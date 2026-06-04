"""
LLMProviderManager — service centralisé de gestion des fournisseurs LLM.

Responsabilités :
- rotation des clés API par fournisseur (GEMINI_API_KEYS, GROQ_API_KEYS, …) ;
- failover automatique Gemini → Groq → Cerebras → Ollama (dernier recours) ;
- cache mémoire des clés/fournisseurs défaillants (cooldown, ex. 5 min) ;
- logs détaillés (fournisseur, n° de clé sans la dévoiler, temps, motif) ;
- état de santé pour /system/llm-status.

Réutilise les classes de fournisseurs existantes (Gemini/Groq/Cerebras/Ollama)
et la logique de cooldown de BaseLLMProvider — aucune logique HTTP dupliquée.
"""

from __future__ import annotations

import json
import logging
import re
import time

import httpx

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
from app.services.llm_providers.ollama import OllamaLLMProvider

logger = logging.getLogger("lekki.llm")

CLOUD_PROVIDERS = ("gemini", "groq", "cerebras")


def parse_api_keys(raw: str, single: str = "") -> list[str]:
    """
    Analyse une liste de clés depuis l'environnement.

    Formats acceptés : JSON (["k1","k2"]) ou valeurs séparées par virgules /
    retours à la ligne. La clé unique `single` est ajoutée en complément
    (rétro-compatibilité). Les doublons sont éliminés en conservant l'ordre.
    """
    keys: list[str] = []
    raw = (raw or "").strip()
    if raw:
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    keys = [str(k).strip() for k in parsed if str(k).strip()]
            except json.JSONDecodeError:
                keys = []
        if not keys:
            for part in re.split(r"[,\n]", raw):
                cleaned = part.strip().strip('"').strip("'")
                if cleaned:
                    keys.append(cleaned)

    if single and single.strip():
        keys.append(single.strip())

    seen: set[str] = set()
    unique: list[str] = []
    for key in keys:
        if key not in seen:
            seen.add(key)
            unique.append(key)
    return unique


def classify_failure(exc: Exception) -> tuple[str, bool]:
    """
    Traduit une exception en (motif lisible, est_transitoire).

    Les motifs transitoires (quota, rate-limit, timeout, réseau) déclenchent un
    cooldown de la clé ; les autres erreurs provoquent un failover sans cooldown.
    """
    if isinstance(exc, QuotaExhaustedError):
        text = str(exc).lower()
        if any(m in text for m in ("quota", "resource_exhausted", "insufficient_quota")):
            return "QuotaExceeded", True
        return "RateLimit", True
    if isinstance(exc, httpx.TimeoutException):
        return "Timeout", True
    if isinstance(exc, httpx.ConnectError):
        return "NetworkError", True
    if isinstance(exc, httpx.RequestError):
        return "NetworkError", True
    if is_quota_or_rate_limit(exc):
        return "RateLimit", True
    return f"Error({type(exc).__name__})", False


class LLMProviderManager:
    """Gestionnaire centralisé avec rotation de clés et failover multi-fournisseurs."""

    def __init__(self, *, build: bool = True) -> None:
        # groups[name] = liste d'instances de providers (une par clé API).
        self.groups: dict[str, list[BaseLLMProvider]] = {}
        self.cloud_order: list[str] = []
        self.ollama: OllamaLLMProvider | None = None
        if build:
            self._build()

    def _build(self) -> None:
        cooldown = settings.LLM_KEY_COOLDOWN_MINUTES

        order = [
            name.strip().lower()
            for name in settings.LLM_PROVIDER_ORDER.split(",")
            if name.strip()
        ]
        self.cloud_order = [name for name in order if name in CLOUD_PROVIDERS]

        keysets = {
            "gemini": parse_api_keys(settings.GEMINI_API_KEYS, settings.GEMINI_API_KEY),
            "groq": parse_api_keys(settings.GROQ_API_KEYS, settings.GROQ_API_KEY),
            "cerebras": parse_api_keys(settings.CEREBRAS_API_KEYS, settings.CEREBRAS_API_KEY),
        }
        factories = {
            "gemini": lambda key: GeminiLLMProvider(cooldown, api_key=key),
            "groq": lambda key: GroqLLMProvider(cooldown, api_key=key),
            "cerebras": lambda key: CerebrasLLMProvider(cooldown, api_key=key),
        }

        for name in self.cloud_order:
            self.groups[name] = [factories[name](key) for key in keysets.get(name, [])]

        # Ollama : toujours en dernier recours, hors de l'ordre cloud.
        self.ollama = OllamaLLMProvider(cooldown)

    # ── Génération avec failover ────────────────────────────────────────────

    async def generate(self, prompt: str) -> tuple[str, str]:
        """
        Essaie chaque clé de chaque fournisseur cloud dans l'ordre, puis Ollama.
        Retourne (réponse, nom_du_fournisseur). Lève AllProvidersFailedError si
        rien n'aboutit (Ollama désactivé ou en échec).
        """
        errors: list[tuple[str, str]] = []
        attempted_provider = False

        for name in self.cloud_order:
            instances = [p for p in self.groups.get(name, []) if p.is_configured()]
            if not instances:
                continue

            title = name.capitalize()
            if attempted_provider:
                logger.info("[LLM] Switching to %s", title)
            attempted_provider = True

            multi = len(instances) > 1
            for idx, provider in enumerate(instances, start=1):
                label = f"{title} key #{idx}" if multi else title

                if provider.is_in_cooldown():
                    logger.info("[LLM] %s skipped : cooldown active", label)
                    errors.append((label, "cooldown"))
                    if multi and idx < len(instances):
                        logger.info("[LLM] Switching to %s key #%d", title, idx + 1)
                    continue

                start = time.perf_counter()
                try:
                    text = await provider.generate(prompt)
                    elapsed = time.perf_counter() - start
                    logger.info("[LLM] %s success in %.1fs", label, elapsed)
                    return text, name
                except Exception as exc:  # noqa: BLE001 — on classe puis on bascule
                    reason, transient = classify_failure(exc)
                    if transient:
                        provider.mark_unavailable()
                    logger.warning("[LLM] %s failed : %s", label, reason)
                    errors.append((label, reason))
                    if multi and idx < len(instances):
                        logger.info("[LLM] Switching to %s key #%d", title, idx + 1)

        # Tous les fournisseurs cloud ont échoué → Ollama (dernier recours).
        if self.ollama is not None and self.ollama.is_configured():
            logger.info("[LLM] All cloud providers unavailable — falling back to Ollama (last resort)")
            start = time.perf_counter()
            try:
                text = await self.ollama.generate(prompt)
                elapsed = time.perf_counter() - start
                logger.info("[LLM] Ollama success in %.1fs", elapsed)
                return text, "ollama"
            except Exception as exc:  # noqa: BLE001
                reason, _ = classify_failure(exc)
                logger.error("[LLM] Ollama failed : %s", reason)
                errors.append(("ollama", reason))
        else:
            logger.error("[LLM] All cloud providers failed and Ollama is disabled")

        raise AllProvidersFailedError(errors)

    # ── Monitoring ──────────────────────────────────────────────────────────

    def get_status(self) -> list[dict]:
        """État détaillé par fournisseur cloud (rétro-compatible /llm/status)."""
        status: list[dict] = []
        for name in self.cloud_order:
            configured = [p for p in self.groups.get(name, []) if p.is_configured()]
            status.append(
                {
                    "name": name,
                    "configured": bool(configured),
                    "in_cooldown": bool(configured)
                    and all(p.is_in_cooldown() for p in configured),
                    "keys": len(configured),
                    "keys_available": sum(
                        1 for p in configured if not p.is_in_cooldown()
                    ),
                }
            )
        return status

    def get_health(self) -> dict[str, str]:
        """
        Santé synthétique des fournisseurs pour /system/llm-status.

        Valeurs : available | cooldown | not_configured (cloud) ;
                  fallback | disabled (ollama).
        """
        health: dict[str, str] = {}
        for name in self.cloud_order:
            configured = [p for p in self.groups.get(name, []) if p.is_configured()]
            if not configured:
                health[name] = "not_configured"
            elif all(p.is_in_cooldown() for p in configured):
                health[name] = "cooldown"
            else:
                health[name] = "available"

        # Les fournisseurs absents de l'ordre apparaissent quand même.
        for name in CLOUD_PROVIDERS:
            health.setdefault(name, "not_configured")

        health["ollama"] = (
            "fallback" if (self.ollama and self.ollama.is_configured()) else "disabled"
        )
        return health
