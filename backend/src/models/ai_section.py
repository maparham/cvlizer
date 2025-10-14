"""
AI section model for storing AI-generated CV content.

This module defines the AISection database model for storing
AI-generated CV sections with metadata about generation process.
"""

import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class AISection(Base):
    __tablename__ = "ai_sections"

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
    section_content = Column(Text, nullable=True)
    original_content = Column(Text, nullable=True)
    suggestions = Column(JSON, nullable=True)
    optimized_data = Column(JSON, nullable=True)
    section_type = Column(String(50), default="why_good_fit", nullable=False)
    generation_prompt = Column(Text, nullable=True)
    ai_model = Column(
        String(50), nullable=True
    )  # Default set by application layer from config
    confidence_score = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    generation_time = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
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
    cv = relationship("CV", back_populates="ai_sections")
    job_description = relationship("JobDescription", back_populates="ai_sections")

    def __str__(self):
        return f"<AISection {self.section_type} for CV {self.cv_id}>"
