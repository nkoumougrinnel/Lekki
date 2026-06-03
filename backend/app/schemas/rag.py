import json
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    chat_id: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    sources: list[str]
    provider: Optional[str] = None
    chat_id: Optional[str] = None
