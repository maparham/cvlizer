"""
Optimization history model for tracking ATS optimization scores over time.

This module defines the OptimizationHistory database model for storing
ATS optimization analysis results and tracking improvements over time.
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class OptimizationHistory(Base):
    __tablename__ = "optimization_history"

    # Configure to avoid Pydantic model conflicts
    model_config = {"protected_namespaces": ()}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_id = Column(
        String(36), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_description_id = Column(
        String(36),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    optimization_type = Column(
        String(50), default="ats", nullable=False
    )  # "ats", "job_fit", "content_enhancement"
    ats_score = Column(Integer, nullable=True)  # 1-100 ATS compatibility score
    confidence_score = Column(Integer, nullable=True)  # 1-100 confidence in analysis
    missing_keywords = Column(
        JSON, nullable=True
    )  # List of missing keywords with metadata
    keyword_density = Column(JSON, nullable=True)  # Keyword density analysis
    suggestions = Column(JSON, nullable=True)  # List of optimization suggestions
    optimized_sections = Column(JSON, nullable=True)  # Sections that need optimization
    strengths = Column(JSON, nullable=True)  # List of strengths identified
    weaknesses = Column(JSON, nullable=True)  # List of weaknesses identified
    ai_model = Column(
        String(50), nullable=True
    )  # Default set by application layer from config
    tokens_used = Column(Integer, nullable=True)
    generation_time = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    cv = relationship("CV", back_populates="optimization_history")
    job_description = relationship(
        "JobDescription", back_populates="optimization_history"
    )

    def __str__(self):
        return f"<OptimizationHistory {self.optimization_type} for CV {self.cv_id}>"
