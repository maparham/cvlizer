"""
Content enhancement model for storing AI-generated CV content improvements.

This module defines the ContentEnhancement database model for storing
AI-generated suggestions and improvements for CV content sections.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class ContentEnhancement(Base):
    __tablename__ = "content_enhancements"
    
    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Content data
    original_content = Column(Text, nullable=False)
    content_type = Column(String(50), nullable=False)  # e.g., "professional_summary", "work_experience"
    
    # AI-generated enhancements
    suggestions = Column(JSON, nullable=True)  # Specific suggestions for improvement
    overall_improvements = Column(JSON, nullable=True)  # Overall improvement recommendations
    
    # AI metadata
    tokens_used = Column(Integer, default=0, nullable=False)
    generation_time = Column(Integer, default=0, nullable=False)
    model_used = Column(String(50), nullable=True)
    
    # Background task status
    is_generating = Column(Boolean, default=False, nullable=False)
    generation_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="content_enhancements")
    cv = relationship("CV", back_populates="content_enhancements")
    
    def __str__(self):
        return f"<ContentEnhancement {self.content_type} for CV {self.cv_id}>"

