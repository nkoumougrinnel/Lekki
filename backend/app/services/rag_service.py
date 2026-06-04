import hashlib
from datetime import UTC, datetime

import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Message
from app.models.chunk import Chunk
from app.models.page import Page
from app.models.page_relation import PageRelation
from app.services.embedding_providers import EmbeddingProviderRouter

# Mémoire conversationnelle : bornes pour éviter l'explosion des tokens.
MAX_HISTORY_EXCHANGES = 4          # 4 derniers échanges (≈ 8 messages)
MAX_CHARS_PER_MESSAGE = 600        # troncature par message
MAX_HISTORY_TOTAL_CHARS = 3000     # plafond global du contexte injecté

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n## ", "\n### ", "\n\n", "\n", " "],
)

_embedding_router = EmbeddingProviderRouter()


async def embed_page(db: AsyncSession, page_id: str) -> int | None:
    """
    Pipeline d'ingestion : découpe la page, embeddings (MiniLM local / Gemini), stockage.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        return None

    await db.execute(delete(Chunk).where(Chunk.page_id == page_id))

    texts = text_splitter.split_text(page.content)
    new_chunks = []

    for i, text in enumerate(texts):
        vector = await _embedding_router.embed_document(text, title=page.title)
        chunk_hash = hashlib.md5(text.encode()).hexdigest()

        new_chunks.append(
            Chunk(
                page_id=page_id,
                # Cloisonnement : le chunk hérite du workspace de sa page.
                workspace_id=page.workspace_id,
                chunk_index=i,
                chunk_text=text,
                chunk_hash=chunk_hash,
                token_count=len(text.split()),
                embedding=vector,
            )
        )

    db.add_all(new_chunks)
    page.is_embedded = True
    await db.commit()

    return len(new_chunks)


async def delete_page_embeddings(db: AsyncSession, page_id: str) -> bool:
    """Supprime les chunks RAG d'une page et remet is_embedded à False."""
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        return False

    await db.execute(delete(Chunk).where(Chunk.page_id == page_id))
    page.is_embedded = False
    await db.commit()
    return True


async def count_indexed_chunks(db: AsyncSession) -> int:
    """Nombre de chunks avec embedding (index RAG prêt)."""
    result = await db.execute(
        select(Chunk).where(Chunk.embedding.isnot(None))
    )
    return len(result.scalars().all())


async def get_relevant_chunks(
    db: AsyncSession,
    query: str,
    limit: int = 4,
    workspace_ids: list[str] | None = None,
):
    """
    Recherche sémantique : embedding requête + similarité cosinus.

    SÉCURITÉ (cloisonnement workspace) :
    - `workspace_ids=None`  → aucun filtre (usage interne / scripts uniquement).
    - `workspace_ids=[...]` → seuls les chunks de ces workspaces sont candidats.
    - `workspace_ids=[]`    → aucun chunk (utilisateur sans workspace).

    Ce filtre est appliqué AVANT la recherche vectorielle : un utilisateur ne
    peut jamais récupérer le contenu d'un workspace auquel il n'appartient pas,
    même via le chatbot RAG.
    """
    stmt = select(Chunk).where(Chunk.embedding.isnot(None))
    if workspace_ids is not None:
        if not workspace_ids:
            return []
        stmt = stmt.where(Chunk.workspace_id.in_(workspace_ids))

    result = await db.execute(stmt)
    chunks = result.scalars().all()
    if not chunks:
        return []

    query_vec = await _embedding_router.embed_query(query)

    scored_chunks = []
    for chunk in chunks:
        if chunk.embedding:
            chunk_vec = np.frombuffer(chunk.embedding, dtype=np.float32)
            score = np.dot(query_vec, chunk_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
            )
            scored_chunks.append((score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return scored_chunks[:limit]


def build_sources(scored_chunks: list, excerpt_len: int = 120) -> list[dict]:
    """Sources enrichies pour le front et la colonne JSON `messages.sources`."""
    by_page: dict[str, dict] = {}
    for score, chunk in scored_chunks:
        score_f = float(max(0.0, min(1.0, score)))
        existing = by_page.get(chunk.page_id)
        if existing is None or score_f > existing["score"]:
            excerpt = chunk.chunk_text.strip().replace("\n", " ")
            if len(excerpt) > excerpt_len:
                excerpt = excerpt[: excerpt_len - 1].rstrip() + "…"
            by_page[chunk.page_id] = {
                "page_id": chunk.page_id,
                "excerpt": excerpt,
                "score": round(score_f, 4),
            }
    return sorted(by_page.values(), key=lambda x: x["score"], reverse=True)


async def attach_page_titles(db: AsyncSession, sources: list[dict]) -> list[dict]:
    """Ajoute le titre de la page à chaque source (le front affiche le titre, pas l'UUID)."""
    if not sources:
        return sources
    page_ids = [s["page_id"] for s in sources]
    result = await db.execute(select(Page.id, Page.title).where(Page.id.in_(page_ids)))
    titles = {pid: title for pid, title in result.all()}
    for s in sources:
        s["title"] = titles.get(s["page_id"], "Document")
    return sources


def compute_confidence(scored_chunks: list) -> float:
    if not scored_chunks:
        return 0.0
    top = max(float(s) for s, _ in scored_chunks)
    return round(max(0.0, min(1.0, top)), 4)


# ── Mémoire conversationnelle ─────────────────────────────────────────────────

async def get_recent_history(
    db: AsyncSession,
    chat_id: str,
    max_exchanges: int = MAX_HISTORY_EXCHANGES,
) -> list[dict]:
    """
    Récupère les derniers échanges d'une conversation (du plus ancien au plus récent),
    tronqués pour limiter la taille du contexte (anti explosion de tokens).

    Un échange = 1 message utilisateur + 1 réponse assistant → on charge au plus
    `max_exchanges * 2` messages récents.
    """
    limit = max(1, max_exchanges) * 2
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    # Du plus récent au plus ancien : on garde en priorité les échanges récents.
    messages = list(result.scalars().all())  # déjà trié desc (récent → ancien)

    history: list[dict] = []
    total = 0
    for msg in messages:
        content = (msg.content or "").strip()
        if not content:
            continue
        if len(content) > MAX_CHARS_PER_MESSAGE:
            content = content[: MAX_CHARS_PER_MESSAGE - 1].rstrip() + "…"
        # Plafond global anti-explosion de tokens.
        if total + len(content) > MAX_HISTORY_TOTAL_CHARS:
            break
        total += len(content)
        history.append({"role": msg.role, "content": content})

    history.reverse()  # ordre chronologique (ancien → récent) pour le prompt
    return history


# ── Pages liées (voisins sémantiques) ─────────────────────────────────────────

async def compute_related_pages(db: AsyncSession, top_k: int = 5) -> int:
    """
    Recalcule l'intégralité du graphe de pages liées.

    Vecteur de page = moyenne (normalisée) des embeddings de ses chunks.
    On conserve, pour chaque page, ses `top_k` voisins par similarité cosinus.
    Retourne le nombre de relations créées.
    """
    result = await db.execute(
        select(Chunk.page_id, Chunk.embedding).where(Chunk.embedding.isnot(None))
    )
    rows = result.all()

    # Agrégation des embeddings par page (somme + compte → moyenne).
    sums: dict[str, np.ndarray] = {}
    counts: dict[str, int] = {}
    dims: dict[str, int] = {}
    for page_id, emb in rows:
        if not emb:
            continue
        vec = np.frombuffer(emb, dtype=np.float32).astype(np.float64)
        if page_id in sums and vec.shape[0] != dims[page_id]:
            # Dimension incohérente (changement de modèle) : on ignore ce chunk.
            continue
        if page_id not in sums:
            sums[page_id] = vec.copy()
            counts[page_id] = 1
            dims[page_id] = vec.shape[0]
        else:
            sums[page_id] += vec
            counts[page_id] += 1

    # Ne garder que la dimension la plus fréquente (robustesse multi-modèles).
    if dims:
        from collections import Counter

        common_dim = Counter(dims.values()).most_common(1)[0][0]
        page_ids = [pid for pid in sums if dims[pid] == common_dim]
    else:
        page_ids = []

    # Réinitialisation du graphe.
    await db.execute(delete(PageRelation))

    if len(page_ids) < 2:
        await db.commit()
        return 0

    matrix = np.vstack(
        [
            (lambda m: m / (np.linalg.norm(m) or 1.0))(sums[pid] / counts[pid])
            for pid in page_ids
        ]
    )
    sims = matrix @ matrix.T  # cosinus (vecteurs normalisés)

    now = datetime.now(UTC)
    relations: list[PageRelation] = []
    for i, pid in enumerate(page_ids):
        order = np.argsort(-sims[i])
        added = 0
        for j in order:
            if int(j) == i:
                continue
            relations.append(
                PageRelation(
                    page_id=pid,
                    related_id=page_ids[int(j)],
                    score=round(float(sims[i, int(j)]), 6),
                    computed_at=now,
                )
            )
            added += 1
            if added >= top_k:
                break

    db.add_all(relations)
    await db.commit()
    return len(relations)


async def get_related_pages(
    db: AsyncSession,
    page_id: str,
    accessible_workspace_ids: list[str],
    limit: int = 5,
) -> list[dict]:
    """
    Voisins sémantiques d'une page, restreints aux workspaces accessibles.
    Retourne [{ page_id, title, category, score }] trié par score décroissant.
    """
    result = await db.execute(
        select(PageRelation.related_id, PageRelation.score, Page.title, Page.category, Page.workspace_id)
        .join(Page, Page.id == PageRelation.related_id)
        .where(PageRelation.page_id == page_id)
        .order_by(PageRelation.score.desc())
    )

    related: list[dict] = []
    for related_id, score, title, category, workspace_id in result.all():
        # SÉCURITÉ : ne jamais suggérer une page d'un workspace inaccessible.
        if workspace_id is not None and workspace_id not in accessible_workspace_ids:
            continue
        related.append(
            {
                "page_id": related_id,
                "title": title,
                "category": category,
                "score": round(float(score), 4),
            }
        )
        if len(related) >= limit:
            break
    return related
