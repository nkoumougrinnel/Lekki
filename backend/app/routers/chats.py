"""
Lekki Wiki — Router Chats (async + JWT)
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatResponse, MessageResponse
from app.services.auth_service import get_current_user
from app.utils.chats import get_user_chat

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=list[ChatResponse])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste les conversations de l'utilisateur connecté (plus récentes en premier)."""
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    body: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = Chat(title=body.title, user_id=current_user.id)
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
