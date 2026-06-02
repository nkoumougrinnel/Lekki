from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.page import Page
from app.schemas.page import PageCreate, PageUpdate, PageResponse, PageCategory

router = APIRouter(
    prefix="/pages",
    tags=["pages"]
)

@router.get("/", response_model=List[PageResponse])
async def get_pages(
    category: Optional[PageCategory] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(Page)
    if category:
        query = query.where(Page.category == category)
    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{id}", response_model=PageResponse)
async def get_page(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Page).where(Page.id == id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.post("/", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(page_in: PageCreate, db: AsyncSession = Depends(get_db)):
    new_page = Page(**page_in.model_dump())
    db.add(new_page)
    await db.commit()
    await db.refresh(new_page)
    return new_page

@router.put("/{id}", response_model=PageResponse)
async def update_page(id: int, page_in: PageUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Page).where(Page.id == id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    update_data = page_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(page, key, value)
    
    await db.commit()
    await db.refresh(page)
    return page

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Page).where(Page.id == id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    await db.delete(page)
    await db.commit()
    return None