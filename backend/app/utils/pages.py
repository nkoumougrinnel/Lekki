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

    # Synchronisation manuelle FTS5
    try:
        await db.execute(
            text("INSERT INTO pages_fts (page_id, title, content) VALUES (:id, :title, :content)"),
            {"id": new_page.id, "title": new_page.title, "content": new_page.content}
        )
        await db.commit()
    except Exception as e:
        print(f"FTS5 Sync Error on creation: {e}")

    # Déclenchement automatique du pipeline RAG (Chunking + Embeddings)
    try:
        await rag_service.embed_page(db, new_page.id)
    except Exception as e:
        print(f"RAG Error on creation: {e}")

    await db.refresh(new_page)
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

    # Mise à jour manuelle FTS5
    try:
        await db.execute(
            text("UPDATE pages_fts SET title = :title, content = :content WHERE page_id = :id"),
            {"id": page_id, "title": page.title, "content": page.content}
        )
        await db.commit()
    except Exception as e:
        print(f"FTS5 Sync Error on update: {e}")

    # Mise à jour automatique du pipeline RAG (Recalcul des chunks)
    try:
        await rag_service.embed_page(db, page_id)
    except Exception as e:
        print(f"RAG Error on update: {e}")

    await db.refresh(page)
    return page

async def delete_page(db: AsyncSession, page_id: str):
    page = await get_page(db, page_id)
    if not page:
        return None
    
    # Nettoyage FTS5
    try:
        await db.execute(
            text("DELETE FROM pages_fts WHERE page_id = :id"),
            {"id": page_id}
        )
    except Exception as e:
        print(f"FTS5 Sync Error on delete: {e}")

    await db.delete(page)
    await db.commit()
    return page

async def search_pages(db: AsyncSession, query: str):
    clean_query = query.strip()
    if not clean_query:
        return []

    # Recherche par préfixe sur chaque mot : "Test Auto" -> "Test* Auto*"
    terms = [f"{term}*" for term in clean_query.split() if term]
    fts_query = " ".join(terms)

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