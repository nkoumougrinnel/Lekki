from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from app.database import Base


class DriveFolder(Base):
    __tablename__ = "drive_folders"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    parent_id = Column(String, ForeignKey("drive_folders.id"), nullable=True, index=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DriveFile(Base):
    __tablename__ = "drive_files"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    extension = Column(String, default="pdf")
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    size = Column(Integer, default=1024)
    tags = Column(Text, default="[]")  # JSON string
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    folder_id = Column(String, ForeignKey("drive_folders.id"), nullable=True, index=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    scope = Column(String, default="workspace")  # personal, shared_with_me, workspace
    shared_with = Column(Text, default="[]")     # JSON string of user IDs
    is_starred = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
