"""
Usage API for free-tier quota and AI usage display.

Provides GET /usage for the frontend to show token/cost progress and allowed status.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services.platform import quota_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["usage"])


class UsageResponse(BaseModel):
    """Response for GET /api/usage."""

    used_tokens: int
    limit_tokens: int
    used_cost: float
    limit_cost: float
    remaining_cost: float
    period_days: int
    allowed: bool


@router.get("/usage", response_model=UsageResponse)
def get_usage(
    current_user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
):
    """
    Return current user's AI usage and quota for the rolling period.

    Uses effective user (impersonation shows the impersonated user's usage).
    """
    try:
        result = quota_service.check_quota(db, str(current_user.id))
    except SQLAlchemyError:
        logger.exception("GET /api/usage: database error in check_quota")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Usage temporarily unavailable",
        ) from None

    return UsageResponse(
        used_tokens=int(result["used_tokens"]),
        limit_tokens=int(result["limit_tokens"]),
        used_cost=float(result["used_cost"]),
        limit_cost=float(result["limit_cost"]),
        remaining_cost=float(result["remaining_cost"]),
        period_days=int(result["period_days"]),
        allowed=bool(result["allowed"]),
    )
