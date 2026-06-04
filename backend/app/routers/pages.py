"""
Lekki Wiki — Router Pages (async + protection par rôles)
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.page import (
    PageCreate,
    PageUpdate,
    PageResponse,
    PageCategory,
    PageSummaryResponse,
    RelatedPage,
)
from app.services import rag_service, summary_service, workspace_service
from app.services.auth_service import get_current_user, require_role
from app.services.llm_providers.base import AllProvidersFailedError
from app.utils import pages as crud_pages

router = APIRouter(prefix="/pages", tags=["pages"])


# ── Lecture — tous les rôles authentifiés ────────────────────────────────────

@router.get("", response_model=List[PageResponse])
async def list_pages(
    category: Optional[PageCategory] = None,
    workspace_id: Optional[str] = Query(None, description="Filtrer sur un workspace précis"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Cloisonnement : uniquement les pages des workspaces de l'utilisateur.
    accessible = await workspace_service.get_accessible_workspace_ids(db, current_user)
    if workspace_id is not None:
        if workspace_id not in accessible:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé à ce workspace",
            )
        workspace_ids = [workspace_id]
    else:
        workspace_ids = accessible
    return await crud_pages.get_pages(
        db, skip=skip, limit=limit,
        category=category.value if category else None,
        workspace_ids=workspace_ids,
    )


@router.get("/search", response_model=List[PageResponse])
async def search_pages(
    q: str = Query(..., min_length=1, description="Texte à rechercher"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace_ids = await workspace_service.get_accessible_workspace_ids(db, current_user)
    return await crud_pages.search_pages(db, q, workspace_ids=workspace_ids)


@router.get("/{id}", response_model=PageResponse)
async def read_page(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page = await crud_pages.get_page(db, id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    # Cloisonnement : interdire l'accès à une page hors des workspaces autorisés.
    if not await workspace_service.has_workspace_access(db, page.workspace_id, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé à cette page")
    # Tracking d'usage : compteur de vues + date de dernière consultation.
    page.view_count = (page.view_count or 0) + 1
    page.last_viewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(page)
    return page


# ── Création — admin + editor ────────────────────────────────────────────────

@router.post("", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(
    page_in: PageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "editor")),
):
    # On ne peut créer une page que dans un workspace dont on est membre.
    await workspace_service.require_workspace_access(db, page_in.workspace_id, current_user)
    return await crud_pages.create_page(db, page_in, current_user.id)


# ── Modification — admin + editor ────────────────────────────────────────────

@router.put("/{id}", response_model=PageResponse)
async def update_page(
    id: str,
    page_in: PageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "editor")),
):
    page = await crud_pages.get_page(db, id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Cloisonnement : la page doit appartenir à un workspace autorisé.
    if not await workspace_service.has_workspace_access(db, page.workspace_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à cette page",
        )

    # Un editor ne peut modifier que ses propres pages
    if current_user.role == "editor" and page.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez modifier que vos propres pages",
        )

    updated = await crud_pages.update_page(db, id, page_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated


# ── Suppression — admin uniquement ───────────────────────────────────────────

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    deleted = await crud_pages.delete_page(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return None


# ── Résumé automatique (TL;DR) ───────────────────────────────────────────────

async def _get_page_with_access(db: AsyncSession, page_id: str, user: User):
    page = await crud_pages.get_page(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if not await workspace_service.has_workspace_access(db, page.workspace_id, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à cette page",
        )
    return page


@router.post("/{id}/summarize", response_model=PageSummaryResponse)
async def summarize_page(
    id: str,
    force: bool = Query(False, description="Régénérer même si un résumé existe"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Génère (ou retourne) un résumé TL;DR de 5 à 8 lignes pour la page.
    Si un résumé existe déjà, il est renvoyé tel quel (sauf `force=true`).
    """
    page = await _get_page_with_access(db, id, current_user)
    try:
        page, cached, provider = await summary_service.get_or_create_summary(
            db, page, force=force
        )
    except AllProvidersFailedError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Tous les fournisseurs LLM sont indisponibles (quota ou erreur).",
                "errors": exc.errors,
            },
        ) from exc

    return PageSummaryResponse(
        page_id=page.id,
        summary=page.summary,
        summary_at=page.summary_at,
        cached=cached,
        provider=provider,
    )


@router.get("/{id}/summary", response_model=PageSummaryResponse)
async def get_page_summary(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retourne le résumé existant d'une page (summary à null s'il n'a pas encore été généré)."""
    page = await _get_page_with_access(db, id, current_user)
    return PageSummaryResponse(
        page_id=page.id,
        summary=page.summary,
        summary_at=page.summary_at,
        cached=bool(page.summary),
    )


# ── Pages liées (voisins sémantiques) ────────────────────────────────────────

@router.get("/{id}/related", response_model=List[RelatedPage])
async def get_related_pages(
    id: str,
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pages sémantiquement proches d'une page donnée.
    Ne suggère jamais une page appartenant à un workspace inaccessible.
    """
    page = await _get_page_with_access(db, id, current_user)
    accessible = await workspace_service.get_accessible_workspace_ids(db, current_user)
    return await rag_service.get_related_pages(
        db, page.id, accessible_workspace_ids=accessible, limit=limit
    )
