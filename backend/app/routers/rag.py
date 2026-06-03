from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import llm_service, rag_service
from app.services.llm_providers.base import AllProvidersFailedError

router = APIRouter(tags=["rag"])
llm = llm_service.LLMService()


class QuestionRequest(BaseModel):
    question: str


@router.post("/ask")
async def ask_lekki(req: QuestionRequest, db: AsyncSession = Depends(get_db)):
    scored_chunks = await rag_service.get_relevant_chunks(db, req.question)
    if not scored_chunks:
        return {
            "answer": "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question.",
            "sources": [],
            "provider": None,
        }

    chunks = [c for score, c in scored_chunks]
    try:
        answer, provider = await llm.ask_question(req.question, chunks)
    except AllProvidersFailedError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Tous les fournisseurs LLM sont indisponibles (quota ou erreur).",
                "errors": exc.errors,
            },
        ) from exc

    return {
        "answer": answer,
        "sources": [c.page_id for c in chunks],
        "provider": provider,
    }


@router.get("/llm/status")
async def llm_providers_status():
    """État des fournisseurs LLM (config, cooldown) — utile pour le debug."""
    return {"providers": llm.get_providers_status()}
