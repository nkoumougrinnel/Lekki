import json
import re
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.rag_query import RagQuery
from app.models.user import User
from app.services import llm_service, rag_service, workspace_service
from app.services.auth_service import get_optional_user
from app.services.embedding_providers import EmbeddingProviderRouter
from app.services.llm_providers.base import AllProvidersFailedError
from app.utils.chats import get_user_chat

router = APIRouter(tags=["rag"])
llm = llm_service.get_llm_service()
embedding_router = EmbeddingProviderRouter()

NO_CONTEXT_ANSWER = (
    "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question."
)

GREETING_ANSWER = (
    "Bonjour ! Je suis Lekki AI, l'assistant du wiki. "
    "Posez-moi une question sur le contenu du wiki (RH, technique, commercial, guides…) "
    "et je chercherai la réponse dans la base de connaissances."
)

# Salutations / formules de politesse courtes qui ne nécessitent pas de recherche RAG.
_GREETING_WORDS = {
    "bonjour", "bonsoir", "salut", "coucou", "hello", "hi", "hey", "yo",
    "slt", "cc", "wesh", "hola", "merci", "thanks", "ok", "okay", "bye",
    "ça", "va", "comment", "tu", "vas", "bonne", "journée", "soirée",
}


def _is_smalltalk(text: str) -> bool:
    """Détecte une salutation / formule courte sans réelle question."""
    cleaned = re.sub(r"[^\w\sàâäéèêëïîôöùûüç]", "", text.lower(), flags=re.UNICODE).strip()
    words = cleaned.split()
    if not words:
        return True
    if len(words) <= 4 and all(w in _GREETING_WORDS for w in words):
        return True
    return False


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1)
    chat_id: str | None = None
    workspace_id: str | None = None


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
    chat = None
    if req.chat_id:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentification requise pour associer une conversation",
            )
        chat = await get_user_chat(db, req.chat_id, current_user)

    # SÉCURITÉ RAG : ne fouiller que les chunks des workspaces de l'utilisateur.
    # - utilisateur non authentifié → aucun workspace → aucune source.
    # - si la conversation est rattachée à un workspace précis, on restreint à
    #   ce seul workspace (et on vérifie que l'utilisateur y a accès).
    workspace_ids = await workspace_service.get_accessible_workspace_ids(db, current_user)
    if chat is not None and chat.workspace_id:
        if chat.workspace_id not in workspace_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé au workspace de cette conversation",
            )
        workspace_ids = [chat.workspace_id]
    elif req.workspace_id:
        # Le client demande de restreindre la recherche à un workspace précis.
        if req.workspace_id not in workspace_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé à ce workspace",
            )
        workspace_ids = [req.workspace_id]

    # Workspace attribué à la trace analytics (workspace de scope si défini).
    tracked_workspace_id: str | None = None
    if chat is not None and chat.workspace_id:
        tracked_workspace_id = chat.workspace_id
    elif req.workspace_id:
        tracked_workspace_id = req.workspace_id

    # Salutation / small-talk : réponse conviviale sans interroger le RAG.
    if _is_smalltalk(req.question):
        answer = GREETING_ANSWER
        sources: list[dict] = []
        confidence = 0.0
        provider = None
    else:
        started = time.perf_counter()
        scored_chunks = await rag_service.get_relevant_chunks(
            db, req.question, workspace_ids=workspace_ids
        )
        sources = rag_service.build_sources(scored_chunks)
        sources = await rag_service.attach_page_titles(db, sources)
        confidence = rag_service.compute_confidence(scored_chunks)

        if not scored_chunks:
            answer = NO_CONTEXT_ANSWER
            provider = None
        else:
            chunks = [c for _, c in scored_chunks]
            # Mémoire conversationnelle : injecter les derniers échanges (questions de suivi).
            history = (
                await rag_service.get_recent_history(db, req.chat_id)
                if req.chat_id
                else None
            )
            try:
                answer, provider = await llm.ask_question(req.question, chunks, history)
            except AllProvidersFailedError as exc:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "message": "Tous les fournisseurs LLM sont indisponibles (quota ou erreur).",
                        "errors": exc.errors,
                    },
                ) from exc

        # Tracking analytics : on enregistre chaque vraie question (hors small-talk).
        duration_ms = int((time.perf_counter() - started) * 1000)
        db.add(
            RagQuery(
                user_id=current_user.id if current_user else None,
                workspace_id=tracked_workspace_id,
                question=req.question.strip(),
                confidence=confidence,
                provider=provider,
                duration_ms=duration_ms,
                had_results=bool(scored_chunks),
            )
        )
        await db.commit()

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
