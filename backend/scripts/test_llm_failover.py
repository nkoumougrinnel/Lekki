"""
Démonstration manuelle du LLMProviderManager — sans clés API (fournisseurs simulés).

Usage (depuis backend/) :
  python scripts/test_llm_failover.py
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.llm_providers.base import (  # noqa: E402
    AllProvidersFailedError,
    BaseLLMProvider,
    QuotaExhaustedError,
)
from app.services.llm_providers.manager import LLMProviderManager  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")


class FakeLLMProvider(BaseLLMProvider):
    def __init__(self, name: str, *, quota: bool = False, ok: bool = True, configured: bool = True):
        super().__init__(cooldown_minutes=5)
        self.name = name
        self._quota = quota
        self._ok = ok
        self._configured = configured

    def is_configured(self) -> bool:
        return self._configured

    async def generate(self, prompt: str) -> str:
        if self._quota:
            raise QuotaExhaustedError(f"429 quota — {self.name}")
        if not self._ok:
            raise RuntimeError(f"erreur — {self.name}")
        return f"[{self.name}] Réponse simulée ({len(prompt)} car.)"


def _manager(cloud, ollama=None):
    m = LLMProviderManager(build=False)
    m.groups = cloud
    m.cloud_order = list(cloud.keys())
    m.ollama = ollama
    return m


async def run_scenarios() -> None:
    print("=== Démonstration bascule LLM (sans API) ===\n")

    print("1. Rotation de clés Gemini (key#1 quota -> key#2) :")
    m1 = _manager(
        {"gemini": [FakeLLMProvider("gemini", quota=True), FakeLLMProvider("gemini")]}
    )
    text, provider = await m1.generate("Question P1 ?")
    print(f"   -> provider={provider} | {text}\n")

    print("2. Toutes les clés Gemini échouent -> Groq :")
    m2 = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota=True)],
            "groq": [FakeLLMProvider("groq")],
            "cerebras": [FakeLLMProvider("cerebras")],
        }
    )
    text, provider = await m2.generate("Question")
    print(f"   -> provider={provider}\n")

    print("3. Tout le cloud échoue -> Ollama (dernier recours) :")
    m3 = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota=True)],
            "groq": [FakeLLMProvider("groq", quota=True)],
            "cerebras": [FakeLLMProvider("cerebras", quota=True)],
        },
        ollama=FakeLLMProvider("ollama"),
    )
    text, provider = await m3.generate("Question")
    print(f"   -> provider={provider}\n")

    print("4. Tout le cloud échoue + Ollama désactivé -> erreur propre :")
    m4 = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota=True)],
            "groq": [FakeLLMProvider("groq", quota=True)],
        },
        ollama=FakeLLMProvider("ollama", configured=False),
    )
    try:
        await m4.generate("Échec total")
        print("   ERREUR: devait lever AllProvidersFailedError")
    except AllProvidersFailedError as exc:
        print(f"   -> AllProvidersFailedError ({len(exc.errors)} erreurs)\n")

    print("5. Santé des fournisseurs (manager réel, selon .env) :")
    real = LLMProviderManager()
    for name, state in real.get_health().items():
        print(f"   {name:10} {state}")

    print("\n=== Scénarios simulés OK ===")


if __name__ == "__main__":
    asyncio.run(run_scenarios())
