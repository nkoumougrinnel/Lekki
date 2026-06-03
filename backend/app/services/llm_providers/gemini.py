"""Fournisseur Google Gemini (import paresseux du SDK google-genai)."""

import asyncio
from typing import Any

from app.config import settings
from app.services.llm_providers.base import BaseLLMProvider, QuotaExhaustedError, is_quota_or_rate_limit


def _import_genai() -> Any:
    """Importe le SDK google-genai à la demande (évite de bloquer le démarrage)."""
    from google import genai

    return genai


class GeminiLLMProvider(BaseLLMProvider):
    name = "gemini"

    def __init__(self, cooldown_minutes: int) -> None:
        super().__init__(cooldown_minutes)
        self._client: Any = None

    @property
    def client(self) -> Any:
        if self._client is None:
            genai = _import_genai()
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def is_configured(self) -> bool:
        if not settings.GEMINI_API_KEY.strip():
            return False
        try:
            _import_genai()
        except ImportError:
            return False
        return True

    def _generate_sync(self, prompt: str) -> str:
        response = self.client.models.generate_content(
            model=settings.GEMINI_LLM_MODEL,
            contents=prompt,
        )
        return response.text

    async def generate(self, prompt: str) -> str:
        try:
            return await asyncio.to_thread(self._generate_sync, prompt)
        except Exception as exc:
            if is_quota_or_rate_limit(exc):
                raise QuotaExhaustedError(str(exc)) from exc
            raise
