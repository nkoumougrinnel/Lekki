from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Workspace(Base):
    """Espace de travail cloisonné : regroupe pages, chunks et chats."""

    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="owned_workspaces", foreign_keys=[owner_id])
    members = relationship(
        "WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan"
    )
    rag_queries = relationship("RagQuery", back_populates="workspace")


class WorkspaceMember(Base):
    """Appartenance d'un utilisateur à un workspace (avec rôle local)."""

    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, default="member", nullable=False)  # owner | admin | member
    joined_at = Column(DateTime, server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")
