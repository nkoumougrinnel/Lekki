from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Import(Base):
    """Tâche d'import documentaire (upload → extraction → page → RAG)."""

    __tablename__ = "imports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source_type = Column(String, nullable=False)  # pdf | docx | txt | markdown | mixed
    source_name = Column(String, nullable=False)  # nom de fichier (ou résumé du lot)
    status = Column(String, default="pending", nullable=False)  # pending|processing|completed|failed|partial
    total_files = Column(Integer, default=0, nullable=False)
    processed_files = Column(Integer, default=0, nullable=False)
    error_log = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    workspace = relationship("Workspace")
