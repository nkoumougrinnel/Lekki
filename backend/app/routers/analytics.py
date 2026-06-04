"""
Lekki Wiki — Router Analytics

Statistiques d'usage pour les Workspace Admins (portée = leurs workspaces) et les
Super Admins (portée globale). Le cloisonnement est strict : un Workspace Admin
ne peut jamais consulter les données d'un autre workspace.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    FailedQuestion,
    MissingTopic,
    OverviewResponse,
    QuestionsPerDay,
    SuperAdminDashboard,
    TopPage,
    TopQuestion,
    TopUser,
)
from app.services import analytics_service, workspace_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def resolve_scope(
    db: AsyncSession, user: User, workspace_id: str | None
) -> list[str] | None:
    """Portée des statistiques selon les droits — voir workspace_service.resolve_admin_scope."""
    return await workspace_service.resolve_admin_scope(db, user, workspace_id)


@router.get("/overview", response_model=OverviewResponse)
async def overview(
    workspace_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_overview(db, scope)


@router.get("/pages/top", response_model=list[TopPage])
async def top_pages(
    workspace_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_top_pages(db, scope, limit=limit)


@router.get("/pages/never-viewed", response_model=list[TopPage])
async def never_viewed_pages(
    workspace_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    pages = await analytics_service.get_never_viewed_pages(db, scope, limit=limit)
    # Compléter les champs absents (view_count = 0) pour le modèle TopPage.
    return [{**p, "view_count": 0, "last_viewed_at": None} for p in pages]


@router.get("/users/top", response_model=list[TopUser])
async def top_users(
    workspace_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_top_users(db, scope, limit=limit)


@router.get("/questions/top", response_model=list[TopQuestion])
async def top_questions(
    workspace_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_top_questions(db, scope, limit=limit)


@router.get("/questions/failed", response_model=list[FailedQuestion])
async def failed_questions(
    workspace_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_failed_questions(db, scope, limit=limit)


@router.get("/questions/per-day", response_model=list[QuestionsPerDay])
async def questions_per_day(
    workspace_id: str | None = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_questions_per_day(db, scope, days=days)


@router.get("/providers")
async def providers(
    workspace_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_provider_usage(db, scope)


@router.get("/missing-topics", response_model=list[MissingTopic])
async def missing_topics(
    workspace_id: str | None = Query(None),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    « Ce qui manque dans votre base documentaire » — sujets fréquemment recherchés
    mais non documentés (déduits des questions sans réponse).
    """
    scope = await resolve_scope(db, current_user, workspace_id)
    return await analytics_service.get_missing_topics(db, scope, limit=limit)


@router.get("/super-admin", response_model=SuperAdminDashboard)
async def super_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tableau de bord global — réservé au Super Admin (métriques uniquement)."""
    if not workspace_service.is_global_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé au Super Admin",
        )
    return await analytics_service.get_super_admin_dashboard(db)
