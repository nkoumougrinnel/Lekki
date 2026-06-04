"""
Lekki Wiki — Router Audit de connaissance

Réservé aux Workspace Admins (portée = leurs workspaces) et aux Super Admins
(portée globale). Les utilisateurs standards n'ont aucun accès. Le cloisonnement
est strict : un Workspace Admin ne voit jamais les données d'un autre workspace.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.page import Page
from app.models.page_flag import FLAG_TYPES
from app.models.user import User
from app.schemas.audit import (
    FlaggedPage,
    FlagRequest,
    FlagResponse,
    HealthScore,
    MissingKnowledge,
    StalePage,
    UnansweredGroup,
    UnindexedPage,
    UnusedPage,
)
from app.services import audit_service, workspace_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


async def _scope(db: AsyncSession, user: User, workspace_id: str | None):
    """Portée admin (None = global) ou 403 si droits insuffisants."""
    return await workspace_service.resolve_admin_scope(db, user, workspace_id)


# ── PARTIE 1 — Pages obsolètes ───────────────────────────────────────────────

@router.get("/pages/stale", response_model=list[StalePage])
async def stale_pages(
    workspace_id: str | None = Query(None),
    min_score: int = Query(0, ge=0, le=100),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_stale_pages(
        db, scope, min_score=min_score, limit=limit
    )


# ── PARTIE 2 — Questions sans réponse ────────────────────────────────────────

@router.get("/questions/unanswered", response_model=list[UnansweredGroup])
async def unanswered_questions(
    workspace_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_unanswered_questions(db, scope, limit=limit)


# ── PARTIE 3 — Pages non indexées ────────────────────────────────────────────

@router.get("/pages/unindexed", response_model=list[UnindexedPage])
async def unindexed_pages(
    workspace_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_unindexed_pages(db, scope, limit=limit)


# ── PARTIE 4 — Documents jamais utilisés ─────────────────────────────────────

@router.get("/pages/unused", response_model=list[UnusedPage])
async def unused_pages(
    workspace_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_unused_pages(db, scope, limit=limit)


# ── PARTIE 5 — Pages signalées ───────────────────────────────────────────────

async def _get_page_for_admin(db: AsyncSession, page_id: str, user: User) -> Page:
    page = (
        await db.execute(select(Page).where(Page.id == page_id))
    ).scalar_one_or_none()
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Page introuvable"
        )
    # Vérifie que l'utilisateur administre le workspace de la page (ou est global admin).
    await workspace_service.resolve_admin_scope(db, user, page.workspace_id)
    return page


@router.post("/pages/{page_id}/flag", response_model=FlagResponse)
async def flag_page(
    page_id: str,
    body: FlagRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.flag_type not in FLAG_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"flag_type invalide. Valeurs : {', '.join(FLAG_TYPES)}",
        )
    page = await _get_page_for_admin(db, page_id, current_user)
    flag = await audit_service.flag_page(db, page, body.flag_type, current_user)
    return FlagResponse(
        id=flag.id,
        page_id=flag.page_id,
        flag_type=flag.flag_type,
        flagged_by=flag.flagged_by,
        created_at=flag.created_at,
    )


@router.delete("/pages/{page_id}/flag")
async def unflag_page(
    page_id: str,
    flag_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page = await _get_page_for_admin(db, page_id, current_user)
    resolved = await audit_service.unflag_page(db, page, flag_type, current_user)
    return {"resolved": resolved, "flag_count": page.flag_count}


@router.get("/pages/flagged", response_model=list[FlaggedPage])
async def flagged_pages(
    workspace_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_flagged_pages(db, scope, limit=limit)


# ── PARTIE 6 — Knowledge Health Score ────────────────────────────────────────

@router.get("/health", response_model=HealthScore)
async def health_score(
    workspace_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_health_score(db, scope)


# ── PARTIE 7 — Connaissances manquantes ──────────────────────────────────────

@router.get("/missing-topics", response_model=list[MissingKnowledge])
async def missing_topics(
    workspace_id: str | None = Query(None),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await _scope(db, current_user, workspace_id)
    return await audit_service.get_missing_topics(db, scope, limit=limit)
