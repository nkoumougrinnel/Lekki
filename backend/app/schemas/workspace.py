from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

WorkspaceRole = Literal["owner", "admin", "member"]


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberAdd(BaseModel):
    user_id: str = Field(..., min_length=1)
    role: WorkspaceRole = "member"


class MemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)
