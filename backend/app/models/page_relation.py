from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base
import uuid


class PageRelation(Base):
    """Voisin sémantique d'une page (similarité cosinus entre embeddings)."""

    __tablename__ = "page_relations"
    __table_args__ = (
        UniqueConstraint("page_id", "related_id", name="uq_page_relation"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(
        String,
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    related_id = Column(
        String,
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score = Column(Float, nullable=False)
    computed_at = Column(DateTime, server_default=func.now())
