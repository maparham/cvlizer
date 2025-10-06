"""
AI suggestion model for storing content enhancement suggestions.

This module defines the AISuggestion database model for storing
AI-generated content enhancement suggestions with confidence scores.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"
    
    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    job_description_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=True, index=True)
    original_content = Column(Text, nullable=False)
    suggested_content = Column(Text, nullable=False)
    content_type = Column(String(50), default="bullet_point", nullable=False)
    improvements = Column(JSON, nullable=True)  # List of improvement descriptions
    confidence_score = Column(Integer, nullable=True)
    section_path = Column(String(200), nullable=True)  # Path to the section in CV (e.g., "work_experience.0.achievements.1")
    ai_model = Column(String(50), nullable=True)  # Default set by application layer from config
    tokens_used = Column(Integer, nullable=True)
    generation_time = Column(Integer, nullable=True)
    is_accepted = Column(String(10), nullable=True)  # "accepted", "rejected", or null
    
    # Background task status
    is_generating = Column(Boolean, default=False, nullable=False)
    generation_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    cv = relationship("CV", back_populates="ai_suggestions")
    job_description = relationship("JobDescription", back_populates="ai_suggestions")
    
    def __str__(self):
        return f"<AISuggestion {self.content_type} for CV {self.cv_id}>"

