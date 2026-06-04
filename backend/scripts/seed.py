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
from app.models.workspace import Workspace, WorkspaceMember
from scripts.seed_pages import PME_PAGES

ADMIN_ID = "a0000000-0000-4000-8000-000000000001"
EDITOR_ID = "a0000000-0000-4000-8000-000000000002"
READER_ID = "a0000000-0000-4000-8000-000000000003"

# Workspaces de démo (IDs fixes pour tests / cloisonnement RAG).
WS_RH_ID = "c0000000-0000-4000-8000-000000000001"
WS_TECH_ID = "c0000000-0000-4000-8000-000000000002"

DEFAULT_PASSWORD = os.getenv("SEED_PASSWORD", "lekki123")


def workspace_for_category(category: str) -> str:
    """Affecte chaque page à un workspace selon sa catégorie."""
    return WS_TECH_ID if category == "technique" else WS_RH_ID


async def _refresh_page_fts(session, page: Page) -> None:
    """(Re)synchronise l'entrée FTS d'une page (delete + insert)."""
    await session.execute(
        text("DELETE FROM pages_fts WHERE page_id = :id"),
        {"id": page.id},
    )
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

        # --- Workspaces de démo (RH + Technique) ----------------------------
        ws_specs = [
            (WS_RH_ID, "Ressources Humaines", "Pages RH, guides et commercial."),
            (WS_TECH_ID, "Technique", "Documentation technique et infrastructure."),
        ]
        for ws_id, ws_name, ws_desc in ws_specs:
            workspace = await session.get(Workspace, ws_id)
            if workspace is None:
                session.add(
                    Workspace(
                        id=ws_id,
                        name=ws_name,
                        description=ws_desc,
                        owner_id=admin_id,
                    )
                )
        await session.flush()

        # Membres : admin partout, editor + reader uniquement sur RH.
        # → un reader « RH only » ne doit jamais atteindre le workspace Technique.
        membership_specs = [
            (WS_RH_ID, admin_id, "owner"),
            (WS_TECH_ID, admin_id, "owner"),
            (WS_RH_ID, editor_id, "admin"),
            (WS_RH_ID, READER_ID, "member"),
        ]
        for ws_id, uid, role in membership_specs:
            exists = await session.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == ws_id,
                    WorkspaceMember.user_id == uid,
                )
            )
            if exists.scalar_one_or_none() is None:
                session.add(
                    WorkspaceMember(workspace_id=ws_id, user_id=uid, role=role)
                )
        await session.flush()
        print("  workspaces : RH + Technique (membres affectés)")

        # Upsert des pages de démo (par ID fixe) : crée ou rafraîchit le contenu.
        created = 0
        updated = 0
        for data in PME_PAGES:
            creator = editor_id if data["category"] == "commercial" else admin_id
            ws_id = workspace_for_category(data["category"])
            page = await session.get(Page, data["id"])
            if page is None:
                page = Page(
                    id=data["id"],
                    title=data["title"],
                    content=data["content"],
                    category=data["category"],
                    status="published",
                    creator_id=creator,
                    workspace_id=ws_id,
                )
                session.add(page)
                created += 1
            else:
                changed = (
                    page.title != data["title"]
                    or page.content != data["content"]
                    or page.category != data["category"]
                    or page.workspace_id != ws_id
                )
                page.title = data["title"]
                page.content = data["content"]
                page.category = data["category"]
                page.workspace_id = ws_id
                if changed:
                    # Le contenu/cloisonnement a évolué : forcer une réindexation RAG.
                    page.is_embedded = False
                    updated += 1
            await session.flush()
            await _refresh_page_fts(session, page)

        await session.commit()
        print(f"  pages wiki : {created} créées, {updated} mises à jour")

    print("\nSeed terminé.")
    if not user_count:
        print(f"  Mot de passe (comptes démo) : {DEFAULT_PASSWORD}")
        print("  admin@lekki.local | editor@lekki.local | reader@lekki.local")
    print("  Étape suivante : python -m scripts.index_rag")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
