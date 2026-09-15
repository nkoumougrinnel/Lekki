from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace import WorkspaceOut, WorkspaceCreate, WorkspaceMemberOut, MemberAdd
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceOut])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Workspace)
    result = await db.execute(query)
    workspaces = result.scalars().all()
    
    out = []
    for ws in workspaces:
        # count members
        count_res = await db.execute(
            select(func.count(WorkspaceMember.id)).where(WorkspaceMember.workspace_id == ws.id)
        )
        members_count = count_res.scalar() or 1
        
        # user role in workspace
        role_res = await db.execute(
            select(WorkspaceMember.role).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == current_user.id
            )
        )
        user_role = role_res.scalar() or ("owner" if ws.owner_id == current_user.id else "member")
        
        out.append(WorkspaceOut(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            icon=ws.icon or "school",
            role=user_role,
            members_count=members_count,
            created_at=ws.created_at
        ))
    return out


@router.post("", response_model=WorkspaceOut)
async def create_workspace(
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ws_id = f"ws-{uuid.uuid4().hex[:8]}"
    ws = Workspace(
        id=ws_id,
        name=data.name,
        description=data.description,
        icon=data.icon or "school",
        owner_id=current_user.id
    )
    db.add(ws)
    
    member = WorkspaceMember(
        id=f"wm-{uuid.uuid4().hex[:8]}",
        workspace_id=ws_id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(member)
    
    await db.commit()
    await db.refresh(ws)
    
    return WorkspaceOut(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        icon=ws.icon,
        role="owner",
        members_count=1,
        created_at=ws.created_at
    )


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace introuvable")
        
    count_res = await db.execute(
        select(func.count(WorkspaceMember.id)).where(WorkspaceMember.workspace_id == ws.id)
    )
    members_count = count_res.scalar() or 1
    
    return WorkspaceOut(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        icon=ws.icon,
        role="member",
        members_count=members_count,
        created_at=ws.created_at
    )


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
async def list_members(workspace_id: str, db: AsyncSession = Depends(get_db)):
    query = (
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    result = await db.execute(query)
    rows = result.all()
    
    return [
        WorkspaceMemberOut(
            id=wm.id,
            user_id=u.id,
            name=u.name,
            email=u.email,
            username=u.username,
            role=wm.role,
            joined_at=wm.joined_at
        )
        for wm, u in rows
    ]


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut)
async def add_member(
    workspace_id: str,
    data: MemberAdd,
    db: AsyncSession = Depends(get_db)
):
    user_res = await db.execute(select(User).where(User.id == data.user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
    member = WorkspaceMember(
        id=f"wm-{uuid.uuid4().hex[:8]}",
        workspace_id=workspace_id,
        user_id=data.user_id,
        role=data.role or "member"
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    
    return WorkspaceMemberOut(
        id=member.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        username=user.username,
        role=member.role,
        joined_at=member.joined_at
    )


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    )
    result = await db.execute(query)
    member = result.scalar_one_or_none()
    if member:
        await db.delete(member)
        await db.commit()
    return None
