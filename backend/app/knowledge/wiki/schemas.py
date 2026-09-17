from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class WikiHistoryOut(BaseModel):
    id: Optional[str] = None
    version: int
    author_id: Optional[str] = None
    author_name: str
    comment: Optional[str] = None
    content: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WikiPageCreate(BaseModel):
    title: str
    content: Optional[str] = None
    category: Optional[str] = "cours"
    topic: Optional[str] = "Général"
    section: Optional[str] = "Général"
    parent_page_id: Optional[str] = None
    workspace_id: Optional[str] = None
    related_document_ids: Optional[List[str]] = []
    related_wiki_ids: Optional[List[str]] = []


class WikiPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    topic: Optional[str] = None
    section: Optional[str] = None
    parent_page_id: Optional[str] = None
    related_document_ids: Optional[List[str]] = None
    related_wiki_ids: Optional[List[str]] = None
    comment: Optional[str] = None


class WikiStatusUpdate(BaseModel):
    status: str


class WikiPageOut(BaseModel):
    id: str
    title: str
    content: str
    category: str
    topic: str = "Général"
    section: str = "Général"
    parent_page_id: Optional[str] = None
    workspace_id: Optional[str] = None
    status: str
    status_verified_by: Optional[str] = None
    status_verified_at: Optional[datetime] = None
    creator_id: Optional[str] = None
    last_editor_id: Optional[str] = None
    view_count: int = 1
    related_document_ids: List[str] = []
    related_wiki_ids: List[str] = []
    history: List[WikiHistoryOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
