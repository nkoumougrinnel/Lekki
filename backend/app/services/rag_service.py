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
    Pipeline d'ingestion : découpe la page, embeddings (bascule Gemini), stockage.
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


async def get_relevant_chunks(db: AsyncSession, query: str, limit: int = 4):
    """Recherche sémantique : embedding requête + similarité cosinus."""
    query_vec = await _embedding_router.embed_query(query)

    result = await db.execute(select(Chunk))
    chunks = result.scalars().all()

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
