import hashlib

import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.page import Page
from app.services.embedding_providers import EmbeddingProviderRouter

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


async def get_relevant_chunks(db: AsyncSession, query: str, limit: int = 4):
    """Recherche sémantique : embedding requête + similarité cosinus."""
    result = await db.execute(
        select(Chunk).where(Chunk.embedding.isnot(None))
    )
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


def compute_confidence(scored_chunks: list) -> float:
    if not scored_chunks:
        return 0.0
    top = max(float(s) for s, _ in scored_chunks)
    return round(max(0.0, min(1.0, top)), 4)
