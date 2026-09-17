from typing import List, Optional

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    workspace_id: Optional[str] = None
    chat_id: Optional[str] = None


class AskSource(BaseModel):
    id: str
    title: str
    type: str
    detail: Optional[str] = None
    excerpt: str
    score: float
    workspace_id: Optional[str] = None
    file_extension: Optional[str] = None
    location: Optional[str] = None


class AskResponse(BaseModel):
    message_id: Optional[str] = None
    answer: str
    sources: List[AskSource] = []
    contradiction: Optional[str] = None
    confidence: float = 0.95
    provider: Optional[str] = "Lekki AI (Groq / Gemini / Cerebras)"
