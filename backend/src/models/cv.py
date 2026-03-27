"""
CV model for storing uploaded CV files and parsed data.

This module defines the CV database model with fields for file information,
parsed data storage, and relationships to users, job descriptions, and AI sections.
"""

import uuid
from datetime import timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class CV(Base):
    __tablename__ = "cvs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    parsed_data = Column(JSON, nullable=True)
    is_parsed = Column(Boolean, default=False, nullable=False)
    parse_error = Column(Text, nullable=True)
    public_share_token = Column(String(128), unique=True, nullable=True, index=True)
    is_public_shared = Column(Boolean, default=False, nullable=False, index=True)
    public_share_created_at = Column(DateTime(timezone=True), nullable=True)
    public_share_view_mode = Column(String(20), default="shell", nullable=False)
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
    user = relationship("User", back_populates="cvs")
    job_descriptions = relationship(
        "JobDescription",
        back_populates="cv"
        # REMOVED cascade="all, delete-orphan" - job descriptions should persist
        # when CV is deleted (handled by database FK with SET NULL)
    )

    # Many-to-many relationship with Job Descriptions through junction table
    job_description_associations = relationship(
        "CVJobDescription",
        foreign_keys="[CVJobDescription.cv_id]",
        cascade="all, delete-orphan",
        backref="cv_association",
    )

    ai_sections = relationship(
        "AISection", back_populates="cv", cascade="all, delete-orphan"
    )
    ai_drafts = relationship("AIDraft", back_populates="cv", cascade="all, delete-orphan")
    ai_suggestions = relationship(
        "AISuggestion", back_populates="cv", cascade="all, delete-orphan"
    )
    ai_enhancements = relationship(
        "AIEnhancement", back_populates="cv", cascade="all, delete-orphan"
    )
    cv_quality_analyses = relationship(
        "CVQualityAnalysis", back_populates="cv", cascade="all, delete-orphan"
    )
    optimization_history = relationship(
        "OptimizationHistory",
        back_populates="cv",
        cascade="all, delete-orphan",
        order_by="OptimizationHistory.created_at.desc()",
    )
    history = relationship(
        "CVHistory",
        back_populates="cv",
        cascade="all, delete-orphan",
        order_by="CVHistory.created_at.desc()",
    )

    def __str__(self):
        return f"<CV {self.original_filename}>"

    def to_response_dict(self, include_parsed_data: bool = True) -> dict:
        """
        Convert CV model to response dictionary.

        This centralizes the response formatting logic that was previously
        duplicated across multiple API endpoints.
        """
        # Check if this is an imported CV (has file_size > 0)
        is_imported = self.file_size > 0

        # REMOVED: has_been_edited check to avoid N+1 query on history
        # This was causing 3+ second delays on CV list endpoints
        # History can be loaded separately when viewing individual CVs
        has_been_edited = False

        data = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "is_parsed": self.is_parsed,
            "parse_error": self.parse_error,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat(),
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat(),
            "is_imported": is_imported,
            "has_been_edited": has_been_edited,
        }

        # Only include parsed_data if explicitly requested (for list views, exclude it)
        if include_parsed_data:
            # Clean parsed_data by removing AI-only fields that shouldn't be editable
            parsed_data = self.parsed_data
            if parsed_data and isinstance(parsed_data, dict):
                # Create a copy without AI validation fields that shouldn't be part of editable CV data
                parsed_data = {
                    k: v
                    for k, v in parsed_data.items()
                    if k not in ["is_valid_cv", "validation_error"]
                }
            data["parsed_data"] = parsed_data

        return data
