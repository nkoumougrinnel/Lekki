"""Tests des routes /chats."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat, Message
from app.models.user import User
from app.services.auth_service import create_token, hash_password


async def _create_user(db: AsyncSession, email: str, username: str) -> User:
    user = User(
        email=email,
        username=username,
        password_hash=hash_password("password123"),
        role="reader",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _auth_header(user: User) -> dict:
    token = create_token({"sub": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_list_chats(client: AsyncClient, db: AsyncSession):
    user = await _create_user(db, "chat@lekki.com", "chatuser")

    create = await client.post(
        "/api/v1/chats/",
        json={"title": "Mon premier chat"},
        headers=_auth_header(user),
    )
    assert create.status_code == 201
    chat_id = create.json()["id"]
    assert create.json()["title"] == "Mon premier chat"
    assert create.json()["user_id"] == user.id

    listing = await client.get("/api/v1/chats/", headers=_auth_header(user))
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["id"] == chat_id


@pytest.mark.asyncio
async def test_get_chat_forbidden_for_other_user(client: AsyncClient, db: AsyncSession):
    owner = await _create_user(db, "owner@lekki.com", "owner")
    other = await _create_user(db, "other@lekki.com", "other")

    chat = Chat(user_id=owner.id, title="Privé")
    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    resp = await client.get(f"/api/v1/chats/{chat.id}", headers=_auth_header(other))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_chat(client: AsyncClient, db: AsyncSession):
    user = await _create_user(db, "del@lekki.com", "deluser")

    create = await client.post(
        "/api/v1/chats/",
        json={"title": "À supprimer"},
        headers=_auth_header(user),
    )
    chat_id = create.json()["id"]

    delete = await client.delete(f"/api/v1/chats/{chat_id}", headers=_auth_header(user))
    assert delete.status_code == 204

    get_resp = await client.get(f"/api/v1/chats/{chat_id}", headers=_auth_header(user))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_list_messages(client: AsyncClient, db: AsyncSession):
    user = await _create_user(db, "msg@lekki.com", "msguser")
    chat = Chat(user_id=user.id, title="Messages")
    db.add(chat)
    await db.flush()
    db.add_all([
        Message(chat_id=chat.id, role="user", content="Bonjour"),
        Message(chat_id=chat.id, role="assistant", content="Salut !"),
    ])
    await db.commit()

    resp = await client.get(
        f"/api/v1/chats/{chat.id}/messages",
        headers=_auth_header(user),
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_chats_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/chats/")
    assert resp.status_code == 401
