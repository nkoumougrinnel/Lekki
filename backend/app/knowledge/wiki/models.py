from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base


class WikiPage(Base):
    __tablename__ = "wiki_pages"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String, default="cours")
    topic = Column(String, default="Général", index=True)
    section = Column(String, default="Général", index=True)
    parent_page_id = Column(String, nullable=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    status = Column(String, default="draft")
    status_verified_by = Column(String, nullable=True)
    status_verified_at = Column(DateTime, nullable=True)
    creator_id = Column(String, ForeignKey("users.id"), nullable=True)
    last_editor_id = Column(String, ForeignKey("users.id"), nullable=True)
    view_count = Column(Integer, default=1)
    related_document_ids = Column(Text, default="[]")
    related_wiki_ids = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WikiHistory(Base):
    __tablename__ = "wiki_histories"

    id = Column(String, primary_key=True, index=True)
    page_id = Column(String, ForeignKey("wiki_pages.id"), index=True, nullable=False)
    version = Column(Integer, nullable=False)
    author_id = Column(String, nullable=True)
    author_name = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
