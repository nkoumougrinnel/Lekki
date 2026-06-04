"""
Lekki Wiki — AuditService

Audit automatique de la qualité de la base documentaire. Permet aux Workspace
Admins et Super Admins de détecter :
- les pages obsolètes (score d'obsolescence) ;
- les questions récurrentes sans réponse (regroupées sémantiquement) ;
- les pages non indexées (sans chunks / sans embeddings) ;
- les documents jamais utilisés (view_count = 0) ;
- les pages signalées manuellement (page_flags) ;
- un score global de santé du workspace (Knowledge Health Score) ;
- les connaissances manquantes (sujets à documenter, par priorité).

Toutes les fonctions acceptent `workspace_ids` :
- None  → portée globale (Super Admin) ;
- [...] → restreint aux workspaces fournis (Workspace Admin).
"""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.page import Page
from app.models.page_flag import PageFlag
from app.models.rag_query import RagQuery
from app.models.user import User
from app.models.workspace import Workspace
from app.services.analytics_service import (
    _failed_condition,
    _keywords,
    _scope,
)

# Pondérations du score d'obsolescence (cf. spec : 40% / 40% / 20%).
STALE_AGE_WEIGHT = 0.4
STALE_NOVIEW_WEIGHT = 0.4
STALE_USAGE_WEIGHT = 0.2

# Bornes de normalisation (en jours).
STALE_MAX_AGE_DAYS = 365.0          # ancienneté max prise en compte
STALE_NOVIEW_HORIZON_DAYS = 90.0    # horizon "non consulté depuis N jours"

# Pénalités du Knowledge Health Score (par item, plafonnées).
HEALTH_PENALTIES = {
    "stale": (2.0, 30.0),       # (pénalité unitaire, plafond)
    "unanswered": (0.5, 30.0),
    "unindexed": (4.0, 20.0),
    "flagged": (3.0, 20.0),
}
# Une page est comptée "obsolète" pour la santé au-delà de ce score.
STALE_HEALTH_THRESHOLD = 70


def _now() -> datetime:
    return datetime.now(UTC)


def _as_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _days_between(now: datetime, dt: datetime | None) -> float | None:
    dt = _as_aware(dt)
    if dt is None:
        return None
    return max(0.0, (now - dt).total_seconds() / 86400.0)


# ── PARTIE 1 — Pages obsolètes ───────────────────────────────────────────────

def _staleness_score(now: datetime, page: Page) -> int:
    """
    Score d'obsolescence 0–100 :
      40% ancienneté + 40% absence de consultation + 20% (faible) fréquence d'usage.
    """
    last_update = page.updated_at or page.created_at
    age_days = _days_between(now, last_update)
    age_factor = min(1.0, (age_days or 0.0) / STALE_MAX_AGE_DAYS)

    noview_days = _days_between(now, page.last_viewed_at)
    if noview_days is None:  # jamais consultée
        noview_factor = 1.0
    else:
        noview_factor = min(1.0, noview_days / STALE_NOVIEW_HORIZON_DAYS)

    # Plus une page est consultée, moins elle est obsolète.
    usage_factor = 1.0 / (1.0 + float(page.view_count or 0))

    score = (
        STALE_AGE_WEIGHT * age_factor
        + STALE_NOVIEW_WEIGHT * noview_factor
        + STALE_USAGE_WEIGHT * usage_factor
    )
    return int(round(score * 100))


async def get_stale_pages(
    db: AsyncSession,
    workspace_ids: list[str] | None,
    min_score: int = 0,
    limit: int = 50,
) -> list[dict]:
    stmt = select(Page)
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    pages = (await db.execute(stmt)).scalars().all()
    now = _now()

    results = []
    for page in pages:
        score = _staleness_score(now, page)
        if score < min_score:
            continue
        last_viewed = _as_aware(page.last_viewed_at)
        results.append(
            {
                "id": page.id,
                "page": page.title,
                "category": page.category,
                "workspace_id": page.workspace_id,
                "staleness_score": score,
                "view_count": int(page.view_count or 0),
                "last_viewed": last_viewed.date().isoformat() if last_viewed else None,
                "updated_at": page.updated_at,
                "never_viewed": page.last_viewed_at is None,
            }
        )

    results.sort(key=lambda r: r["staleness_score"], reverse=True)
    return results[:limit]


# ── PARTIE 2 — Questions sans réponse (regroupées) ───────────────────────────

def _primary_keyword(question: str, global_freq: Counter[str]) -> str | None:
    """Mot-clé le plus représentatif (le plus fréquent globalement) de la question."""
    kws = _keywords(question)
    if not kws:
        return None
    return max(kws, key=lambda k: (global_freq.get(k, 0), len(k)))


async def get_unanswered_questions(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 20
) -> list[dict]:
    """
    Regroupe les questions sans réponse (confidence < 0.30 ou had_results = false)
    par sujet (mot-clé dominant) et renvoie occurrences / dernière occurrence /
    score moyen.
    """
    stmt = select(
        RagQuery.question, RagQuery.confidence, RagQuery.created_at
    ).where(_failed_condition())
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)
    stmt = stmt.limit(1000)

    rows = (await db.execute(stmt)).all()
    if not rows:
        return []

    # Fréquence globale des mots-clés pour choisir un sujet représentatif.
    global_freq: Counter[str] = Counter()
    for r in rows:
        global_freq.update(set(_keywords(r.question or "")))

    groups: dict[str, dict] = defaultdict(
        lambda: {
            "occurrences": 0,
            "confidences": [],
            "last_occurrence": None,
            "samples": Counter(),
        }
    )

    for r in rows:
        key = _primary_keyword(r.question or "", global_freq)
        if key is None:
            key = (r.question or "").strip().lower()[:40] or "?"
        g = groups[key]
        g["occurrences"] += 1
        if r.confidence is not None:
            g["confidences"].append(float(r.confidence))
        created = _as_aware(r.created_at)
        if created and (g["last_occurrence"] is None or created > g["last_occurrence"]):
            g["last_occurrence"] = created
        if r.question:
            g["samples"][r.question.strip()] += 1

    result = []
    for key, g in groups.items():
        confidences = g["confidences"]
        avg_score = round(sum(confidences) / len(confidences), 3) if confidences else None
        sample = g["samples"].most_common(1)[0][0] if g["samples"] else key
        result.append(
            {
                "topic": key.capitalize(),
                "sample_question": sample,
                "occurrences": g["occurrences"],
                "avg_score": avg_score,
                "last_occurrence": g["last_occurrence"],
            }
        )

    result.sort(key=lambda x: x["occurrences"], reverse=True)
    return result[:limit]


# ── PARTIE 3 — Pages non indexées ────────────────────────────────────────────

async def get_unindexed_pages(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 100
) -> list[dict]:
    """
    Détecte les pages sans embeddings exploitables :
    - aucune chunk ;
    - chunks présents mais aucun embedding ;
    - drapeau is_embedded à false.
    """
    chunk_total = (
        select(Chunk.page_id, func.count(Chunk.id).label("n_chunks"))
        .group_by(Chunk.page_id)
        .subquery()
    )
    chunk_emb = (
        select(Chunk.page_id, func.count(Chunk.id).label("n_emb"))
        .where(Chunk.embedding.isnot(None))
        .group_by(Chunk.page_id)
        .subquery()
    )

    stmt = (
        select(
            Page.id,
            Page.title,
            Page.category,
            Page.workspace_id,
            Page.is_embedded,
            Page.created_at,
            func.coalesce(chunk_total.c.n_chunks, 0).label("n_chunks"),
            func.coalesce(chunk_emb.c.n_emb, 0).label("n_emb"),
        )
        .outerjoin(chunk_total, chunk_total.c.page_id == Page.id)
        .outerjoin(chunk_emb, chunk_emb.c.page_id == Page.id)
    )
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    results = []
    for r in rows:
        n_chunks = int(r.n_chunks or 0)
        n_emb = int(r.n_emb or 0)
        if n_chunks == 0:
            reason = "No chunks"
        elif n_emb == 0:
            reason = "No embeddings"
        elif not r.is_embedded:
            reason = "Not indexed"
        else:
            continue  # page correctement indexée
        results.append(
            {
                "id": r.id,
                "page": r.title,
                "category": r.category,
                "workspace_id": r.workspace_id,
                "reason": reason,
                "created_at": r.created_at,
            }
        )
    return results[:limit]


# ── PARTIE 4 — Documents jamais utilisés ─────────────────────────────────────

async def get_unused_pages(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 100
) -> list[dict]:
    """Pages dont view_count = 0 (jamais consultées)."""
    stmt = (
        select(
            Page.id,
            Page.title,
            Page.category,
            Page.workspace_id,
            Page.created_at,
            Workspace.name.label("workspace_name"),
        )
        .outerjoin(Workspace, Workspace.id == Page.workspace_id)
        .where(or_(Page.view_count == 0, Page.view_count.is_(None)))
        .order_by(Page.created_at.desc())
        .limit(limit)
    )
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": r.id,
            "page": r.title,
            "category": r.category,
            "workspace_id": r.workspace_id,
            "workspace": r.workspace_name,
            "created_at": r.created_at,
        }
        for r in rows
    ]


# ── PARTIE 5 — Pages signalées ───────────────────────────────────────────────

async def flag_page(
    db: AsyncSession, page: Page, flag_type: str, user: User
) -> PageFlag:
    """Crée un signalement non résolu et incrémente le compteur de la page."""
    flag = PageFlag(
        id=str(uuid.uuid4()),
        page_id=page.id,
        flag_type=flag_type,
        flagged_by=user.id,
    )
    db.add(flag)

    # Recalcule flag_count = nombre de signalements non résolus.
    page.flag_count = (page.flag_count or 0) + 1
    await db.commit()
    await db.refresh(flag)
    return flag


async def unflag_page(
    db: AsyncSession, page: Page, flag_type: str | None, user: User
) -> int:
    """
    Résout (resolved_at) les signalements non résolus de la page (optionnellement
    filtrés par type) et met à jour flag_count. Renvoie le nombre résolu.
    """
    stmt = select(PageFlag).where(
        PageFlag.page_id == page.id, PageFlag.resolved_at.is_(None)
    )
    if flag_type:
        stmt = stmt.where(PageFlag.flag_type == flag_type)

    flags = (await db.execute(stmt)).scalars().all()
    now = _now()
    for flag in flags:
        flag.resolved_at = now

    page.flag_count = max(0, (page.flag_count or 0) - len(flags))
    await db.commit()
    return len(flags)


async def get_flagged_pages(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 100
) -> list[dict]:
    """Pages ayant au moins un signalement non résolu, agrégées par page."""
    stmt = (
        select(
            Page.id,
            Page.title,
            Page.category,
            Page.workspace_id,
            PageFlag.flag_type,
            PageFlag.created_at,
        )
        .join(Page, Page.id == PageFlag.page_id)
        .where(PageFlag.resolved_at.is_(None))
        .order_by(PageFlag.created_at.desc())
    )
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()

    pages: dict[str, dict] = {}
    for r in rows:
        entry = pages.setdefault(
            r.id,
            {
                "id": r.id,
                "page": r.title,
                "category": r.category,
                "workspace_id": r.workspace_id,
                "flag_count": 0,
                "flag_types": Counter(),
                "last_flagged_at": None,
            },
        )
        entry["flag_count"] += 1
        entry["flag_types"][r.flag_type] += 1
        created = _as_aware(r.created_at)
        if created and (
            entry["last_flagged_at"] is None or created > entry["last_flagged_at"]
        ):
            entry["last_flagged_at"] = created

    result = [
        {**e, "flag_types": dict(e["flag_types"])}
        for e in pages.values()
    ]
    result.sort(key=lambda x: x["flag_count"], reverse=True)
    return result[:limit]


# ── PARTIE 7 — Sujets manquants (avec priorité) ──────────────────────────────

def _priority(occurrences: int) -> str:
    if occurrences >= 5:
        return "high"
    if occurrences >= 2:
        return "medium"
    return "low"


async def get_missing_topics(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 8
) -> list[dict]:
    """
    « Connaissances manquantes » : sujets fréquemment demandés mais sans réponse,
    classés par fréquence avec un niveau de priorité.
    """
    groups = await get_unanswered_questions(db, workspace_ids, limit=limit)
    topics = []
    for g in groups:
        topics.append(
            {
                "topic": g["topic"],
                "requests": g["occurrences"],
                "priority": _priority(g["occurrences"]),
                "sample_question": g["sample_question"],
            }
        )
    return topics


# ── PARTIE 6 — Knowledge Health Score ────────────────────────────────────────

async def get_health_score(
    db: AsyncSession, workspace_ids: list[str] | None
) -> dict:
    """
    Score global 0–100 = 100 − pénalités (pages obsolètes, questions sans réponse,
    pages non indexées, pages signalées). Chaque pénalité est plafonnée.
    """
    # Pages obsolètes (au-delà du seuil de santé).
    stale = await get_stale_pages(
        db, workspace_ids, min_score=STALE_HEALTH_THRESHOLD, limit=10_000
    )
    stale_count = len(stale)

    # Questions sans réponse.
    unanswered_stmt = select(func.count(RagQuery.id)).where(_failed_condition())
    qcond = _scope(RagQuery.workspace_id, workspace_ids)
    if qcond is not None:
        unanswered_stmt = unanswered_stmt.where(qcond)
    unanswered_count = int(await db.scalar(unanswered_stmt) or 0)

    # Pages non indexées.
    unindexed = await get_unindexed_pages(db, workspace_ids, limit=10_000)
    unindexed_count = len(unindexed)

    # Pages signalées (non résolues).
    flagged_stmt = (
        select(func.count(func.distinct(PageFlag.page_id)))
        .join(Page, Page.id == PageFlag.page_id)
        .where(PageFlag.resolved_at.is_(None))
    )
    fcond = _scope(Page.workspace_id, workspace_ids)
    if fcond is not None:
        flagged_stmt = flagged_stmt.where(fcond)
    flagged_count = int(await db.scalar(flagged_stmt) or 0)

    def penalty(key: str, count: int) -> float:
        unit, cap = HEALTH_PENALTIES[key]
        return min(cap, unit * count)

    p_stale = penalty("stale", stale_count)
    p_unanswered = penalty("unanswered", unanswered_count)
    p_unindexed = penalty("unindexed", unindexed_count)
    p_flagged = penalty("flagged", flagged_count)

    total_penalty = p_stale + p_unanswered + p_unindexed + p_flagged
    score = max(0, int(round(100 - total_penalty)))

    return {
        "score": score,
        "details": {
            "stale_pages": stale_count,
            "unanswered_questions": unanswered_count,
            "unindexed_pages": unindexed_count,
            "flagged_pages": flagged_count,
        },
        "penalties": {
            "stale_pages": round(p_stale, 1),
            "unanswered_questions": round(p_unanswered, 1),
            "unindexed_pages": round(p_unindexed, 1),
            "flagged_pages": round(p_flagged, 1),
        },
    }
