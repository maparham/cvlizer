"""
AI Usage Log model for tracking OpenAI API token consumption and costs.

This module defines the AIUsageLog database model for comprehensive tracking
of all OpenAI API calls, including token usage, costs, and performance metrics.
"""

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cv_id = Column(
        String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    operation_type = Column(
        String(50), nullable=False, index=True
    )  # parse_cv, generate_section, etc.
    model_used = Column(
        String(50), nullable=False
    )  # Model name from .env (e.g., gpt-5-nano)
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    cached_tokens = Column(
        Integer, nullable=False, default=0
    )  # Cached input tokens (billed at 10% of input price)
    total_tokens = Column(Integer, nullable=False, default=0)
    estimated_cost = Column(
        Float(precision=6), nullable=False, default=0.0
    )  # USD with 6 decimal places
    # flex, standard, priority. Migration in database.py adds column if missing.
    service_tier = Column(String(50), nullable=True)
    generation_time = Column(Integer, nullable=False, default=0)  # milliseconds
    success = Column(Boolean, nullable=False, default=True, index=True)
    error_message = Column(Text, nullable=True)
    timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", backref="ai_usage_logs")
    cv = relationship("CV", backref="ai_usage_logs")

    # Indexes for performance
    __table_args__ = (
        Index("idx_ai_usage_user_timestamp", "user_id", "timestamp"),
        Index("idx_ai_usage_operation_timestamp", "operation_type", "timestamp"),
        Index("idx_ai_usage_success_timestamp", "success", "timestamp"),
    )

    def __str__(self):
        return f"<AIUsageLog {self.operation_type} - {self.total_tokens} tokens - ${self.estimated_cost:.6f}>"

    def to_dict(self):
        """Convert model to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "cv_id": str(self.cv_id) if self.cv_id else None,
            "operation_type": self.operation_type,
            "model_used": self.model_used,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "cached_tokens": self.cached_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost": self.estimated_cost,
            "service_tier": self.service_tier,
            "generation_time": self.generation_time,
            "success": self.success,
            "error_message": self.error_message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
