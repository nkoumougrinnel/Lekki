from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


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
    scope: Optional[str] = None


class FileOut(BaseModel):
    id: str
    name: str
    extension: str
    size: int
    content: Optional[str] = None
    summary: Optional[str] = None
    workspace_id: Optional[str] = None
    folder_id: Optional[str] = None
    scope: str
    is_starred: bool = False
    is_deleted: bool = False
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
