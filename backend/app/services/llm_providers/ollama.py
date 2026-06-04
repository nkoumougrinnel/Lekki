"""
Fournisseur Ollama — filet de sécurité local (DERNIER recours uniquement).

Utilise un modèle léger (llama3.2:3b / qwen2.5:3b) avec des paramètres très
économiques (RAM/CPU minimum). N'est sollicité par le manager que lorsque tous
les fournisseurs cloud ont échoué, et seulement si OLLAMA_ENABLED=true.
"""

import httpx

from app.config import settings
from app.services.llm_providers.base import (
    BaseLLMProvider,
    QuotaExhaustedError,
    is_quota_or_rate_limit,
)


class OllamaLLMProvider(BaseLLMProvider):
    name = "ollama"

    def __init__(
        self,
        cooldown_minutes: int,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        super().__init__(cooldown_minutes)
        self._base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self._model = model or settings.OLLAMA_MODEL
        self._timeout = settings.OLLAMA_TIMEOUT
        # Paramètres volontairement frugaux : réponse courte, contexte réduit.
        self._options = {
            "temperature": settings.OLLAMA_TEMPERATURE,
            "top_p": settings.OLLAMA_TOP_P,
            "num_predict": settings.OLLAMA_NUM_PREDICT,
            "num_ctx": settings.OLLAMA_NUM_CTX,
        }

    def is_configured(self) -> bool:
        # Ollama est « configuré » dès lors qu'il est activé : la disponibilité
        # réelle (serveur local joignable) est détectée à l'appel.
        return bool(settings.OLLAMA_ENABLED)

    async def generate(self, prompt: str) -> str:
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": self._options,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/api/generate", json=payload
                )
            response.raise_for_status()
            data = response.json()
            return (data.get("response") or "").strip()
        except httpx.HTTPStatusError as exc:
            if is_quota_or_rate_limit(exc):
                raise QuotaExhaustedError(str(exc)) from exc
            raise
