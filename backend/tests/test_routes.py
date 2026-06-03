"""
Lekki Wiki — Tests routes : auth + pages (protection par rôles)
"""

import pytest
from httpx import AsyncClient

from app.models.user import User
from app.models.page import Page


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user: User):
    resp = await client.post("/api/v1/auth/login", data={
        "username": "admin@test.io",
        "password": "Admin1234!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_login_with_username(client: AsyncClient, admin_user: User):
    resp = await client.post("/api/v1/auth/login", data={
        "username": "admin",
        "password": "Admin1234!",
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user: User):
    resp = await client.post("/api/v1/auth/login", data={
        "username": "admin@test.io",
        "password": "mauvais",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", data={
        "username": "nobody@test.io",
        "password": "xxx",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, admin_token: str):
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@test.io"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token(client: AsyncClient):
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token_invalide"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Pages — accès lecture
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_pages_authenticated(
    client: AsyncClient, reader_token: str, sample_page: Page
):
    resp = await client.get(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_list_pages_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/pages")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_page_by_id(
    client: AsyncClient, reader_token: str, sample_page: Page
):
    resp = await client.get(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Page de test"


@pytest.mark.asyncio
async def test_get_page_not_found(client: AsyncClient, reader_token: str):
    resp = await client.get(
        "/api/v1/pages/id-inexistant",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Pages — création
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_page_as_admin(client: AsyncClient, admin_token: str):
    resp = await client.post(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Nouvelle page",
            "content": "Contenu de la page.",
            "category": "technique",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Nouvelle page"


@pytest.mark.asyncio
async def test_create_page_as_editor(client: AsyncClient, editor_token: str):
    resp = await client.post(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {editor_token}"},
        json={
            "title": "Page éditeur",
            "content": "Contenu.",
            "category": "rh",
        },
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_create_page_as_reader_forbidden(client: AsyncClient, reader_token: str):
    resp = await client.post(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {reader_token}"},
        json={
            "title": "Tentative",
            "content": "...",
            "category": "rh",
        },
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Pages — suppression
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_page_as_admin(
    client: AsyncClient, admin_token: str, sample_page: Page
):
    resp = await client.delete(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_page_as_editor_forbidden(
    client: AsyncClient, editor_token: str, sample_page: Page
):
    resp = await client.delete(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {editor_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_page_as_reader_forbidden(
    client: AsyncClient, reader_token: str, sample_page: Page
):
    resp = await client.delete(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Pages — routes sans slash (contrat frontend)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_pages_no_trailing_slash(
    client: AsyncClient, reader_token: str, sample_page: Page
):
    resp = await client.get(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_create_page_no_trailing_slash(client: AsyncClient, admin_token: str):
    resp = await client.post(
        "/api/v1/pages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Page sans slash",
            "content": "Contenu test.",
            "category": "guides",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Page sans slash"


# ---------------------------------------------------------------------------
# Pages — mise à jour
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_page_as_admin(
    client: AsyncClient, admin_token: str, sample_page: Page
):
    resp = await client.put(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"title": "Titre mis à jour", "content": "Nouveau contenu."},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Titre mis à jour"


@pytest.mark.asyncio
async def test_update_page_as_editor_forbidden(
    client: AsyncClient, editor_token: str, sample_page: Page
):
    resp = await client.put(
        f"/api/v1/pages/{sample_page.id}",
        headers={"Authorization": f"Bearer {editor_token}"},
        json={"title": "Tentative"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_search_pages(
    client: AsyncClient, reader_token: str, sample_page: Page
):
    resp = await client.get(
        "/api/v1/pages/search?q=test",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# Santé & racine
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert "docs" in resp.json()

