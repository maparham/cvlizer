"""
User authentication and authorization API endpoints.

This module handles user registration, login, token management,
and provides authentication dependency for protected routes.
"""

import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    create_user,
    get_user_by_email,
    verify_token,
)
from src.services.user_service import delete_user_and_all_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


class UserRegistration(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegistration, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    user = create_user(db, user_data.email, user_data.password)

    # Create tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=15 * 60,  # 15 minutes
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    # Create tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=15 * 60,  # 15 minutes
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token"""
    payload = verify_token(token_data.refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    # Create new tokens
    access_token = create_access_token({"sub": user_id, "email": email})
    refresh_token = create_refresh_token({"sub": user_id, "email": email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=15 * 60,  # 15 minutes
    )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = verify_token(token, "access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )

    return user


@router.get("/me")
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "is_active": current_user.is_active,
        "email_verified": current_user.email_verified,
        "created_at": (
            current_user.created_at.isoformat() if current_user.created_at else None
        ),
        "updated_at": (
            current_user.updated_at.isoformat() if current_user.updated_at else None
        ),
    }


@router.delete("/account")
async def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """
    Delete the authenticated user's account and all associated data.

    This endpoint permanently deletes:
    - User account from local database
    - All CVs and their files from disk
    - All job descriptions
    - All AI enhancements and content
    - All history and activity logs
    - User account from Clerk (authentication provider)

    This action cannot be undone. The user will be signed out and redirected.
    """
    try:
        logger.info(
            f"User account deletion requested by: {current_user.email} (ID: {current_user.id})"
        )

        # Call deletion service
        result = delete_user_and_all_data(
            db=db,
            user_id=str(current_user.id),
            clerk_id=current_user.clerk_id,
            delete_from_clerk=True,
        )

        if not result["success"]:
            logger.error(
                f"Account deletion failed for {current_user.email}: {result['message']}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"],
            )

        # Log successful deletion
        logger.info(
            f"Account successfully deleted: {current_user.email} "
            f"(CVs: {result['deleted_cvs']}, Files: {result['deleted_files']}, "
            f"Clerk: {result['clerk_deleted']})"
        )

        # Return success with details
        response = {
            "message": "Account successfully deleted",
            "deleted_cvs": result["deleted_cvs"],
            "deleted_files": result["deleted_files"],
            "clerk_deleted": result["clerk_deleted"],
        }

        # Include warnings if Clerk deletion failed
        if result.get("errors"):
            response["warnings"] = result["errors"]

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during account deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account deletion failed: {str(e)}",
        )
