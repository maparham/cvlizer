"""
Preview job model for async LaTeX template preview generation.

Persists job state in the database so export previews work across multiple
HTTP workers and process restarts. Preview image bytes live on disk under
the uploads directory; this row tracks status and metadata.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from .base import Base


class PreviewJob(Base):
    """Tracks a single CV export preview generation job (one template)."""

    __tablename__ = "preview_jobs"

    job_id = Column(String(150), primary_key=True)
    cv_id = Column(
        String(36),
        ForeignKey("cvs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    page_count = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    has_pdf_fallback = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
