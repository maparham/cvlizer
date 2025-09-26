"""
Impersonation API endpoints for admin user impersonation functionality.

This module provides REST API endpoints for managing admin impersonation sessions
with comprehensive security controls, rate limiting, and audit logging.
Enables verified admins to temporarily act as users with full auditability.

Key endpoints:
- POST /start: Start impersonation session
- POST /end: End current impersonation session  
- GET /status: Get current impersonation status
- GET /active: List active impersonation sessions
- POST /revoke/{session_id}: Revoke specific session (admin only)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

from ..models.base import get_db
from ..models.user import User
from ..models.impersonation_session import ImpersonationSession
from ..middleware.clerk_auth import get_current_user, get_current_user_lightweight, is_admin_user, require_admin_not_impersonating, require_admin_allow_impersonating
from ..services.impersonation_service import (
    start_impersonation_session,
    end_impersonation_session,
    get_active_session_for_admin,
    get_active_sessions,
    validate_session,
    revoke_session,
    ImpersonationNotAllowedError,
    ImpersonationRateLimitError,
    ImpersonationError
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/impersonations", tags=["impersonation"])
auth_router = APIRouter(prefix="/api/auth/impersonation", tags=["impersonation"])

# Cookie configuration
IMPERSONATION_COOKIE_NAME = "impersonation_session"
COOKIE_MAX_AGE = 1800  # 30 minutes

# Derive cookie security from environment
import os
from dotenv import load_dotenv
load_dotenv()

def _is_truthy(val: str) -> bool:
    return str(val).lower() in {"1", "true", "yes", "on"}

DEV_MODE = _is_truthy(os.getenv("DEV_MODE", "true"))
IMPERSONATION_COOKIE_SECURE = os.getenv("IMPERSONATION_COOKIE_SECURE")

# Cookie security: secure in prod, not secure in dev (unless explicitly overridden)
if IMPERSONATION_COOKIE_SECURE is not None:
    COOKIE_SECURE = _is_truthy(IMPERSONATION_COOKIE_SECURE)
else:
    COOKIE_SECURE = not DEV_MODE

COOKIE_SAMESITE = "strict"


# Request/Response models
class StartImpersonationRequest(BaseModel):
    target_user_id: str = Field(..., description="ID of the user to impersonate")
    justification: Optional[str] = Field(None, description="Optional justification for impersonation")


class ImpersonationSessionResponse(BaseModel):
    id: str
    target_user_id: str
    target_user_email: str
    started_at: str
    expires_at: str
    remaining_seconds: int
    justification: Optional[str]
    
    class Config:
        from_attributes = True


class ImpersonationStatusResponse(BaseModel):
    active: bool
    target_user: Optional[dict] = None
    expires_at: Optional[str] = None
    remaining_seconds: Optional[int] = None
    session_id: Optional[str] = None


class ActiveSessionResponse(BaseModel):
    id: str
    admin_id: str
    admin_email: str
    target_user_id: str
    target_user_email: str
    started_at: str
    expires_at: str
    remaining_seconds: int
    justification: Optional[str]
    
    class Config:
        from_attributes = True


def _get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP address from request."""
    # Check for forwarded headers first (for reverse proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    if hasattr(request, "client") and request.client:
        return request.client.host
    
    return None


def _get_user_agent(request: Request) -> Optional[str]:
    """Extract user agent from request."""
    return request.headers.get("User-Agent")




@router.post("/start", response_model=ImpersonationSessionResponse)
async def start_impersonation(
    request: StartImpersonationRequest,
    req: Request,
    response: Response,
    current_user: User = Depends(require_admin_not_impersonating),
    db: Session = Depends(get_db)
):
    """
    Start a new impersonation session.
    
    Requires admin privileges. Creates a new impersonation session and sets
    a secure HTTP-only cookie for session tracking.
    """
    try:
        # Admin check is now handled by the dependency
        
        # Get client metadata
        admin_ip = _get_client_ip(req)
        admin_user_agent = _get_user_agent(req)
        
        # Start the impersonation session
        session = start_impersonation_session(
            db=db,
            admin_user=current_user,
            target_user_id=request.target_user_id,
            justification=request.justification,
            admin_ip=admin_ip,
            admin_user_agent=admin_user_agent
        )
        
        # Set secure cookie
        response.set_cookie(
            key=IMPERSONATION_COOKIE_NAME,
            value=session.id,
            max_age=COOKIE_MAX_AGE,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            path="/"
        )
        
        return ImpersonationSessionResponse(
            id=session.id,
            target_user_id=session.target_user_id,
            target_user_email=session.target_user.email,
            started_at=session.started_at.isoformat(),
            expires_at=session.expires_at.isoformat(),
            remaining_seconds=session.remaining_seconds,
            justification=session.justification
        )
        
    except ImpersonationNotAllowedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ImpersonationRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except ImpersonationError as e:
        logger.error(f"Impersonation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start impersonation session"
        )
    except Exception as e:
        logger.error(f"Unexpected error starting impersonation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/end", status_code=status.HTTP_204_NO_CONTENT)
async def end_impersonation(
    response: Response,
    current_user: User = Depends(require_admin_allow_impersonating),
    db: Session = Depends(get_db)
):
    """
    End the current impersonation session.
    
    Requires admin privileges. Ends the active impersonation session for
    the current admin and clears the session cookie.
    """
    try:
        # Admin check is now handled by the dependency
        
        # Find active session for this admin
        active_session = get_active_session_for_admin(db, current_user.id)
        if not active_session:
            # Clear cookie anyway in case it exists
            response.delete_cookie(
                key=IMPERSONATION_COOKIE_NAME,
                path="/",
                secure=COOKIE_SECURE,
                samesite=COOKIE_SAMESITE
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active impersonation session found"
            )
        
        # End the session
        success = end_impersonation_session(db, active_session.id, "ended_by_admin")
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to end impersonation session"
            )
        
        # Clear the cookie
        response.delete_cookie(
            key=IMPERSONATION_COOKIE_NAME,
            path="/",
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error ending impersonation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/active", response_model=List[ActiveSessionResponse])
async def get_active_impersonation_sessions(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_admin_not_impersonating),
    db: Session = Depends(get_db)
):
    """
    Get active impersonation sessions.
    
    Requires admin privileges. Returns list of currently active
    impersonation sessions, optionally filtered by the current admin.
    """
    try:
        # Admin check is now handled by the dependency
        
        # Get active sessions for this admin only
        sessions = get_active_sessions(db, admin_id=current_user.id, limit=limit, offset=offset)
        
        return [
            ActiveSessionResponse(
                id=session.id,
                admin_id=session.admin_id,
                admin_email=session.admin.email,
                target_user_id=session.target_user_id,
                target_user_email=session.target_user.email,
                started_at=session.started_at.isoformat(),
                expires_at=session.expires_at.isoformat(),
                remaining_seconds=session.remaining_seconds,
                justification=session.justification
            )
            for session in sessions
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting active sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/revoke/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_impersonation_session(
    session_id: str,
    current_user: User = Depends(require_admin_not_impersonating),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific impersonation session.
    
    Requires admin privileges. Allows an admin to revoke any impersonation
    session (useful for emergency situations or administrative oversight).
    """
    try:
        # Admin check is now handled by the dependency
        
        success = revoke_session(db, session_id, current_user)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Impersonation session not found or already ended"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error revoking session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# Auth endpoints (available to any authenticated user)
@auth_router.get("/status", response_model=ImpersonationStatusResponse)
async def get_impersonation_status(
    req: Request,
    response: Response,
    current_user: User = Depends(get_current_user_lightweight),
    db: Session = Depends(get_db)
):
    """
    Get current impersonation status.
    
    Available to any authenticated user. Returns information about
    the current impersonation session if active.
    """
    def delete_cookie():
        """Helper to delete stale impersonation cookie"""
        response.delete_cookie(
            key=IMPERSONATION_COOKIE_NAME,
            path="/",
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE
        )
    
    try:
        # Check for impersonation cookie
        session_id = req.cookies.get(IMPERSONATION_COOKIE_NAME)
        if not session_id:
            return ImpersonationStatusResponse(active=False)
        
        # Validate the session
        admin_ip = _get_client_ip(req)
        admin_user_agent = _get_user_agent(req)
        
        session = validate_session(db, session_id, admin_ip, admin_user_agent)
        if not session:
            # Session is invalid/expired, clear the cookie
            delete_cookie()
            return ImpersonationStatusResponse(active=False)
        
        # Verify the current user is the admin for this session
        if current_user.id != session.admin_id:
            # Admin mismatch, clear the cookie
            delete_cookie()
            return ImpersonationStatusResponse(active=False)
        
        return ImpersonationStatusResponse(
            active=True,
            target_user={
                "id": session.target_user.id,
                "email": session.target_user.email
            },
            expires_at=session.expires_at.isoformat(),
            remaining_seconds=session.remaining_seconds,
            session_id=session.id
        )
        
    except Exception as e:
        logger.error(f"Unexpected error getting impersonation status: {str(e)}")
        # Clear cookie on error and return inactive status
        delete_cookie()
        return ImpersonationStatusResponse(active=False)
