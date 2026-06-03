import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_register():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/register", json={
            "email": "test@lekki.com",
            "username": "testuser",
            "password": "password123"
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@lekki.com"

@pytest.mark.asyncio
async def test_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/api/auth/register", json={
            "email": "login@lekki.com",
            "username": "loginuser",
            "password": "password123"
        })
        response = await client.post("/api/auth/login", json={
            "email": "login@lekki.com",
            "password": "password123"
        })
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "email": "login@lekki.com",
            "password": "mauvais"
        })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_me_protected():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Sans token → 403
        response = await client.get("/api/auth/me")
        assert response.status_code == 403

        # Avec token → 200
        reg = await client.post("/api/auth/register", json={
            "email": "me@lekki.com",
            "username": "meuser",
            "password": "password123"
        })
        token = reg.json()["access_token"]
        response = await client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        assert response.json()["email"] == "me@lekki.com"

@pytest.mark.asyncio
async def test_role_viewer_cannot_create():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "email": "viewer@lekki.com",
            "username": "vieweruser",
            "password": "password123"
        })
        token = reg.json()["access_token"]
        response = await client.post("/api/pages", 
            json={"title": "Test", "content": "contenu"},
            headers={"Authorization": f"Bearer {token}"}
        )
        # viewer ne peut pas créer → 403
        assert response.status_code == 403