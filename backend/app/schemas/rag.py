from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    workspace_id: Optional[str] = None
    chat_id: Optional[str] = None


class AskSource(BaseModel):
    id: str
    title: str
    type: str  # document, wiki
    detail: Optional[str] = None
    excerpt: str
    score: float


class AskResponse(BaseModel):
    message_id: Optional[str] = None
    answer: str
    sources: List[AskSource] = []
    contradiction: Optional[str] = None
    confidence: float = 0.95
    provider: Optional[str] = "Lekki AI (Gemini 2.5 Flash)"


class SearchItem(BaseModel):
    id: str
    type: str  # document, wiki
    title: str
    excerpt: Optional[str] = None
    topic: Optional[str] = None
    category: Optional[str] = None
    extension: Optional[str] = None
    workspace_id: Optional[str] = None


class UnifiedSearchResponse(BaseModel):
    query: str
    total: int
    documents: List[SearchItem] = []
    wiki_pages: List[SearchItem] = []
