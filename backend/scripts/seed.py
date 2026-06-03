"""
Données de démo pour le développement local (idempotent).

Usage (depuis backend/) :
  copy .env.example .env   # puis GEMINI_API_KEY=
  python -m scripts.seed
  python -m scripts.index_rag   # indexation RAG (nécessite GEMINI_API_KEY)
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import bcrypt
from sqlalchemy import select, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal, run_migrations
from app.models.page import Page
from app.models.user import User
from scripts.seed_pages import PME_PAGES

ADMIN_ID = "a0000000-0000-4000-8000-000000000001"
EDITOR_ID = "a0000000-0000-4000-8000-000000000002"
READER_ID = "a0000000-0000-4000-8000-000000000003"

DEFAULT_PASSWORD = os.getenv("SEED_PASSWORD", "lekki123")


async def seed() -> None:
    run_migrations()

    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User.id).limit(1))
        if existing.scalar_one_or_none():
            print("Seed déjà appliqué — aucune modification.")
            print("  Pour réindexer le RAG : python -m scripts.index_rag")
            return

        password_hash = bcrypt.hashpw(
            DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        users = [
            User(
                id=ADMIN_ID,
                email="admin@lekki.local",
                username="admin",
                password_hash=password_hash,
                role="admin",
            ),
            User(
                id=EDITOR_ID,
                email="editor@lekki.local",
                username="editor",
                password_hash=password_hash,
                role="editor",
            ),
            User(
                id=READER_ID,
                email="reader@lekki.local",
                username="reader",
                password_hash=password_hash,
                role="reader",
            ),
        ]
        session.add_all(users)

        pages = []
        for data in PME_PAGES:
            creator = EDITOR_ID if data["category"] == "commercial" else ADMIN_ID
            pages.append(
                Page(
                    id=data["id"],
                    title=data["title"],
                    content=data["content"],
                    category=data["category"],
                    status="published",
                    creator_id=creator,
                )
            )
        session.add_all(pages)
        await session.commit()

        for page in pages:
            await session.execute(
                text(
                    "INSERT INTO pages_fts (page_id, title, content) "
                    "VALUES (:id, :title, :content)"
                ),
                {"id": page.id, "title": page.title, "content": page.content},
            )
        await session.commit()

    print("Seed terminé.")
    print(f"  Mot de passe (tous les comptes) : {DEFAULT_PASSWORD}")
    print("  admin@lekki.local | editor@lekki.local | reader@lekki.local")
    print(f"  {len(PME_PAGES)} pages wiki (5 use cases PME + 2 complémentaires)")
    print("  Étape suivante : python -m scripts.index_rag")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
