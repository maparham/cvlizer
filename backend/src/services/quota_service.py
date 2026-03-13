"""
Free-tier AI quota service.

Provides rolling 30-day usage aggregation and quota checks for AI operations.
Enforcement (admin exemption, 403) is handled by the require_ai_quota dependency.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from src.config import AIUsageConfig
from src.models.ai_usage_log import AIUsageLog


def get_period_usage(db: Session, user_id: str, days: int = 30) -> Dict[str, Any]:
    """
    Get AI usage for a user over the last N days (successful operations only).

    Args:
        db: Database session
        user_id: User ID to aggregate for
        days: Number of days (default 30)

    Returns:
        Dict with used_cost (sum estimated_cost), used_tokens (sum total_tokens)
    """
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    query = db.query(
        func.coalesce(func.sum(AIUsageLog.estimated_cost), 0.0).label("used_cost"),
        func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("used_tokens"),
    ).filter(
        and_(
            AIUsageLog.user_id == user_id,
            AIUsageLog.timestamp >= start_date,
            AIUsageLog.timestamp <= end_date,
            AIUsageLog.success == True,
        )
    )
    row = query.first()
    return {
        "used_cost": float(row.used_cost or 0.0),
        "used_tokens": int(row.used_tokens or 0),
    }


def check_quota(db: Session, user_id: str) -> Dict[str, Any]:
    """
    Check if the user is within free-tier quota for the current period.

    Args:
        db: Database session
        user_id: User ID to check

    Returns:
        Dict with allowed (bool), used_cost, limit_cost, remaining_cost,
        used_tokens, limit_tokens (display cap from config).
    """
    if not AIUsageConfig.FREE_TIER_QUOTA_ENABLED:
        return {
            "allowed": True,
            "used_cost": 0.0,
            "limit_cost": AIUsageConfig.FREE_TIER_COST_PER_30_DAYS,
            "remaining_cost": AIUsageConfig.FREE_TIER_COST_PER_30_DAYS,
            "used_tokens": 0,
            "limit_tokens": AIUsageConfig.FREE_TIER_DISPLAY_TOKEN_CAP,
            "period_days": 30,
        }

    usage = get_period_usage(db, user_id, days=30)
    limit_cost = AIUsageConfig.FREE_TIER_COST_PER_30_DAYS
    used_cost = usage["used_cost"]
    remaining_cost = max(0.0, limit_cost - used_cost)
    allowed = used_cost < limit_cost

    return {
        "allowed": allowed,
        "used_cost": round(used_cost, 6),
        "limit_cost": limit_cost,
        "remaining_cost": round(remaining_cost, 6),
        "used_tokens": usage["used_tokens"],
        "limit_tokens": AIUsageConfig.FREE_TIER_DISPLAY_TOKEN_CAP,
        "period_days": 30,
    }
