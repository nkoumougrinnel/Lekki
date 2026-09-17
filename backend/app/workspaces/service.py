import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.models import User
from app.workspaces.models import Workspace, WorkspaceMember
from app.workspaces.repository import WorkspaceRepository
from app.workspaces.schemas import MemberAdd, WorkspaceCreate, WorkspaceMemberOut, WorkspaceOut


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = WorkspaceRepository(db)

    async def list_for_user(self, user: User) -> list[WorkspaceOut]:
        workspaces = await self.repository.list()
        result = []
        for workspace in workspaces:
            role = await self.repository.role_for_user(workspace.id, user.id)
            result.append(self._workspace_out(workspace, role or ("owner" if workspace.owner_id == user.id else "member"), await self.repository.member_count(workspace.id)))
        return result

    async def create(self, data: WorkspaceCreate, owner: User) -> WorkspaceOut:
        workspace_id = f"ws-{uuid.uuid4().hex[:8]}"
        workspace = Workspace(id=workspace_id, name=data.name, description=data.description, icon=data.icon or "school", owner_id=owner.id)
        self.db.add(workspace)
        self.db.add(WorkspaceMember(id=f"wm-{uuid.uuid4().hex[:8]}", workspace_id=workspace_id, user_id=owner.id, role="owner"))
        await self.db.commit()
        await self.db.refresh(workspace)
        return self._workspace_out(workspace, "owner", 1)

    async def get(self, workspace_id: str) -> WorkspaceOut:
        workspace = await self.repository.get(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace introuvable")
        return self._workspace_out(workspace, "member", await self.repository.member_count(workspace.id))

    async def list_members(self, workspace_id: str) -> list[WorkspaceMemberOut]:
        return [WorkspaceMemberOut(id=member.id, user_id=user.id, name=user.name, email=user.email, username=user.username, role=member.role, joined_at=member.joined_at) for member, user in await self.repository.members(workspace_id)]

    async def add_member(self, workspace_id: str, data: MemberAdd) -> WorkspaceMemberOut:
        user = await self.repository.db.get(User, data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        member = WorkspaceMember(id=f"wm-{uuid.uuid4().hex[:8]}", workspace_id=workspace_id, user_id=user.id, role=data.role or "member")
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return WorkspaceMemberOut(id=member.id, user_id=user.id, name=user.name, email=user.email, username=user.username, role=member.role, joined_at=member.joined_at)

    async def remove_member(self, workspace_id: str, user_id: str) -> None:
        member = await self.repository.member(workspace_id, user_id)
        if member:
            await self.db.delete(member)
            await self.db.commit()

    @staticmethod
    def _workspace_out(workspace: Workspace, role: str, members_count: int) -> WorkspaceOut:
        return WorkspaceOut(id=workspace.id, name=workspace.name, description=workspace.description, icon=workspace.icon or "school", role=role, members_count=members_count, created_at=workspace.created_at)
