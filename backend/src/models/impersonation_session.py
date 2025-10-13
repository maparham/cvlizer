"""
Impersonation session model for admin user impersonation functionality.

This module defines the ImpersonationSession database model for tracking
admin impersonation sessions with full auditability and security controls.
Supports secure, time-limited impersonation with comprehensive logging.

Key responsibilities:
- Track active impersonation sessions with TTL
- Store session metadata for security validation
- Enable audit trail for all impersonation activities
- Support session revocation and cleanup
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid
from datetime import datetime, timezone, timedelta


class ImpersonationSession(Base):
    __tablename__ = "impersonation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    # Session timing
    started_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Session metadata
    end_reason = Column(String(50), nullable=True)  # ended_by_admin|expired|revoked
    admin_ip = Column(String(45), nullable=True)
    admin_user_agent = Column(Text, nullable=True)
    justification = Column(Text, nullable=True)

    # Session state
    revoked = Column(Boolean, default=False, nullable=False)

    # Relationships
    admin = relationship(
        "User", foreign_keys=[admin_id], backref="impersonation_sessions_as_admin"
    )
    target_user = relationship(
        "User", foreign_keys=[target_user_id], backref="impersonation_sessions_as_target"
    )

    # Indexes for performance
    __table_args__ = (
        # Ensure only one active session per admin
        Index(
            "idx_active_admin_session",
            admin_id,
            postgresql_where=(ended_at.is_(None) & (revoked == False)),
        ),
        # Performance indexes
        Index("idx_expires_at", expires_at),
        Index("idx_target_user_sessions", target_user_id),
    )

    @property
    def is_active(self) -> bool:
        """Check if the session is currently active."""
        now = datetime.now(timezone.utc)
        # Ensure expires_at is timezone-aware
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return not self.revoked and self.ended_at is None and expires_at > now

    @property
    def is_expired(self) -> bool:
        """Check if the session has expired."""
        now = datetime.now(timezone.utc)
        # Ensure expires_at is timezone-aware
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at <= now

    @property
    def remaining_seconds(self) -> int:
        """Get remaining seconds until expiration."""
        if self.ended_at or self.revoked:
            return 0

        now = datetime.now(timezone.utc)
        # Ensure expires_at is timezone-aware
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            return 0
        return int((expires_at - now).total_seconds())

    def end_session(self, reason: str = "ended_by_admin") -> None:
        """End the impersonation session."""
        self.ended_at = datetime.now(timezone.utc)
        self.end_reason = reason

    def revoke_session(self) -> None:
        """Revoke the impersonation session."""
        self.revoked = True
        self.end_reason = "revoked"
        if not self.ended_at:
            self.ended_at = datetime.now(timezone.utc)

    def __str__(self):
        return f"<ImpersonationSession {self.id} admin={self.admin_id} target={self.target_user_id}>"
