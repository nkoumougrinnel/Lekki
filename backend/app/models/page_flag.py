from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship

from app.database import Base
import uuid

# Types de signalement autorisés.
FLAG_TYPES = ("outdated", "incorrect", "duplicate", "missing_information")


class PageFlag(Base):
    """Signalement d'un problème de qualité sur une page (audit de connaissance)."""

    __tablename__ = "page_flags"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(
        String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    flag_type = Column(String, nullable=False)  # outdated | incorrect | duplicate | missing_information
    flagged_by = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    page = relationship("Page", back_populates="flags")
    flagger = relationship("User")
