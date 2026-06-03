from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.page import Page
from app.schemas.page import PageCreate, PageUpdate

async def get_pages(db: AsyncSession, skip: int = 0, limit: int = 20, category: str | None = None):
    query = select(Page)
    if category:
        query = query.where(Page.category == category)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def get_page(db: AsyncSession, page_id: str):
    result = await db.execute(select(Page).where(Page.id == page_id))
    return result.scalar_one_or_none()

async def create_page(db: AsyncSession, page_in: PageCreate, creator_id: str):
    data = page_in.model_dump()
    data["category"] = page_in.category.value
    new_page = Page(**data, creator_id=creator_id)
    db.add(new_page)
    await db.commit()
    await db.refresh(new_page)

    # Sync FTS5
    await db.execute(text(
        "INSERT INTO page_index(rowid, title, content, category) VALUES (:rowid, :title, :content, :category)"
    ), {"rowid": new_page.rowid, "title": new_page.title, "content": new_page.content, "category": new_page.category})
    await db.commit()

    return new_page

async def update_page(db: AsyncSession, page_id: str, page_in: PageUpdate):
    page = await get_page(db, page_id)
    if not page:
        return None
    update_data = page_in.model_dump(exclude_unset=True)
    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].value
    for key, value in update_data.items():
        setattr(page, key, value)
    await db.commit()
    await db.refresh(page)

    # Sync FTS5
    await db.execute(text(
        "UPDATE page_index SET title=:title, content=:content, category=:category WHERE rowid=:rowid"
    ), {"rowid": page.rowid, "title": page.title, "content": page.content, "category": page.category})
    await db.commit()

    return page

async def delete_page(db: AsyncSession, page_id: str):
    page = await get_page(db, page_id)
    if not page:
        return None

    # Sync FTS5 avant suppression
    await db.execute(text("DELETE FROM page_index WHERE rowid=:rowid"), {"rowid": page.rowid})

    await db.delete(page)
    await db.commit()
    return page

async def search_pages(db: AsyncSession, query: str):
    fts_query = query.strip() + "*"
    
    try:
        # Récupère les titres depuis FTS5 puis retrouve les pages par titre
        result = await db.execute(
            text("SELECT title FROM page_index WHERE page_index MATCH :query ORDER BY rank"),
            {"query": fts_query}
        )
        titles = [row[0] for row in result.fetchall()]
        
        if not titles:
            return []
        
        pages_result = await db.execute(
            select(Page).where(Page.title.in_(titles))
        )
        return pages_result.scalars().all()
    except Exception as e:
        print(f"FTS5 search error: {e}")
        return []