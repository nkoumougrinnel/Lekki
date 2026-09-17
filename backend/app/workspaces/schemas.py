from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "school"


class WorkspaceOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "school"
    role: Optional[str] = "member"
    members_count: Optional[int] = 1
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberAdd(BaseModel):
    user_id: str
    role: Optional[str] = "member"


class WorkspaceMemberOut(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    username: str
    role: str
    joined_at: Optional[datetime] = None
