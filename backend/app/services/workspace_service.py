"""
Lekki Wiki — WorkspaceService

Centralise toute la logique de cloisonnement par workspace :
- résolution des workspaces accessibles à un utilisateur ;
- contrôle d'accès (lecture) et de gestion (membres) sur un workspace.

Règle de sécurité fondamentale : un utilisateur ne « voit » que les workspaces
dont il est propriétaire ou membre. Un administrateur global (role == "admin")
a accès à l'ensemble des workspaces (super-utilisateur).
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember


def is_global_admin(user: User | None) -> bool:
    return bool(user and user.role == "admin")


async def get_accessible_workspace_ids(
    db: AsyncSession, user: User | None
) -> list[str]:
    """
    Liste des IDs de workspaces auxquels l'utilisateur a accès.

    - utilisateur non authentifié → [] (aucun accès au contenu cloisonné) ;
    - admin global → tous les workspaces ;
    - sinon → workspaces possédés + workspaces où il est membre.
    """
    if user is None:
        return []

    if is_global_admin(user):
        result = await db.execute(select(Workspace.id))
        return [wid for wid in result.scalars().all()]

    owned = await db.execute(
        select(Workspace.id).where(Workspace.owner_id == user.id)
    )
    member = await db.execute(
        select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == user.id
        )
    )
    ids = set(owned.scalars().all()) | set(member.scalars().all())
    return list(ids)


async def get_managed_workspace_ids(db: AsyncSession, user: User | None) -> list[str]:
    """
    Workspaces que l'utilisateur peut administrer (analytics admin).

    - admin global → tous les workspaces ;
    - sinon → workspaces possédés + ceux où il est membre owner/admin.
    """
    if user is None:
        return []
    if is_global_admin(user):
        result = await db.execute(select(Workspace.id))
        return [wid for wid in result.scalars().all()]

    owned = await db.execute(select(Workspace.id).where(Workspace.owner_id == user.id))
    managed = await db.execute(
        select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.role.in_(("owner", "admin")),
        )
    )
    ids = set(owned.scalars().all()) | set(managed.scalars().all())
    return list(ids)


async def resolve_admin_scope(
    db: AsyncSession, user: User, workspace_id: str | None
) -> list[str] | None:
    """
    Portée des statistiques/audit selon les droits (analytics + audit).

    - Super Admin sans workspace_id → None (global) ;
    - workspace_id fourni → autorisé si admin global ou admin du workspace ;
    - Workspace Admin sans workspace_id → ses workspaces gérés ;
    - aucun droit → HTTP 403.
    """
    managed = await get_managed_workspace_ids(db, user)

    if workspace_id is not None:
        if is_global_admin(user) or workspace_id in managed:
            return [workspace_id]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé aux statistiques de ce workspace",
        )

    if is_global_admin(user):
        return None
    if managed:
        return managed

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Réservé aux administrateurs de workspace",
    )


async def has_workspace_access(
    db: AsyncSession, workspace_id: str, user: User | None
) -> bool:
    if user is None:
        return False
    if is_global_admin(user):
        return True
    accessible = await get_accessible_workspace_ids(db, user)
    return workspace_id in accessible


async def get_workspace_or_404(db: AsyncSession, workspace_id: str) -> Workspace:
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace introuvable",
        )
    return workspace


async def require_workspace_access(
    db: AsyncSession, workspace_id: str, user: User
) -> Workspace:
    """Vérifie que l'utilisateur peut accéder au workspace (lecture/écriture de contenu)."""
    workspace = await get_workspace_or_404(db, workspace_id)
    if not await has_workspace_access(db, workspace_id, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à ce workspace",
        )
    return workspace


async def require_workspace_manager(
    db: AsyncSession, workspace_id: str, user: User
) -> Workspace:
    """
    Vérifie que l'utilisateur peut gérer le workspace (ajout/suppression de membres).
    Autorisé : admin global, propriétaire du workspace, membre avec rôle owner/admin.
    """
    workspace = await get_workspace_or_404(db, workspace_id)

    if is_global_admin(user) or workspace.owner_id == user.id:
        return workspace

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership and membership.role in ("owner", "admin"):
        return workspace

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Droits insuffisants pour gérer ce workspace",
    )


async def get_membership(
    db: AsyncSession, workspace_id: str, user_id: str
) -> WorkspaceMember | None:
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
