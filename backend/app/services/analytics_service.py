"""
Lekki Wiki — AnalyticsService

Intelligence documentaire : pages populaires, utilisateurs actifs, questions
fréquentes, questions sans réponse, santé de la plateforme et — fonctionnalité
différenciante — détection automatique des sujets manquants.

Toutes les fonctions acceptent `workspace_ids` :
- None  → portée globale (Super Admin) ;
- [...] → restreint aux workspaces fournis (Workspace Admin).
"""

from __future__ import annotations

import os
import re
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import Float, cast, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import BACKEND_ROOT
from app.models.page import Page
from app.models.rag_query import RagQuery
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

# Critère « question sans réponse ».
FAILED_CONFIDENCE_THRESHOLD = 0.3

# Mots vides français/anglais ignorés pour la détection de sujets manquants.
_STOPWORDS = {
    "comment", "quel", "quelle", "quels", "quelles", "quoi", "pour", "avec",
    "dans", "des", "les", "une", "que", "qui", "est", "sur", "par", "aux",
    "mon", ".ma", "mes", "nos", "vos", "leur", "leurs", "son", "s05",
    "puis", "dois", "doit", "faut", "faire", "avoir", "etre", "être", "vais",
    "peut", "peux", "pouvez", "savoir", "connaitre", "connaître", "donner",
    "what", "how", "the", "and", "for", "with", "about", "where", "when",
    "lekki", "page", "document", "documents", "info", "information", "informations",
    "procedure", "procédure", "entreprise", "société", "societe",
}


def _scope(column, workspace_ids: list[str] | None):
    """Filtre de portée sur une colonne workspace_id (None = global)."""
    if workspace_ids is None:
        return None
    if not workspace_ids:
        # Portée vide explicite → aucune donnée.
        return column.in_([""])
    return column.in_(workspace_ids)


# ── Vue d'ensemble (KPI) ─────────────────────────────────────────────────────

async def get_overview(db: AsyncSession, workspace_ids: list[str] | None) -> dict:
    # Documents
    pages_stmt = select(func.count(Page.id))
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        pages_stmt = pages_stmt.where(cond)
    documents = int(await db.scalar(pages_stmt) or 0)

    # Pages jamais consultées
    never_stmt = select(func.count(Page.id)).where(
        or_(Page.view_count == 0, Page.view_count.is_(None))
    )
    if cond is not None:
        never_stmt = never_stmt.where(cond)
    never_viewed = int(await db.scalar(never_stmt) or 0)

    # Workspaces
    if workspace_ids is None:
        workspaces = int(await db.scalar(select(func.count(Workspace.id))) or 0)
    else:
        workspaces = len(workspace_ids)

    # Utilisateurs
    if workspace_ids is None:
        users = int(await db.scalar(select(func.count(User.id))) or 0)
    else:
        users = int(
            await db.scalar(
                select(func.count(distinct(WorkspaceMember.user_id))).where(
                    WorkspaceMember.workspace_id.in_(workspace_ids)
                )
            )
            or 0
        )

    # Questions (requêtes RAG tracées)
    q_stmt = select(func.count(RagQuery.id))
    qcond = _scope(RagQuery.workspace_id, workspace_ids)
    if qcond is not None:
        q_stmt = q_stmt.where(qcond)
    questions = int(await db.scalar(q_stmt) or 0)

    return {
        "documents": documents,
        "workspaces": workspaces,
        "users": users,
        "questions": questions,
        "never_viewed_pages": never_viewed,
    }


# ── Pages ────────────────────────────────────────────────────────────────────

async def get_top_pages(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 10
) -> list[dict]:
    stmt = (
        select(
            Page.id,
            Page.title,
            Page.category,
            Page.workspace_id,
            Page.view_count,
            Page.last_viewed_at,
        )
        .where(Page.view_count > 0)
        .order_by(Page.view_count.desc())
        .limit(limit)
    )
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "workspace_id": r.workspace_id,
            "view_count": r.view_count or 0,
            "last_viewed_at": r.last_viewed_at,
        }
        for r in rows
    ]


async def get_never_viewed_pages(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 20
) -> list[dict]:
    stmt = (
        select(Page.id, Page.title, Page.category, Page.workspace_id)
        .where(or_(Page.view_count == 0, Page.view_count.is_(None)))
        .order_by(Page.created_at.desc())
        .limit(limit)
    )
    cond = _scope(Page.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)
    rows = (await db.execute(stmt)).all()
    return [
        {"id": r.id, "title": r.title, "category": r.category, "workspace_id": r.workspace_id}
        for r in rows
    ]


# ── Utilisateurs ─────────────────────────────────────────────────────────────

async def get_top_users(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 10
) -> list[dict]:
    count_col = func.count(RagQuery.id).label("question_count")
    stmt = (
        select(User.id, User.username, User.email, User.role, count_col)
        .join(User, User.id == RagQuery.user_id)
        .group_by(User.id, User.username, User.email, User.role)
        .order_by(count_col.desc())
        .limit(limit)
    )
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "user_id": r.id,
            "username": r.username,
            "email": r.email,
            "role": r.role,
            "question_count": int(r.question_count),
        }
        for r in rows
    ]


# ── Questions ────────────────────────────────────────────────────────────────

async def get_top_questions(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 10
) -> list[dict]:
    norm = func.lower(func.trim(RagQuery.question))
    count_col = func.count(RagQuery.id).label("count")
    stmt = (
        select(
            func.max(RagQuery.question).label("question"),
            count_col,
            func.avg(cast(RagQuery.confidence, Float)).label("avg_confidence"),
        )
        .group_by(norm)
        .order_by(count_col.desc())
        .limit(limit)
    )
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "question": r.question,
            "count": int(r.count),
            "avg_confidence": round(float(r.avg_confidence), 3)
            if r.avg_confidence is not None
            else None,
        }
        for r in rows
    ]


def _failed_condition():
    return or_(
        RagQuery.had_results.is_(False),
        RagQuery.confidence < FAILED_CONFIDENCE_THRESHOLD,
        RagQuery.confidence.is_(None),
    )


async def get_failed_questions(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 20
) -> list[dict]:
    stmt = (
        select(
            RagQuery.question,
            RagQuery.confidence,
            RagQuery.provider,
            RagQuery.had_results,
            RagQuery.created_at,
        )
        .where(_failed_condition())
        .order_by(RagQuery.created_at.desc())
        .limit(limit)
    )
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "question": r.question,
            "confidence": round(float(r.confidence), 3) if r.confidence is not None else None,
            "provider": r.provider,
            "had_results": bool(r.had_results),
            "created_at": r.created_at,
        }
        for r in rows
    ]


# ── Fournisseurs IA ──────────────────────────────────────────────────────────

async def get_provider_usage(
    db: AsyncSession, workspace_ids: list[str] | None
) -> dict:
    count_col = func.count(RagQuery.id)
    stmt = (
        select(RagQuery.provider, count_col)
        .where(RagQuery.provider.isnot(None))
        .group_by(RagQuery.provider)
        .order_by(count_col.desc())
    )
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    # Capitalise pour l'affichage (gemini → Gemini).
    return {(provider or "?").capitalize(): int(count) for provider, count in rows}


# ── Série temporelle (graphique « questions par jour ») ──────────────────────

async def get_questions_per_day(
    db: AsyncSession, workspace_ids: list[str] | None, days: int = 30
) -> list[dict]:
    since = datetime.now(UTC) - timedelta(days=days)
    day = func.date(RagQuery.created_at).label("day")
    count_col = func.count(RagQuery.id).label("count")
    stmt = (
        select(day, count_col)
        .where(RagQuery.created_at >= since)
        .group_by(day)
        .order_by(day.asc())
    )
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)

    rows = (await db.execute(stmt)).all()
    return [{"date": str(r.day), "count": int(r.count)} for r in rows]


# ── Fonctionnalité différenciante : sujets manquants ─────────────────────────

def _keywords(text: str) -> list[str]:
    tokens = re.findall(r"[a-zà-ÿ0-9]+", (text or "").lower())
    return [t for t in tokens if len(t) > 3 and t not in _STOPWORDS]


async def get_missing_topics(
    db: AsyncSession, workspace_ids: list[str] | None, limit: int = 8
) -> list[dict]:
    """
    Détecte les sujets fréquemment recherchés mais non documentés.

    Algorithme :
    1. récupérer les questions sans réponse (confidence < 0.3 ou had_results=false) ;
    2. extraire les mots-clés significatifs (hors mots vides) ;
    3. regrouper les questions par mot-clé dominant ;
    4. classer les sujets par fréquence et proposer un exemple représentatif.
    """
    stmt = select(RagQuery.question).where(_failed_condition())
    cond = _scope(RagQuery.workspace_id, workspace_ids)
    if cond is not None:
        stmt = stmt.where(cond)
    stmt = stmt.limit(500)  # borne de sécurité

    questions = [q for (q,) in (await db.execute(stmt)).all() if q]
    if not questions:
        return []

    keyword_counts: Counter[str] = Counter()
    keyword_samples: dict[str, Counter[str]] = defaultdict(Counter)

    for question in questions:
        kws = set(_keywords(question))
        for kw in kws:
            keyword_counts[kw] += 1
            keyword_samples[kw][question.strip()] += 1

    topics: list[dict] = []
    for keyword, occurrences in keyword_counts.most_common(limit):
        if occurrences < 1:
            continue
        sample_question = keyword_samples[keyword].most_common(1)[0][0]
        topics.append(
            {
                "topic": keyword.capitalize(),
                "occurrences": occurrences,
                "sample_question": sample_question,
            }
        )
    return topics


# ── Dashboard Super Admin (métriques globales, sans contenu) ─────────────────

def _disk_usage_bytes() -> int:
    """Taille totale du dossier de données (base SQLite, index, etc.)."""
    data_dir = BACKEND_ROOT / "data"
    total = 0
    if data_dir.exists():
        for root, _dirs, files in os.walk(data_dir):
            for name in files:
                try:
                    total += os.path.getsize(os.path.join(root, name))
                except OSError:
                    continue
    return total


async def get_super_admin_dashboard(db: AsyncSession, days: int = 30) -> dict:
    since = datetime.now(UTC) - timedelta(days=days)

    total_workspaces = int(await db.scalar(select(func.count(Workspace.id))) or 0)
    total_users = int(await db.scalar(select(func.count(User.id))) or 0)
    total_documents = int(await db.scalar(select(func.count(Page.id))) or 0)
    total_queries = int(await db.scalar(select(func.count(RagQuery.id))) or 0)

    active_users = int(
        await db.scalar(
            select(func.count(distinct(RagQuery.user_id))).where(
                RagQuery.created_at >= since, RagQuery.user_id.isnot(None)
            )
        )
        or 0
    )

    providers = await get_provider_usage(db, None)

    # « Erreurs système récentes » = signaux d'échec récents (questions sans réponse).
    recent_errors_rows = (
        await db.execute(
            select(
                RagQuery.question,
                RagQuery.confidence,
                RagQuery.provider,
                RagQuery.had_results,
                RagQuery.created_at,
            )
            .where(_failed_condition())
            .order_by(RagQuery.created_at.desc())
            .limit(10)
        )
    ).all()
    recent_errors = [
        {
            "question": r.question,
            "confidence": round(float(r.confidence), 3) if r.confidence is not None else None,
            "provider": r.provider,
            "reason": "no_results" if not r.had_results else "low_confidence",
            "created_at": r.created_at,
        }
        for r in recent_errors_rows
    ]

    return {
        "total_workspaces": total_workspaces,
        "total_users": total_users,
        "active_users": active_users,
        "total_documents": total_documents,
        "total_queries": total_queries,
        "disk_usage_bytes": _disk_usage_bytes(),
        "providers": providers,
        "recent_errors": recent_errors,
    }
