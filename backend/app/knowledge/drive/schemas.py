from datetime import datetime
import json
from typing import List, Optional

from pydantic import BaseModel, validator


class DocumentIndexInfo(BaseModel):
    total_pages_analyzed: int = 0
    total_chunks: int = 0
    chapters_detected: List[str] = []


class FolderCreate(BaseModel):
    name: str
    workspace_id: Optional[str] = None
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None


class FolderOut(BaseModel):
    id: str
    name: str
    workspace_id: Optional[str] = None
    parent_id: Optional[str] = None
    files_count: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FileCreate(BaseModel):
    name: str
    extension: Optional[str] = "pdf"
    content: Optional[str] = None
    summary: Optional[str] = None
    workspace_id: Optional[str] = None
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None


class FileUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    is_starred: Optional[bool] = None
    is_deleted: Optional[bool] = None
    scope: Optional[str] = None


class FileOut(BaseModel):
    id: str
    name: str
    extension: str
    size: int
    content: Optional[str] = None
    summary: Optional[str] = None
    structured_text: Optional[str] = None
    thumbnail_path: Optional[str] = None
    workspace_id: Optional[str] = None
    folder_id: Optional[str] = None
    scope: str
    shared_with: List[str] = []
    is_starred: bool = False
    is_deleted: bool = False
    tags: List[str] = []
    index_meta: Optional[DocumentIndexInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @validator("shared_with", pre=True)
    def parse_shared_with(cls, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except (TypeError, ValueError):
                return []
        return value or []

    class Config:
        from_attributes = True
