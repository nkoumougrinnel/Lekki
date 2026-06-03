from pydantic import BaseModel, ConfigDict, Field
from typing import Literal
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: Literal["admin", "editor", "reader"]
