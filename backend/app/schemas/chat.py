from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class ChatCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    sources: Optional[str] = None
    tokens_used: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
