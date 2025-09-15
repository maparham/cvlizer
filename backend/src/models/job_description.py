"""
Job description model for storing target job information.

This module defines the JobDescription database model for storing
job postings and requirements associated with CVs for optimization.
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source_url = Column(String(500), nullable=True)
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    cv = relationship("CV", back_populates="job_descriptions")
    ai_sections = relationship("AISection", back_populates="job_description", cascade="all, delete-orphan")
