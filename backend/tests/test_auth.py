import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import hash_password


async def _create_user(db: AsyncSession, email: str, username: str, password: str) -> None:
    db.add(
        User(
            email=email,
            username=username,
            password_hash=hash_password(password),
            role="reader",
        )
    )
    await db.commit()


@pytest.mark.asyncio
async def test_register(client: AsyncClient, db: AsyncSession):
    """Pas d'endpoint register — on vérifie la connexion d'un nouvel utilisateur."""
    await _create_user(db, "test@lekki.com", "testuser", "password123")

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@lekki.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@lekki.com"


@pytest.mark.asyncio
async def test_login(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "login@lekki.com", "loginuser", "password123")

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@lekki.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "login@lekki.com", "loginuser", "password123")

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@lekki.com", "password": "mauvais"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_protected(client: AsyncClient, db: AsyncSession):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

    await _create_user(db, "me@lekki.com", "meuser", "password123")
    login = await client.post(
        "/api/v1/auth/login",
        data={"username": "me@lekki.com", "password": "password123"},
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "me@lekki.com"


@pytest.mark.asyncio
async def test_role_viewer_cannot_create(client: AsyncClient, reader_token: str):
    response = await client.post(
        "/api/v1/pages",
        json={"title": "Test", "content": "contenu", "category": "technique"},
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert response.status_code == 403
