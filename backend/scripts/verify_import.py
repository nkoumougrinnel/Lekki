"""
Vérifie le critère d'acceptation de l'import documentaire :
un PDF importé devient immédiatement consultable par le RAG, sans script manuel.

Usage (depuis backend/) : python -m scripts.verify_import
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal, run_migrations
from app.models.import_job import Import
from app.models.page import Page
from app.models.chunk import Chunk
from app.services import import_service, rag_service
from scripts.seed import ADMIN_ID, WS_TECH_ID

UNIQUE_PHRASE = (
    "Le protocole secret Zephyr-7 impose une rotation des cles de chiffrement "
    "toutes les quarante-deux heures pour le cluster Lekki."
)


def build_minimal_pdf(body_text: str) -> bytes:
    """Construit un PDF 1.4 minimal et valide (xref calculé) contenant `body_text`."""
    # Échapper les caractères spéciaux PDF.
    safe = body_text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    content = f"BT /F1 14 Tf 72 720 Td ({safe}) Tj ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = "%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf.encode("latin-1")))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n"

    xref_pos = len(pdf.encode("latin-1"))
    n = len(objects) + 1
    pdf += f"xref\n0 {n}\n0000000000 65535 f \n"
    for off in offsets:
        pdf += f"{off:010d} 00000 n \n"
    pdf += (
        f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF"
    )
    return pdf.encode("latin-1")


async def main() -> None:
    run_migrations()

    pdf_bytes = build_minimal_pdf(UNIQUE_PHRASE)

    # 1) Extraction PDF
    extracted = import_service.extract_text("protocole_zephyr.pdf", pdf_bytes)
    assert "Zephyr-7" in extracted, f"Extraction PDF KO : {extracted!r}"
    print("1) Extraction PDF : OK")

    # 2) Création d'une tâche d'import puis exécution du pipeline.
    async with AsyncSessionLocal() as session:
        job = Import(
            user_id=ADMIN_ID,
            workspace_id=WS_TECH_ID,
            source_type="pdf",
            source_name="protocole_zephyr.pdf",
            status="pending",
            total_files=1,
            processed_files=0,
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        job_id = job.id

    await import_service.process_import(
        job_id, [("protocole_zephyr.pdf", pdf_bytes)], ADMIN_ID, WS_TECH_ID
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(Import, job_id)
        print(f"2) Import : status={job.status} processed={job.processed_files}/{job.total_files}")
        assert job.status == "completed", f"Statut inattendu : {job.status} / {job.error_log}"

        # 3) Page créée + chunks embeddés dans le workspace Technique.
        result = await session.execute(
            select(Page).where(Page.workspace_id == WS_TECH_ID, Page.title == "protocole zephyr")
        )
        page = result.scalar_one_or_none()
        assert page is not None, "Page non créée"
        assert page.is_embedded, "Page non vectorisée"
        print(f"3) Page créée et vectorisée : {page.id}")

        # 4) Consultable par le RAG (sans script manuel).
        scored = await rag_service.get_relevant_chunks(
            session,
            "Tous les combien rotation des cles de chiffrement protocole Zephyr ?",
            workspace_ids=[WS_TECH_ID],
        )
        found = any(c.page_id == page.id for _, c in scored)
        print(f"4) RAG : {len(scored)} chunks, page importée trouvée = {found}")
        assert found, "La page importée n'est pas retrouvée par le RAG !"

        # Nettoyage.
        await session.execute(delete(Chunk).where(Chunk.page_id == page.id))
        await session.execute(delete(Page).where(Page.id == page.id))
        await session.execute(delete(Import).where(Import.id == job_id))
        await session.commit()

    print("\nOK — Un PDF importé est immédiatement consultable par le RAG (aucun script manuel).")


if __name__ == "__main__":
    asyncio.run(main())
