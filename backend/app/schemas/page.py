from pydantic import BaseModel, ConfigDict
from typing import Optional
from enum import Enum
from datetime import datetime


class PageCategory(str, Enum):
    RH = "rh"
    TECHNIQUE = "technique"
    COMMERCIAL = "commercial"
    GUIDES = "guides"


class PageBase(BaseModel):
    title: str
    content: str
    category: PageCategory


class PageCreate(PageBase):
    workspace_id: str


class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[PageCategory] = None
    status: Optional[str] = None


class PageResponse(PageBase):
    id: str
    status: str
    is_embedded: bool
    view_count: int
    last_viewed_at: Optional[datetime] = None
    creator_id: str
    workspace_id: Optional[str] = None
    summary: Optional[str] = None
    summary_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PageSummaryResponse(BaseModel):
    page_id: str
    summary: Optional[str] = None
    summary_at: Optional[datetime] = None
    cached: bool = False
    provider: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RelatedPage(BaseModel):
    page_id: str
    title: str
    category: str
    score: float
