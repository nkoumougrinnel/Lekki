from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.service import ConversationService
from app.core.database import get_db
from app.identity.models import User
from app.middleware.auth import get_current_user

router = APIRouter(tags=["Conversations"])


@router.get("/chats/history")
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ConversationService(db).history(current_user.id)


@router.delete("/chats/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ConversationService(db).clear_history(current_user.id)
    return None
