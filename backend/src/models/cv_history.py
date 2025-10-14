"""
CV History model for storing version snapshots.

This module defines the CV history database model for tracking changes
and versions of CV documents over time.
"""

import uuid
from datetime import timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class CVHistory(Base):
    __tablename__ = "cv_history"

    # Define indexes for optimal query performance
    __table_args__ = (
        Index("idx_cv_history_cv_timestamp", "cv_id", "created_at"),
        Index("idx_cv_history_change_type", "change_type"),
        Index("idx_cv_history_is_automatic", "is_automatic"),
        Index("idx_cv_history_user_timestamp", "user_id", "created_at"),
        Index("idx_cv_history_is_initial", "is_initial"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(
        String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Snapshot data
    cv_data = Column(JSON, nullable=False)  # The CV data at this point in time
    change_type = Column(
        String(50), nullable=False
    )  # Type of change that triggered this snapshot
    description = Column(Text, nullable=True)  # Human-readable description
    label = Column(String(255), nullable=True)  # Optional user-provided label

    # Metadata
    is_automatic = Column(
        Boolean, default=True, nullable=False
    )  # Whether this was an auto-snapshot
    is_initial = Column(
        Boolean, default=False, nullable=False
    )  # Whether this is the initial version (undeletable)
    data_size = Column(Integer, nullable=False)  # Size of the serialized data

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    cv = relationship("CV", back_populates="history")
    user = relationship("User")

    def __str__(self):
        return f"<CVHistory {self.cv_id} - {self.change_type} at {self.created_at}>"

    def to_response_dict(self) -> dict:
        """Convert CV history model to response dictionary."""
        return {
            "id": str(self.id),
            "cv_id": str(self.cv_id),
            "user_id": str(self.user_id),
            "cv_data": self.cv_data,
            "change_type": self.change_type,
            "description": self.description,
            "label": self.label,
            "is_automatic": self.is_automatic,
            "is_initial": self.is_initial,
            "data_size": self.data_size,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat(),
        }

    def to_frontend_format(self) -> dict:
        """Convert to frontend history entry format."""
        return {
            "id": str(self.id),
            "timestamp": self.created_at.replace(tzinfo=timezone.utc).isoformat(),
            "cvData": self.cv_data,
            "changeType": self.change_type,
            "description": self.description or self._generate_default_description(),
            "isAutomatic": self.is_automatic,
            "isInitial": self.is_initial,
            "label": self.label,
            "dataSize": self.data_size,
        }

    def _generate_default_description(self) -> str:
        """Generate a default description based on change type."""
        descriptions = {
            "manual_save": "Manual save",
            "auto_save": "Automatic save",
            "section_edit": "Section edited",
            "bulk_change": "Multiple sections changed",
            "initial_load": "CV loaded",
            "before_ai_optimize": "Before AI optimization",
            "restore_point": "Restore point created",
        }
        return descriptions.get(self.change_type, "CV updated")
