"""Bascule des embeddings — MiniLM local, puis Gemini (fallback distant)."""

import logging

from app.config import settings
from app.services.embedding_providers.base import (
    AllEmbeddingProvidersFailedError,
    BaseEmbeddingProvider,
    QuotaExhaustedError,
    is_quota_or_rate_limit,
)
from app.services.embedding_providers.gemini import GeminiEmbeddingProvider
from app.services.embedding_providers.minilm import MiniLMEmbeddingProvider

logger = logging.getLogger(__name__)


class EmbeddingProviderRouter:
    def __init__(self) -> None:
        cooldown = settings.LLM_PROVIDER_COOLDOWN_MINUTES
        registry: dict[str, BaseEmbeddingProvider] = {
            "minilm": MiniLMEmbeddingProvider(cooldown),
            "gemini": GeminiEmbeddingProvider(cooldown),
        }
        order = [
            name.strip().lower()
            for name in settings.EMBEDDING_PROVIDER_ORDER.split(",")
            if name.strip()
        ]
        self.providers = registry
        self.order = [name for name in order if name in registry]

    def get_status(self) -> list[dict]:
        status = []
        for name in self.order:
            provider = self.providers[name]
            status.append({
                "name": name,
                "configured": provider.is_configured(),
                "in_cooldown": provider.is_in_cooldown(),
            })
        return status

    def has_configured_provider(self) -> bool:
        return any(self.providers[name].is_configured() for name in self.order)

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
                logger.warning("Embedding %s échoué — bascule suivante", name)
        raise AllEmbeddingProvidersFailedError(errors)

    async def embed_query(self, text: str) -> "np.ndarray":
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
                logger.warning("Embedding query %s échoué — bascule suivante", name)
        raise AllEmbeddingProvidersFailedError(errors)
