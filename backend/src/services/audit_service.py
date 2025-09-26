"""
Audit logging service for tracking admin actions and system events.

This module provides functions for logging admin actions
and other important system events for security auditing and debugging purposes.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models.audit_log import AuditLog
from ..models.user import User
import logging

logger = logging.getLogger(__name__)


def log_admin_action(
    db: Session,
    admin_user: User,
    action: str,
    description: Optional[str] = None,
    target_user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    """
    Log an admin action to the audit trail.
    
    Args:
        db: Database session
        admin_user: The admin user performing the action
        action: The action being performed (e.g., 'view_user_data')
        description: Human-readable description of the action
        target_user_id: ID of the user being acted upon (if applicable)
        details: Additional context data as a dictionary
        ip_address: IP address of the admin user
        user_agent: User agent string of the admin user
    
    Returns:
        AuditLog: The created audit log entry
    """
    try:
        audit_log = AuditLog(
            admin_user_id=admin_user.id,
            target_user_id=target_user_id,
            action=action,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.now(timezone.utc)
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        logger.info(f"Audit log created: {action} by {admin_user.email} for target {target_user_id}")
        return audit_log
        
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")
        db.rollback()
        raise


def get_audit_logs(
    db: Session,
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> list[AuditLog]:
    """
    Retrieve audit logs with optional filtering.
    
    Args:
        db: Database session
        admin_user_id: Filter by admin user ID
        target_user_id: Filter by target user ID
        action: Filter by action type
        limit: Maximum number of results
        offset: Number of results to skip
    
    Returns:
        list[AuditLog]: List of audit log entries
    """
    query = db.query(AuditLog)
    
    if admin_user_id:
        query = query.filter(AuditLog.admin_user_id == admin_user_id)
    
    if target_user_id:
        query = query.filter(AuditLog.target_user_id == target_user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()






