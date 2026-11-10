"""Règles d'accès centralisées de Lekki.

Une seule source de vérité pour répondre à « cet utilisateur peut-il voir / modifier
cette ressource ? ». Toutes les routes Drive, Wiki, Recherche et IA passent par ici.

Règles :
- un administrateur plateforme (User.role == "admin") voit tout ;
- un espace (promo, club, groupe) est visible par son propriétaire et ses membres ;
- un document personnel (sans espace) n'est visible que par son propriétaire
  et les personnes avec qui il a été explicitement partagé ;
- modifier un document : son auteur, ou un membre de l'espace qui le contient ;
- supprimer définitivement : son auteur ou un admin/propriétaire de l'espace.
"""

from __future__ import annotations

import json
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import false, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.models import User
from app.knowledge.drive.models import DriveFile, DriveFolder
from app.knowledge.wiki.models import WikiPage
from app.workspaces.models import Workspace, WorkspaceMember

MANAGER_ROLES = {"owner", "admin"}


def is_platform_admin(user: User) -> bool:
    return (user.role or "") == "admin"


async def accessible_workspace_ids(db: AsyncSession, user: User) -> set[str]:
    """Identifiants des espaces dont l'utilisateur est membre ou propriétaire."""
    members = await db.execute(
        select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user.id)
    )
    owned = await db.execute(select(Workspace.id).where(Workspace.owner_id == user.id))
    return {row[0] for row in members.all()} | {row[0] for row in owned.all()}


async def workspace_role(db: AsyncSession, user: User, workspace_id: str) -> str | None:
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        return None
    if workspace.owner_id == user.id:
        return "owner"
    result = await db.execute(
        select(WorkspaceMember.role).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    return result.scalar_one_or_none()


async def require_workspace_member(db: AsyncSession, user: User, workspace_id: str | None) -> None:
    """Lève 403/404 si l'utilisateur n'appartient pas à l'espace demandé."""
    if not workspace_id or is_platform_admin(user):
        return
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Espace introuvable")
    if await workspace_role(db, user, workspace_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas membre de cet espace.",
        )


def _shared_ids(raw: str | None) -> set[str]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return set()
    return {str(item) for item in value} if isinstance(value, list) else set()


async def can_read_file(db: AsyncSession, user: User, drive_file: DriveFile) -> bool:
    if is_platform_admin(user) or drive_file.owner_id == user.id:
        return True
    if user.id in _shared_ids(drive_file.shared_with):
        return True
    if drive_file.workspace_id:
        return await workspace_role(db, user, drive_file.workspace_id) is not None
    return False


async def can_edit_file(db: AsyncSession, user: User, drive_file: DriveFile) -> bool:
    if is_platform_admin(user) or drive_file.owner_id == user.id:
        return True
    if drive_file.workspace_id:
        return await workspace_role(db, user, drive_file.workspace_id) is not None
    return False


async def can_destroy_file(db: AsyncSession, user: User, drive_file: DriveFile) -> bool:
    if is_platform_admin(user) or drive_file.owner_id == user.id:
        return True
    if drive_file.workspace_id:
        return await workspace_role(db, user, drive_file.workspace_id) in MANAGER_ROLES
    return False


async def can_access_folder(db: AsyncSession, user: User, folder: DriveFolder) -> bool:
    if is_platform_admin(user) or folder.owner_id == user.id:
        return True
    if folder.workspace_id:
        return await workspace_role(db, user, folder.workspace_id) is not None
    return False


async def can_read_wiki(db: AsyncSession, user: User, page: WikiPage) -> bool:
    if is_platform_admin(user) or page.creator_id == user.id:
        return True
    if page.workspace_id:
        return await workspace_role(db, user, page.workspace_id) is not None
    return False


def deny(detail: str = "Accès refusé à cette ressource.") -> HTTPException:
    # 404 plutôt que 403 : on ne révèle pas l'existence d'une ressource privée.
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def file_visibility_clause(user: User, workspace_ids: Iterable[str]):
    """Filtre SQL : documents Drive visibles par l'utilisateur."""
    ids = list(workspace_ids)
    return or_(
        DriveFile.owner_id == user.id,
        DriveFile.workspace_id.in_(ids) if ids else false(),
        # Pré-filtre grossier ; le contrôle exact se fait sur le JSON (voir filter_shared).
        DriveFile.shared_with.like(f'%"{user.id}"%'),
    )


def wiki_visibility_clause(user: User, workspace_ids: Iterable[str]):
    ids = list(workspace_ids)
    return or_(
        WikiPage.workspace_id.in_(ids) if ids else false(),
        (WikiPage.workspace_id.is_(None)) & (WikiPage.creator_id == user.id),
    )


def filter_visible_files(user: User, workspace_ids: set[str], files: Iterable[DriveFile]) -> list[DriveFile]:
    """Contrôle exact après la requête SQL (le LIKE sur shared_with n'est qu'un pré-filtre)."""
    if is_platform_admin(user):
        return list(files)
    visible = []
    for f in files:
        if (
            f.owner_id == user.id
            or (f.workspace_id and f.workspace_id in workspace_ids)
            or user.id in _shared_ids(f.shared_with)
        ):
            visible.append(f)
    return visible
