"""
AI quota dependency for free-tier enforcement.

Requires the effective user to be within the rolling 30-day cost limit before
allowing AI operations. Admins (when not impersonating) are exempt.
"""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.config import AIUsageConfig
from src.middleware.clerk_auth import (
    AuthContext,
    get_current_user_with_impersonation,
    is_admin_user,
)
from src.models.base import get_db
from src.services import quota_service


async def require_ai_quota(
    request: Request,
    auth_context: AuthContext = Depends(get_current_user_with_impersonation),
    db: Session = Depends(get_db),
) -> None:
    """
    Ensure the effective user is within free-tier AI quota. Raise 403 if over limit.

    Skips check when quota is disabled or when the request is from an admin
    who is not impersonating (impersonation consumes the target user's quota).
    """
    if not AIUsageConfig.FREE_TIER_QUOTA_ENABLED:
        return
    if is_admin_user(auth_context.original_user) and not auth_context.is_impersonating:
        return
    result = quota_service.check_quota(db, str(auth_context.effective_user.id))
    if not result["allowed"]:
        detail = (
            f"Free trial limit reached. Used ${result['used_cost']:.2f} of "
            f"${result['limit_cost']:.2f} this period."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
