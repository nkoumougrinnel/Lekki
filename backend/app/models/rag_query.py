from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base
import uuid


class RagQuery(Base):
    """
    Trace d'une requête posée à l'assistant RAG (analytics d'usage).

    Permet d'identifier : questions fréquentes, questions sans réponse,
    fournisseurs utilisés, utilisateurs actifs — le tout cloisonné par workspace.
    """

    __tablename__ = "rag_queries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    question = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    provider = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    had_results = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    user = relationship("User", back_populates="rag_queries")
    workspace = relationship("Workspace", back_populates="rag_queries")
