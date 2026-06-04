from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.knowledge_map import KnowledgeMapResponse
from app.services import knowledge_map_service
from app.services.auth_service import get_current_user

router = APIRouter(tags=["knowledge-map"])


@router.get("/knowledge-map", response_model=KnowledgeMapResponse)
async def knowledge_map(
    workspace_id: str | None = Query(
        None, description="Restreindre la carte à un workspace précis"
    ),
    min_score: float = Query(
        0.3, ge=0.0, le=1.0, description="Seuil minimal de similarité pour une arête"
    ),
    max_edges_per_node: int = Query(
        5, ge=1, le=15, description="Nombre maximal d'arêtes par nœud"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Carte interactive des connaissances (nœuds, arêtes, clusters) au format React Flow.

    - Les nœuds sont les pages accessibles, colorées et regroupées par thématique.
    - Les arêtes sont déduites automatiquement des similarités sémantiques.
    - Les clusters regroupent les pages par catégorie.
    """
    return await knowledge_map_service.build_knowledge_map(
        db,
        current_user,
        workspace_id=workspace_id,
        min_score=min_score,
        max_edges_per_node=max_edges_per_node,
    )
