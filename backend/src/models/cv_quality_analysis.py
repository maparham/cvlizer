"""
CV Quality Analysis model for storing AI-generated quality coaching.

Independent of job descriptions - analyzes CV quality in isolation.
Stores writing corrections, content coaching, timeline gaps, and overall score.
"""

import uuid
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class CVQualityAnalysis(Base):
    """
    CV Quality Analysis model.

    Stores comprehensive quality analysis results including:
    - Writing corrections (grammar, typos, clarity)
    - Content coaching questions
    - Professional summary suggestions
    - Work experience & education quality scores
    - Timeline gap detection
    - Overall quality score
    """

    __tablename__ = "cv_quality_analyses"

    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cv_id = Column(
        String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # AI-generated quality analysis data
    quality_data = Column(
        JSON, nullable=True, comment="Complete quality analysis response"
    )
    overall_quality_score = Column(
        Integer, nullable=True, comment="Overall CV quality score (0-100)"
    )

    # AI metadata
    tokens_used = Column(Integer, default=0, nullable=False)
    generation_time = Column(
        Integer, default=0, nullable=False, comment="Generation time in seconds"
    )
    model_used = Column(String(50), nullable=True)

    # Background task status
    is_generating = Column(Boolean, default=False, nullable=False, index=True)
    generation_error = Column(Text, nullable=True)

    # Timestamps
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
    user = relationship("User", back_populates="cv_quality_analyses")
    cv = relationship("CV", back_populates="cv_quality_analyses")

    def __repr__(self):
        return f"<CVQualityAnalysis(id={self.id}, cv_id={self.cv_id}, score={self.overall_quality_score})>"
