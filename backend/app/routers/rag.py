import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.user import User
from app.schemas.rag import AskRequest, AskResponse
from app.services import llm_service, rag_service
from app.services.auth_service import get_current_user
from app.services.embedding_providers.base import AllEmbeddingProvidersFailedError
from app.services.llm_providers.base import AllProvidersFailedError
from app.utils.chats import get_owned_chat

router = APIRouter(tags=["rag"])
llm = llm_service.LLMService()


async def _persist_exchange(
    db: AsyncSession,
    chat_id: str,
    question: str,
    answer: str,
    source_ids: list[str],
) -> None:
    chat = await db.get(Chat, chat_id)
    if chat:
        chat.updated_at = datetime.utcnow()
    db.add(Message(chat_id=chat_id, role="user", content=question))
    db.add(
        Message(
            chat_id=chat_id,
            role="assistant",
            content=answer,
            sources=json.dumps(source_ids) if source_ids else None,
        )
    )
    await db.commit()


@router.post("/ask", response_model=AskResponse)
async def ask_lekki(
    req: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.chat_id:
        await get_owned_chat(req.chat_id, current_user, db)

    try:
        scored_chunks = await rag_service.get_relevant_chunks(db, req.question)
    except AllEmbeddingProvidersFailedError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Service d'embedding indisponible (vérifiez GEMINI_API_KEY).",
                "errors": exc.errors,
            },
        ) from exc

    if not scored_chunks:
        answer = "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question."
        if req.chat_id:
            await _persist_exchange(db, req.chat_id, req.question, answer, [])
        return AskResponse(answer=answer, sources=[], provider=None, chat_id=req.chat_id)

    chunks = [c for score, c in scored_chunks]
    source_ids = [c.page_id for c in chunks]
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

    if req.chat_id:
        await _persist_exchange(db, req.chat_id, req.question, answer, source_ids)

    return AskResponse(
        answer=answer,
        sources=source_ids,
        provider=provider,
        chat_id=req.chat_id,
    )


@router.get("/llm/status")
async def llm_providers_status():
    """État des fournisseurs LLM (config, cooldown) — utile pour le debug."""
    return {"providers": llm.get_providers_status()}
