from typing import List, Optional
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.knowledge.wiki.models import WikiPage, WikiHistory
from app.knowledge.wiki.schemas import WikiPageOut, WikiPageCreate, WikiPageUpdate, WikiStatusUpdate, WikiHistoryOut
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/wiki", tags=["Wiki"])


@router.get("/pages", response_model=List[WikiPageOut])
async def list_wiki_pages(
    workspace_id: Optional[str] = None,
    category: Optional[str] = None,
    topic: Optional[str] = None,
    section: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(WikiPage).order_by(desc(WikiPage.updated_at))
    if workspace_id:
        query = query.where(WikiPage.workspace_id == workspace_id)
    if category:
        query = query.where(WikiPage.category == category)
    if topic:
        query = query.where(WikiPage.topic == topic)
    if section:
        query = query.where(WikiPage.section == section)
    if status:
        query = query.where(WikiPage.status == status)

    result = await db.execute(query)
    pages = result.scalars().all()

    out = []
    for p in pages:
        # Load histories
        h_res = await db.execute(
            select(WikiHistory).where(WikiHistory.page_id == p.id).order_by(desc(WikiHistory.version))
        )
        histories = h_res.scalars().all()

        docs = []
        wikis = []
        try:
            docs = json.loads(p.related_document_ids or "[]")
        except Exception:
            pass
        try:
            wikis = json.loads(p.related_wiki_ids or "[]")
        except Exception:
            pass

        out.append(WikiPageOut(
            id=p.id,
            title=p.title,
            content=p.content,
            category=p.category or "cours",
            topic=p.topic or "Général",
            section=p.section or "Général",
            parent_page_id=p.parent_page_id,
            workspace_id=p.workspace_id,
            status=p.status or "draft",
            status_verified_by=p.status_verified_by,
            status_verified_at=p.status_verified_at,
            creator_id=p.creator_id,
            last_editor_id=p.last_editor_id,
            view_count=p.view_count or 1,
            related_document_ids=docs,
            related_wiki_ids=wikis,
            history=[
                WikiHistoryOut(
                    id=h.id,
                    version=h.version,
                    author_id=h.author_id,
                    author_name=h.author_name,
                    comment=h.comment,
                    content=h.content,
                    updated_at=h.updated_at
                )
                for h in histories
            ],
            created_at=p.created_at,
            updated_at=p.updated_at
        ))
    return out


@router.get("/pages/{page_id}", response_model=WikiPageOut)
async def get_wiki_page(page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Page Wiki introuvable")

    p.view_count = (p.view_count or 0) + 1
    await db.commit()

    h_res = await db.execute(
        select(WikiHistory).where(WikiHistory.page_id == p.id).order_by(desc(WikiHistory.version))
    )
    histories = h_res.scalars().all()

    docs = []
    wikis = []
    try:
        docs = json.loads(p.related_document_ids or "[]")
    except Exception:
        pass
    try:
        wikis = json.loads(p.related_wiki_ids or "[]")
    except Exception:
        pass

    return WikiPageOut(
        id=p.id,
        title=p.title,
        content=p.content,
        category=p.category or "cours",
        topic=p.topic or "Général",
        section=p.section or "Général",
        parent_page_id=p.parent_page_id,
        workspace_id=p.workspace_id,
        status=p.status or "draft",
        status_verified_by=p.status_verified_by,
        status_verified_at=p.status_verified_at,
        creator_id=p.creator_id,
        last_editor_id=p.last_editor_id,
        view_count=p.view_count,
        related_document_ids=docs,
        related_wiki_ids=wikis,
        history=[
            WikiHistoryOut(
                id=h.id,
                version=h.version,
                author_id=h.author_id,
                author_name=h.author_name,
                comment=h.comment,
                content=h.content,
                updated_at=h.updated_at
            )
            for h in histories
        ],
        created_at=p.created_at,
        updated_at=p.updated_at
    )


@router.post("/pages", response_model=WikiPageOut)
async def create_wiki_page(
    data: WikiPageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    page_id = f"wiki-{uuid.uuid4().hex[:8]}"
    content = data.content or f"# {data.title}\n\nContenu en cours de rédaction..."
    
    page = WikiPage(
        id=page_id,
        title=data.title,
        content=content,
        category=data.category or "cours",
        topic=data.topic or "Général",
        section=data.section or "Général",
        parent_page_id=data.parent_page_id,
        workspace_id=data.workspace_id,
        status="draft",
        creator_id=current_user.id,
        last_editor_id=current_user.id,
        view_count=1,
        related_document_ids=json.dumps(data.related_document_ids or []),
        related_wiki_ids=json.dumps(data.related_wiki_ids or [])
    )
    db.add(page)

    history = WikiHistory(
        id=f"wh-{uuid.uuid4().hex[:8]}",
        page_id=page_id,
        version=1,
        author_id=current_user.id,
        author_name=current_user.name,
        comment="Création initiale de la page",
        content=content,
        updated_at=datetime.utcnow()
    )
    db.add(history)

    await db.commit()
    await db.refresh(page)

    return WikiPageOut(
        id=page.id,
        title=page.title,
        content=page.content,
        category=page.category,
        topic=page.topic,
        section=page.section,
        parent_page_id=page.parent_page_id,
        workspace_id=page.workspace_id,
        status=page.status,
        creator_id=page.creator_id,
        last_editor_id=page.last_editor_id,
        view_count=1,
        related_document_ids=data.related_document_ids or [],
        related_wiki_ids=data.related_wiki_ids or [],
        history=[
            WikiHistoryOut(
                id=history.id,
                version=1,
                author_id=current_user.id,
                author_name=current_user.name,
                comment=history.comment,
                content=content,
                updated_at=history.updated_at
            )
        ],
        created_at=page.created_at,
        updated_at=page.updated_at
    )


@router.put("/pages/{page_id}", response_model=WikiPageOut)
async def update_wiki_page(
    page_id: str,
    data: WikiPageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page Wiki introuvable")

    if data.title:
        page.title = data.title
    if data.category:
        page.category = data.category
    if data.topic:
        page.topic = data.topic
    if data.section:
        page.section = data.section
    if data.related_document_ids is not None:
        page.related_document_ids = json.dumps(data.related_document_ids)
    if data.related_wiki_ids is not None:
        page.related_wiki_ids = json.dumps(data.related_wiki_ids)

    # If content changed, create history entry
    if data.content and data.content != page.content:
        page.content = data.content
        
        # count existing versions
        h_res = await db.execute(select(WikiHistory).where(WikiHistory.page_id == page.id))
        count = len(h_res.scalars().all())
        new_version = count + 1

        new_hist = WikiHistory(
            id=f"wh-{uuid.uuid4().hex[:8]}",
            page_id=page.id,
            version=new_version,
            author_id=current_user.id,
            author_name=current_user.name,
            comment=data.comment or f"Mise à jour v{new_version}",
            content=data.content,
            updated_at=datetime.utcnow()
        )
        db.add(new_hist)

        if page.status == "draft":
            page.status = "community"

    page.last_editor_id = current_user.id
    page.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(page)

    return await get_wiki_page(page_id, db)


@router.post("/pages/{page_id}/status", response_model=WikiPageOut)
async def update_page_status(
    page_id: str,
    data: WikiStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page Wiki introuvable")

    if data.status in ["draft", "community", "verified"]:
        page.status = data.status
        if data.status == "verified":
            page.status_verified_by = f"{current_user.name} (Référent)"
            page.status_verified_at = datetime.utcnow()
        else:
            page.status_verified_by = None
            page.status_verified_at = None

    await db.commit()
    return await get_wiki_page(page_id, db)


@router.post("/pages/{page_id}/restore/{version}", response_model=WikiPageOut)
async def restore_page_version(
    page_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page Wiki introuvable")

    h_res = await db.execute(
        select(WikiHistory).where(WikiHistory.page_id == page_id, WikiHistory.version == version)
    )
    entry = h_res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Version introuvable")

    page.content = entry.content
    all_h = await db.execute(select(WikiHistory).where(WikiHistory.page_id == page.id))
    new_ver = len(all_h.scalars().all()) + 1

    restored_h = WikiHistory(
        id=f"wh-{uuid.uuid4().hex[:8]}",
        page_id=page.id,
        version=new_ver,
        author_id=current_user.id,
        author_name=current_user.name,
        comment=f"Restauration de la version v{version}",
        content=entry.content,
        updated_at=datetime.utcnow()
    )
    db.add(restored_h)
    await db.commit()

    return await get_wiki_page(page_id, db)


@router.delete("/pages/{page_id}")
async def delete_wiki_page(page_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if page:
        await db.delete(page)
        await db.commit()
    return None
