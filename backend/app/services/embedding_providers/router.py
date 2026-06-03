"""Bascule des embeddings — Gemini en premier (extensible)."""

import logging

from app.config import settings
from app.services.embedding_providers.base import (
    AllEmbeddingProvidersFailedError,
    BaseEmbeddingProvider,
    QuotaExhaustedError,
    is_quota_or_rate_limit,
)
from app.services.embedding_providers.gemini import GeminiEmbeddingProvider

logger = logging.getLogger(__name__)


class EmbeddingProviderRouter:
    def __init__(self) -> None:
        cooldown = settings.LLM_PROVIDER_COOLDOWN_MINUTES
        registry: dict[str, BaseEmbeddingProvider] = {
            "gemini": GeminiEmbeddingProvider(cooldown),
        }
        order = [
            name.strip().lower()
            for name in settings.EMBEDDING_PROVIDER_ORDER.split(",")
            if name.strip()
        ]
        self.providers = registry
        self.order = [name for name in order if name in registry]

    async def embed_document(self, text: str, title: str | None = None) -> bytes:
        errors: list[tuple[str, str]] = []
        for name in self.order:
            provider = self.providers[name]
            if not provider.is_configured():
                continue
            if provider.is_in_cooldown():
                errors.append((name, "cooldown actif"))
                continue
            try:
                return await provider.embed_document(text, title)
            except QuotaExhaustedError as exc:
                provider.mark_unavailable()
                errors.append((name, str(exc)))
            except Exception as exc:
                if is_quota_or_rate_limit(exc):
                    provider.mark_unavailable()
                errors.append((name, str(exc)))
        raise AllEmbeddingProvidersFailedError(errors)

    async def embed_query(self, text: str) -> "np.ndarray":
        import numpy as np

        errors: list[tuple[str, str]] = []
        for name in self.order:
            provider = self.providers[name]
            if not provider.is_configured():
                continue
            if provider.is_in_cooldown():
                errors.append((name, "cooldown actif"))
                continue
            try:
                return await provider.embed_query(text)
            except QuotaExhaustedError as exc:
                provider.mark_unavailable()
                errors.append((name, str(exc)))
            except Exception as exc:
                if is_quota_or_rate_limit(exc):
                    provider.mark_unavailable()
                errors.append((name, str(exc)))
        raise AllEmbeddingProvidersFailedError(errors)
