import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.user import User
from app.services import llm_service, rag_service
from app.services.auth_service import get_optional_user
from app.services.embedding_providers import EmbeddingProviderRouter
from app.services.llm_providers.base import AllProvidersFailedError
from app.utils.chats import get_user_chat

router = APIRouter(tags=["rag"])
llm = llm_service.LLMService()
embedding_router = EmbeddingProviderRouter()

NO_CONTEXT_ANSWER = (
    "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question."
)


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1)
    chat_id: str | None = None


class AskResponse(BaseModel):
    message_id: str | None = None
    user_message_id: str | None = None
    answer: str
    sources: list[dict]
    confidence: float
    provider: str | None = None


async def _persist_messages(
    db: AsyncSession,
    chat_id: str,
    question: str,
    answer: str,
    sources: list[dict],
) -> tuple[str, str]:
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if chat:
        chat.updated_at = datetime.now(UTC)

    user_msg = Message(
        chat_id=chat_id,
        role="user",
        content=question,
        tokens_used=len(question.split()),
    )
    assistant_msg = Message(
        chat_id=chat_id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources, ensure_ascii=False),
        tokens_used=len(answer.split()),
    )
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    return user_msg.id, assistant_msg.id


@router.post("/ask", response_model=AskResponse)
async def ask_lekki(
    req: QuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if req.chat_id:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentification requise pour associer une conversation",
            )
        await get_user_chat(db, req.chat_id, current_user)

    scored_chunks = await rag_service.get_relevant_chunks(db, req.question)
    sources = rag_service.build_sources(scored_chunks)
    confidence = rag_service.compute_confidence(scored_chunks)

    if not scored_chunks:
        answer = NO_CONTEXT_ANSWER
        provider = None
    else:
        chunks = [c for _, c in scored_chunks]
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

    user_message_id: str | None = None
    message_id: str | None = None
    if req.chat_id:
        user_message_id, message_id = await _persist_messages(
            db, req.chat_id, req.question, answer, sources
        )

    return AskResponse(
        message_id=message_id,
        user_message_id=user_message_id,
        answer=answer,
        sources=sources,
        confidence=confidence,
        provider=provider,
    )


@router.get("/llm/status")
async def llm_providers_status():
    """État des fournisseurs LLM (config, cooldown) — utile pour le debug."""
    return {"providers": llm.get_providers_status()}


@router.get("/embedding/status")
async def embedding_providers_status():
    """État des fournisseurs d'embeddings (MiniLM local, Gemini fallback)."""
    return {"providers": embedding_router.get_status()}
