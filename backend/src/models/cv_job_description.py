"""
CV-JobDescription Association Model - Many-to-Many Relationship

This module defines the junction table for the many-to-many relationship
between CVs and Job Descriptions. It allows job descriptions to be associated
with multiple CVs and tracks when each association was created.

Key responsibilities:
- Store CV-to-JobDescription associations
- Track when each association was created
- Enable job descriptions to be shared across multiple CVs
- Maintain referential integrity with cascade deletes

Usage context:
- Used by CV and JobDescription models for many-to-many relationship
- Automatically managed by SQLAlchemy ORM
- Enables user-scoped job descriptions accessible from any CV

Dependencies:
- CV and JobDescription models for foreign key relationships
- SQLAlchemy for ORM functionality
"""

from sqlalchemy import Column, DateTime, ForeignKey, String, Table
from sqlalchemy.sql import func

from .base import Base


class CVJobDescription(Base):
    """
    Junction table for many-to-many relationship between CVs and Job Descriptions.

    This allows a job description to be associated with multiple CVs,
    enabling users to reuse job descriptions across different CV versions.
    """

    __tablename__ = "cv_job_descriptions"

    cv_id = Column(
        String(36),
        ForeignKey("cvs.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    job_description_id = Column(
        String(36),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __str__(self):
        return f"<CVJobDescription cv_id={self.cv_id} jd_id={self.job_description_id}>"
