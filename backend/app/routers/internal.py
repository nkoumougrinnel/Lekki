import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rag_service

router = APIRouter(prefix="/internal", tags=["internal"])

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "lekki-internal-secret-key")

async def verify_internal_key(x_internal_key: str = Header(...)):
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API interne invalide")

@router.post("/embed/{page_id}", status_code=200)
async def process_page_embedding(
    page_id: str, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_internal_key)
):
    """
    Force l'indexation RAG d'une page spécifique.
    """
    chunks_count = await rag_service.embed_page(db, page_id)
    if chunks_count is None:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    return {"status": "success", "page_id": page_id, "chunks_created": chunks_count}