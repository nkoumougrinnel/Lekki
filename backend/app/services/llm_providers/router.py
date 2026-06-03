"""Bascule automatique Gemini → Groq → Cerebras selon disponibilité."""

import logging

from app.config import settings
from app.services.llm_providers.base import (
    AllProvidersFailedError,
    BaseLLMProvider,
    QuotaExhaustedError,
    is_quota_or_rate_limit,
)
from app.services.llm_providers.cerebras import CerebrasLLMProvider
from app.services.llm_providers.gemini import GeminiLLMProvider
from app.services.llm_providers.groq import GroqLLMProvider

logger = logging.getLogger(__name__)


class LLMProviderRouter:
    """Essaie chaque fournisseur dans l'ordre configuré (LLM_PROVIDER_ORDER)."""

    def __init__(self) -> None:
        cooldown = settings.LLM_PROVIDER_COOLDOWN_MINUTES
        registry: dict[str, BaseLLMProvider] = {
            "gemini": GeminiLLMProvider(cooldown),
            "groq": GroqLLMProvider(cooldown),
            "cerebras": CerebrasLLMProvider(cooldown),
        }
        order = [
            name.strip().lower()
            for name in settings.LLM_PROVIDER_ORDER.split(",")
            if name.strip()
        ]
        self.providers = registry
        self.order = [name for name in order if name in registry]

    def get_status(self) -> list[dict]:
        """État des fournisseurs (debug / monitoring)."""
        status = []
        for name in self.order:
            provider = self.providers[name]
            status.append({
                "name": name,
                "configured": provider.is_configured(),
                "in_cooldown": provider.is_in_cooldown(),
            })
        return status

    async def generate(self, prompt: str) -> tuple[str, str]:
        """
        Retourne (réponse, nom_du_fournisseur_utilisé).
        """
        errors: list[tuple[str, str]] = []

        for name in self.order:
            provider = self.providers[name]

            if not provider.is_configured():
                logger.debug("LLM %s ignoré — clé API absente", name)
                continue

            if provider.is_in_cooldown():
                logger.info("LLM %s en cooldown — bascule suivante", name)
                errors.append((name, "cooldown actif (quota précédent)"))
                continue

            try:
                text = await provider.generate(prompt)
                logger.info("Réponse LLM via %s", name)
                return text, name
            except QuotaExhaustedError as exc:
                provider.mark_unavailable()
                logger.warning("Quota/rate-limit %s — cooldown %s min", name, settings.LLM_PROVIDER_COOLDOWN_MINUTES)
                errors.append((name, str(exc)))
            except Exception as exc:
                if is_quota_or_rate_limit(exc):
                    provider.mark_unavailable()
                    errors.append((name, str(exc)))
                else:
                    errors.append((name, str(exc)))
                logger.warning("Échec LLM %s : %s", name, exc)

        raise AllProvidersFailedError(errors)
