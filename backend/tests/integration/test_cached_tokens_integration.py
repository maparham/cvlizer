"""
Integration tests for cached tokens functionality.

Tests end-to-end workflows including:
- AI service calls with cached tokens
- Admin API endpoints for cached tokens
- Database persistence and retrieval
- Frontend data export with cached tokens
"""

import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from datetime import datetime, timedelta, timezone

from main import app
from src.models.ai_usage_log import AIUsageLog
from src.models.user import User


class TestAIUsageAPIWithCachedTokens:
    """Test suite for AI usage API endpoints with cached tokens."""

    def test_get_ai_usage_logs_includes_cached_tokens(
        self, client, test_user, admin_user, admin_headers, db_session
    ):
        """Test that AI usage logs API returns cached_tokens field."""
        # Arrange: Create usage logs with cached tokens
        usage_log = AIUsageLog(
            user_id=test_user.id,
            operation_type="job_fit_analysis",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=600,
            total_tokens=1500,
            estimated_cost=0.000369,
            generation_time=1200,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()

        # Act: Get usage logs
        response = client.get("/api/admin/ai-usage", headers=admin_headers)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert len(data["logs"]) > 0

        log = data["logs"][0]
        assert "cached_tokens" in log
        assert log["cached_tokens"] == 600
        assert log["prompt_tokens"] == 1000
        assert log["completion_tokens"] == 500
        assert log["total_tokens"] == 1500

    def test_get_ai_usage_logs_includes_service_tier(
        self, client, test_user, admin_headers, db_session
    ):
        """Test that AI usage logs API returns service_tier and tier-based cost."""
        usage_log = AIUsageLog(
            user_id=test_user.id,
            operation_type="job_fit_analysis",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=0,
            total_tokens=1500,
            estimated_cost=0.000225,  # flex tier: 0.5 * 0.00045
            service_tier="flex",
            generation_time=1200,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()

        response = client.get("/admin/ai-usage/logs", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert len(data["logs"]) > 0
        log = next((l for l in data["logs"] if l.get("service_tier") == "flex"), None)
        assert log is not None
        assert log["service_tier"] == "flex"
        assert log["estimated_cost"] == pytest.approx(0.000225, abs=1e-6)

    def test_export_ai_usage_logs_includes_cached_tokens(
        self, client, test_user, admin_headers, db_session
    ):
        """Test that CSV export includes cached_tokens column."""
        # Arrange: Create usage logs
        usage_log = AIUsageLog(
            user_id=test_user.id,
            operation_type="cv_parsing",
            model_used="gpt-4o-mini",
            prompt_tokens=1500,
            completion_tokens=800,
            cached_tokens=900,
            total_tokens=2300,
            estimated_cost=0.00051,
            generation_time=1500,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()

        # Act: Export logs
        response = client.get("/api/admin/ai-usage/export", headers=admin_headers)

        # Assert
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

        csv_content = response.content.decode("utf-8")
        lines = csv_content.strip().split("\n")

        # Check header
        header = lines[0]
        assert "Cached Tokens" in header
        assert "Service Tier" in header

        # Check data row
        data_row = lines[1]
        assert "900" in data_row  # Cached tokens value

    def test_ai_usage_statistics_with_cached_tokens(
        self, client, test_user, admin_headers, db_session
    ):
        """Test that AI usage statistics account for cached tokens in cost savings."""
        # Arrange: Create logs with and without cached tokens
        log_with_cache = AIUsageLog(
            user_id=test_user.id,
            operation_type="job_fit_analysis",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=600,
            total_tokens=1500,
            estimated_cost=0.000369,
            generation_time=1200,
            success=True,
        )
        log_without_cache = AIUsageLog(
            user_id=test_user.id,
            operation_type="job_fit_analysis",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=0,
            total_tokens=1500,
            estimated_cost=0.00045,
            generation_time=1300,
            success=True,
        )
        db_session.add_all([log_with_cache, log_without_cache])
        db_session.commit()

        # Act: Get statistics
        response = client.get("/api/admin/ai-usage/stats", headers=admin_headers)

        # Assert
        assert response.status_code == 200
        stats = response.json()
        assert "total_cost" in stats
        # Total cost should reflect cached token savings
        expected_cost = 0.000369 + 0.00045
        assert stats["total_cost"] == pytest.approx(expected_cost, abs=1e-6)


class TestCVParsingWithCachedTokens:
    """Test suite for CV parsing with cached tokens."""

    @pytest.mark.asyncio
    @patch("src.services.ai_service.cv_parsing.get_openai_client")
    async def test_cv_parsing_saves_cached_tokens(
        self, mock_get_client, client, test_user, auth_headers, db_session
    ):
        """Test that CV parsing saves cached tokens to database."""
        # Arrange
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        # Mock OpenAI response
        mock_response = Mock()
        mock_response.output_parsed = Mock()
        mock_response.output_parsed.model_dump.return_value = {
            "personal_info": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
            },
            "work_experience": [],
        }
        mock_response.usage = Mock()
        mock_response.usage.input_tokens = 1500
        mock_response.usage.output_tokens = 800
        mock_response.usage.prompt_tokens_details = Mock()
        mock_response.usage.prompt_tokens_details.cached_tokens = 900

        mock_client.chat.completions.create.return_value = mock_response

        # Act: Upload and parse CV
        cv_file_content = b"John Doe\nSoftware Engineer\nPython, FastAPI"
        response = client.post(
            "/api/cv/upload",
            headers=auth_headers,
            files={"file": ("resume.txt", cv_file_content, "text/plain")},
        )

        # Assert
        assert response.status_code == 200

        # Wait for background parsing
        import asyncio

        await asyncio.sleep(3)

        # Check usage log
        usage_log = (
            db_session.query(AIUsageLog)
            .filter_by(user_id=test_user.id, operation_type="cv_parsing")
            .first()
        )
        assert usage_log is not None
        assert usage_log.cached_tokens == 900


class TestAdminDashboardWithCachedTokens:
    """Test suite for admin dashboard with cached tokens display."""

    def test_admin_dashboard_shows_cache_hit_rate(
        self, client, admin_headers, test_user, db_session
    ):
        """Test that admin dashboard calculates and shows cache hit rate."""
        # Arrange: Create logs with varying cache rates
        logs = [
            AIUsageLog(
                user_id=test_user.id,
                operation_type="job_fit_analysis",
                model_used="gpt-4o-mini",
                prompt_tokens=1000,
                completion_tokens=500,
                cached_tokens=0,  # No cache
                total_tokens=1500,
                estimated_cost=0.00045,
                generation_time=1200,
                success=True,
            ),
            AIUsageLog(
                user_id=test_user.id,
                operation_type="job_fit_analysis",
                model_used="gpt-4o-mini",
                prompt_tokens=1000,
                completion_tokens=500,
                cached_tokens=600,  # 60% cache
                total_tokens=1500,
                estimated_cost=0.000369,
                generation_time=1100,
                success=True,
            ),
            AIUsageLog(
                user_id=test_user.id,
                operation_type="job_fit_analysis",
                model_used="gpt-4o-mini",
                prompt_tokens=1000,
                completion_tokens=500,
                cached_tokens=800,  # 80% cache
                total_tokens=1500,
                estimated_cost=0.000339,
                generation_time=1000,
                success=True,
            ),
        ]
        db_session.add_all(logs)
        db_session.commit()

        # Act: Get AI usage logs
        response = client.get("/api/admin/ai-usage", headers=admin_headers)

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify all logs have cached_tokens field
        for log in data["logs"]:
            assert "cached_tokens" in log

        # Calculate average cache hit rate
        total_prompt_tokens = sum(log["prompt_tokens"] for log in data["logs"])
        total_cached_tokens = sum(log["cached_tokens"] for log in data["logs"])
        avg_cache_rate = (total_cached_tokens / total_prompt_tokens) * 100

        # Average: (0 + 600 + 800) / 3000 = 46.67%
        assert avg_cache_rate == pytest.approx(46.67, abs=0.1)


class TestCostAnalysisWithCachedTokens:
    """Test suite for cost analysis considering cached tokens."""

    def test_monthly_cost_report_includes_cache_savings(
        self, client, admin_headers, test_user, db_session
    ):
        """Test that monthly cost report shows savings from cached tokens."""
        # Arrange: Create logs for the month
        now = datetime.now(timezone.utc)

        # Week 1: No caching (baseline)
        for i in range(10):
            log = AIUsageLog(
                user_id=test_user.id,
                operation_type="job_fit_analysis",
                model_used="gpt-4o-mini",
                prompt_tokens=1000,
                completion_tokens=500,
                cached_tokens=0,
                total_tokens=1500,
                estimated_cost=0.00045,
                generation_time=1200,
                success=True,
                created_at=now - timedelta(days=21),
            )
            db_session.add(log)

        # Week 4: With caching (70% hit rate)
        for i in range(10):
            log = AIUsageLog(
                user_id=test_user.id,
                operation_type="job_fit_analysis",
                model_used="gpt-4o-mini",
                prompt_tokens=1000,
                completion_tokens=500,
                cached_tokens=700,
                total_tokens=1500,
                estimated_cost=0.000345,
                generation_time=1000,
                success=True,
                created_at=now - timedelta(days=3),
            )
            db_session.add(log)

        db_session.commit()

        # Act: Get usage stats
        start_date = (now - timedelta(days=30)).isoformat()
        end_date = now.isoformat()
        response = client.get(
            f"/api/admin/ai-usage/stats?start_date={start_date}&end_date={end_date}",
            headers=admin_headers,
        )

        # Assert
        assert response.status_code == 200
        stats = response.json()

        # Calculate expected costs
        cost_without_cache = 0.00045 * 10  # Week 1
        cost_with_cache = 0.000345 * 10  # Week 4
        total_cost = cost_without_cache + cost_with_cache
        potential_savings = (0.00045 - 0.000345) * 10

        assert stats["total_cost"] == pytest.approx(total_cost, abs=1e-6)
        # Savings from caching: 0.00105
        assert potential_savings == pytest.approx(0.00105, abs=1e-6)


# Pytest fixtures
@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create test database session using separate test database."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from src.models.base import Base

    # CRITICAL: Use a separate test database, NOT the production database
    test_engine = create_engine(
        "sqlite:///./test_cached_tokens_integration.db",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )

    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        id="test-user-123",
        email="test@example.com",
        full_name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    """Create admin user."""
    user = User(
        id="admin-user-123",
        email="admin@example.com",
        full_name="Admin User",
        is_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create auth headers for test user."""
    return {"Authorization": f"Bearer test-token-{test_user.id}"}


@pytest.fixture
def admin_headers(admin_user):
    """Create auth headers for admin user."""
    return {"Authorization": f"Bearer admin-token-{admin_user.id}"}


@pytest.fixture
def test_cv(db_session, test_user):
    """Create test CV."""
    from src.models.cv import CV

    cv = CV(
        user_id=test_user.id,
        filename="test_resume.pdf",
        file_path="/uploads/test_resume.pdf",
        file_size=12345,
        parsed_data={
            "personal_info": {"name": "Test User", "email": "test@example.com"},
            "work_experience": [],
        },
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)
    return cv


@pytest.fixture
def test_job_description(db_session, test_user, test_cv):
    """Create test job description."""
    from src.models.job_description import JobDescription

    job_desc = JobDescription(
        user_id=test_user.id,
        cv_id=test_cv.id,
        title="Senior Backend Developer",
        company="Tech Corp",
        content="Looking for Python developer with FastAPI experience...",
    )
    db_session.add(job_desc)
    db_session.commit()
    db_session.refresh(job_desc)
    return job_desc
