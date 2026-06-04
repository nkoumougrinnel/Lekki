from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, LargeBinary, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_hash = Column(String, nullable=False)
    token_count = Column(Integer, nullable=False)
    embedding = Column(LargeBinary, nullable=True)

    page = relationship("Page", back_populates="chunks")
