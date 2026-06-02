from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from app.schemas.page import PageCreate, PageUpdate, PageResponse, PageCategory

router = APIRouter(
    prefix="/pages",
    tags=["pages"]
)

@router.get("/", response_model=List[PageResponse])
async def get_pages(
    category: Optional[PageCategory] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    # Logique de récupération à implémenter avec SQLAlchemy
    return []

@router.get("/{id}", response_model=PageResponse)
async def get_page(id: int):
    # Logique de récupération par ID
    return {}

@router.post("/", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(page_in: PageCreate):
    # Logique de création. Note : Déclenchera l'embedding interne plus tard.
    return {}

@router.put("/{id}", response_model=PageResponse)
async def update_page(id: int, page_in: PageUpdate):
    # Logique de mise à jour
    return {}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(id: int):
    # Logique de suppression (Admin requis via middleware plus tard)
    return None