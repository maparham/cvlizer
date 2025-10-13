"""
AI Draft model for storing draft AI-generated CV content.

This module defines the AIDraft database model for storing
draft AI-generated CV sections before they are approved and committed.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class AIDraft(Base):
    __tablename__ = "ai_drafts"

    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(
        String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_description_id = Column(
        String(36),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    section_type = Column(String(50), default="why_good_fit", nullable=False)

    # Draft content - stores the full WhyGoodFit analysis
    draft_data = Column(JSON, nullable=False)

    # Metadata
    ai_model = Column(
        String(50), nullable=True
    )  # Default set by application layer from config
    tokens_used = Column(Integer, nullable=True)
    generation_time = Column(Integer, nullable=True)

    # Background task status fields
    is_generating = Column(Boolean, default=False, nullable=False)
    generation_error = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cv = relationship("CV", back_populates="ai_drafts")
    job_description = relationship("JobDescription", back_populates="ai_drafts")

    def __str__(self):
        return f"<AIDraft {self.section_type} for CV {self.cv_id}>"
