"""
Test manuel de bascule LLM — sans clés API (fournisseurs simulés).

Usage (depuis backend/) :
  python scripts/test_llm_failover.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.llm_providers.base import AllProvidersFailedError, QuotaExhaustedError
from app.services.llm_providers.base import BaseLLMProvider
from app.services.llm_providers.router import LLMProviderRouter


class FakeLLMProvider(BaseLLMProvider):
    def __init__(self, name: str, *, quota: bool = False, ok: bool = True, configured: bool = True):
        super().__init__(cooldown_minutes=1)
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
        return f"[{self.name}] Réponse simulée ({len(prompt)} car. prompt)"


def _router(*providers: FakeLLMProvider) -> LLMProviderRouter:
    r = LLMProviderRouter.__new__(LLMProviderRouter)
    r.providers = {p.name: p for p in providers}
    r.order = [p.name for p in providers]
    return r


async def run_scenarios() -> None:
    print("=== Test bascule LLM (sans API) ===\n")

    # 1. Succès sur le premier
    r1 = _router(
        FakeLLMProvider("gemini"),
        FakeLLMProvider("groq"),
        FakeLLMProvider("cerebras"),
    )
    text, provider = await r1.generate("Quelle est la procédure P1 ?")
    print(f"1. Premier disponible     -> provider={provider}")
    print(f"   {text}\n")

    # 2. Gemini quota -> Groq
    r2 = _router(
        FakeLLMProvider("gemini", quota=True),
        FakeLLMProvider("groq"),
        FakeLLMProvider("cerebras"),
    )
    text, provider = await r2.generate("Question test")
    print(f"2. Gemini quota         -> provider={provider}")
    print(f"   gemini cooldown={r2.providers['gemini'].is_in_cooldown()}")
    print(f"   {text}\n")

    # 3. Gemini + Groq quota -> Cerebras
    r3 = _router(
        FakeLLMProvider("gemini", quota=True),
        FakeLLMProvider("groq", quota=True),
        FakeLLMProvider("cerebras"),
    )
    text, provider = await r3.generate("Question test")
    print(f"3. Gemini+Groq quota    -> provider={provider}")
    print(f"   {text}\n")

    # 4. Pas de clé Gemini -> Groq direct
    r4 = _router(
        FakeLLMProvider("gemini", configured=False),
        FakeLLMProvider("groq"),
    )
    text, provider = await r4.generate("Sans clé gemini")
    print(f"4. Gemini non configuré -> provider={provider}")
    print(f"   {text}\n")

    # 5. Tous en échec
    r5 = _router(
        FakeLLMProvider("gemini", quota=True),
        FakeLLMProvider("groq", quota=True),
        FakeLLMProvider("cerebras", quota=True),
    )
    try:
        await r5.generate("Échec total")
        print("5. ERREUR: devait lever AllProvidersFailedError")
    except AllProvidersFailedError as e:
        print(f"5. Tous indisponibles    -> AllProvidersFailedError ({len(e.errors)} erreurs)")
        for name, msg in e.errors:
            print(f"   - {name}: {msg[:60]}...")
    print()

    # 6. Statut
    print("6. Statut fournisseurs (router réel, selon .env) :")
    real = LLMProviderRouter()
    for row in real.get_status():
        flags = []
        if row["configured"]:
            flags.append("clé OK")
        if row["in_cooldown"]:
            flags.append("COOLDOWN")
        print(f"   {row['name']:10} {' | '.join(flags) or 'non configuré'}")

    print("\n=== Tous les scénarios simulés OK ===")


if __name__ == "__main__":
    asyncio.run(run_scenarios())
