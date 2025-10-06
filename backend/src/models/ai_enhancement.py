"""
AI enhancement model for storing AI-generated CV enhancement suggestions in background tasks.

This module defines the AIEnhancement database model for storing
AI-generated enhancement suggestions for CV in a background task pattern.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class AIEnhancement(Base):
    __tablename__ = "ai_enhancements"
    
    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    job_description_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # AI-generated enhancement data
    enhancement_data = Column(JSON, nullable=True)  # All suggestions (skills, professional_summary, etc.)
    
    # AI metadata
    tokens_used = Column(Integer, default=0, nullable=False)
    generation_time = Column(Integer, default=0, nullable=False)
    model_used = Column(String(50), nullable=True)
    
    # Background task status
    is_generating = Column(Boolean, default=False, nullable=False, index=True)
    generation_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="ai_enhancements")
    cv = relationship("CV", back_populates="ai_enhancements")
    job_description = relationship("JobDescription", back_populates="ai_enhancements")
    
    def __str__(self):
        return f"AIEnhancement(id={self.id}, cv_id={self.cv_id}, is_generating={self.is_generating})"
