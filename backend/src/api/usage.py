"""
Usage API for free-tier quota and AI usage display.

Provides GET /usage for the frontend to show token/cost progress and allowed status.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services import quota_service

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
    result = quota_service.check_quota(db, str(current_user.id))
    return UsageResponse(
        used_tokens=result["used_tokens"],
        limit_tokens=result["limit_tokens"],
        used_cost=result["used_cost"],
        limit_cost=result["limit_cost"],
        remaining_cost=result["remaining_cost"],
        period_days=result["period_days"],
        allowed=result["allowed"],
    )
