from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="reader", nullable=False)  # admin | editor | reader
    created_at = Column(DateTime, server_default=func.now())

    pages = relationship("Page", back_populates="creator")
    chats = relationship("Chat", back_populates="user")
