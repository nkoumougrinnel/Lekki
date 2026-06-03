"""
Données de démo pour le développement local (idempotent).

Usage (depuis backend/) :
  copy .env.example .env
  python -m scripts.seed
  python -m scripts.index_rag
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import bcrypt
from sqlalchemy import func, select, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal, run_migrations
from app.models.page import Page
from app.models.user import User
from scripts.seed_pages import PME_PAGES

ADMIN_ID = "a0000000-0000-4000-8000-000000000001"
EDITOR_ID = "a0000000-0000-4000-8000-000000000002"
READER_ID = "a0000000-0000-4000-8000-000000000003"

DEFAULT_PASSWORD = os.getenv("SEED_PASSWORD", "lekki123")


async def _index_pages_fts(session, pages: list[Page]) -> None:
    for page in pages:
        await session.execute(
            text(
                "INSERT INTO pages_fts (page_id, title, content) "
                "VALUES (:id, :title, :content)"
            ),
            {"id": page.id, "title": page.title, "content": page.content},
        )


async def seed() -> None:
    run_migrations()

    async with AsyncSessionLocal() as session:
        user_count = await session.scalar(select(func.count()).select_from(User))
        page_count = await session.scalar(select(func.count()).select_from(Page))

        if user_count and page_count:
            print("Seed déjà appliqué — utilisateurs et pages présents.")
            print("  Pour réindexer le RAG : python -m scripts.index_rag")
            return

        password_hash = bcrypt.hashpw(
            DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        if not user_count:
            session.add_all([
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
            ])
            await session.flush()
            print("  + 3 comptes démo créés")

        if not page_count:
            admin = await session.get(User, ADMIN_ID)
            editor = await session.get(User, EDITOR_ID)
            fallback = admin or editor or (
                await session.execute(select(User).limit(1))
            ).scalar_one_or_none()
            if not fallback:
                print("ERREUR : impossible de créer les pages sans utilisateur.")
                return

            admin_id = admin.id if admin else fallback.id
            editor_id = editor.id if editor else fallback.id

            pages = []
            for data in PME_PAGES:
                creator = editor_id if data["category"] == "commercial" else admin_id
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
            await _index_pages_fts(session, pages)
            await session.commit()
            print(f"  + {len(PME_PAGES)} pages wiki créées")
        else:
            await session.commit()

    print("\nSeed terminé.")
    if not user_count:
        print(f"  Mot de passe (comptes démo) : {DEFAULT_PASSWORD}")
        print("  admin@lekki.local | editor@lekki.local | reader@lekki.local")
    print("  Étape suivante : python -m scripts.index_rag")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
