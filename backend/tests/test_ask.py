"""
Tests de l'endpoint POST /ask — contrat frontend + persistance messages.
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat, Message
from app.models.chunk import Chunk
from app.models.page import Page
from app.services.llm_providers.base import AllProvidersFailedError


def _fake_chunk(page_id: str, text: str = "fragment de test", score: float = 0.87):
    chunk = Chunk(
        page_id=page_id,
        chunk_index=0,
        chunk_text=text,
        chunk_hash="abc",
        token_count=3,
    )
    return chunk, score


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ask_response_contract(
    client: AsyncClient, sample_page: Page, sample_chat: Chat, reader_token: str
):
    chunk, score = _fake_chunk(sample_page.id, "Docker compose up -d pour déployer", 0.91)
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse simulée pour le front.", "groq"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(score, chunk)],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Comment déployer ?", "chat_id": sample_chat.id},
                headers=_auth(reader_token),
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Réponse simulée pour le front."
    assert data["provider"] == "groq"
    assert data["confidence"] == 0.91
    assert data["message_id"]
    assert data["user_message_id"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["page_id"] == sample_page.id
    assert "excerpt" in data["sources"][0]
    assert data["sources"][0]["score"] == 0.91


@pytest.mark.asyncio
async def test_ask_persists_messages(
    client: AsyncClient,
    db: AsyncSession,
    sample_page: Page,
    sample_chat: Chat,
    reader_token: str,
):
    chunk, score = _fake_chunk(sample_page.id)
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse persistée.", "gemini"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(score, chunk)],
        ):
            await client.post(
                "/api/v1/ask",
                json={"question": "Question test", "chat_id": sample_chat.id},
                headers=_auth(reader_token),
            )

    result = await db.execute(
        select(Message).where(Message.chat_id == sample_chat.id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[0].content == "Question test"
    assert messages[1].role == "assistant"
    assert messages[1].content == "Réponse persistée."

    sources = json.loads(messages[1].sources)
    assert sources[0]["page_id"] == sample_page.id


@pytest.mark.asyncio
async def test_ask_without_chat_id(client: AsyncClient, sample_page: Page):
    chunk, score = _fake_chunk(sample_page.id)
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse sans chat.", "groq"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(score, chunk)],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Question stateless"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["message_id"] is None
    assert data["user_message_id"] is None
    assert data["answer"] == "Réponse sans chat."


@pytest.mark.asyncio
async def test_ask_requires_auth_with_chat_id(client: AsyncClient, sample_chat: Chat):
    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Test", "chat_id": sample_chat.id},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ask_chat_not_found(client: AsyncClient, reader_token: str):
    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Test", "chat_id": "00000000-0000-0000-0000-000000000000"},
        headers=_auth(reader_token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_ask_chat_forbidden(client: AsyncClient, sample_chat: Chat, admin_token: str):
    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Test", "chat_id": sample_chat.id},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_ask_no_chunks(client: AsyncClient, sample_chat: Chat, reader_token: str):
    with patch(
        "app.routers.rag.rag_service.get_relevant_chunks",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.post(
            "/api/v1/ask",
            json={"question": "Question sans contexte", "chat_id": sample_chat.id},
            headers=_auth(reader_token),
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] is None
    assert data["confidence"] == 0.0
    assert data["sources"] == []
    assert "aucune information" in data["answer"].lower()
    assert data["message_id"]


@pytest.mark.asyncio
async def test_ask_all_providers_down(client: AsyncClient, sample_page: Page):
    chunk, score = _fake_chunk(sample_page.id)
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        side_effect=AllProvidersFailedError([("gemini", "quota"), ("groq", "quota")]),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(score, chunk)],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Test 503"},
            )

    assert resp.status_code == 503
    assert "indisponibles" in resp.json()["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_ask_deduplicates_sources_by_page(client: AsyncClient, sample_page: Page):
    chunks = [
        (0.95, _fake_chunk(sample_page.id, "Premier extrait")[0]),
        (0.72, _fake_chunk(sample_page.id, "Second extrait")[0]),
    ]
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("OK", "gemini"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=chunks,
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Test dédup"},
            )

    sources = resp.json()["sources"]
    assert len(sources) == 1
    assert sources[0]["score"] == 0.95
