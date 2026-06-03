"""
Lekki Wiki — Fixtures pytest (async, SQLite in-memory)
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.page import Page
from app.models.chunk import Chunk
from app.models.chat import Chat, Message
from app.services.auth_service import hash_password, create_token

# ---------------------------------------------------------------------------
# Base de données in-memory pour les tests
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    """Recrée les tables avant chaque test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
                    title, content, page_id UNINDEXED
                )
                """
            )
        )
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("DROP TABLE IF EXISTS pages_fts"))


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Utilisateurs de test
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    user = User(
        email="admin@test.io",
        username="admin",
        password_hash=hash_password("Admin1234!"),
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def editor_user(db: AsyncSession) -> User:
    user = User(
        email="editor@test.io",
        username="editor",
        password_hash=hash_password("Editor1234!"),
        role="editor",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def reader_user(db: AsyncSession) -> User:
    user = User(
        email="reader@test.io",
        username="reader",
        password_hash=hash_password("Reader1234!"),
        role="reader",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Tokens JWT de test
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def admin_token(admin_user: User) -> str:
    return create_token({"sub": admin_user.id, "role": admin_user.role})


@pytest_asyncio.fixture
async def editor_token(editor_user: User) -> str:
    return create_token({"sub": editor_user.id, "role": editor_user.role})


@pytest_asyncio.fixture
async def reader_token(reader_user: User) -> str:
    return create_token({"sub": reader_user.id, "role": reader_user.role})


# ---------------------------------------------------------------------------
# Page de test
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def sample_page(db: AsyncSession, admin_user: User) -> Page:
    page = Page(
        title="Page de test",
        content="Contenu de test pour les tests unitaires.",
        category="technique",
        status="published",
        creator_id=admin_user.id,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
    return page


# ---------------------------------------------------------------------------
# Chat de test
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def sample_chat(db: AsyncSession, reader_user: User) -> Chat:
    chat = Chat(title="Conversation de test", user_id=reader_user.id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat
