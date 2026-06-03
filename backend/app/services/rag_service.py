import hashlib
import numpy as np
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.page import Page
from app.models.chunk import Chunk
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n## ", "\n### ", "\n\n", "\n", " "]
)

async def embed_page(db: AsyncSession, page_id: str) -> int | None:
    """
    Pipeline d'ingestion : Découpe la page, génère les embeddings et les stocke.
    """
    # 1. Récupération de la page
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        return None

    # 2. Nettoyage des anciens segments (évite les doublons sur update)
    await db.execute(delete(Chunk).where(Chunk.page_id == page_id))

    # 3. Découpage du texte
    texts = text_splitter.split_text(page.content)
    
    new_chunks = []
    for i, text in enumerate(texts):
        # 4. Génération de l'embedding
        response = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", title=page.title)
        )
        # On convertit la liste de floats en bytes (float32) pour le stockage SQLite BLOB
        vector = np.array(response.embeddings[0].values, dtype=np.float32).tobytes()
        
        # Hash pour vérifier l'intégrité si besoin
        chunk_hash = hashlib.md5(text.encode()).hexdigest()
        
        new_chunks.append(Chunk(
            page_id=page_id,
            chunk_index=i,
            chunk_text=text,
            chunk_hash=chunk_hash,
            token_count=len(text.split()),
            embedding=vector
        ))
    
    # 5. Persistance
    db.add_all(new_chunks)
    page.is_embedded = True
    await db.commit()
    
    return len(new_chunks)

async def get_relevant_chunks(db: AsyncSession, query: str, limit: int = 4):
    """
    Recherche sémantique : récupère les chunks et calcule la similarité cosinus.
    """
    # 1. Embedding de la question
    response = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
    )
    query_vec = np.array(response.embeddings[0].values, dtype=np.float32)

    # 2. Récupération des chunks
    result = await db.execute(select(Chunk))
    chunks = result.scalars().all()
    
    scored_chunks = []
    for chunk in chunks:
        if chunk.embedding:
            chunk_vec = np.frombuffer(chunk.embedding, dtype=np.float32)
            score = np.dot(query_vec, chunk_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec))
            scored_chunks.append((score, chunk))
    
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return scored_chunks[:limit]