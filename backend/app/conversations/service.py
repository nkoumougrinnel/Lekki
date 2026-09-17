from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.repository import ConversationRepository


class ConversationService:
    def __init__(self, db: AsyncSession):
        self.repository = ConversationRepository(db)

    async def history(self, user_id: str) -> list[dict]:
        return [
            self.repository.serialize(message)
            for message in await self.repository.list_messages(user_id)
        ]

    async def clear_history(self, user_id: str) -> None:
        await self.repository.clear(user_id)
