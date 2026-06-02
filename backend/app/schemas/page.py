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

class PageResponse(PageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner_id: int

    model_config = ConfigDict(from_attributes=True)