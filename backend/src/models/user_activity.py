"""
User activity logging model for tracking user interactions and system events.

This module defines the UserActivity database model for comprehensive tracking
of user actions, errors, and system events to enable effective problem recreation
and debugging by administrators.
"""
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True)  # e.g., 'page_view', 'api_call', 'error', 'user_action'
    action = Column(String(100), nullable=False, index=True)  # e.g., 'upload_cv', 'generate_ai_section'
    description = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)  # Additional context data like request/response, error details
    page_url = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(100), nullable=True, index=True)  # Frontend session identifier
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="activities")
    
    def __str__(self):
        return f"<UserActivity {self.action} by {self.user_id} at {self.timestamp}>"


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String(100), nullable=False, unique=True, index=True)
    browser_info = Column(JSON, nullable=True)  # Browser, OS, screen resolution, etc.
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(String(10), default='true', nullable=False)  # 'true' or 'false' as string for SQLite compatibility
    
    # Relationships
    user = relationship("User", backref="sessions")
    
    def __str__(self):
        return f"<UserSession {self.session_id} for {self.user_id}>"
