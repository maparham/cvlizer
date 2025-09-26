"""
Audit log model for tracking admin actions and system events.

This module defines the AuditLog database model for comprehensive tracking
of administrative actions, security events, and system changes to enable
audit trails and compliance monitoring.
"""
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import uuid


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., 'user_impersonation_start', 'user_deactivated'
    description = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)  # Additional context data
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    admin_user = relationship("User", foreign_keys=[admin_user_id], backref="admin_actions")
    target_user = relationship("User", foreign_keys=[target_user_id], backref="targeted_actions")
    
    def __str__(self):
        return f"<AuditLog {self.action} by {self.admin_user_id} at {self.timestamp}>"
