from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AcademicInfo(BaseModel):
    """Programme d'études d'une promo. Seul le cycle ITT de SUP'PTIC est connu pour l'instant."""
    program: Literal["supptic-itt"] = "supptic-itt"
    level: int = Field(ge=1, le=3)
    specialty: Optional[Literal["IR", "RC", "RT"]] = None


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=240)
    icon: Optional[str] = "school"
    academic: Optional[AcademicInfo] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=240)
    icon: Optional[str] = None
    academic: Optional[AcademicInfo] = None
    clear_academic: bool = False


class WorkspaceJoin(BaseModel):
    code: str


class WorkspaceJoinCode(BaseModel):
    code: str


class WorkspaceOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "school"
    role: Optional[str] = "member"
    members_count: Optional[int] = 1
    academic: Optional[AcademicInfo] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberAdd(BaseModel):
    user_id: str
    role: Optional[str] = "member"


class MemberRoleUpdate(BaseModel):
    role: str


class WorkspaceMemberOut(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    username: str
    role: str
    joined_at: Optional[datetime] = None
