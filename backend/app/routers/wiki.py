from typing import List, Optional
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.knowledge.wiki.models import WikiPage, WikiHistory
from app.knowledge.wiki.schemas import WikiPageOut, WikiPageCreate, WikiPageUpdate, WikiStatusUpdate, WikiHistoryOut
from app.middleware.auth import get_current_user
from app.workspaces.models import Workspace, WorkspaceMember

router = APIRouter(prefix="/wiki", tags=["Wiki"])


async def require_wiki_manager(
    workspace_id: Optional[str],
    current_user: User,
    db: AsyncSession,
) -> None:
    if current_user.role == "admin":
        return
    if not workspace_id:
        raise HTTPException(status_code=403, detail="Droits d’administration requis")

    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace introuvable")
    if workspace.owner_id == current_user.id:
        return

    membership_res = await db.execute(
        select(WorkspaceMember.role).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if membership_res.scalar_one_or_none() not in {"owner", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs et propriétaires du workspace peuvent supprimer du contenu Wiki",
        )


async def delete_wiki_pages(pages: list[WikiPage], db: AsyncSession) -> None:
    page_ids = [page.id for page in pages]
    if not page_ids:
        return

    # Remove links to the deleted pages from the surviving pages in the same workspace.
    workspace_ids = {page.workspace_id for page in pages}
    deleted_ids = set(page_ids)
    for workspace_id in workspace_ids:
        if not workspace_id:
            continue
        result = await db.execute(
            select(WikiPage).where(
                WikiPage.workspace_id == workspace_id,
                WikiPage.id.not_in(deleted_ids),
            )
        )
        for survivor in result.scalars().all():
            try:
                linked_ids = json.loads(survivor.related_wiki_ids or "[]")
            except (TypeError, json.JSONDecodeError):
                linked_ids = []
            filtered_ids = [linked_id for linked_id in linked_ids if linked_id not in deleted_ids]
            if filtered_ids != linked_ids:
                survivor.related_wiki_ids = json.dumps(filtered_ids)

    await db.execute(delete(WikiHistory).where(WikiHistory.page_id.in_(page_ids)))
    await db.execute(delete(WikiPage).where(WikiPage.id.in_(page_ids)))
    await db.commit()


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
        editor_res = await db.execute(
            select(User.name).where(
                User.id == (p.last_editor_id or p.creator_id)
            )
        )
        last_editor_name = editor_res.scalar_one_or_none()

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
            author_name=last_editor_name,
            last_editor_name=last_editor_name,
            current_version=max((h.version for h in histories), default=1),
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
    editor_res = await db.execute(
        select(User.name).where(User.id == (p.last_editor_id or p.creator_id))
    )
    last_editor_name = editor_res.scalar_one_or_none()

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
        author_name=last_editor_name,
        last_editor_name=last_editor_name,
        current_version=max((h.version for h in histories), default=1),
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
        parent_page_id=None,
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
        author_name=current_user.name,
        last_editor_name=current_user.name,
        current_version=1,
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

    # Wiki pages are peers; other pages are linked as sources, not nested.
    page.parent_page_id = None

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

        if page.status in {"draft", "verified"}:
            page.status = "community"
            page.status_verified_by = None
            page.status_verified_at = None

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

    if data.status not in {"draft", "community", "verified"}:
        raise HTTPException(status_code=400, detail="Statut Wiki invalide")

    if data.status == "verified" or page.status == "verified":
        can_verify = current_user.role == "admin"
        if page.workspace_id:
            workspace = await db.get(Workspace, page.workspace_id)
            can_verify = can_verify or bool(
                workspace and workspace.owner_id == current_user.id
            )
            membership_res = await db.execute(
                select(WorkspaceMember.role).where(
                    WorkspaceMember.workspace_id == page.workspace_id,
                    WorkspaceMember.user_id == current_user.id,
                )
            )
            can_verify = can_verify or membership_res.scalar_one_or_none() in {
                "owner",
                "admin",
                "verifier",
            }
        if not can_verify:
            raise HTTPException(
                status_code=403,
                detail="Seuls les référents, administrateurs ou propriétaires peuvent modifier le statut d’une page vérifiée",
            )

    page.status = data.status
    page.last_editor_id = current_user.id
    page.updated_at = datetime.utcnow()
    if data.status == "verified":
        page.status_verified_by = f"{current_user.name} (Référent)"
        page.status_verified_at = page.updated_at
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


@router.delete("/pages/section")
async def delete_wiki_section(
    workspace_id: str,
    topic: str,
    section: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_wiki_manager(workspace_id, current_user, db)
    pages_result = await db.execute(
        select(WikiPage).where(
            WikiPage.workspace_id == workspace_id,
            WikiPage.topic == topic,
            WikiPage.section == section,
        )
    )
    pages = pages_result.scalars().all()
    if not pages:
        raise HTTPException(status_code=404, detail="Section Wiki introuvable")
    await delete_wiki_pages(pages, db)
    return {"deleted_pages": len(pages)}


@router.delete("/pages/{page_id}")
async def delete_wiki_page(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page Wiki introuvable")
    await require_wiki_manager(page.workspace_id, current_user, db)
    await delete_wiki_pages([page], db)
    return None
