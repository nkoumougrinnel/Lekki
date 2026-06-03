"""
Données de démo pour le développement local (idempotent).

Usage (depuis backend/) :
  alembic upgrade head
  python -m scripts.seed
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import bcrypt
from sqlalchemy import select

# backend/ sur le path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal, run_migrations
from app.models.chunk import Chunk
from app.models.page import Page
from app.models.user import User

# IDs fixes pour tests API / Swagger
ADMIN_ID = "a0000000-0000-4000-8000-000000000001"
EDITOR_ID = "a0000000-0000-4000-8000-000000000002"
READER_ID = "a0000000-0000-4000-8000-000000000003"

PAGE_RH_ID = "b0000000-0000-4000-8000-000000000001"
PAGE_TECH_ID = "b0000000-0000-4000-8000-000000000002"
PAGE_GUIDE_ID = "b0000000-0000-4000-8000-000000000003"

DEFAULT_PASSWORD = os.getenv("SEED_PASSWORD", "lekki123")


async def seed() -> None:
    run_migrations()

    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User.id).limit(1))
        if existing.scalar_one_or_none():
            print("Seed déjà appliqué — aucune modification.")
            return
        
        # Utilisation directe de bcrypt pour éviter le bug de passlib sur Python 3.12
        password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

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

        pages = [
            Page(
                id=PAGE_RH_ID,
                title="Politique de télétravail",
                content="## Télétravail\n\nJusqu'à 2 jours par semaine sur accord manager.",
                category="rh",
                status="published",
                creator_id=EDITOR_ID,
            ),
            Page(
                id=PAGE_TECH_ID,
                title="Guide déploiement Docker",
                content="## Docker\n\n`docker compose up -d` depuis la racine du projet.",
                category="technique",
                status="published",
                creator_id=ADMIN_ID,
            ),
            Page(
                id=PAGE_GUIDE_ID,
                title="Onboarding nouvel arrivant",
                content="## Bienvenue\n\n1. Compte LDAP\n2. Accès wiki\n3. Premier chat RAG",
                category="guides",
                status="published",
                creator_id=ADMIN_ID,
            ),
        ]
        session.add_all(pages)

        chunks = [
            Chunk(
                page_id=PAGE_TECH_ID,
                chunk_index=0,
                chunk_text="docker compose up -d depuis la racine du projet.",
                chunk_hash="chunk-tech-0",
                token_count=12,
            ),
        ]
        session.add_all(chunks)

        await session.commit()

    print("Seed terminé.")
    print(f"  Mot de passe (tous les comptes) : {DEFAULT_PASSWORD}")
    print("  admin  →", ADMIN_ID, "| admin@lekki.local")
    print("  editor →", EDITOR_ID, "| editor@lekki.local")
    print("  reader →", READER_ID, "| reader@lekki.local")
    print("  Pages  →", PAGE_RH_ID, PAGE_TECH_ID, PAGE_GUIDE_ID)
    print("  POST /api/v1/pages?creator_id=", EDITOR_ID)


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
