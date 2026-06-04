"""
Lekki Wiki — Router Chats (async + JWT)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatResponse, MessageResponse
from app.services import rag_service, workspace_service
from app.services.auth_service import get_current_user
from app.utils.chats import get_user_chat

router = APIRouter(prefix="/chats", tags=["chats"])


async def _get_chat_with_workspace_access(
    db: AsyncSession, chat_id: str, user: User
) -> Chat:
    """Vérifie l'appartenance du chat ET l'accès à son workspace."""
    chat = await get_user_chat(db, chat_id, user)
    if chat.workspace_id and not await workspace_service.has_workspace_access(
        db, chat.workspace_id, user
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé au workspace de cette conversation",
        )
    return chat


@router.get("", response_model=list[ChatResponse])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Liste les conversations de l'utilisateur connecté (plus récentes en premier).

    Cloisonnement : on ne renvoie que les conversations de l'utilisateur qui sont
    soit sans workspace, soit rattachées à un workspace toujours accessible.
    """
    workspace_ids = await workspace_service.get_accessible_workspace_ids(db, current_user)
    result = await db.execute(
        select(Chat)
        .where(
            Chat.user_id == current_user.id,
            or_(Chat.workspace_id.is_(None), Chat.workspace_id.in_(workspace_ids)),
        )
        .order_by(Chat.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    body: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Un chat ne peut être rattaché qu'à un workspace dont l'utilisateur est membre.
    if body.workspace_id:
        await workspace_service.require_workspace_access(db, body.workspace_id, current_user)

    chat = Chat(title=body.title, user_id=current_user.id, workspace_id=body.workspace_id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.get("/{id}", response_model=ChatResponse)
async def read_chat(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_chat(db, id, current_user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await get_user_chat(db, id, current_user)
    await db.delete(chat)
    await db.commit()


@router.get("/{id}/messages", response_model=list[MessageResponse])
async def list_messages(
    id: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_user_chat(db, id, current_user)
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()


# ── Mémoire conversationnelle (contexte) ─────────────────────────────────────

@router.get("/{id}/context")
async def get_chat_context(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne le contexte (derniers échanges) qui sera injecté dans le prompt
    pour les questions de suivi. Borné pour éviter l'explosion des tokens.
    """
    await _get_chat_with_workspace_access(db, id, current_user)
    history = await rag_service.get_recent_history(db, id)
    return {
        "chat_id": id,
        "exchanges": history,
        "count": len(history),
        "max_exchanges": rag_service.MAX_HISTORY_EXCHANGES,
    }


@router.delete("/{id}/context", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_context(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Réinitialise la mémoire de la conversation (supprime ses messages, garde le chat)."""
    await _get_chat_with_workspace_access(db, id, current_user)
    await db.execute(delete(Message).where(Message.chat_id == id))
    await db.commit()
    return None
