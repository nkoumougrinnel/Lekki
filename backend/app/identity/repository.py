from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id_or_username(self, value: str) -> User | None:
        result = await self.db.execute(
            select(User).where((User.id == value) | (User.username == value))
        )
        return result.scalar_one_or_none()

    async def get_by_login(self, value: str) -> User | None:
        result = await self.db.execute(
            select(User).where((User.username == value) | (User.email == value))
        )
        return result.scalar_one_or_none()

    async def list(self) -> list[User]:
        result = await self.db.execute(select(User))
        return list(result.scalars().all())
