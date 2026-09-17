from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.identity.models import User
from app.middleware.auth import get_current_user
from app.workspaces.schemas import MemberAdd, WorkspaceCreate, WorkspaceMemberOut, WorkspaceOut
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceOut])
async def list_workspaces(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).list_for_user(current_user)


@router.post("", response_model=WorkspaceOut)
async def create_workspace(data: WorkspaceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).create(data, current_user)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).get(workspace_id)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
async def list_members(workspace_id: str, db: AsyncSession = Depends(get_db)):
    return await WorkspaceService(db).list_members(workspace_id)


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut)
async def add_member(workspace_id: str, data: MemberAdd, db: AsyncSession = Depends(get_db)):
    return await WorkspaceService(db).add_member(workspace_id, data)


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(workspace_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    await WorkspaceService(db).remove_member(workspace_id, user_id)
    return None
