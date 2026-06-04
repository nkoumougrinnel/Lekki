"""
Tests du module Audit de connaissance : pages obsolètes, questions sans réponse
regroupées, pages non indexées, documents inutilisés, signalements, score de santé,
connaissances manquantes et cloisonnement par workspace.
"""

from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.page import Page
from app.models.page_flag import PageFlag
from app.models.rag_query import RagQuery
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.services.auth_service import create_token, hash_password


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def audit_data(db: AsyncSession, admin_user: User):
    wsadmin = User(
        email="auditadmin@test.io",
        username="auditadmin",
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

    old = datetime.utcnow() - timedelta(days=400)
    recent = datetime.utcnow() - timedelta(days=1)

    # Page consultée récemment + indexée (saine).
    p_fresh = Page(
        title="Congés", content="...", category="rh", status="published",
        creator_id=admin_user.id, workspace_id=w1.id, view_count=15,
        last_viewed_at=recent, is_embedded=True,
    )
    # Page jamais vue, ancienne → obsolète + inutilisée.
    p_stale = Page(
        title="Vieille politique", content="...", category="rh", status="published",
        creator_id=admin_user.id, workspace_id=w1.id, view_count=0,
        last_viewed_at=None, is_embedded=True,
    )
    # Page sans chunks → non indexée.
    p_unindexed = Page(
        title="Guide non indexé", content="...", category="rh", status="published",
        creator_id=admin_user.id, workspace_id=w1.id, view_count=2,
        last_viewed_at=recent, is_embedded=False,
    )
    # Page dans W2 (autre workspace).
    p_other = Page(
        title="Docker", content="...", category="technique", status="published",
        creator_id=admin_user.id, workspace_id=w2.id, view_count=0,
        is_embedded=True,
    )
    db.add_all([p_fresh, p_stale, p_unindexed, p_other])
    await db.commit()
    for p in (p_fresh, p_stale, p_unindexed, p_other):
        await db.refresh(p)

    # Forcer created_at/updated_at anciens pour p_stale.
    p_stale.created_at = old
    p_stale.updated_at = old
    db.add(p_stale)

    # Chunks avec embeddings pour les pages indexées.
    db.add_all([
        Chunk(page_id=p_fresh.id, workspace_id=w1.id, chunk_index=0,
              chunk_text="x", chunk_hash="h1", token_count=1, embedding=b"\x00"),
        Chunk(page_id=p_stale.id, workspace_id=w1.id, chunk_index=0,
              chunk_text="x", chunk_hash="h2", token_count=1, embedding=b"\x00"),
        Chunk(page_id=p_other.id, workspace_id=w2.id, chunk_index=0,
              chunk_text="x", chunk_hash="h3", token_count=1, embedding=b"\x00"),
    ])

    # Requêtes RAG sans réponse (W1) regroupables + W2.
    db.add_all([
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Comment demander une avance sur salaire ?",
                 confidence=0.1, provider="groq", duration_ms=500, had_results=False),
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Procédure avance salariale ?",
                 confidence=0.0, provider=None, duration_ms=400, had_results=False),
        RagQuery(user_id=wsadmin.id, workspace_id=w1.id, question="Comment obtenir une avance ?",
                 confidence=0.2, provider="groq", duration_ms=600, had_results=False),
        RagQuery(user_id=admin_user.id, workspace_id=w2.id, question="Config Docker ?",
                 confidence=0.9, provider="gemini", duration_ms=300, had_results=True),
    ])
    await db.commit()

    return {
        "w1": w1, "w2": w2, "wsadmin": wsadmin,
        "p_fresh": p_fresh, "p_stale": p_stale,
        "p_unindexed": p_unindexed, "p_other": p_other,
    }


@pytest.mark.asyncio
async def test_stale_pages_scoped(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/pages/stale?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    pages = resp.json()
    titles = [p["page"] for p in pages]
    assert "Vieille politique" in titles
    assert "Docker" not in titles  # autre workspace
    # La plus obsolète (jamais vue + ancienne) doit arriver en tête.
    assert pages[0]["page"] == "Vieille politique"
    assert pages[0]["staleness_score"] >= 80
    assert pages[0]["never_viewed"] is True


@pytest.mark.asyncio
async def test_unanswered_grouping(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/questions/unanswered?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    groups = resp.json()
    # Les 3 questions « avance/salaire » doivent se regrouper en un sujet dominant.
    top = groups[0]
    assert top["occurrences"] >= 3
    assert top["last_occurrence"] is not None


@pytest.mark.asyncio
async def test_unindexed_pages(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/pages/unindexed?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    titles = [p["page"] for p in resp.json()]
    assert "Guide non indexé" in titles
    assert "Congés" not in titles


@pytest.mark.asyncio
async def test_unused_pages(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/pages/unused?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    titles = [p["page"] for p in resp.json()]
    assert "Vieille politique" in titles
    assert "Congés" not in titles
    assert "Docker" not in titles  # W2


@pytest.mark.asyncio
async def test_flag_lifecycle(client, audit_data, db: AsyncSession, admin_token: str):
    page = audit_data["p_fresh"]
    # Flag
    resp = await client.post(
        f"/api/v1/audit/pages/{page.id}/flag",
        json={"flag_type": "outdated"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    await db.refresh(page)
    assert page.flag_count == 1

    # Apparaît dans flagged
    flagged = await client.get(
        f"/api/v1/audit/pages/flagged?workspace_id={audit_data['w1'].id}",
        headers=_auth(admin_token),
    )
    assert any(p["id"] == page.id for p in flagged.json())

    # Type invalide rejeté
    bad = await client.post(
        f"/api/v1/audit/pages/{page.id}/flag",
        json={"flag_type": "nope"},
        headers=_auth(admin_token),
    )
    assert bad.status_code == 422

    # Résolution
    resolved = await client.request(
        "DELETE", f"/api/v1/audit/pages/{page.id}/flag", headers=_auth(admin_token)
    )
    assert resolved.status_code == 200
    await db.refresh(page)
    assert page.flag_count == 0
    rows = (await db.execute(select(PageFlag).where(PageFlag.page_id == page.id))).scalars().all()
    assert all(f.resolved_at is not None for f in rows)


@pytest.mark.asyncio
async def test_health_score(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/health?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    data = resp.json()
    assert 0 <= data["score"] <= 100
    assert data["details"]["unindexed_pages"] >= 1
    assert data["details"]["unanswered_questions"] >= 3
    assert data["score"] < 100  # il y a des problèmes → score pénalisé


@pytest.mark.asyncio
async def test_missing_topics_priority(client, audit_data, admin_token: str):
    w1 = audit_data["w1"]
    resp = await client.get(
        f"/api/v1/audit/missing-topics?workspace_id={w1.id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 200
    topics = resp.json()
    assert len(topics) >= 1
    top = topics[0]
    assert "priority" in top and top["priority"] in ("high", "medium", "low")
    assert top["requests"] >= 1


@pytest.mark.asyncio
async def test_workspace_admin_cannot_audit_other_workspace(client, audit_data):
    wsadmin = audit_data["wsadmin"]
    token = create_token({"sub": wsadmin.id, "role": wsadmin.role})

    ok = await client.get(
        f"/api/v1/audit/health?workspace_id={audit_data['w1'].id}", headers=_auth(token)
    )
    assert ok.status_code == 200

    denied = await client.get(
        f"/api/v1/audit/health?workspace_id={audit_data['w2'].id}", headers=_auth(token)
    )
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_standard_user_no_audit_access(client, audit_data, db: AsyncSession):
    # Utilisateur sans workspace géré → 403 sur portée par défaut.
    user = User(
        email="plain@test.io", username="plain",
        password_hash=hash_password("Pass1234!"), role="reader",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_token({"sub": user.id, "role": user.role})

    denied = await client.get("/api/v1/audit/health", headers=_auth(token))
    assert denied.status_code == 403
