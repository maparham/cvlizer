"""
Unit tests for cached tokens functionality.

Tests the OpenAI prompt caching integration including:
- Token extraction from OpenAI responses
- Cost calculation with cached tokens
- AI usage logging with cached tokens
- Database model updates
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

from src.models.ai_usage_log import AIUsageLog
from src.services.ai_usage_service import calculate_cost, log_ai_usage
from src.services.ai_service.common import extract_cached_tokens


class TestCachedTokenExtraction:
    """Test suite for extracting cached tokens from OpenAI responses."""

    def test_extract_cached_tokens_from_input_tokens_details(self):
        """Test extracting cached tokens from input_tokens_details (newer SDK format)."""
        # Arrange
        response = Mock()
        response.usage = Mock()
        response.usage.input_tokens_details = Mock()
        response.usage.input_tokens_details.cached_tokens = 500

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 500

    def test_extract_cached_tokens_from_prompt_tokens_details(self):
        """Test extracting cached tokens from prompt_tokens_details (alternative format)."""
        # Arrange
        response = Mock()
        response.usage = Mock()
        response.usage.input_tokens_details = None
        response.usage.prompt_tokens_details = Mock()
        response.usage.prompt_tokens_details.cached_tokens = 300

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 300

    def test_extract_cached_tokens_no_usage(self):
        """Test extracting cached tokens when response has no usage attribute."""
        # Arrange
        response = Mock(spec=[])  # No usage attribute

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 0

    def test_extract_cached_tokens_no_details(self):
        """Test extracting cached tokens when usage has no token details."""
        # Arrange
        response = Mock()
        response.usage = Mock()
        response.usage.input_tokens_details = None
        response.usage.prompt_tokens_details = None

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 0

    def test_extract_cached_tokens_zero_cached(self):
        """Test extracting cached tokens when cached_tokens is 0."""
        # Arrange
        response = Mock()
        response.usage = Mock()
        response.usage.input_tokens_details = Mock()
        response.usage.input_tokens_details.cached_tokens = 0

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 0

    def test_extract_cached_tokens_prefers_input_tokens_details(self):
        """Test that input_tokens_details is preferred over prompt_tokens_details."""
        # Arrange
        response = Mock()
        response.usage = Mock()
        response.usage.input_tokens_details = Mock()
        response.usage.input_tokens_details.cached_tokens = 500
        response.usage.prompt_tokens_details = Mock()
        response.usage.prompt_tokens_details.cached_tokens = 300

        # Act
        cached_tokens = extract_cached_tokens(response)

        # Assert
        assert cached_tokens == 500  # Should use input_tokens_details


class TestCostCalculationWithCachedTokens:
    """Test suite for cost calculation with cached tokens."""

    def test_calculate_cost_no_cached_tokens(self):
        """Test cost calculation without cached tokens (baseline)."""
        # Arrange: gpt-4o-mini pricing: $0.150/1M input, $0.600/1M output
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 0

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert
        # Input: (1000 / 1_000_000) * 0.150 = 0.00015
        # Output: (500 / 1_000_000) * 0.600 = 0.0003
        # Total: 0.00045
        assert cost == pytest.approx(0.00045, abs=1e-6)

    def test_calculate_cost_with_partial_cached_tokens(self):
        """Test cost calculation with partial cached tokens."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 600  # 60% cache hit

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert
        # Non-cached input: (400 / 1_000_000) * 0.150 = 0.00006
        # Cached input: (600 / 1_000_000) * 0.150 * 0.1 = 0.000009
        # Output: (500 / 1_000_000) * 0.600 = 0.0003
        # Total: 0.000369
        assert cost == pytest.approx(0.000369, abs=1e-6)

    def test_calculate_cost_with_full_cached_tokens(self):
        """Test cost calculation with 100% cached tokens (best case)."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 1000  # 100% cache hit

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert
        # Non-cached input: (0 / 1_000_000) * 0.150 = 0
        # Cached input: (1000 / 1_000_000) * 0.150 * 0.1 = 0.000015
        # Output: (500 / 1_000_000) * 0.600 = 0.0003
        # Total: 0.000315
        assert cost == pytest.approx(0.000315, abs=1e-6)

    def test_calculate_cost_savings_with_cached_tokens(self):
        """Test cost savings percentage with cached tokens."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500

        # Act
        cost_no_cache = calculate_cost(model, prompt_tokens, completion_tokens, 0)
        cost_full_cache = calculate_cost(model, prompt_tokens, completion_tokens, 1000)

        # Assert
        savings_percentage = ((cost_no_cache - cost_full_cache) / cost_no_cache) * 100
        # Input is 0.00015, savings is 0.000135, so savings % = 90% of input cost
        # Total cost savings = (0.000135 / 0.00045) * 100 = 30%
        assert savings_percentage == pytest.approx(30.0, abs=0.1)

    def test_calculate_cost_with_gpt_4o(self):
        """Test cost calculation with gpt-4o (higher pricing)."""
        # Arrange: gpt-4o pricing: $2.50/1M input, $10.00/1M output
        model = "gpt-4o"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 600

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert
        # Non-cached input: (400 / 1_000_000) * 2.50 = 0.001
        # Cached input: (600 / 1_000_000) * 2.50 * 0.1 = 0.00015
        # Output: (500 / 1_000_000) * 10.00 = 0.005
        # Total: 0.00615
        assert cost == pytest.approx(0.00615, abs=1e-6)

    def test_calculate_cost_with_unknown_model(self):
        """Test cost calculation with unknown model (uses default pricing)."""
        # Arrange
        model = "unknown-model"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 500

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert: Should use default pricing from AIUsageConfig
        # Default: $0.150/1M input, $0.600/1M output (from config.py)
        # Non-cached: (500 / 1_000_000) * 0.150 = 0.000075
        # Cached: (500 / 1_000_000) * 0.150 * 0.1 = 0.0000075
        # Output: (500 / 1_000_000) * 0.600 = 0.000300
        # Total: 0.0003825
        assert cost == pytest.approx(0.0003825, abs=1e-6)

    def test_calculate_cost_edge_case_zero_tokens(self):
        """Test cost calculation with zero tokens."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 0
        completion_tokens = 0
        cached_tokens = 0

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert
        assert cost == 0.0

    def test_calculate_cost_edge_case_cached_exceeds_prompt(self):
        """Test cost calculation when cached_tokens equals prompt_tokens (edge case)."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 1000  # Equal to prompt_tokens

        # Act
        cost = calculate_cost(model, prompt_tokens, completion_tokens, cached_tokens)

        # Assert: Should handle gracefully (non_cached_input = 0)
        # Non-cached: 0
        # Cached: (1000 / 1_000_000) * 0.150 * 0.1 = 0.000015
        # Output: (500 / 1_000_000) * 0.600 = 0.0003
        # Total: 0.000315
        assert cost == pytest.approx(0.000315, abs=1e-6)


class TestAIUsageLogging:
    """Test suite for AI usage logging with cached tokens."""

    @patch("src.services.ai_usage_service.calculate_cost")
    def test_log_ai_usage_with_cached_tokens(self, mock_calculate_cost, db_session):
        """Test logging AI usage with cached tokens."""
        # Arrange
        mock_calculate_cost.return_value = 0.000369
        user_id = "user-123"
        operation_type = "job_fit_analysis"
        model_used = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500
        cached_tokens = 600
        generation_time = 1500

        # Act
        usage_log = log_ai_usage(
            db=db_session,
            user_id=user_id,
            operation_type=operation_type,
            model_used=model_used,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            generation_time=generation_time,
            success=True,
            cached_tokens=cached_tokens,
        )

        # Assert
        assert usage_log is not None
        assert usage_log.user_id == user_id
        assert usage_log.operation_type == operation_type
        assert usage_log.model_used == model_used
        assert usage_log.prompt_tokens == prompt_tokens
        assert usage_log.completion_tokens == completion_tokens
        assert usage_log.cached_tokens == cached_tokens
        assert usage_log.total_tokens == 1500
        assert usage_log.estimated_cost == 0.000369
        assert usage_log.generation_time == generation_time
        assert usage_log.success is True

        # Verify calculate_cost was called with cached_tokens and no tier
        mock_calculate_cost.assert_called_once_with(
            model_used, prompt_tokens, completion_tokens, cached_tokens, service_tier=None
        )

    @patch("src.services.ai_usage_service.calculate_cost")
    def test_log_ai_usage_without_cached_tokens(self, mock_calculate_cost, db_session):
        """Test logging AI usage without cached tokens (backward compatibility)."""
        # Arrange
        mock_calculate_cost.return_value = 0.00045
        user_id = "user-123"
        operation_type = "cv_parsing"

        # Act
        usage_log = log_ai_usage(
            db=db_session,
            user_id=user_id,
            operation_type=operation_type,
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            generation_time=1200,
            success=True,
            # cached_tokens not provided (default: 0)
        )

        # Assert
        assert usage_log is not None
        assert usage_log.cached_tokens == 0
        mock_calculate_cost.assert_called_once_with(
            "gpt-4o-mini", 1000, 500, 0, service_tier=None
        )

    @patch("src.services.ai_usage_service.calculate_cost")
    def test_log_ai_usage_with_service_tier(self, mock_calculate_cost, db_session):
        """Test logging AI usage with service_tier stores tier and uses tier cost."""
        mock_calculate_cost.return_value = 0.000225  # 0.5 × 0.00045 for flex
        usage_log = log_ai_usage(
            db=db_session,
            user_id="user-123",
            operation_type="job_fit_analysis",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            generation_time=1500,
            success=True,
            cached_tokens=0,
            service_tier="flex",
        )
        assert usage_log is not None
        assert usage_log.service_tier == "flex"
        assert usage_log.estimated_cost == 0.000225
        mock_calculate_cost.assert_called_once_with(
            "gpt-4o-mini", 1000, 500, 0, service_tier="flex"
        )

    def test_ai_usage_log_model_to_dict(self, db_session):
        """Test AIUsageLog model to_dict includes cached_tokens and service_tier."""
        # Arrange
        usage_log = AIUsageLog(
            user_id="user-123",
            operation_type="parse_cv",
            model_used="gpt-4o-mini",
            prompt_tokens=800,
            completion_tokens=400,
            cached_tokens=500,
            total_tokens=1200,
            estimated_cost=0.00035,
            service_tier="priority",
            generation_time=1100,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()

        # Act
        log_dict = usage_log.to_dict()

        # Assert
        assert "cached_tokens" in log_dict
        assert log_dict["cached_tokens"] == 500
        assert "service_tier" in log_dict
        assert log_dict["service_tier"] == "priority"
        assert log_dict["prompt_tokens"] == 800
        assert log_dict["completion_tokens"] == 400
        assert log_dict["total_tokens"] == 1200


class TestAIServiceIntegration:
    """Test suite for AI service integration with cached tokens."""

    @pytest.mark.asyncio
    @patch("src.services.ai_service.cv_parsing.get_openai_client")
    @patch("src.services.ai_service.cv_parsing.log_ai_usage_safe")
    async def test_cv_parsing_logs_cached_tokens(
        self, mock_log_ai_usage, mock_get_client
    ):
        """Test that CV parsing extracts and logs cached tokens."""
        # Arrange
        from src.services.ai_service.cv_parsing import parse_cv_text_with_openai

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock OpenAI response with cached tokens
        # Create a simple mock object for usage to avoid MagicMock nested attribute issues
        class MockUsageDetails:
            cached_tokens = 900

        class MockUsage:
            input_tokens = 1500
            output_tokens = 800
            prompt_tokens_details = MockUsageDetails()
            input_tokens_details = None  # Not used in this test

        mock_response = MagicMock()
        mock_response.output_parsed = MagicMock()
        mock_response.output_parsed.model_dump.return_value = {
            "personal_info": {"name": "Jane Smith"},
            "work_experience": [],
        }
        mock_response.usage = MockUsage()

        mock_client.responses.parse.return_value = mock_response

        cv_text = "Jane Smith\nSoftware Engineer"
        user_id = "user-789"
        cv_id = "cv-101"

        # Act
        result = await parse_cv_text_with_openai(cv_text, user_id, cv_id)

        # Assert
        assert result is not None
        mock_log_ai_usage.assert_called_once()
        call_kwargs = mock_log_ai_usage.call_args[1]
        assert call_kwargs["cached_tokens"] == 900


class TestDatabaseMigration:
    """Test suite for database migration and schema updates."""

    def test_ai_usage_log_has_cached_tokens_column(self, db_session):
        """Test that ai_usage_logs table has cached_tokens column."""
        # Arrange & Act
        usage_log = AIUsageLog(
            user_id="test-user",
            operation_type="test_operation",
            model_used="gpt-4o-mini",
            prompt_tokens=100,
            completion_tokens=50,
            cached_tokens=60,  # Should not raise error
            total_tokens=150,
            estimated_cost=0.00001,
            generation_time=100,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()
        db_session.refresh(usage_log)

        # Assert
        assert hasattr(usage_log, "cached_tokens")
        assert usage_log.cached_tokens == 60

    def test_cached_tokens_defaults_to_zero(self, db_session):
        """Test that cached_tokens defaults to 0 when not provided."""
        # Arrange & Act
        usage_log = AIUsageLog(
            user_id="test-user",
            operation_type="test_operation",
            model_used="gpt-4o-mini",
            prompt_tokens=100,
            completion_tokens=50,
            # cached_tokens not provided
            total_tokens=150,
            estimated_cost=0.00001,
            generation_time=100,
            success=True,
        )
        db_session.add(usage_log)
        db_session.commit()
        db_session.refresh(usage_log)

        # Assert
        assert usage_log.cached_tokens == 0

    def test_query_ai_usage_logs_with_cached_tokens(self, db_session):
        """Test querying ai_usage_logs with cached_tokens filter."""
        # Arrange
        log1 = AIUsageLog(
            user_id="user-1",
            operation_type="job_fit",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=600,
            total_tokens=1500,
            estimated_cost=0.0003,
            generation_time=1200,
            success=True,
        )
        log2 = AIUsageLog(
            user_id="user-2",
            operation_type="cv_parsing",
            model_used="gpt-4o-mini",
            prompt_tokens=1000,
            completion_tokens=500,
            cached_tokens=0,
            total_tokens=1500,
            estimated_cost=0.00045,
            generation_time=1300,
            success=True,
        )
        db_session.add_all([log1, log2])
        db_session.commit()

        # Act: Query logs with cached tokens
        logs_with_cache = (
            db_session.query(AIUsageLog).filter(AIUsageLog.cached_tokens > 0).all()
        )

        # Assert
        assert len(logs_with_cache) == 1
        assert logs_with_cache[0].cached_tokens == 600


class TestCostSavingsAnalysis:
    """Test suite for analyzing cost savings with cached tokens."""

    def test_calculate_cost_savings_percentage(self):
        """Test calculating cost savings percentage."""
        # Arrange
        model = "gpt-4o-mini"
        prompt_tokens = 1000
        completion_tokens = 500

        # Act
        cost_without_cache = calculate_cost(model, prompt_tokens, completion_tokens, 0)
        cost_with_50_percent_cache = calculate_cost(
            model, prompt_tokens, completion_tokens, 500
        )
        cost_with_100_percent_cache = calculate_cost(
            model, prompt_tokens, completion_tokens, 1000
        )

        # Calculate savings
        savings_50 = (
            (cost_without_cache - cost_with_50_percent_cache) / cost_without_cache
        ) * 100
        savings_100 = (
            (cost_without_cache - cost_with_100_percent_cache) / cost_without_cache
        ) * 100

        # Assert
        assert cost_without_cache == pytest.approx(0.00045, abs=1e-6)
        assert savings_50 == pytest.approx(15.0, abs=0.5)  # ~15% savings
        assert savings_100 == pytest.approx(30.0, abs=0.5)  # ~30% savings

    def test_roi_calculation_for_caching(self):
        """Test ROI calculation for prompt caching feature."""
        # Arrange: Simulate 1000 job fit analyses
        model = "gpt-4o-mini"
        prompt_tokens = 600  # After optimization
        completion_tokens = 400
        num_analyses = 1000
        cache_hit_rate = 0.70  # 70% cache hit rate

        # Act
        # Cost without caching
        cost_per_analysis_no_cache = calculate_cost(
            model, prompt_tokens, completion_tokens, 0
        )
        total_cost_no_cache = cost_per_analysis_no_cache * num_analyses

        # Cost with caching (70% hit rate)
        cached_tokens = int(prompt_tokens * cache_hit_rate)
        cost_per_analysis_with_cache = calculate_cost(
            model, prompt_tokens, completion_tokens, cached_tokens
        )
        total_cost_with_cache = cost_per_analysis_with_cache * num_analyses

        # Calculate savings
        total_savings = total_cost_no_cache - total_cost_with_cache
        savings_percentage = (total_savings / total_cost_no_cache) * 100

        # Assert
        assert total_savings > 0
        assert savings_percentage == pytest.approx(
            17.3, abs=1.0
        )  # ~17% savings with 70% cache hit
        assert total_cost_with_cache < total_cost_no_cache


# Pytest fixtures
@pytest.fixture
def db_session():
    """Create a test database session using a separate test database."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from src.models.base import Base

    # CRITICAL: Use a separate test database, NOT the production database
    test_engine = create_engine(
        "sqlite:///./test_cached_tokens.db", connect_args={"check_same_thread": False}
    )
    SessionLocal = sessionmaker(bind=test_engine)

    # Create tables in test database
    Base.metadata.create_all(bind=test_engine)

    # Create session
    session = SessionLocal()

    yield session

    # Cleanup
    session.rollback()
    session.close()

    # Drop tables from test database only
    Base.metadata.drop_all(bind=test_engine)
