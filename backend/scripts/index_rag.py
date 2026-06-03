"""
Indexation RAG de toutes les pages (chunking + embeddings Gemini).

Usage (depuis backend/, après seed) :
  python -m scripts.index_rag
  python -m scripts.index_rag --page-id b0000000-0000-4000-8000-000000000001
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import AsyncSessionLocal, run_migrations
from app.models.page import Page
from app.services import rag_service
from app.services.embedding_providers.gemini import GeminiEmbeddingProvider


async def index_all(page_id: str | None = None) -> None:
    run_migrations()

    provider = GeminiEmbeddingProvider(settings.LLM_PROVIDER_COOLDOWN_MINUTES)
    if not provider.is_configured():
        print("ERREUR : GEMINI_API_KEY manquante dans .env")
        print("  → https://aistudio.google.com/apikey")
        sys.exit(1)

    async with AsyncSessionLocal() as session:
        query = select(Page)
        if page_id:
            query = query.where(Page.id == page_id)
        result = await session.execute(query)
        pages = result.scalars().all()

        if not pages:
            print("Aucune page à indexer.")
            return

        total_chunks = 0
        for page in pages:
            try:
                n = await rag_service.embed_page(session, page.id)
                total_chunks += n or 0
                print(f"  OK  {page.title[:50]:<50} → {n} chunks")
            except Exception as exc:
                print(f"  ERR {page.title[:50]:<50} → {exc}")

        print(f"\nIndexation terminée : {total_chunks} chunks au total.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Indexation RAG Lekki Wiki")
    parser.add_argument("--page-id", help="Indexer une seule page (UUID)")
    args = parser.parse_args()
    asyncio.run(index_all(args.page_id))


if __name__ == "__main__":
    main()
