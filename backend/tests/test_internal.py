"""Tests route interne POST /internal/embed/{page_id}."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.models.page import Page

INTERNAL_KEY = "lekki-internal-secret-key"


@pytest.mark.asyncio
async def test_internal_embed_success(client: AsyncClient, sample_page: Page):
    with patch(
        "app.routers.internal.rag_service.embed_page",
        new_callable=AsyncMock,
        return_value=3,
    ):
        resp = await client.post(
            f"/api/v1/internal/embed/{sample_page.id}",
            headers={"X-Internal-Key": INTERNAL_KEY},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["page_id"] == sample_page.id
    assert data["chunks_created"] == 3


@pytest.mark.asyncio
async def test_internal_embed_unauthorized(client: AsyncClient, sample_page: Page):
    resp = await client.post(
        f"/api/v1/internal/embed/{sample_page.id}",
        headers={"X-Internal-Key": "wrong-key"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_internal_embed_page_not_found(client: AsyncClient):
    with patch(
        "app.routers.internal.rag_service.embed_page",
        new_callable=AsyncMock,
        return_value=None,
    ):
        resp = await client.post(
            "/api/v1/internal/embed/id-inexistant",
            headers={"X-Internal-Key": INTERNAL_KEY},
        )
    assert resp.status_code == 404
