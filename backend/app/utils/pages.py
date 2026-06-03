from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.page import Page
from app.schemas.page import PageCreate, PageUpdate
from app.services import rag_service

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

    # Déclenchement automatique du pipeline RAG (Chunking + Embeddings)
    try:
        await rag_service.embed_page(db, new_page.id)
    except Exception as e:
        print(f"RAG Error on creation: {e}")

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

    # Mise à jour automatique du pipeline RAG (Recalcul des chunks)
    try:
        await rag_service.embed_page(db, page_id)
    except Exception as e:
        print(f"RAG Error on update: {e}")

    return page

async def delete_page(db: AsyncSession, page_id: str):
    page = await get_page(db, page_id)
    if not page:
        return None
    
    await db.delete(page)
    await db.commit()
    return page

async def search_pages(db: AsyncSession, query: str):
    fts_query = query.strip()
    if not fts_query:
        return []
        
    fts_query += "*"

    try:
        # Recherche via la table virtuelle pages_fts (join sur page_id)
        result = await db.execute(
            text("SELECT page_id FROM pages_fts WHERE pages_fts MATCH :query ORDER BY rank"),
            {"query": fts_query}
        )
        ids = [row[0] for row in result.fetchall()]
        
        if not ids:
            return []
        
        pages_result = await db.execute(
            select(Page).where(Page.id.in_(ids))
        )
        return pages_result.scalars().all()
    except Exception as e:
        print(f"FTS5 search error: {e}")
        return []