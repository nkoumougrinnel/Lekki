"""Point d'entrée Docker : seed, indexation RAG initiale, puis uvicorn."""

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


def main() -> None:
    subprocess.run([sys.executable, "-m", "scripts.seed"], check=False)

    if os.getenv("GEMINI_API_KEY"):
        try:
            if asyncio.run(_needs_rag_index()):
                print("Indexation RAG initiale…")
                subprocess.run([sys.executable, "-m", "scripts.index_rag"], check=False)
        except Exception as exc:
            print(f"index_rag ignoré : {exc}")

    os.execvp(
        "uvicorn",
        ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    )


if __name__ == "__main__":
    main()
