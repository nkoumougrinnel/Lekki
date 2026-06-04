from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    workspace_id: str | None = None


class ChatResponse(BaseModel):
    id: str
    title: str
    user_id: str
    workspace_id: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    sources: str | None = None
    tokens_used: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
