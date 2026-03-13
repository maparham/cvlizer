"""
Unit tests for free-tier quota service.

Tests get_period_usage and check_quota: under limit, at limit, over limit,
and that only successful operations count toward quota.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base
from src.models.ai_usage_log import AIUsageLog
from src.models.user import User
from src.services.quota_service import check_quota, get_period_usage


@pytest.fixture
def db_session():
    """In-memory SQLite session with Base tables."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def user_id(db_session):
    """Create a test user and return id."""
    user = User(
        email="quota_test@example.com",
        password_hash="hash",
        is_active=True,
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return str(user.id)


def _add_log(
    db,
    user_id: str,
    estimated_cost: float,
    total_tokens: int,
    success: bool = True,
    days_ago: int = 0,
):
    """Insert an AIUsageLog row."""
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    log = AIUsageLog(
        user_id=user_id,
        operation_type="test_op",
        model_used="gpt-4o-mini",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=total_tokens,
        estimated_cost=estimated_cost,
        success=success,
        timestamp=ts,
    )
    db.add(log)
    db.commit()


class TestGetPeriodUsage:
    """Tests for get_period_usage."""

    def test_empty_usage_returns_zero(self, db_session, user_id):
        result = get_period_usage(db_session, user_id, days=30)
        assert result["used_cost"] == 0.0
        assert result["used_tokens"] == 0

    def test_sums_successful_operations_only(self, db_session, user_id):
        _add_log(db_session, user_id, 0.10, 1000, success=True)
        _add_log(db_session, user_id, 0.05, 500, success=False)
        result = get_period_usage(db_session, user_id, days=30)
        assert result["used_cost"] == 0.10
        assert result["used_tokens"] == 1000

    def test_sums_multiple_successful_logs(self, db_session, user_id):
        _add_log(db_session, user_id, 0.10, 1000)
        _add_log(db_session, user_id, 0.15, 2000)
        result = get_period_usage(db_session, user_id, days=30)
        assert result["used_cost"] == 0.25
        assert result["used_tokens"] == 3000

    def test_filters_by_user_id(self, db_session, user_id):
        _add_log(db_session, user_id, 0.10, 1000)
        other_user = User(
            email="other@example.com",
            password_hash="hash",
            is_active=True,
            email_verified=True,
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        _add_log(db_session, str(other_user.id), 0.50, 5000)
        result = get_period_usage(db_session, user_id, days=30)
        assert result["used_cost"] == 0.10
        assert result["used_tokens"] == 1000


class TestCheckQuota:
    """Tests for check_quota."""

    @patch("src.services.quota_service.AIUsageConfig")
    def test_under_limit_allowed(self, mock_config, db_session, user_id):
        mock_config.FREE_TIER_QUOTA_ENABLED = True
        mock_config.FREE_TIER_COST_PER_30_DAYS = 0.25
        mock_config.FREE_TIER_DISPLAY_TOKEN_CAP = 50000
        _add_log(db_session, user_id, 0.10, 10000)
        result = check_quota(db_session, user_id)
        assert result["allowed"] is True
        assert result["used_cost"] == 0.10
        assert result["limit_cost"] == 0.25
        assert result["remaining_cost"] == 0.15
        assert result["used_tokens"] == 10000
        assert result["limit_tokens"] == 50000

    @patch("src.services.quota_service.AIUsageConfig")
    def test_at_limit_not_allowed(self, mock_config, db_session, user_id):
        mock_config.FREE_TIER_QUOTA_ENABLED = True
        mock_config.FREE_TIER_COST_PER_30_DAYS = 0.25
        mock_config.FREE_TIER_DISPLAY_TOKEN_CAP = 50000
        _add_log(db_session, user_id, 0.25, 20000)
        result = check_quota(db_session, user_id)
        assert result["allowed"] is False
        assert result["used_cost"] == 0.25
        assert result["remaining_cost"] == 0.0

    @patch("src.services.quota_service.AIUsageConfig")
    def test_over_limit_not_allowed(self, mock_config, db_session, user_id):
        mock_config.FREE_TIER_QUOTA_ENABLED = True
        mock_config.FREE_TIER_COST_PER_30_DAYS = 0.25
        mock_config.FREE_TIER_DISPLAY_TOKEN_CAP = 50000
        _add_log(db_session, user_id, 0.30, 25000)
        result = check_quota(db_session, user_id)
        assert result["allowed"] is False
        assert result["used_cost"] == 0.30
        assert result["remaining_cost"] == 0.0

    @patch("src.services.quota_service.AIUsageConfig")
    def test_quota_disabled_always_allowed(self, mock_config, db_session, user_id):
        mock_config.FREE_TIER_QUOTA_ENABLED = False
        mock_config.FREE_TIER_COST_PER_30_DAYS = 0.25
        mock_config.FREE_TIER_DISPLAY_TOKEN_CAP = 50000
        _add_log(db_session, user_id, 1.0, 100000)
        result = check_quota(db_session, user_id)
        assert result["allowed"] is True
        assert result["used_tokens"] == 0
        assert result["remaining_cost"] == 0.25
