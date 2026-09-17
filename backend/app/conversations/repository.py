import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.models import ChatMessage


class ConversationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_messages(self, user_id: str) -> list[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at)
        )
        return list(result.scalars().all())

    async def clear(self, user_id: str) -> None:
        for message in await self.list_messages(user_id):
            await self.db.delete(message)
        await self.db.commit()

    @staticmethod
    def serialize(message: ChatMessage) -> dict:
        try:
            sources = json.loads(message.sources_json or "[]")
        except (TypeError, ValueError):
            sources = []
        return {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "timestamp": message.created_at.isoformat() if message.created_at else None,
            "sources": sources,
            "contradiction": message.contradiction,
        }
