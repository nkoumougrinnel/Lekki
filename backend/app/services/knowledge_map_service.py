"""
Lekki Wiki — KnowledgeMapService

Construit une carte interactive des connaissances à partir de :
- pages (titres, catégories) ;
- relations sémantiques pré-calculées (`page_relations`, similarité cosinus
  entre embeddings) → déduction automatique des liens ;
- regroupement thématique par catégorie (clusters).

La sortie est directement consommable par React Flow :
    { "nodes": [...], "edges": [...], "clusters": [...] }

Sécurité : seules les pages des workspaces accessibles (ou sans workspace) sont
exposées, et un lien n'est jamais retourné s'il pointe vers une page inaccessible.
"""

from __future__ import annotations

import math

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.page import Page
from app.models.page_relation import PageRelation
from app.models.user import User
from app.services import workspace_service

# Métadonnées thématiques par catégorie (label lisible + couleur React Flow).
CATEGORY_META: dict[str, dict[str, str]] = {
    "rh": {"label": "Ressources Humaines", "color": "#6366f1"},
    "technique": {"label": "Technique", "color": "#0ea5e9"},
    "commercial": {"label": "Commercial", "color": "#f59e0b"},
    "guides": {"label": "Guides", "color": "#10b981"},
}
DEFAULT_CLUSTER = {"label": "Autres", "color": "#94a3b8"}

# Disposition (layout) : les clusters sont répartis sur un grand cercle, et les
# pages d'un cluster sur un cercle plus petit autour du centre du cluster.
CLUSTER_RADIUS = 520.0
NODE_RADIUS_BASE = 150.0
NODE_RADIUS_STEP = 26.0


def _cluster_meta(category: str | None) -> dict[str, str]:
    return CATEGORY_META.get((category or "").lower(), DEFAULT_CLUSTER)


def _layout_positions(
    clusters: list[str], pages_by_cluster: dict[str, list[Page]]
) -> dict[str, dict[str, float]]:
    """Calcule une position (x, y) par page, regroupée par cluster."""
    positions: dict[str, dict[str, float]] = {}
    n_clusters = max(1, len(clusters))

    for ci, cluster in enumerate(clusters):
        # Centre du cluster sur le grand cercle.
        angle = (2 * math.pi * ci) / n_clusters
        cx = CLUSTER_RADIUS * math.cos(angle)
        cy = CLUSTER_RADIUS * math.sin(angle)

        members = pages_by_cluster[cluster]
        count = len(members)
        # Rayon interne croissant si beaucoup de pages (évite le chevauchement).
        inner_radius = NODE_RADIUS_BASE + NODE_RADIUS_STEP * max(0, count - 6)

        for pi, page in enumerate(members):
            if count == 1:
                px, py = cx, cy
            else:
                a = (2 * math.pi * pi) / count
                px = cx + inner_radius * math.cos(a)
                py = cy + inner_radius * math.sin(a)
            positions[page.id] = {"x": round(px, 2), "y": round(py, 2)}

    return positions


async def build_knowledge_map(
    db: AsyncSession,
    user: User | None,
    workspace_id: str | None = None,
    min_score: float = 0.3,
    max_edges_per_node: int = 5,
) -> dict:
    """
    Retourne la carte des connaissances au format React Flow.

    - `workspace_id` : restreint la carte à un seul workspace (sinon : tous les
      workspaces accessibles + pages sans workspace).
    - `min_score` : seuil minimal de similarité pour tracer une arête.
    - `max_edges_per_node` : limite d'arêtes par nœud (lisibilité du graphe).
    """
    accessible_ids = await workspace_service.get_accessible_workspace_ids(db, user)

    # Sélection des pages visibles.
    stmt = select(Page).where(Page.status == "published")
    if workspace_id is not None:
        if not await workspace_service.has_workspace_access(db, workspace_id, user):
            # Pas d'accès → carte vide plutôt qu'une fuite d'information.
            return {"nodes": [], "edges": [], "clusters": []}
        stmt = stmt.where(Page.workspace_id == workspace_id)
    else:
        conditions = [Page.workspace_id.is_(None)]
        if accessible_ids:
            conditions.append(Page.workspace_id.in_(accessible_ids))
        stmt = stmt.where(or_(*conditions))

    result = await db.execute(stmt)
    pages = list(result.scalars().all())
    page_ids = {p.id for p in pages}

    if not pages:
        return {"nodes": [], "edges": [], "clusters": []}

    # Regroupement thématique (clusters par catégorie).
    pages_by_cluster: dict[str, list[Page]] = {}
    for page in pages:
        key = (page.category or "autres").lower()
        pages_by_cluster.setdefault(key, []).append(page)

    cluster_keys = sorted(pages_by_cluster.keys())
    positions = _layout_positions(cluster_keys, pages_by_cluster)

    # Nœuds (format React Flow).
    nodes: list[dict] = []
    for page in pages:
        key = (page.category or "autres").lower()
        meta = _cluster_meta(page.category)
        nodes.append(
            {
                "id": page.id,
                "type": "default",
                "position": positions.get(page.id, {"x": 0.0, "y": 0.0}),
                "data": {
                    "label": page.title,
                    "category": page.category,
                    "cluster": key,
                    "workspaceId": page.workspace_id,
                    "views": page.view_count,
                    "hasSummary": bool(page.summary),
                },
                "style": {
                    "background": meta["color"],
                    "color": "#ffffff",
                    "border": "none",
                    "borderRadius": 10,
                    "padding": 8,
                    "fontSize": 12,
                    "width": 170,
                },
            }
        )

    # Arêtes : relations sémantiques pré-calculées, dédupliquées (non orientées).
    rel_result = await db.execute(
        select(
            PageRelation.page_id,
            PageRelation.related_id,
            PageRelation.score,
            Page.workspace_id,
        )
        .join(Page, Page.id == PageRelation.related_id)
        .where(PageRelation.page_id.in_(page_ids))
        .order_by(PageRelation.score.desc())
    )

    best_scores: dict[tuple[str, str], float] = {}
    per_node_count: dict[str, int] = {}
    for src, dst, score, dst_ws in rel_result.all():
        # SÉCURITÉ : la cible doit être visible (page accessible).
        if dst not in page_ids:
            continue
        if dst_ws is not None and dst_ws not in accessible_ids and workspace_id is None:
            continue
        s = float(score)
        if s < min_score or src == dst:
            continue
        # Limite d'arêtes par nœud (les relations sont déjà triées par score desc).
        if per_node_count.get(src, 0) >= max_edges_per_node:
            continue
        key = (src, dst) if src < dst else (dst, src)
        if key in best_scores:
            if s > best_scores[key]:
                best_scores[key] = s
            continue
        best_scores[key] = s
        per_node_count[src] = per_node_count.get(src, 0) + 1

    edges: list[dict] = []
    for (a, b), score in best_scores.items():
        edges.append(
            {
                "id": f"e-{a}-{b}",
                "source": a,
                "target": b,
                "type": "default",
                "animated": score >= 0.7,
                "label": f"{score:.2f}",
                "data": {"score": round(score, 4)},
                "style": {"stroke": "#cbd5e1", "strokeWidth": 1 + 2 * score},
            }
        )

    # Clusters (groupes thématiques).
    clusters: list[dict] = []
    for key in cluster_keys:
        members = pages_by_cluster[key]
        meta = _cluster_meta(key)
        clusters.append(
            {
                "id": key,
                "label": meta["label"],
                "color": meta["color"],
                "count": len(members),
                "page_ids": [p.id for p in members],
            }
        )

    return {"nodes": nodes, "edges": edges, "clusters": clusters}
