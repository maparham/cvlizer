"""
AI section model for storing AI-generated CV content.

This module defines the AISection database model for storing
AI-generated CV sections with metadata about generation process.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class AISection(Base):
    __tablename__ = "ai_sections"
    
    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    job_description_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    section_content = Column(Text, nullable=False)
    section_type = Column(String(50), default="why_good_fit", nullable=False)
    generation_prompt = Column(Text, nullable=True)
    ai_model = Column(String(50), default="gpt-4o-mini", nullable=False)
    tokens_used = Column(Integer, nullable=True)
    generation_time = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    cv = relationship("CV", back_populates="ai_sections")
    job_description = relationship("JobDescription", back_populates="ai_sections")
