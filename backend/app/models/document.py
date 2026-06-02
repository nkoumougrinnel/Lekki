from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("documents.id"), nullable=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="draft", nullable=False)
    tags = Column(String)         # JSON array stocké en string
    ai_summary = Column(String)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="documents")
    author = relationship("User")
    children = relationship("Document", backref="parent", remote_side=[id])
    embeddings = relationship("Embedding", back_populates="document")