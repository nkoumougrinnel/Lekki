"""Base pour les fournisseurs d'embeddings (recherche sémantique RAG)."""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

import numpy as np

from app.services.llm_providers.base import QuotaExhaustedError, is_quota_or_rate_limit

__all__ = ["QuotaExhaustedError", "is_quota_or_rate_limit", "AllEmbeddingProvidersFailedError", "BaseEmbeddingProvider"]


class AllEmbeddingProvidersFailedError(Exception):
    def __init__(self, errors: list[tuple[str, str]]):
        self.errors = errors
        details = "; ".join(f"{name}: {msg}" for name, msg in errors)
        super().__init__(f"Tous les fournisseurs d'embedding ont échoué — {details}")


class BaseEmbeddingProvider(ABC):
    name: str

    def __init__(self, cooldown_minutes: int) -> None:
        self._cooldown_minutes = cooldown_minutes
        self._cooldown_until: datetime | None = None

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def embed_document(self, text: str, title: str | None = None) -> bytes:
        """Vecteur sérialisé float32 (BLOB SQLite)."""

    @abstractmethod
    async def embed_query(self, text: str) -> np.ndarray:
        """Vecteur numpy float32 pour la requête."""

    def is_in_cooldown(self) -> bool:
        if self._cooldown_until is None:
            return False
        return datetime.now(timezone.utc) < self._cooldown_until

    def mark_unavailable(self, duration_minutes: int | None = None) -> None:
        minutes = duration_minutes if duration_minutes is not None else self._cooldown_minutes
        self._cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
