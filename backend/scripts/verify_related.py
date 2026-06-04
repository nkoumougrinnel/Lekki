"""Applique la migration 006, calcule les pages liées et vérifie le résultat + le cloisonnement."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal, run_migrations
from app.models.page import Page
from app.services import rag_service
from scripts.seed import WS_RH_ID, WS_TECH_ID


async def main() -> None:
    run_migrations()

    async with AsyncSessionLocal() as db:
        n = await rag_service.compute_related_pages(db)
        print(f"Relations calculées : {n}")

        # Prendre une page RH et vérifier ses voisins.
        rh_page = (
            await db.execute(__import__("sqlalchemy").select(Page).where(Page.workspace_id == WS_RH_ID).limit(1))
        ).scalar_one_or_none()
        assert rh_page, "Pas de page RH (lancez seed + index_rag)."

        # Utilisateur RH only : ne doit jamais voir une page Technique.
        related_rh = await rag_service.get_related_pages(db, rh_page.id, [WS_RH_ID], limit=5)
        print(f"\nVoisins de « {rh_page.title} » (vue RH only) : {len(related_rh)}")
        for r in related_rh:
            print(f"  - {r['title']} [{r['category']}] score={r['score']}")
        # Vérifier qu'aucune page Technique n'est suggérée.
        tech_ids = {
            p.id
            for p in (
                await db.execute(__import__("sqlalchemy").select(Page).where(Page.workspace_id == WS_TECH_ID))
            ).scalars().all()
        }
        leak = [r for r in related_rh if r["page_id"] in tech_ids]
        assert not leak, f"FUITE : pages Technique suggérées à un utilisateur RH : {leak}"

        # Admin (accès aux deux) : voit potentiellement des voisins des deux workspaces.
        related_admin = await rag_service.get_related_pages(
            db, rh_page.id, [WS_RH_ID, WS_TECH_ID], limit=5
        )
        print(f"\nVoisins de « {rh_page.title} » (vue admin) : {len(related_admin)}")
        for r in related_admin:
            print(f"  - {r['title']} [{r['category']}] score={r['score']}")

        assert 1 <= len(related_admin) <= 5, "Le nombre de voisins doit être borné (1..5)."

    print("\nOK — Pages liées calculées et cloisonnées par workspace.")


if __name__ == "__main__":
    asyncio.run(main())
