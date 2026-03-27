"""
Share view analytics model for public links.

Stores readonly public-link visits for CVs and job descriptions.
"""

import uuid

from sqlalchemy import Column, DateTime, Index, String, Text
from sqlalchemy.sql import func

from src.models.base import Base


class ShareView(Base):
    __tablename__ = "share_views"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_type = Column(String(32), nullable=False, index=True)  # cv | job_description
    resource_id = Column(String(36), nullable=False, index=True)
    # 50 chars: IPv6 max + zone ID (e.g. fe80::1%eth0) per common limits
    viewer_ip = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    referer = Column(String(500), nullable=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index(
            "ix_share_views_resource_type_resource_id_viewed_at",
            "resource_type",
            "resource_id",
            "viewed_at",
        ),
    )
