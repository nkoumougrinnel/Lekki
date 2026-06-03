"""
Tests de bascule LLM — sans appels API réels (fournisseurs simulés).
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.llm_providers.base import (
    AllProvidersFailedError,
    BaseLLMProvider,
    QuotaExhaustedError,
)
from app.models.page import Page
from app.services.llm_providers.router import LLMProviderRouter
from app.services.llm_service import LLMService


class FakeLLMProvider(BaseLLMProvider):
    """Fournisseur simulé pour les tests de bascule."""

    def __init__(
        self,
        name: str,
        *,
        configured: bool = True,
        response: str = "réponse test",
        quota_error: bool = False,
        generic_error: Exception | None = None,
        cooldown_minutes: int = 60,
    ) -> None:
        super().__init__(cooldown_minutes)
        self.name = name
        self._configured = configured
        self._response = response
        self._quota_error = quota_error
        self._generic_error = generic_error
        self.calls = 0

    def is_configured(self) -> bool:
        return self._configured

    async def generate(self, prompt: str) -> str:
        self.calls += 1
        if self._quota_error:
            raise QuotaExhaustedError(f"quota simulé — {self.name}")
        if self._generic_error:
            raise self._generic_error
        return f"{self._response} [{self.name}] prompt_len={len(prompt)}"


def _router_with(*providers: FakeLLMProvider) -> LLMProviderRouter:
    router = LLMProviderRouter.__new__(LLMProviderRouter)
    router.providers = {p.name: p for p in providers}
    router.order = [p.name for p in providers]
    return router


# ---------------------------------------------------------------------------
# Bascule LLMProviderRouter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_router_uses_first_available_provider():
    router = _router_with(
        FakeLLMProvider("gemini", response="ok gemini"),
        FakeLLMProvider("groq", response="ok groq"),
    )
    text, name = await router.generate("question test")
    assert name == "gemini"
    assert "ok gemini" in text
    assert router.providers["groq"].calls == 0


@pytest.mark.asyncio
async def test_router_fails_over_on_quota():
    router = _router_with(
        FakeLLMProvider("gemini", quota_error=True),
        FakeLLMProvider("groq", response="ok groq"),
        FakeLLMProvider("cerebras", response="ok cerebras"),
    )
    text, name = await router.generate("question")
    assert name == "groq"
    assert router.providers["gemini"].is_in_cooldown()
    assert router.providers["groq"].calls == 1


@pytest.mark.asyncio
async def test_router_fails_over_twice_to_cerebras():
    router = _router_with(
        FakeLLMProvider("gemini", quota_error=True),
        FakeLLMProvider("groq", quota_error=True),
        FakeLLMProvider("cerebras", response="ok cerebras"),
    )
    text, name = await router.generate("question")
    assert name == "cerebras"
    assert "cerebras" in text


@pytest.mark.asyncio
async def test_router_skips_unconfigured_provider():
    router = _router_with(
        FakeLLMProvider("gemini", configured=False),
        FakeLLMProvider("groq", response="via groq"),
    )
    text, name = await router.generate("q")
    assert name == "groq"
    assert router.providers["gemini"].calls == 0


@pytest.mark.asyncio
async def test_router_skips_provider_in_cooldown():
    gemini = FakeLLMProvider("gemini", response="gemini")
    gemini.mark_unavailable()
    groq = FakeLLMProvider("groq", response="groq")
    router = _router_with(gemini, groq)

    text, name = await router.generate("q")
    assert name == "groq"
    assert gemini.calls == 0


@pytest.mark.asyncio
async def test_router_all_providers_fail():
    router = _router_with(
        FakeLLMProvider("gemini", quota_error=True),
        FakeLLMProvider("groq", quota_error=True),
        FakeLLMProvider("cerebras", quota_error=True),
    )
    with pytest.raises(AllProvidersFailedError) as exc_info:
        await router.generate("q")
    assert len(exc_info.value.errors) == 3


@pytest.mark.asyncio
async def test_router_get_status():
    gemini = FakeLLMProvider("gemini", configured=True)
    groq = FakeLLMProvider("groq", configured=False)
    router = _router_with(gemini, groq)

    status = router.get_status()
    assert status[0] == {"name": "gemini", "configured": True, "in_cooldown": False}
    assert status[1] == {"name": "groq", "configured": False, "in_cooldown": False}


# ---------------------------------------------------------------------------
# LLMService + route /ask (mockés)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_llm_service_returns_provider_name():
    fake_router = _router_with(
        FakeLLMProvider("gemini", quota_error=True),
        FakeLLMProvider("groq", response="réponse mock"),
    )
    service = LLMService()
    service.router = fake_router

    from app.models.chunk import Chunk

    chunks = [
        Chunk(
            page_id="p1",
            chunk_index=0,
            chunk_text="Docker compose up -d",
            chunk_hash="h1",
            token_count=5,
        )
    ]
    answer, provider = await service.ask_question("Comment déployer ?", chunks)
    assert provider == "groq"
    assert "réponse mock" in answer


@pytest.mark.asyncio
async def test_ask_route_with_mocked_llm(client, sample_page: Page):
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse simulée sans API.", "groq"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(0.9, _fake_chunk(sample_page.id))],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Test sans API ?"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Réponse simulée sans API."
    assert data["provider"] == "groq"
    assert sample_page.id in data["sources"]


@pytest.mark.asyncio
async def test_ask_route_no_chunks(client):
    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Question sans contexte"},
    )
    assert resp.status_code == 200
    assert resp.json()["provider"] is None
    assert "aucune information" in resp.json()["answer"].lower()


@pytest.mark.asyncio
async def test_ask_route_all_providers_down(client, admin_token: str):
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        side_effect=AllProvidersFailedError([("gemini", "quota"), ("groq", "quota")]),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(0.8, _fake_chunk("page-1"))],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Test 503"},
            )

    assert resp.status_code == 503
    assert "indisponibles" in resp.json()["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_llm_status_route(client):
    resp = await client.get("/api/v1/llm/status")
    assert resp.status_code == 200
    providers = resp.json()["providers"]
    names = [p["name"] for p in providers]
    assert names == ["gemini", "groq", "cerebras"]


def _fake_chunk(page_id: str):
    from app.models.chunk import Chunk

    return Chunk(
        page_id=page_id,
        chunk_index=0,
        chunk_text="fragment de test",
        chunk_hash="abc",
        token_count=3,
    )
