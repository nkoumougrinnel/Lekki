from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.models import User
from app.workspaces.models import Workspace, WorkspaceMember


class WorkspaceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self) -> list[Workspace]:
        result = await self.db.execute(select(Workspace))
        return list(result.scalars().all())

    async def get(self, workspace_id: str) -> Workspace | None:
        result = await self.db.execute(select(Workspace).where(Workspace.id == workspace_id))
        return result.scalar_one_or_none()

    async def member_count(self, workspace_id: str) -> int:
        result = await self.db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == workspace_id
            )
        )
        return result.scalar() or 1

    async def role_for_user(self, workspace_id: str, user_id: str) -> str | None:
        result = await self.db.execute(
            select(WorkspaceMember.role).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def members(self, workspace_id: str):
        result = await self.db.execute(
            select(WorkspaceMember, User)
            .join(User, WorkspaceMember.user_id == User.id)
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        return result.all()

    async def member(self, workspace_id: str, user_id: str) -> WorkspaceMember | None:
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()
