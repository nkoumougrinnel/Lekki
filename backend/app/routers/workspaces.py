"""
Lekki Wiki — Router Workspaces (async + JWT)

Routes :
  POST   /workspaces
  GET    /workspaces
  GET    /workspaces/{id}
  POST   /workspaces/{id}/members
  DELETE /workspaces/{id}/members/{user_id}
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace import (
    MemberAdd,
    MemberResponse,
    WorkspaceCreate,
    WorkspaceResponse,
)
from app.services import workspace_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crée un workspace ; le créateur en devient propriétaire et premier membre."""
    workspace = Workspace(
        name=body.name,
        description=body.description,
        owner_id=current_user.id,
    )
    db.add(workspace)
    await db.flush()

    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=current_user.id,
            role="owner",
        )
    )
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste uniquement les workspaces accessibles à l'utilisateur connecté."""
    ids = await workspace_service.get_accessible_workspace_ids(db, current_user)
    if not ids:
        return []
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id.in_(ids))
        .order_by(Workspace.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=WorkspaceResponse)
async def get_workspace(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Détail d'un workspace (403 si l'utilisateur n'y a pas accès)."""
    return await workspace_service.require_workspace_access(db, id, current_user)


@router.get("/{id}/members", response_model=List[MemberResponse])
async def list_members(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste des membres d'un workspace (accès réservé aux membres)."""
    await workspace_service.require_workspace_access(db, id, current_user)
    result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == id)
        .order_by(WorkspaceMember.joined_at.asc())
    )
    return result.scalars().all()


@router.post(
    "/{id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    id: str,
    body: MemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ajoute (ou met à jour le rôle d') un membre. Réservé au gestionnaire du workspace."""
    await workspace_service.require_workspace_manager(db, id, current_user)

    target = await db.get(User, body.user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur cible introuvable",
        )

    existing = await workspace_service.get_membership(db, id, body.user_id)
    if existing:
        existing.role = body.role
        await db.commit()
        await db.refresh(existing)
        return existing

    membership = WorkspaceMember(
        workspace_id=id,
        user_id=body.user_id,
        role=body.role,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


@router.delete(
    "/{id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retire un membre du workspace. Réservé au gestionnaire du workspace."""
    workspace = await workspace_service.require_workspace_manager(db, id, current_user)

    if user_id == workspace.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible de retirer le propriétaire du workspace",
        )

    membership = await workspace_service.get_membership(db, id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ce membre n'appartient pas au workspace",
        )

    await db.delete(membership)
    await db.commit()
    return None
