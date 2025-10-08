"""
Job description model for storing target job information.

This module defines the JobDescription database model for storing
job postings and requirements associated with CVs for optimization.
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=True)
    salary_range = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=True)
    source_url = Column(String(500), nullable=True)
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    hidden = Column(Boolean, default=False, nullable=False)

    # Background task status fields
    is_parsing = Column(Boolean, default=False, nullable=False)
    parse_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="job_descriptions")
    cv = relationship("CV", back_populates="job_descriptions")
    ai_sections = relationship("AISection", back_populates="job_description", cascade="all, delete-orphan")
    ai_drafts = relationship("AIDraft", back_populates="job_description", cascade="all, delete-orphan")
    ai_suggestions = relationship("AISuggestion", back_populates="job_description", cascade="all, delete-orphan")
    ai_enhancements = relationship("AIEnhancement", back_populates="job_description", cascade="all, delete-orphan")
    optimization_history = relationship("OptimizationHistory", back_populates="job_description", cascade="all, delete-orphan")
    
    def __str__(self):
        return f"<JobDescription {self.title} at {self.company}>"
