from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    role = Column(String, nullable=False)  # viewer / editor / admin

    __table_args__ = (UniqueConstraint("user_id", "workspace_id"),)

    user = relationship("User", back_populates="permissions")
    workspace = relationship("Workspace", back_populates="permissions")