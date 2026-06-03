"""Embeddings Google Gemini (structure d'origine)."""

import asyncio

import numpy as np
from google import genai
from google.genai import types

from app.config import settings
from app.services.embedding_providers.base import BaseEmbeddingProvider
from app.services.llm_providers.base import QuotaExhaustedError, is_quota_or_rate_limit


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
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

    def _embed_document_sync(self, text: str, title: str | None) -> bytes:
        response = self.client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                title=title or "",
            ),
        )
        vector = np.array(response.embeddings[0].values, dtype=np.float32)
        return vector.tobytes()

    def _embed_query_sync(self, text: str) -> np.ndarray:
        response = self.client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        return np.array(response.embeddings[0].values, dtype=np.float32)

    async def _wrap(self, fn, *args):
        try:
            return await asyncio.to_thread(fn, *args)
        except Exception as exc:
            if is_quota_or_rate_limit(exc):
                raise QuotaExhaustedError(str(exc)) from exc
            raise

    async def embed_document(self, text: str, title: str | None = None) -> bytes:
        return await self._wrap(self._embed_document_sync, text, title)

    async def embed_query(self, text: str) -> np.ndarray:
        return await self._wrap(self._embed_query_sync, text)
