"""
Lekki Wiki — SummaryService

Résumé automatique d'une page :
  contenu Markdown → LLM (TL;DR 5–8 lignes) → stockage (summary + summary_at).

Si un résumé existe déjà, il est renvoyé tel quel (sauf demande de régénération).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.page import Page
from app.services import llm_service

_llm = llm_service.LLMService()


async def get_or_create_summary(
    db: AsyncSession,
    page: Page,
    force: bool = False,
) -> Tuple[Page, bool, str | None]:
    """
    Retourne (page, cached, provider).

    - `cached=True`  : un résumé existait déjà et a été renvoyé tel quel.
    - `cached=False` : un nouveau résumé a été généré par le LLM (`provider` renseigné).
    """
    if page.summary and not force:
        return page, True, None

    summary, provider = await _llm.summarize(page.title, page.content)

    page.summary = summary
    page.summary_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(page)

    return page, False, provider
