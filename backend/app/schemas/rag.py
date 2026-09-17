from typing import List, Optional

from pydantic import BaseModel

from app.ai.schemas import AskRequest, AskResponse, AskSource


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
