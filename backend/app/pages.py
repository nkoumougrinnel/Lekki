from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.page import Page
from app.schemas.page import PageCreate, PageUpdate
from typing import List, Optional

async def get_pages(db: AsyncSession, skip: int = 0, limit: int = 100, category: Optional[str] = None) -> List[Page]:
    query = select(Page).offset(skip).limit(limit)
    if category:
        query = query.where(Page.category == category)
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_page(db: AsyncSession, page_id: str) -> Optional[Page]:
    result = await db.execute(select(Page).where(Page.id == page_id))
    return result.scalar_one_or_none()

async def create_page(db: AsyncSession, page_in: PageCreate, creator_id: str) -> Page:
    db_page = Page(
        **page_in.model_dump(),
        creator_id=creator_id
    )
    db.add(db_page)
    await db.commit()
    await db.refresh(db_page)
    return db_page

async def update_page(db: AsyncSession, page_id: str, page_in: PageUpdate) -> Optional[Page]:
    result = await db.execute(select(Page).where(Page.id == page_id))
    db_page = result.scalar_one_or_none()
    if not db_page:
        return None
        
    update_data = page_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_page, key, value)
        
    await db.commit()
    await db.refresh(db_page)
    return db_page

async def delete_page(db: AsyncSession, page_id: str) -> bool:
    result = await db.execute(select(Page).where(Page.id == page_id))
    db_page = result.scalar_one_or_none()
    if not db_page:
        return False
    await db.delete(db_page)
    await db.commit()
    return True