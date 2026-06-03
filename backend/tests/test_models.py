"""
Lekki Wiki — Tests BD : modèles et CRUD de base
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.page import Page
from app.models.chunk import Chunk
from app.models.chat import Chat, Message
from app.services.auth_service import hash_password, verify_password


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_user(db: AsyncSession):
    user = User(
        email="test@lekki.io",
        username="testuser",
        password_hash=hash_password("password123"),
        role="reader",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    assert user.id is not None
    assert user.email == "test@lekki.io"
    assert user.role == "reader"
    assert user.created_at is not None


@pytest.mark.asyncio
async def test_user_email_unique(db: AsyncSession):
    u1 = User(email="dup@lekki.io", username="u1", password_hash="x", role="reader")
    u2 = User(email="dup@lekki.io", username="u2", password_hash="x", role="reader")
    db.add(u1)
    await db.commit()
    db.add(u2)
    with pytest.raises(Exception):
        await db.commit()


@pytest.mark.asyncio
async def test_user_username_unique(db: AsyncSession):
    u1 = User(email="a@lekki.io", username="same", password_hash="x", role="reader")
    u2 = User(email="b@lekki.io", username="same", password_hash="x", role="reader")
    db.add(u1)
    await db.commit()
    db.add(u2)
    with pytest.raises(Exception):
        await db.commit()


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_page(db: AsyncSession, admin_user: User):
    page = Page(
        title="Guide onboarding",
        content="Bienvenue dans l'équipe !",
        category="rh",
        status="published",
        creator_id=admin_user.id,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)

    assert page.id is not None
    assert page.title == "Guide onboarding"
    assert page.is_embedded is False
    assert page.view_count == 0


@pytest.mark.asyncio
async def test_page_default_status(db: AsyncSession, admin_user: User):
    page = Page(
        title="Brouillon",
        content="...",
        category="technique",
        creator_id=admin_user.id,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
    assert page.status == "published"  # valeur par défaut du modèle


@pytest.mark.asyncio
async def test_page_creator_relationship(db: AsyncSession, admin_user: User):
    page = Page(
        title="Test relation",
        content="...",
        category="guides",
        creator_id=admin_user.id,
    )
    db.add(page)
    await db.commit()

    result = await db.execute(select(Page).where(Page.id == page.id))
    fetched = result.scalar_one()
    assert fetched.creator_id == admin_user.id


# ---------------------------------------------------------------------------
# Chunk
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_chunk(db: AsyncSession, sample_page: Page):
    chunk = Chunk(
        page_id=sample_page.id,
        chunk_index=0,
        chunk_text="Premier fragment de texte.",
        chunk_hash="abc123",
        token_count=5,
    )
    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)

    assert chunk.id is not None
    assert chunk.page_id == sample_page.id
    assert chunk.chunk_index == 0


@pytest.mark.asyncio
async def test_chunks_deleted_with_page(db: AsyncSession, sample_page: Page):
    """Cascade delete : les chunks sont supprimés avec la page."""
    chunk = Chunk(
        page_id=sample_page.id,
        chunk_index=0,
        chunk_text="Fragment.",
        chunk_hash="xyz",
        token_count=1,
    )
    db.add(chunk)
    await db.commit()

    await db.delete(sample_page)
    await db.commit()

    result = await db.execute(select(Chunk).where(Chunk.page_id == sample_page.id))
    assert result.scalar_one_or_none() is None


# ---------------------------------------------------------------------------
# Chat & Message
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_chat(db: AsyncSession, reader_user: User):
    chat = Chat(title="Ma conversation", user_id=reader_user.id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    assert chat.id is not None
    assert chat.user_id == reader_user.id


@pytest.mark.asyncio
async def test_create_message(db: AsyncSession, reader_user: User):
    chat = Chat(title="Test", user_id=reader_user.id)
    db.add(chat)
    await db.commit()

    msg = Message(
        chat_id=chat.id,
        role="user",
        content="Quelle est la politique de congés ?",
        tokens_used=10,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    assert msg.id is not None
    assert msg.role == "user"
    assert msg.sources is None


@pytest.mark.asyncio
async def test_messages_deleted_with_chat(db: AsyncSession, reader_user: User):
    """Cascade delete : les messages sont supprimés avec le chat."""
    chat = Chat(title="À supprimer", user_id=reader_user.id)
    db.add(chat)
    await db.commit()

    msg = Message(chat_id=chat.id, role="user", content="test", tokens_used=1)
    db.add(msg)
    await db.commit()

    await db.delete(chat)
    await db.commit()

    result = await db.execute(select(Message).where(Message.chat_id == chat.id))
    assert result.scalar_one_or_none() is None


# ---------------------------------------------------------------------------
# Auth — passwords
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hash_and_verify_password():
    hashed = hash_password("MonMotDePasse!")
    assert verify_password("MonMotDePasse!", hashed) is True
    assert verify_password("mauvais", hashed) is False


@pytest.mark.asyncio
async def test_verify_placeholder_hash():
    """Compatibilité avec les seeds SHA-256."""
    import hashlib
    plain = "Admin1234!"
    placeholder = "PLACEHOLDER:" + hashlib.sha256(plain.encode()).hexdigest()
    assert verify_password(plain, placeholder) is True
    assert verify_password("mauvais", placeholder) is False
