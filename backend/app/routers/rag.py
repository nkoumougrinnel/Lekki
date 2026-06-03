from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rag_service, llm_service

router = APIRouter(tags=["rag"])
llm = llm_service.LLMService()

class QuestionRequest(BaseModel):
    question: str

@router.post("/ask")
async def ask_lekki(req: QuestionRequest, db: AsyncSession = Depends(get_db)):
    # 1. Retrieval : Trouver les morceaux de texte pertinents
    scored_chunks = await rag_service.get_relevant_chunks(db, req.question)
    if not scored_chunks:
        return {"answer": "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question.", "sources": []}
    
    # 2. Augmentation & Generation : Envoyer au LLM
    chunks = [c for score, c in scored_chunks]
    answer = await llm.ask_question(req.question, chunks)
    
    return {"answer": answer, "sources": [c.page_id for c in chunks]}