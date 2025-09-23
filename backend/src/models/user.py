"""
User model for authentication and user management.

This module defines the User database model with fields for authentication,
profile information, and relationships to CVs.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_id = Column(String(255), unique=True, nullable=True, index=True)  # Clerk user ID
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Keep for backward compatibility
    google_id = Column(String(255), nullable=True, unique=True, index=True)  # Keep for backward compatibility
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    cvs = relationship("CV", back_populates="user", cascade="all, delete-orphan")
    
    def __str__(self):
        return f"<User {self.email}>"