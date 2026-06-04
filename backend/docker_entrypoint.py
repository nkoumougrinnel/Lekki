"""Point d'entrée Docker : migrations, seed, index RAG optionnel, uvicorn."""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys


async def _needs_rag_index() -> bool:
    from app.database import AsyncSessionLocal, run_migrations
    from app.services import rag_service

    run_migrations()
    async with AsyncSessionLocal() as session:
        return await rag_service.count_indexed_chunks(session) == 0


def _maybe_index_rag() -> None:
    try:
        from app.services.embedding_providers import EmbeddingProviderRouter

        router = EmbeddingProviderRouter()
        if not router.has_configured_provider():
            print("Aucun provider embedding configuré — index RAG ignoré.")
            return
        if not asyncio.run(_needs_rag_index()):
            return
        print("Indexation RAG en arrière-plan…")
        subprocess.Popen([sys.executable, "-m", "scripts.index_rag"])
    except Exception as exc:
        print(f"index_rag ignoré : {exc}")


def main() -> None:
    subprocess.run([sys.executable, "-m", "scripts.seed"], check=False)
    _maybe_index_rag()
    os.execvp(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
    )


if __name__ == "__main__":
    main()
