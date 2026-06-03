"""Tests routes /ask avec persistance chat et /users admin."""

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat, Message
from app.models.user import User
from app.services.auth_service import hash_password, create_token


def _auth(user: User) -> dict:
    token = create_token({"sub": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ask_without_auth_allowed(client: AsyncClient):
    """Sans chat_id, /ask est public (MVP)."""
    with patch(
        "app.routers.rag.rag_service.get_relevant_chunks",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.post("/api/v1/ask", json={"question": "Hello?"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_ask_with_chat_id_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Hello?", "chat_id": "fake-id"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ask_persists_messages(client: AsyncClient, db: AsyncSession, reader_token: str, reader_user: User):
    chat = Chat(user_id=reader_user.id, title="RAG test")
    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse persistée.", "groq"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Ma question ?", "chat_id": chat.id},
                headers={"Authorization": f"Bearer {reader_token}"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["message_id"] is not None
    assert data["user_message_id"] is not None

    result = await db.execute(select(Message).where(Message.chat_id == chat.id))
    messages = result.scalars().all()
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[0].content == "Ma question ?"
    assert messages[1].role == "assistant"


@pytest.mark.asyncio
async def test_ask_forbidden_on_foreign_chat(client: AsyncClient, db: AsyncSession, reader_token: str, reader_user: User):
    other = User(
        email="other@lekki.com",
        username="otheruser",
        password_hash=hash_password("password123"),
        role="reader",
    )
    db.add(other)
    await db.flush()
    chat = Chat(user_id=other.id, title="Privé")
    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    resp = await client.post(
        "/api/v1/ask",
        json={"question": "Test", "chat_id": chat.id},
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_list_users(client: AsyncClient, admin_token: str, reader_user: User):
    resp = await client.get("/api/v1/users/", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert reader_user.email in emails


@pytest.mark.asyncio
async def test_reader_cannot_list_users(client: AsyncClient, reader_token: str):
    resp = await client.get("/api/v1/users/", headers={"Authorization": f"Bearer {reader_token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_update_role(client: AsyncClient, admin_token: str, reader_user: User):
    resp = await client.put(
        f"/api/v1/users/{reader_user.id}/role",
        json={"role": "editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"


@pytest.mark.asyncio
async def test_admin_cannot_change_own_role(client: AsyncClient, admin_token: str, admin_user: User):
    resp = await client.put(
        f"/api/v1/users/{admin_user.id}/role",
        json={"role": "reader"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_embed(client: AsyncClient, db: AsyncSession, sample_page):
    from app.models.chunk import Chunk

    db.add(
        Chunk(
            page_id=sample_page.id,
            chunk_index=0,
            chunk_text="test",
            chunk_hash="abc",
            token_count=1,
        )
    )
    sample_page.is_embedded = True
    await db.commit()

    resp = await client.delete(
        f"/api/v1/internal/embed/{sample_page.id}",
        headers={"X-Internal-Key": "lekki-internal-secret-key"},
    )
    assert resp.status_code == 200

    result = await db.execute(select(Chunk).where(Chunk.page_id == sample_page.id))
    assert len(result.scalars().all()) == 0
