"""
Tests du LLMProviderManager — rotation de clés, failover multi-fournisseurs,
Ollama en dernier recours, cooldown et santé. Sans appels API réels.
"""

import httpx
import pytest
from unittest.mock import AsyncMock, patch

from app.models.page import Page
from app.services.llm_providers.base import (
    AllProvidersFailedError,
    BaseLLMProvider,
    QuotaExhaustedError,
)
from app.services.llm_providers.manager import (
    LLMProviderManager,
    classify_failure,
    parse_api_keys,
)
from app.services.llm_service import LLMService


class FakeLLMProvider(BaseLLMProvider):
    """Fournisseur simulé (une clé) pour les tests de bascule."""

    def __init__(
        self,
        name: str,
        *,
        configured: bool = True,
        response: str = "réponse test",
        quota_error: bool = False,
        generic_error: Exception | None = None,
        cooldown_minutes: int = 5,
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
            raise QuotaExhaustedError(f"429 quota simulé — {self.name}")
        if self._generic_error:
            raise self._generic_error
        return f"{self._response} [{self.name}]"


def _manager(cloud: dict[str, list[FakeLLMProvider]], ollama: FakeLLMProvider | None = None):
    m = LLMProviderManager(build=False)
    m.groups = cloud
    m.cloud_order = list(cloud.keys())
    m.ollama = ollama
    return m


# ---------------------------------------------------------------------------
# parse_api_keys
# ---------------------------------------------------------------------------

def test_parse_api_keys_json_list():
    assert parse_api_keys('["k1","k2","k3"]') == ["k1", "k2", "k3"]


def test_parse_api_keys_comma_and_newline():
    assert parse_api_keys("k1, k2\nk3") == ["k1", "k2", "k3"]


def test_parse_api_keys_appends_single_and_dedupes():
    # La clé unique complète la liste, sans doublon.
    assert parse_api_keys('["k1","k2"]', "k2") == ["k1", "k2"]
    assert parse_api_keys("", "solo") == ["solo"]
    assert parse_api_keys("") == []


# ---------------------------------------------------------------------------
# classify_failure
# ---------------------------------------------------------------------------

def test_classify_failure_quota_and_ratelimit():
    assert classify_failure(QuotaExhaustedError("quota exceeded")) == ("QuotaExceeded", True)
    assert classify_failure(QuotaExhaustedError("rate limit 429")) == ("RateLimit", True)


def test_classify_failure_timeout_and_network():
    assert classify_failure(httpx.TimeoutException("slow")) == ("Timeout", True)
    assert classify_failure(httpx.ConnectError("down")) == ("NetworkError", True)


def test_classify_failure_other_is_non_transient():
    reason, transient = classify_failure(ValueError("boom"))
    assert transient is False
    assert "ValueError" in reason


# ---------------------------------------------------------------------------
# Failover et rotation de clés
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_manager_uses_first_available_provider():
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", response="ok gemini")],
            "groq": [FakeLLMProvider("groq", response="ok groq")],
        }
    )
    text, name = await manager.generate("question")
    assert name == "gemini"
    assert "ok gemini" in text
    assert manager.groups["groq"][0].calls == 0


@pytest.mark.asyncio
async def test_manager_rotates_to_next_key_on_quota():
    key1 = FakeLLMProvider("gemini", quota_error=True)
    key2 = FakeLLMProvider("gemini", response="ok key2")
    manager = _manager({"gemini": [key1, key2]})

    text, name = await manager.generate("question")
    assert name == "gemini"
    assert "ok key2" in text
    assert key1.is_in_cooldown()  # clé défaillante mise en cooldown
    assert key2.calls == 1


@pytest.mark.asyncio
async def test_manager_switches_provider_when_all_keys_fail():
    manager = _manager(
        {
            "gemini": [
                FakeLLMProvider("gemini", quota_error=True),
                FakeLLMProvider("gemini", quota_error=True),
            ],
            "groq": [FakeLLMProvider("groq", response="ok groq")],
        }
    )
    text, name = await manager.generate("question")
    assert name == "groq"
    assert "ok groq" in text


@pytest.mark.asyncio
async def test_manager_falls_back_to_ollama_last():
    ollama = FakeLLMProvider("ollama", response="ok ollama")
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota_error=True)],
            "groq": [FakeLLMProvider("groq", quota_error=True)],
            "cerebras": [FakeLLMProvider("cerebras", quota_error=True)],
        },
        ollama=ollama,
    )
    text, name = await manager.generate("question")
    assert name == "ollama"
    assert "ok ollama" in text
    assert ollama.calls == 1


@pytest.mark.asyncio
async def test_manager_ollama_not_used_when_cloud_succeeds():
    ollama = FakeLLMProvider("ollama", response="ollama")
    manager = _manager(
        {"gemini": [FakeLLMProvider("gemini", response="ok")]},
        ollama=ollama,
    )
    _, name = await manager.generate("q")
    assert name == "gemini"
    assert ollama.calls == 0  # jamais sollicité si le cloud répond


@pytest.mark.asyncio
async def test_manager_raises_when_all_fail_and_ollama_disabled():
    ollama = FakeLLMProvider("ollama", configured=False)  # OLLAMA_ENABLED=false
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota_error=True)],
            "groq": [FakeLLMProvider("groq", quota_error=True)],
        },
        ollama=ollama,
    )
    with pytest.raises(AllProvidersFailedError) as exc_info:
        await manager.generate("q")
    assert ollama.calls == 0
    assert len(exc_info.value.errors) >= 2


@pytest.mark.asyncio
async def test_manager_skips_unconfigured_provider():
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", configured=False)],
            "groq": [FakeLLMProvider("groq", response="via groq")],
        }
    )
    _, name = await manager.generate("q")
    assert name == "groq"
    assert manager.groups["gemini"][0].calls == 0


@pytest.mark.asyncio
async def test_manager_skips_key_in_cooldown():
    key1 = FakeLLMProvider("gemini", response="gemini")
    key1.mark_unavailable()
    key2 = FakeLLMProvider("gemini", response="ok key2")
    manager = _manager({"gemini": [key1, key2]})

    _, name = await manager.generate("q")
    assert name == "gemini"
    assert key1.calls == 0
    assert key2.calls == 1


# ---------------------------------------------------------------------------
# Santé / statut
# ---------------------------------------------------------------------------

def test_manager_get_health():
    cooled = FakeLLMProvider("groq")
    cooled.mark_unavailable()
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini")],
            "groq": [cooled],
            "cerebras": [FakeLLMProvider("cerebras", configured=False)],
        },
        ollama=FakeLLMProvider("ollama"),
    )
    health = manager.get_health()
    assert health["gemini"] == "available"
    assert health["groq"] == "cooldown"
    assert health["cerebras"] == "not_configured"
    assert health["ollama"] == "fallback"


def test_manager_get_health_ollama_disabled():
    manager = _manager(
        {"gemini": [FakeLLMProvider("gemini")]},
        ollama=FakeLLMProvider("ollama", configured=False),
    )
    assert manager.get_health()["ollama"] == "disabled"


def test_manager_get_status_shape():
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini"), FakeLLMProvider("gemini")],
            "groq": [FakeLLMProvider("groq", configured=False)],
        }
    )
    status = manager.get_status()
    by_name = {row["name"]: row for row in status}
    assert by_name["gemini"]["keys"] == 2
    assert by_name["gemini"]["configured"] is True
    assert by_name["groq"]["configured"] is False


# ---------------------------------------------------------------------------
# LLMService + routes (mockés)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_llm_service_returns_provider_name():
    manager = _manager(
        {
            "gemini": [FakeLLMProvider("gemini", quota_error=True)],
            "groq": [FakeLLMProvider("groq", response="réponse mock")],
        }
    )
    service = LLMService()
    service.manager = manager

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
async def test_ask_route_with_mocked_llm(client, sample_page: Page, admin_token: str):
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
                headers={"Authorization": f"Bearer {admin_token}"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Réponse simulée sans API."
    assert data["provider"] == "groq"
    assert data["confidence"] == 0.9
    assert data["sources"][0]["page_id"] == sample_page.id


@pytest.mark.asyncio
async def test_ask_route_no_chunks(client):
    with patch(
        "app.routers.rag.rag_service.get_relevant_chunks",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.post(
            "/api/v1/ask",
            json={"question": "Question sans contexte"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] is None
    assert data["confidence"] == 0.0
    assert data["sources"] == []
    assert "aucune information" in data["answer"].lower()


@pytest.mark.asyncio
async def test_ask_route_all_providers_down(client, admin_token: str):
    """L'utilisateur ne voit jamais une erreur brute : message 503 propre."""
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
                headers={"Authorization": f"Bearer {admin_token}"},
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


@pytest.mark.asyncio
async def test_system_llm_status_route(client, admin_token: str):
    resp = await client.get(
        "/api/v1/system/llm-status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    for provider in ("gemini", "groq", "cerebras", "ollama"):
        assert provider in data


@pytest.mark.asyncio
async def test_system_llm_status_requires_auth(client):
    resp = await client.get("/api/v1/system/llm-status")
    assert resp.status_code == 401


def _fake_chunk(page_id: str):
    from app.models.chunk import Chunk

    return Chunk(
        page_id=page_id,
        chunk_index=0,
        chunk_text="fragment de test",
        chunk_hash="abc",
        token_count=3,
    )
