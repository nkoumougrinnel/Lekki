import secrets
import uuid
import os

from fastapi import HTTPException
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.models import User
from app.conversations.models import ChatMessage
from app.knowledge.drive.models import DriveFile, DriveFolder
from app.knowledge.wiki.models import WikiHistory, WikiPage
from app.workspaces.models import Workspace, WorkspaceMember
from app.workspaces.repository import WorkspaceRepository
from app.workspaces.schemas import (
    MemberAdd,
    WorkspaceCreate,
    WorkspaceJoin,
    WorkspaceMemberOut,
    WorkspaceOut,
)


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = WorkspaceRepository(db)

    async def list_for_user(self, user: User) -> list[WorkspaceOut]:
        workspaces = await self.repository.list()
        result = []
        for workspace in workspaces:
            role = await self.repository.role_for_user(workspace.id, user.id)
            if not role and workspace.owner_id != user.id:
                continue
            result.append(self._workspace_out(
                workspace,
                role or "owner",
                await self.repository.member_count(workspace.id),
            ))
        return result

    async def create(self, data: WorkspaceCreate, owner: User) -> WorkspaceOut:
        workspace_id = f"ws-{uuid.uuid4().hex[:8]}"
        workspace = Workspace(
            id=workspace_id,
            name=data.name,
            description=data.description,
            icon=data.icon or "school",
            owner_id=owner.id,
            join_code=await self._generate_join_code(),
        )
        self.db.add(workspace)
        self.db.add(WorkspaceMember(id=f"wm-{uuid.uuid4().hex[:8]}", workspace_id=workspace_id, user_id=owner.id, role="owner"))
        await self.db.commit()
        await self.db.refresh(workspace)
        return self._workspace_out(workspace, "owner", 1)

    async def get(self, workspace_id: str, user: User) -> WorkspaceOut:
        workspace = await self.repository.get(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace introuvable")
        role = await self.repository.role_for_user(workspace.id, user.id)
        if not role and workspace.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de ce workspace")
        return self._workspace_out(
            workspace,
            role or "owner",
            await self.repository.member_count(workspace.id),
        )

    async def join(self, data: WorkspaceJoin, user: User) -> WorkspaceOut:
        workspace = await self.repository.get_by_join_code(data.code.strip().upper())
        if not workspace:
            raise HTTPException(status_code=404, detail="Code de workspace invalide")
        member = await self.repository.member(workspace.id, user.id)
        if not member:
            member = WorkspaceMember(
                id=f"wm-{uuid.uuid4().hex[:8]}",
                workspace_id=workspace.id,
                user_id=user.id,
                role="member",
            )
            self.db.add(member)
            await self.db.commit()
        return self._workspace_out(
            workspace,
            await self.repository.role_for_user(workspace.id, user.id) or "member",
            await self.repository.member_count(workspace.id),
        )

    async def list_members(self, workspace_id: str, user: User) -> list[WorkspaceMemberOut]:
        await self._require_manager(workspace_id, user)
        return [WorkspaceMemberOut(id=member.id, user_id=user.id, name=user.name, email=user.email, username=user.username, role=member.role, joined_at=member.joined_at) for member, user in await self.repository.members(workspace_id)]

    async def add_member(self, workspace_id: str, data: MemberAdd, requester: User) -> WorkspaceMemberOut:
        await self._require_manager(workspace_id, requester)
        if data.role not in {"member", "admin", "verifier"}:
            raise HTTPException(status_code=400, detail="Rôle de membre invalide")
        user = await self.repository.db.get(User, data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        existing = await self.repository.member(workspace_id, user.id)
        if existing:
            raise HTTPException(status_code=409, detail="Cet utilisateur est déjà membre")
        member = WorkspaceMember(id=f"wm-{uuid.uuid4().hex[:8]}", workspace_id=workspace_id, user_id=user.id, role=data.role or "member")
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return WorkspaceMemberOut(id=member.id, user_id=user.id, name=user.name, email=user.email, username=user.username, role=member.role, joined_at=member.joined_at)

    async def remove_member(self, workspace_id: str, user_id: str, requester: User) -> None:
        await self._require_manager(workspace_id, requester)
        member = await self.repository.member(workspace_id, user_id)
        if member:
            workspace = await self.repository.get(workspace_id)
            if member.role == "owner" or (workspace and workspace.owner_id == user_id):
                raise HTTPException(status_code=400, detail="Le propriétaire ne peut pas être retiré")
            await self.db.delete(member)
            await self.db.commit()

    async def get_join_code(self, workspace_id: str, user: User) -> str:
        workspace = await self._require_manager(workspace_id, user)
        if not workspace.join_code:
            workspace.join_code = await self._generate_join_code()
            await self.db.commit()
        return workspace.join_code

    async def rotate_join_code(self, workspace_id: str, user: User) -> str:
        workspace = await self._require_manager(workspace_id, user)
        workspace.join_code = await self._generate_join_code()
        await self.db.commit()
        return workspace.join_code

    async def delete(self, workspace_id: str, user: User) -> None:
        workspace = await self.repository.get(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace introuvable")

        role = await self.repository.role_for_user(workspace_id, user.id)
        if role != "owner" and workspace.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer ce workspace")

        wiki_ids = list((await self.db.execute(
            select(WikiPage.id).where(WikiPage.workspace_id == workspace_id)
        )).scalars().all())
        if wiki_ids:
            await self.db.execute(delete(WikiHistory).where(WikiHistory.page_id.in_(wiki_ids)))
            await self.db.execute(delete(WikiPage).where(WikiPage.id.in_(wiki_ids)))

        folder_ids = list((await self.db.execute(
            select(DriveFolder.id).where(DriveFolder.workspace_id == workspace_id)
        )).scalars().all())
        file_filter = DriveFile.workspace_id == workspace_id
        if folder_ids:
            file_filter = or_(file_filter, DriveFile.folder_id.in_(folder_ids))
        files = list((await self.db.execute(select(DriveFile).where(file_filter))).scalars().all())
        await self.db.execute(delete(DriveFile).where(file_filter))
        if folder_ids:
            await self.db.execute(
                update(DriveFolder)
                .where(DriveFolder.parent_id.in_(folder_ids))
                .values(parent_id=None)
            )
            await self.db.execute(delete(DriveFolder).where(DriveFolder.id.in_(folder_ids)))

        await self.db.execute(delete(ChatMessage).where(ChatMessage.workspace_id == workspace_id))
        await self.db.execute(delete(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id))
        await self.db.delete(workspace)
        await self.db.commit()

        for drive_file in files:
            extension = drive_file.extension or ""
            if extension and not extension.startswith("."):
                extension = f".{extension}"
            for path in (
                os.path.join("storage", "files", f"{drive_file.id}{extension}"),
                drive_file.thumbnail_path,
            ):
                if path:
                    try:
                        os.remove(path)
                    except OSError:
                        pass

    async def _require_manager(self, workspace_id: str, user: User) -> Workspace:
        workspace = await self.repository.get(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace introuvable")
        role = await self.repository.role_for_user(workspace_id, user.id)
        if role not in {"admin", "owner"} and workspace.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Réservé aux admins membres de ce workspace")
        return workspace

    async def _generate_join_code(self) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            code = "".join(secrets.choice(alphabet) for _ in range(8))
            if not await self.repository.get_by_join_code(code):
                return code

    @staticmethod
    def _workspace_out(workspace: Workspace, role: str, members_count: int) -> WorkspaceOut:
        return WorkspaceOut(id=workspace.id, name=workspace.name, description=workspace.description, icon=workspace.icon or "school", role=role, members_count=members_count, created_at=workspace.created_at)
