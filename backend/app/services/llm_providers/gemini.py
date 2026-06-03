"""Fournisseur Google Gemini (structure d'origine conservée)."""

import asyncio

from google import genai

from app.config import settings
from app.services.llm_providers.base import BaseLLMProvider, QuotaExhaustedError, is_quota_or_rate_limit


class GeminiLLMProvider(BaseLLMProvider):
    name = "gemini"

    def __init__(self, cooldown_minutes: int) -> None:
        super().__init__(cooldown_minutes)
        self._client: genai.Client | None = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY.strip())

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
