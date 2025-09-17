"""
CV model for storing uploaded CV files and parsed data.

This module defines the CV database model with fields for file information,
parsed data storage, and relationships to users, job descriptions, and AI sections.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class CV(Base):
    __tablename__ = "cvs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    parsed_data = Column(JSON, nullable=True)
    is_parsed = Column(Boolean, default=False, nullable=False)
    parse_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="cvs")
    job_descriptions = relationship("JobDescription", back_populates="cv", cascade="all, delete-orphan")
    ai_sections = relationship("AISection", back_populates="cv", cascade="all, delete-orphan")
    
    def __str__(self):
        return f"<CV {self.original_filename}>"
    
    def to_response_dict(self) -> dict:
        """
        Convert CV model to response dictionary.
        
        This centralizes the response formatting logic that was previously
        duplicated across multiple API endpoints.
        """
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "parsed_data": self.parsed_data,
            "is_parsed": self.is_parsed,
            "parse_error": self.parse_error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }