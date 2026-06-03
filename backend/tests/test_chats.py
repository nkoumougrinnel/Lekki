"""
Tests des routes /chats — contrat frontend + isolation par utilisateur.
"""

import json

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat, Message
from app.models.user import User


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_chats_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/chats")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_chats_empty(client: AsyncClient, reader_token: str):
    resp = await client.get("/api/v1/chats", headers=auth(reader_token))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_chat(client: AsyncClient, reader_token: str, reader_user: User):
    resp = await client.post(
        "/api/v1/chats",
        json={"title": "Ma nouvelle conversation"},
        headers=auth(reader_token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"]
    assert data["title"] == "Ma nouvelle conversation"
    assert data["user_id"] == reader_user.id


@pytest.mark.asyncio
async def test_list_chats_returns_only_current_user(
    client: AsyncClient,
    reader_token: str,
    admin_token: str,
    reader_user: User,
):
    await client.post(
        "/api/v1/chats",
        json={"title": "Chat lecteur"},
        headers=auth(reader_token),
    )
    await client.post(
        "/api/v1/chats",
        json={"title": "Chat admin"},
        headers=auth(admin_token),
    )

    resp = await client.get("/api/v1/chats", headers=auth(reader_token))
    chats = resp.json()
    assert len(chats) == 1
    assert chats[0]["title"] == "Chat lecteur"
    assert chats[0]["user_id"] == reader_user.id


@pytest.mark.asyncio
async def test_get_chat(client: AsyncClient, reader_token: str, sample_chat: Chat):
    resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}",
        headers=auth(reader_token),
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == sample_chat.id


@pytest.mark.asyncio
async def test_get_chat_forbidden(
    client: AsyncClient, admin_token: str, sample_chat: Chat
):
    resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}",
        headers=auth(admin_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_chat_not_found(client: AsyncClient, reader_token: str):
    resp = await client.get(
        "/api/v1/chats/00000000-0000-0000-0000-000000000000",
        headers=auth(reader_token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_chat(client: AsyncClient, db: AsyncSession, reader_token: str, sample_chat: Chat):
    resp = await client.delete(
        f"/api/v1/chats/{sample_chat.id}",
        headers=auth(reader_token),
    )
    assert resp.status_code == 204

    get_resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}",
        headers=auth(reader_token),
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_chat_forbidden(
    client: AsyncClient, admin_token: str, sample_chat: Chat
):
    resp = await client.delete(
        f"/api/v1/chats/{sample_chat.id}",
        headers=auth(admin_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_messages(
    client: AsyncClient,
    db: AsyncSession,
    reader_token: str,
    sample_chat: Chat,
):
    db.add_all([
        Message(chat_id=sample_chat.id, role="user", content="Question ?", tokens_used=2),
        Message(
            chat_id=sample_chat.id,
            role="assistant",
            content="Réponse.",
            sources=json.dumps([{"page_id": "p1", "excerpt": "extrait", "score": 0.9}]),
            tokens_used=5,
        ),
    ])
    await db.commit()

    resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}/messages?limit=50",
        headers=auth(reader_token),
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Question ?"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["sources"] is not None


@pytest.mark.asyncio
async def test_list_messages_respects_limit(
    client: AsyncClient,
    db: AsyncSession,
    reader_token: str,
    sample_chat: Chat,
):
    for i in range(5):
        db.add(Message(chat_id=sample_chat.id, role="user", content=f"msg {i}", tokens_used=1))
    await db.commit()

    resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}/messages?limit=2",
        headers=auth(reader_token),
    )
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_list_messages_forbidden(
    client: AsyncClient, admin_token: str, sample_chat: Chat
):
    resp = await client.get(
        f"/api/v1/chats/{sample_chat.id}/messages",
        headers=auth(admin_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_frontend_flow_create_then_list(
    client: AsyncClient, reader_token: str
):
    """Simule recupererHistoriqueChat + envoyerMessageChat (création chat)."""
    create = await client.post(
        "/api/v1/chats",
        json={"title": "Comment déployer ?"},
        headers=auth(reader_token),
    )
    chat_id = create.json()["id"]

    chats = await client.get("/api/v1/chats", headers=auth(reader_token))
    assert chats.json()[0]["id"] == chat_id

    messages = await client.get(
        f"/api/v1/chats/{chat_id}/messages?limit=50",
        headers=auth(reader_token),
    )
    assert messages.json() == []
