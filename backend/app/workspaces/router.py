from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.identity.models import User
from app.middleware.auth import get_current_user
from app.workspaces.schemas import (
    MemberAdd,
    WorkspaceCreate,
    WorkspaceJoin,
    WorkspaceJoinCode,
    WorkspaceMemberOut,
    WorkspaceOut,
)
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceOut])
async def list_workspaces(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).list_for_user(current_user)


@router.post("", response_model=WorkspaceOut)
async def create_workspace(data: WorkspaceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).create(data, current_user)


@router.post("/join", response_model=WorkspaceOut)
async def join_workspace(data: WorkspaceJoin, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).join(data, current_user)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).get(workspace_id, current_user)


@router.get("/{workspace_id}/join-code", response_model=WorkspaceJoinCode)
async def get_join_code(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = await WorkspaceService(db).get_join_code(workspace_id, current_user)
    return WorkspaceJoinCode(code=code)


@router.post("/{workspace_id}/join-code/rotate", response_model=WorkspaceJoinCode)
async def rotate_join_code(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = await WorkspaceService(db).rotate_join_code(workspace_id, current_user)
    return WorkspaceJoinCode(code=code)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await WorkspaceService(db).delete(workspace_id, current_user)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
async def list_members(workspace_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).list_members(workspace_id, current_user)


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut)
async def add_member(workspace_id: str, data: MemberAdd, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await WorkspaceService(db).add_member(workspace_id, data, current_user)


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(workspace_id: str, user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await WorkspaceService(db).remove_member(workspace_id, user_id, current_user)
    return None
