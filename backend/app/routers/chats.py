"""
Lekki Wiki — Router Chats (async)
Endpoints : CRUD chats + liste des messages
"""

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import Chat, Message
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatResponse, MessageResponse
from app.services.auth_service import get_current_user
from app.utils.chats import get_owned_chat

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/", response_model=List[ChatResponse])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste les chats de l'utilisateur connecté."""
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    body: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crée un nouveau chat pour l'utilisateur connecté."""
    chat = Chat(user_id=current_user.id, title=body.title)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.get("/{id}", response_model=ChatResponse)
async def get_chat(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_owned_chat(id, current_user, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await get_owned_chat(id, current_user, db)
    await db.delete(chat)
    await db.commit()


@router.get("/{id}/messages", response_model=List[MessageResponse])
async def list_messages(
    id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Messages d'un chat (ordre chronologique)."""
    await get_owned_chat(id, current_user, db)
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()
