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
    pass


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
    creator_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
