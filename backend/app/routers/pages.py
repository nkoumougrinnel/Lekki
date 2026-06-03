from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.page import PageCreate, PageUpdate, PageResponse, PageCategory
from app.utils import pages as crud_pages

router = APIRouter(prefix="/pages", tags=["pages"])

@router.get("/", response_model=List[PageResponse])
async def list_pages(
    category: Optional[PageCategory] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await crud_pages.get_pages(db, skip=skip, limit=limit, category=category.value if category else None)

@router.get("/search", response_model=List[PageResponse])
async def search_pages(
    q: str = Query(..., min_length=1, description="Texte à rechercher"),
    db: AsyncSession = Depends(get_db),
):
    return await crud_pages.search_pages(db, q)

@router.get("/{id}", response_model=PageResponse)
async def read_page(id: str, db: AsyncSession = Depends(get_db)):
    page = await crud_pages.get_page(db, id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.post("/", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(page_in: PageCreate, creator_id: str, db: AsyncSession = Depends(get_db)):
    return await crud_pages.create_page(db, page_in, creator_id)

@router.put("/{id}", response_model=PageResponse)
async def update_page(id: str, page_in: PageUpdate, db: AsyncSession = Depends(get_db)):
    updated = await crud_pages.update_page(db, id, page_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud_pages.delete_page(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return None
