from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.drive import DriveFile
from app.models.wiki import WikiPage
from app.schemas.rag import UnifiedSearchResponse, SearchItem
from app.identity.models import User
from app.middleware.auth import get_current_user
from app.core.access import (
    accessible_workspace_ids,
    file_visibility_clause,
    filter_visible_files,
    is_platform_admin,
    require_workspace_member,
    wiki_visibility_clause,
)

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=UnifiedSearchResponse)
async def unified_search(
    q: str = "",
    workspace_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query_str = q.strip()
    if not query_str:
        return UnifiedSearchResponse(query=q, total=0, documents=[], wiki_pages=[])

    s_pattern = f"%{query_str.lower()}%"
    workspace_ids = await accessible_workspace_ids(db, current_user)
    if workspace_id:
        await require_workspace_member(db, current_user, workspace_id)
    admin = is_platform_admin(current_user)

    # Search Drive Files
    f_stmt = select(DriveFile).where(
        DriveFile.is_deleted == False,
        or_(
            DriveFile.name.ilike(s_pattern),
            DriveFile.summary.ilike(s_pattern),
            DriveFile.content.ilike(s_pattern)
        )
    )
    if not admin:
        f_stmt = f_stmt.where(file_visibility_clause(current_user, workspace_ids))
    if workspace_id:
        # L'espace courant + les documents personnels de l'utilisateur
        f_stmt = f_stmt.where(or_(
            DriveFile.workspace_id == workspace_id,
            (DriveFile.workspace_id == None) & (DriveFile.owner_id == current_user.id),
        ))

    f_res = await db.execute(f_stmt)
    files = filter_visible_files(current_user, workspace_ids, f_res.scalars().all())

    # Search Wiki Pages
    w_stmt = select(WikiPage).where(
        or_(
            WikiPage.title.ilike(s_pattern),
            WikiPage.content.ilike(s_pattern),
            WikiPage.topic.ilike(s_pattern),
            WikiPage.section.ilike(s_pattern)
        )
    )
    if not admin:
        w_stmt = w_stmt.where(wiki_visibility_clause(current_user, workspace_ids))
    if workspace_id:
        w_stmt = w_stmt.where(WikiPage.workspace_id == workspace_id)

    w_res = await db.execute(w_stmt)
    wiki_pages = w_res.scalars().all()

    doc_items = [
        SearchItem(
            id=f.id,
            type="document",
            title=f.name,
            excerpt=f.summary or (f.content[:150] if f.content else ""),
            extension=f.extension,
            workspace_id=f.workspace_id
        )
        for f in files
    ]

    wiki_items = [
        SearchItem(
            id=p.id,
            type="wiki",
            title=p.title,
            excerpt=p.content[:160] + "..." if len(p.content) > 160 else p.content,
            topic=p.topic,
            category=p.category,
            workspace_id=p.workspace_id
        )
        for p in wiki_pages
    ]

    return UnifiedSearchResponse(
        query=q,
        total=len(doc_items) + len(wiki_items),
        documents=doc_items,
        wiki_pages=wiki_items
    )
