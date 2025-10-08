"""
Impersonation service for secure admin user impersonation functionality.

This module provides comprehensive impersonation session management with
security controls, audit logging, and session validation. Enables verified
admins to temporarily act as users with full auditability and strict controls.

Key responsibilities:
- Create and manage impersonation sessions with TTL
- Validate impersonation requests and enforce security rules
- Handle session expiration and cleanup
- Integrate with audit logging for full traceability
- Enforce rate limiting and security constraints
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
import logging

from src.models.user import User
from src.models.impersonation_session import ImpersonationSession
from src.services.audit_service import log_admin_action
from src.middleware.clerk_auth import is_admin_user

logger = logging.getLogger(__name__)

# Configuration from environment variables
IMPERSONATION_ENABLED = os.getenv("IMPERSONATION_ENABLED", "true").lower() == "true"
IMPERSONATION_TTL_SECONDS = int(os.getenv("IMPERSONATION_TTL_SECONDS", "1800"))  # 30 minutes
IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR = int(os.getenv("IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR", "10"))
IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY = int(os.getenv("IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY", "5"))
IMPERSONATION_STRICT_IP_BINDING = os.getenv("IMPERSONATION_STRICT_IP_BINDING", "true").lower() == "true"


class ImpersonationError(Exception):
    """Base exception for impersonation-related errors."""
    pass


class ImpersonationNotAllowedError(ImpersonationError):
    """Raised when impersonation is not allowed for the given context."""
    pass


class ImpersonationRateLimitError(ImpersonationError):
    """Raised when rate limits are exceeded."""
    pass


def _check_impersonation_enabled() -> None:
    """Check if impersonation is enabled globally."""
    if not IMPERSONATION_ENABLED:
        raise ImpersonationNotAllowedError("Impersonation is disabled")


def _validate_admin_user(admin_user: User) -> None:
    """Validate that the user can perform impersonation."""
    if not is_admin_user(admin_user):
        raise ImpersonationNotAllowedError("Only verified admins can start impersonation sessions")
    
    if not admin_user.is_active:
        raise ImpersonationNotAllowedError("Admin account is not active")


def _validate_target_user(db: Session, target_user_id: str, admin_user: User) -> User:
    """Validate the target user for impersonation."""
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise ImpersonationNotAllowedError("Target user not found")
    
    # Cannot impersonate admins
    if is_admin_user(target_user):
        raise ImpersonationNotAllowedError("Cannot impersonate admin users")
    
    # Cannot impersonate inactive users
    if not target_user.is_active:
        raise ImpersonationNotAllowedError("Cannot impersonate inactive users")
    
    # Cannot impersonate self (though this should be caught by admin check)
    if target_user.id == admin_user.id:
        raise ImpersonationNotAllowedError("Cannot impersonate yourself")
    
    return target_user


def _check_rate_limits(db: Session, admin_user: User, target_user: User) -> None:
    """Check rate limits for impersonation."""
    now = datetime.now(timezone.utc)
    
    # Check admin rate limit (per hour)
    admin_hour_ago = now - timedelta(hours=1)
    admin_recent_sessions = db.query(ImpersonationSession).filter(
        and_(
            ImpersonationSession.admin_id == admin_user.id,
            ImpersonationSession.started_at >= admin_hour_ago
        )
    ).count()
    
    if admin_recent_sessions >= IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR:
        raise ImpersonationRateLimitError(
            f"Admin rate limit exceeded: {admin_recent_sessions}/{IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR} per hour"
        )
    
    # Check target rate limit (per day) - only count sessions that were actually used
    target_day_ago = now - timedelta(days=1)
    target_recent_sessions = db.query(ImpersonationSession).filter(
        and_(
            ImpersonationSession.target_user_id == target_user.id,
            ImpersonationSession.started_at >= target_day_ago,
            # Only count sessions that were used for more than 1 minute (not just test sessions)
            ImpersonationSession.ended_at.isnot(None),
            ImpersonationSession.ended_at > ImpersonationSession.started_at + timedelta(minutes=1)
        )
    ).count()
    
    if target_recent_sessions >= IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY:
        raise ImpersonationRateLimitError(
            f"Target user rate limit exceeded: {target_recent_sessions}/{IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY} per day"
        )


def start_impersonation_session(
    db: Session,
    admin_user: User,
    target_user_id: str,
    justification: Optional[str] = None,
    admin_ip: Optional[str] = None,
    admin_user_agent: Optional[str] = None
) -> ImpersonationSession:
    """
    Start a new impersonation session.
    
    Args:
        db: Database session
        admin_user: The admin user starting the impersonation
        target_user_id: ID of the user to impersonate
        justification: Optional justification for the impersonation
        admin_ip: IP address of the admin
        admin_user_agent: User agent of the admin
    
    Returns:
        ImpersonationSession: The created impersonation session
    
    Raises:
        ImpersonationNotAllowedError: If impersonation is not allowed
        ImpersonationRateLimitError: If rate limits are exceeded
    """
    try:
        _check_impersonation_enabled()
        _validate_admin_user(admin_user)
        target_user = _validate_target_user(db, target_user_id, admin_user)
        _check_rate_limits(db, admin_user, target_user)
        
        # End any existing active session for this admin
        existing_session = get_active_session_for_admin(db, admin_user.id)
        if existing_session:
            end_impersonation_session(db, existing_session.id, "ended_by_new_session")
            logger.info(f"Ended existing session {existing_session.id} for admin {admin_user.id}")
        
        # Create new session
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=IMPERSONATION_TTL_SECONDS)
        session = ImpersonationSession(
            admin_id=admin_user.id,
            target_user_id=target_user.id,
            expires_at=expires_at,
            admin_ip=admin_ip,
            admin_user_agent=admin_user_agent,
            justification=justification
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Log the impersonation start
        log_admin_action(
            db=db,
            admin_user=admin_user,
            action="impersonation_start",
            description=f"Started impersonating user {target_user.email}",
            target_user_id=target_user.id,
            details={
                "session_id": session.id,
                "expires_at": expires_at.isoformat(),
                "justification": justification,
                "ttl_seconds": IMPERSONATION_TTL_SECONDS
            },
            ip_address=admin_ip,
            user_agent=admin_user_agent
        )
        
        logger.info(f"Started impersonation session {session.id}: admin {admin_user.email} -> target {target_user.email}")
        return session
        
    except (ImpersonationNotAllowedError, ImpersonationRateLimitError):
        # Re-raise these specific exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to start impersonation session: {str(e)}")
        db.rollback()
        raise ImpersonationError(f"Failed to start impersonation session: {str(e)}")


def end_impersonation_session(
    db: Session,
    session_id: str,
    end_reason: str = "ended_by_admin"
) -> bool:
    """
    End an impersonation session.
    
    Args:
        db: Database session
        session_id: ID of the session to end
        end_reason: Reason for ending the session
    
    Returns:
        bool: True if session was ended, False if not found or already ended
    """
    try:
        session = db.query(ImpersonationSession).filter(
            ImpersonationSession.id == session_id
        ).first()
        
        if not session:
            logger.warning(f"Impersonation session {session_id} not found")
            return False
        
        if session.ended_at is not None:
            logger.warning(f"Impersonation session {session_id} already ended")
            return False
        
        # End the session
        session.end_session(end_reason)
        db.commit()
        
        # Calculate duration
        duration_seconds = int((session.ended_at - session.started_at).total_seconds())
        
        # Log the impersonation end
        log_admin_action(
            db=db,
            admin_user=session.admin,
            action="impersonation_end",
            description=f"Ended impersonation of user {session.target_user.email}",
            target_user_id=session.target_user_id,
            details={
                "session_id": session.id,
                "end_reason": end_reason,
                "duration_seconds": duration_seconds
            }
        )
        
        logger.info(f"Ended impersonation session {session_id}: reason={end_reason}, duration={duration_seconds}s")
        return True
        
    except Exception as e:
        logger.error(f"Failed to end impersonation session {session_id}: {str(e)}")
        db.rollback()
        raise ImpersonationError(f"Failed to end impersonation session: {str(e)}")


def get_active_session_for_admin(db: Session, admin_id: str) -> Optional[ImpersonationSession]:
    """Get the active impersonation session for an admin."""
    # Get all sessions for this admin and filter by is_active property
    sessions = db.query(ImpersonationSession).filter(
        and_(
            ImpersonationSession.admin_id == admin_id,
            ImpersonationSession.ended_at.is_(None),
            ImpersonationSession.revoked == False
        )
    ).all()
    
    # Filter by is_active property to handle timezone issues
    for session in sessions:
        if session.is_active:
            return session
    
    return None


def get_session_by_id(db: Session, session_id: str) -> Optional[ImpersonationSession]:
    """Get an impersonation session by ID with eager loading of relationships."""
    return db.query(ImpersonationSession).options(
        joinedload(ImpersonationSession.admin),
        joinedload(ImpersonationSession.target_user)
    ).filter(
        ImpersonationSession.id == session_id
    ).first()


def validate_session(
    db: Session,
    session_id: str,
    admin_ip: Optional[str] = None,
    admin_user_agent: Optional[str] = None
) -> Optional[ImpersonationSession]:
    """
    Validate an impersonation session.
    
    Args:
        db: Database session
        session_id: ID of the session to validate
        admin_ip: Current IP address to validate against
        admin_user_agent: Current user agent to validate against
    
    Returns:
        ImpersonationSession: Valid session or None if invalid
    """
    session = get_session_by_id(db, session_id)
    if not session:
        return None
    
    # Check if session is active
    if not session.is_active:
        # If expired, mark as ended
        if session.is_expired and not session.ended_at:
            session.end_session("expired")
            db.commit()
            
            # Log expiration
            log_admin_action(
                db=db,
                admin_user=session.admin,
                action="impersonation_expire",
                description=f"Impersonation session expired for user {session.target_user.email}",
                target_user_id=session.target_user_id,
                details={"session_id": session.id}
            )
        
        return None
    
    # Validate IP binding if strict mode is enabled
    if IMPERSONATION_STRICT_IP_BINDING and admin_ip and session.admin_ip:
        if admin_ip != session.admin_ip:
            logger.warning(f"IP mismatch for session {session_id}: expected {session.admin_ip}, got {admin_ip}")
            return None
    
    return session


def get_active_sessions(
    db: Session,
    admin_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[ImpersonationSession]:
    """Get active impersonation sessions with optional filtering."""
    query = db.query(ImpersonationSession).filter(
        and_(
            ImpersonationSession.ended_at.is_(None),
            ImpersonationSession.revoked == False
        )
    )
    
    if admin_id:
        query = query.filter(ImpersonationSession.admin_id == admin_id)
    
    # Get all sessions and filter by is_active property to handle timezone issues
    all_sessions = query.order_by(ImpersonationSession.started_at.desc()).all()
    active_sessions = [session for session in all_sessions if session.is_active]
    
    # Apply pagination
    return active_sessions[offset:offset + limit]


def revoke_session(db: Session, session_id: str, revoking_admin: User) -> bool:
    """
    Revoke an impersonation session (admin action).
    
    Args:
        db: Database session
        session_id: ID of the session to revoke
        revoking_admin: Admin user performing the revocation
    
    Returns:
        bool: True if session was revoked, False if not found
    """
    try:
        session = get_session_by_id(db, session_id)
        if not session:
            return False
        
        if session.revoked or session.ended_at:
            return False
        
        # Revoke the session
        session.revoke_session()
        db.commit()
        
        # Log the revocation
        log_admin_action(
            db=db,
            admin_user=revoking_admin,
            action="impersonation_revoke",
            description=f"Revoked impersonation session for user {session.target_user.email}",
            target_user_id=session.target_user_id,
            details={
                "session_id": session.id,
                "original_admin_id": session.admin_id
            }
        )
        
        logger.info(f"Revoked impersonation session {session_id} by admin {revoking_admin.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to revoke impersonation session {session_id}: {str(e)}")
        db.rollback()
        raise ImpersonationError(f"Failed to revoke impersonation session: {str(e)}")


def cleanup_expired_sessions(db: Session) -> int:
    """
    Clean up expired impersonation sessions.
    
    Returns:
        int: Number of sessions cleaned up
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Find expired sessions that haven't been marked as ended
        expired_sessions = db.query(ImpersonationSession).filter(
            and_(
                ImpersonationSession.expires_at <= now,
                ImpersonationSession.ended_at.is_(None),
                ImpersonationSession.revoked == False
            )
        ).all()
        
        count = 0
        for session in expired_sessions:
            session.end_session("expired")
            count += 1
        
        if count > 0:
            db.commit()
            logger.info(f"Cleaned up {count} expired impersonation sessions")
        
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions: {str(e)}")
        db.rollback()
        return 0
