import os
import hashlib
import numpy as np
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
import google.generativeai as genai
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.page import Page
from app.models.chunk import Chunk

# Configuration de Gemini pour les embeddings
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

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
        response = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title=page.title
        )
        # On convertit la liste de floats en bytes (float32) pour le stockage SQLite BLOB
        vector = np.array(response['embedding'], dtype=np.float32).tobytes()
        
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