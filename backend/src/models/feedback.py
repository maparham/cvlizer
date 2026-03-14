"""
User feedback model for bug reports, suggestions, and general feedback.

This module defines the Feedback database model for storing user-submitted
feedback, with optional context (page_url, context JSON) and admin workflow
fields (status, admin_notes).
"""

import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(
        String(50), nullable=False, index=True
    )  # 'bug', 'suggestion', 'general'
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    page_url = Column(String(500), nullable=True)
    context = Column(JSON, nullable=True)  # e.g. cv_id, section_id
    status = Column(
        String(50), nullable=False, default="open", index=True
    )  # open, in_progress, resolved, closed
    admin_notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )

    # Relationships
    user = relationship("User", backref="feedback")

    def __str__(self):
        return f"<Feedback {self.type} '{self.title[:30]}' by {self.user_id}>"
