"""Base commune pour les fournisseurs LLM distants."""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone


class QuotaExhaustedError(Exception):
    """Quota ou rate-limit atteint — déclenche la bascule vers le provider suivant."""


class AllProvidersFailedError(Exception):
    """Aucun fournisseur disponible dans la chaîne de bascule."""

    def __init__(self, errors: list[tuple[str, str]]):
        self.errors = errors
        details = "; ".join(f"{name}: {msg}" for name, msg in errors)
        super().__init__(f"Tous les fournisseurs LLM ont échoué — {details}")


def is_quota_or_rate_limit(exc: Exception) -> bool:
    text = str(exc).lower()
    markers = (
        "429",
        "quota",
        "resource_exhausted",
        "rate limit",
        "rate_limit",
        "too many requests",
        "insufficient_quota",
    )
    return any(marker in text for marker in markers)


class BaseLLMProvider(ABC):
    name: str

    def __init__(self, cooldown_minutes: int) -> None:
        self._cooldown_minutes = cooldown_minutes
        self._cooldown_until: datetime | None = None

    @abstractmethod
    def is_configured(self) -> bool:
        """True si une clé API (ou config) est présente."""

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Génère une réponse texte à partir du prompt."""

    def is_in_cooldown(self) -> bool:
        if self._cooldown_until is None:
            return False
        return datetime.now(timezone.utc) < self._cooldown_until

    def mark_unavailable(self, duration_minutes: int | None = None) -> None:
        minutes = duration_minutes if duration_minutes is not None else self._cooldown_minutes
        self._cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    def clear_cooldown(self) -> None:
        self._cooldown_until = None
