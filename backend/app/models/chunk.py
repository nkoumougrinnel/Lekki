from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=False)  # rh | technique | commercial | guides
    status = Column(String, default="published", nullable=False)
    is_embedded = Column(Boolean, default=False, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    creator = relationship("User", back_populates="pages")
    chunks = relationship("Chunk", back_populates="page", cascade="all, delete-orphan")
