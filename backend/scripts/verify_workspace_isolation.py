"""Vérifie le cloisonnement RAG par workspace (critère d'acceptation)."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services import rag_service, workspace_service
from scripts.seed import WS_RH_ID, WS_TECH_ID, READER_ID, ADMIN_ID

TECH_QUESTION = "Quelle est l'architecture technique et la stack utilisée ?"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        reader = await db.get(User, READER_ID)
        admin = await db.get(User, ADMIN_ID)

        reader_ws = await workspace_service.get_accessible_workspace_ids(db, reader)
        admin_ws = await workspace_service.get_accessible_workspace_ids(db, admin)
        print(f"Workspaces reader : {sorted(reader_ws)}")
        print(f"Workspaces admin  : {sorted(admin_ws)}")
        print(f"(RH={WS_RH_ID[-4:]}  TECH={WS_TECH_ID[-4:]})\n")

        # 1) Reader (RH only) pose une question Technique -> AUCUN chunk technique.
        reader_chunks = await rag_service.get_relevant_chunks(
            db, TECH_QUESTION, workspace_ids=reader_ws
        )
        reader_ws_hit = {c.workspace_id for _, c in reader_chunks}
        print(f"Reader -> {len(reader_chunks)} chunks, workspaces touchés : {reader_ws_hit}")
        assert WS_TECH_ID not in reader_ws_hit, "FUITE : le reader a atteint le workspace Technique !"

        # 2) Admin pose la même question -> retrouve bien le contenu Technique.
        admin_chunks = await rag_service.get_relevant_chunks(
            db, TECH_QUESTION, workspace_ids=admin_ws
        )
        admin_ws_hit = {c.workspace_id for _, c in admin_chunks}
        print(f"Admin  -> {len(admin_chunks)} chunks, workspaces touchés : {admin_ws_hit}")
        assert WS_TECH_ID in admin_ws_hit, "L'admin devrait voir le workspace Technique."

        print("\nOK — Cloisonnement RAG validé : le reader RH n'accède jamais au Technique.")


if __name__ == "__main__":
    asyncio.run(main())
