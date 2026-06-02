from sqlalchemy import Column, String, DateTime, ForeignKey, LargeBinary, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_text = Column(String, nullable=False)
    embedding = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="embeddings")