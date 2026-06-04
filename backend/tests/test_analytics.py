"""
Tests du module Analytics : tracking automatique des requêtes RAG, cloisonnement
par workspace, questions sans réponse et détection des sujets manquants.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.page import Page
from app.models.rag_query import RagQuery
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.services.auth_service import create_token, hash_password


def _fake_chunk(page_id: str) -> Chunk:
    return Chunk(
        page_id=page_id,
        chunk_index=0,
        chunk_text="Contenu pertinent",
        chunk_hash="h",
        token_count=3,
    )


# ---------------------------------------------------------------------------
# Données de test : 2 workspaces, pages, requêtes RAG
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def analytics_data(db: AsyncSession, admin_user: User):
    # Workspace admin local (rôle global reader, mais admin du workspace W1)
    wsadmin = User(
        email="wsadmin@test.io",
        username="wsadmin",
        password_hash=hash_password("Pass1234!"),
        role="reader",
    )
    db.add(wsadmin)
    await db.commit()
    await db.refresh(wsadmin)

    w1 = Workspace(name="RH", owner_id=admin_user.id)
    w2 = Workspace(name="Technique", owner_id=admin_user.id)
    db.add_all([w1, w2])
    await db.commit()
    await db.refresh(w1)
    await db.refresh(w2)

    db.add(WorkspaceMember(workspace_id=w1.id, user_id=wsadmin.id, role="admin"))

    # Pages
    db.add_all([
        Page(title="Congés", content="...", category="rh", status="published",
             creator_id=admin_user.id, workspace_id=w1.id, view_count=10),
        Page(title="Paie", content="...", category="rh", status="published",
             creator_id=admin_user.id, workspace_id=w1.id, view_count=3),
        Page(title="Docker", content="...", category="technique", status="published",
             creator_id=admin_user.id, workspace_id=w2.id, view_count=7),
        Page(title="Jamais vue", content="...", category="rh", status="published",
             creator_id=admin_user.id, workspace_id=w1.id, view_count=0),
    ])

    # Requêtes RAG : W1 (dont des échecs) et W2
    db.add_all([
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Comment poser un congé ?",
                 confidence=0.92, provider="gemini", duration_ms=1450, had_results=True),
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Comment poser un congé ?",
                 confidence=0.80, provider="gemini", duration_ms=900, had_results=True),
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Avance sur salaire possible ?",
                 confidence=0.1, provider="groq", duration_ms=700, had_results=False),
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Politique de télétravail ?",
                 confidence=0.0, provider=None, duration_ms=500, had_results=False),
        RagQuery(user_id=admin_user.id, workspace_id=w2.id, question="Config Docker secrète ?",
                 confidence=0.95, provider="cerebras", duration_ms=1200, had_results=True),
    ])
    await db.commit()

    return {"w1": w1, "w2": w2, "wsadmin": wsadmin}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tracking automatique
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rag_query_tracked_on_ask(client, db: AsyncSession, sample_page: Page, admin_token: str):
    with patch(
        "app.routers.rag.llm.ask_question",
        new_callable=AsyncMock,
        return_value=("Réponse.", "gemini"),
    ):
        with patch(
            "app.routers.rag.rag_service.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[(0.92, _fake_chunk(sample_page.id))],
        ):
            resp = await client.post(
                "/api/v1/ask",
                json={"question": "Comment poser un congé ?"},
                headers=_auth(admin_token),
            )
    assert resp.status_code == 200

    rows = (await db.execute(select(RagQuery))).scalars().all()
    assert len(rows) == 1
    q = rows[0]
    assert q.question == "Comment poser un congé ?"
    assert q.provider == "gemini"
    assert q.had_results is True
    assert q.confidence == 0.92
    assert q.duration_ms is not None and q.duration_ms >= 0


@pytest.mark.asyncio
async def test_smalltalk_not_tracked(client, db: AsyncSession, admin_token: str):
    resp = await client.post(
        "/api/v1/ask", json={"question": "Bonjour"}, headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    rows = (await db.execute(select(RagQuery))).scalars().all()
    assert len(rows) == 0


@pytest.mark.asyncio
async def test_page_view_tracked(client, db: AsyncSession, sample_page: Page, admin_token: str):
    resp = await client.get(f"/api/v1/pages/{sample_page.id}", headers=_auth(admin_token))
    assert resp.status_code == 200
    assert resp.json()["view_count"] == 1
    await db.refresh(sample_page)
    assert sample_page.view_count == 1
    assert sample_page.last_viewed_at is not None


# ---------------------------------------------------------------------------
# Endpoints + cloisonnement
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_overview_global_super_admin(client, analytics_data, admin_token: str):
    resp = await client.get("/api/v1/analytics/overview", headers=_auth(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["documents"] == 4
    assert data["workspaces"] == 2
    assert data["questions"] == 5


@pytest.mark.asyncio
async def test_overview_scoped_to_workspace(client, analytics_data, admin_token: str):
    w1 = analytics_data["w1"]
    resp = await client.get(
        f"/api/v1/analytics/overview?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["documents"] == 3  # 3 pages dans W1
    assert data["questions"] == 4  # 4 requêtes dans W1
    assert data["never_viewed_pages"] == 1


@pytest.mark.asyncio
async def test_workspace_admin_cannot_see_other_workspace(client, analytics_data):
    wsadmin = analytics_data["wsadmin"]
    w2 = analytics_data["w2"]
    token = create_token({"sub": wsadmin.id, "role": wsadmin.role})

    # Accès à son propre workspace : OK
    ok = await client.get(
        f"/api/v1/analytics/overview?workspace_id={analytics_data['w1'].id}",
        headers=_auth(token),
    )
    assert ok.status_code == 200

    # Accès au workspace d'un autre : interdit
    denied = await client.get(
        f"/api/v1/analytics/overview?workspace_id={w2.id}", headers=_auth(token)
    )
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_top_pages_scoped(client, analytics_data, admin_token: str):
    w1 = analytics_data["w1"]
    resp = await client.get(
        f"/api/v1/analytics/pages/top?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    pages = resp.json()
    titles = [p["title"] for p in pages]
    assert titles[0] == "Congés"  # view_count le plus élevé de W1
    assert "Docker" not in titles  # appartient à W2


@pytest.mark.asyncio
async def test_failed_questions(client, analytics_data, admin_token: str):
    w1 = analytics_data["w1"]
    resp = await client.get(
        f"/api/v1/analytics/questions/failed?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    failed = resp.json()
    questions = {f["question"] for f in failed}
    assert "Avance sur salaire possible ?" in questions
    assert "Politique de télétravail ?" in questions
    assert "Comment poser un congé ?" not in questions


@pytest.mark.asyncio
async def test_providers_usage(client, analytics_data, admin_token: str):
    resp = await client.get("/api/v1/analytics/providers", headers=_auth(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("Gemini") == 2
    assert data.get("Groq") == 1
    assert data.get("Cerebras") == 1


@pytest.mark.asyncio
async def test_top_questions(client, analytics_data, admin_token: str):
    w1 = analytics_data["w1"]
    resp = await client.get(
        f"/api/v1/analytics/questions/top?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    top = resp.json()
    assert top[0]["question"] == "Comment poser un congé ?"
    assert top[0]["count"] == 2


@pytest.mark.asyncio
async def test_missing_topics(client, analytics_data, admin_token: str):
    w1 = analytics_data["w1"]
    resp = await client.get(
        f"/api/v1/analytics/missing-topics?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    topics = [t["topic"].lower() for t in resp.json()]
    # Les questions sans réponse parlent de « salaire »/« avance » et « télétravail ».
    assert any("salaire" in t or "avance" in t for t in topics)
    assert any("télétravail" in t or "teletravail" in t for t in topics)


@pytest.mark.asyncio
async def test_super_admin_dashboard_requires_global_admin(client, analytics_data):
    wsadmin = analytics_data["wsadmin"]
    token = create_token({"sub": wsadmin.id, "role": wsadmin.role})
    denied = await client.get("/api/v1/analytics/super-admin", headers=_auth(token))
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_dashboard_ok(client, analytics_data, admin_token: str):
    resp = await client.get("/api/v1/analytics/super-admin", headers=_auth(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_workspaces"] == 2
    assert data["total_queries"] == 5
    assert "disk_usage_bytes" in data
    assert "providers" in data
