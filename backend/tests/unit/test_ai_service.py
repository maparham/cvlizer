import json
from unittest.mock import AsyncMock, Mock, patch

import pytest
from pydantic import BaseModel

from src.services.ai_service import generate_cv_section, parse_cv_text_with_openai
from src.services.ai_service.responses_runner import run_openai_call
from src.services.ai_ops.ai_usage_service import calculate_cost


class TestAIService:
    """Test cases for AI service"""

    @pytest.mark.asyncio
    @patch("src.services.ai_service.common.AIConfig.get_model_for_operation")
    @patch("src.services.ai_service.common.get_openai_client")
    async def test_generate_cv_section_success(self, mock_get_client, mock_get_model):
        """Test successful AI section generation with responses.parse()"""
        mock_get_model.return_value = "gpt-5-mini"
        # Setup mock client for Responses API with parse()
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        # Mock parsed response object
        from src.schemas.ai_response_schemas import CVSectionGenerationResponseSchema

        mock_parsed_output = CVSectionGenerationResponseSchema(
            title="Why I'm a Good Fit",
            content="Generated content here",
            key_points=["Point 1", "Point 2"],
        )

        mock_response = Mock(spec=["output_parsed", "usage"])
        mock_response.output_parsed = mock_parsed_output
        mock_response.usage = Mock()
        mock_response.usage.input_tokens = 80
        mock_response.usage.output_tokens = 70
        mock_client.responses.parse.return_value = mock_response

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        assert result["title"] == "Why I'm a Good Fit"
        assert result["section_content"] == "Generated content here"
        assert result["key_points"] == ["Point 1", "Point 2"]
        assert result["tokens_used"] == 150  # prompt_tokens (80) + completion_tokens (70)
        assert result["model_used"] == "gpt-5-mini"
        assert "generation_time" in result

    @pytest.mark.asyncio
    @patch("src.services.ai_service.common.get_openai_client")
    async def test_generate_cv_section_json_parse_error(self, mock_get_client):
        """Test AI section generation with parsing exception"""
        # Setup mock client that raises exception during parsing
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.parse.side_effect = Exception("Parsing error")

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        # Should use fallback due to exception
        assert result["title"] == "AI Generated Section"
        assert (
            "I apologize, but I'm unable to generate content" in result["section_content"]
        )
        assert result["key_points"] == []
        assert result["tokens_used"] == 0
        assert "error" in result
        assert "Parsing error" in result["error"] or "try again" in result["error"]

    @pytest.mark.asyncio
    @patch("src.services.ai_service.common.get_openai_client")
    async def test_generate_cv_section_api_error(self, mock_get_client):
        """Test AI section generation with API error"""
        # Setup mock client that raises exception
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.parse.side_effect = Exception("API Error")

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        assert (
            "I apologize, but I'm unable to generate content" in result["section_content"]
        )
        assert result["title"] == "AI Generated Section"
        assert result["key_points"] == []
        assert result["tokens_used"] == 0
        assert "error" in result
        assert "API Error" in result["error"] or "try again" in result["error"]

    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_success(self):
        """Test successful CV text parsing: run_openai_call returns parsed_data (parse_cv uses responses.create with text_format_schema)."""
        from src.schemas.ai_response_schemas import (
            CVParsingResponseSchema,
            PersonalInfoResponseSchema,
            WorkExperienceItemSchema,
        )

        expected_parsed = {
            "personal_info": {"full_name": "John Doe", "email": "john@example.com"},
            "work_experience": [{"company": "Tech Corp", "position": "Developer"}],
            "custom_sections": [],
            "education": [],
            "skills": {"technical": {}},
            "certifications": [],
            "projects": [],
            "awards": [],
            "publications": [],
            "volunteer_experience": [],
            "is_valid_cv": True,
            "validation_error": None,
        }
        metadata = {"prompt_tokens": 100, "completion_tokens": 80}

        with patch(
            "src.services.ai_service.cv_parsing.call_openai_with_schema",
            new_callable=AsyncMock,
            return_value=(expected_parsed, metadata),
        ):
            text_content = "John Doe\nDeveloper at Tech Corp"
            result = await parse_cv_text_with_openai(text_content)

        assert result["personal_info"]["full_name"] == "John Doe"
        assert result["personal_info"]["email"] == "john@example.com"
        assert len(result["work_experience"]) == 1
        assert result["work_experience"][0]["company"] == "Tech Corp"

    @patch("src.services.ai_service.common.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_json_error(self, mock_get_client):
        """Test CV text parsing with API exception"""
        # Setup mock client that raises exception
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.parse.side_effect = Exception("Parsing failed")

        text_content = "John Doe\nDeveloper at Tech Corp"

        result = await parse_cv_text_with_openai(text_content)

        assert "error" in result or "parse_error" in result
        error_msg = result.get("error") or result.get("parse_error", "")
        assert "Parsing failed" in error_msg or "try again" in error_msg

    @patch("src.services.ai_service.common.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_api_error(self, mock_get_client):
        """Test CV text parsing with API error"""
        # Setup mock client that raises exception (cv_parsing uses responses.parse)
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.parse.side_effect = Exception("API Error")

        text_content = "John Doe\nDeveloper at Tech Corp"

        result = await parse_cv_text_with_openai(text_content)

        assert "error" in result or "parse_error" in result
        error_msg = result.get("error") or result.get("parse_error", "")
        assert "API Error" in error_msg or "try again" in error_msg

    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_empty_content(self):
        """Test CV text parsing with empty content"""
        text_content = ""

        with patch("src.services.ai_service.common.get_openai_client") as mock_get_client:
            # Setup mock client for Responses API
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            mock_response = Mock()
            mock_output_item = Mock()
            mock_output_item.type = "message"
            # Empty content returns error structure
            result = await parse_cv_text_with_openai(text_content)

            assert "error" in result
            assert "Unable to extract text from PDF" in result["error"]

    @pytest.mark.asyncio
    async def test_run_openai_call_includes_developer_message(self):
        """Inline responses.parse call should include system->developer->user roles."""

        class _DummySchema(BaseModel):
            title: str
            content: str
            key_points: list[str]

        mock_client = Mock()
        mock_response = Mock(spec=["output_parsed", "usage"])
        mock_response.output_parsed = _DummySchema(
            title="t", content="c", key_points=["k1"]
        )
        mock_response.usage = Mock(input_tokens=10, output_tokens=5)
        mock_client.responses.parse.return_value = mock_response

        parsed_data, metadata = await run_openai_call(
            client=mock_client,
            model="gpt-5-mini",
            reasoning_effort="medium",
            reasoning_summary=None,
            use_prompt_ref=False,
            use_reasoning=False,
            system_prompt="system text",
            developer_prompt="developer rules",
            user_prompt="user payload",
            response_schema=_DummySchema,
            operation_type="ai_suggestions",
            retry_attempts=1,
            retry_delay=0.0,
            text_verbosity=None,
            prompt_ref=None,
            prompt_variables=None,
            text_format_schema=None,
            get_seed_for_operation=lambda _op: None,
            with_retries_fn=lambda fn, attempts, delay: fn(),
            extract_cached_tokens_fn=lambda _response: 0,
            max_output_tokens=300,
        )

        call_kwargs = mock_client.responses.parse.call_args.kwargs
        assert call_kwargs["input"][0] == {"role": "system", "content": "system text"}
        assert call_kwargs["input"][1] == {
            "role": "developer",
            "content": "developer rules",
        }
        assert call_kwargs["input"][2] == {"role": "user", "content": "user payload"}
        assert parsed_data["title"] == "t"
        assert metadata["tokens_used"] == 15


class TestAIUsageService:
    """Test cases for AI usage service pricing calculations"""

    def test_calculate_cost_gpt_4o_mini(self):
        """Test cost calculation for GPT-4o Mini"""
        # 1000 input tokens + 500 output tokens
        cost = calculate_cost("gpt-4o-mini", 1000, 500)
        expected = (1000 / 1_000_000) * 0.150 + (500 / 1_000_000) * 0.600
        assert abs(cost - expected) < 0.000001  # Allow for floating point precision

    def test_calculate_cost_gpt_5_mini(self):
        """Test cost calculation for GPT-5 Mini"""
        # 1000 input tokens + 500 output tokens
        cost = calculate_cost("gpt-5-mini", 1000, 500)
        expected = (1000 / 1_000_000) * 0.250 + (500 / 1_000_000) * 2.000
        assert abs(cost - expected) < 0.000001  # Allow for floating point precision

    def test_calculate_cost_gpt_5_nano(self):
        """Test cost calculation for GPT-5 Nano"""
        # 1000 input tokens + 500 output tokens
        cost = calculate_cost("gpt-5-nano", 1000, 500)
        expected = (1000 / 1_000_000) * 0.050 + (500 / 1_000_000) * 0.400
        assert abs(cost - expected) < 0.000001  # Allow for floating point precision

    def test_calculate_cost_unknown_model(self):
        """Test cost calculation for unknown model (should use default pricing)"""
        cost = calculate_cost("unknown-model", 1000, 500)
        expected = (1000 / 1_000_000) * 0.150 + (500 / 1_000_000) * 0.600
        assert abs(cost - expected) < 0.000001  # Allow for floating point precision

    def test_calculate_cost_zero_tokens(self):
        """Test cost calculation with zero tokens"""
        cost = calculate_cost("gpt-5-nano", 0, 0)
        assert cost == 0.0

    def test_calculate_cost_large_numbers(self):
        """Test cost calculation with large token numbers"""
        # 1 million input tokens + 500k output tokens for GPT-5 Mini
        cost = calculate_cost("gpt-5-mini", 1_000_000, 500_000)
        expected = 1.0 * 0.250 + 0.5 * 2.000  # $0.25 + $1.00 = $1.25
        assert abs(cost - 1.25) < 0.000001

    def test_calculate_cost_flex_tier(self):
        """Test cost with service_tier=flex is half of standard."""
        cost_standard = calculate_cost(
            "gpt-4o-mini", 1000, 500, 0, service_tier="standard"
        )
        cost_flex = calculate_cost("gpt-4o-mini", 1000, 500, 0, service_tier="flex")
        assert abs(cost_flex - cost_standard * 0.5) < 0.000001

    def test_calculate_cost_priority_tier(self):
        """Test cost with service_tier=priority is double standard."""
        cost_standard = calculate_cost(
            "gpt-4o-mini", 1000, 500, 0, service_tier="standard"
        )
        cost_priority = calculate_cost(
            "gpt-4o-mini", 1000, 500, 0, service_tier="priority"
        )
        assert abs(cost_priority - cost_standard * 2.0) < 0.000001

    def test_calculate_cost_openrouter_model_id(self):
        """OpenRouter-style model id (e.g. openai/gpt-5.2) uses same pricing as gpt-5.2."""
        cost_short = calculate_cost("gpt-5.2", 1000, 500)
        cost_openrouter = calculate_cost("openai/gpt-5.2", 1000, 500)
        assert abs(cost_short - cost_openrouter) < 0.000001
        # gpt-5.2: $1.75/1M in, $14/1M out
        expected = (1000 / 1_000_000) * 1.75 + (500 / 1_000_000) * 14.00
        assert abs(cost_openrouter - expected) < 0.000001

    def test_calculate_cost_openrouter_skips_tier_multiplier(self):
        """When provider=openrouter, tier multiplier is not applied (OpenRouter has no tier pricing)."""
        base = calculate_cost("gpt-5.2", 1000, 500, provider="openrouter")
        with_flex = calculate_cost(
            "gpt-5.2", 1000, 500, service_tier="flex", provider="openrouter"
        )
        # Both should equal base cost (no 0.5 for flex).
        expected = (1000 / 1_000_000) * 1.75 + (500 / 1_000_000) * 14.00
        assert abs(base - expected) < 0.000001
        assert abs(with_flex - expected) < 0.000001
        # OpenAI flex would be half:
        openai_flex = calculate_cost("gpt-5.2", 1000, 500, service_tier="flex")
        assert abs(openai_flex - expected * 0.5) < 0.000001


class TestOpenAIPricingEstimateCost:
    """Regression: OpenAIPricing.estimate_cost must not match short keys (e.g. gpt-5) before gpt-5.x."""

    def test_gpt_5_4_mini_not_gpt_5_pricing(self):
        from src.config import OpenAIPricing

        # 1M input tokens only — gpt-5.4-mini $0.75/1M; gpt-5 would be $1.25/1M.
        cost_mini = OpenAIPricing.estimate_cost("gpt-5.4-mini", 1_000_000, 0)
        cost_gpt5 = OpenAIPricing.estimate_cost("gpt-5", 1_000_000, 0)
        assert abs(cost_mini - 0.75) < 0.000001
        assert abs(cost_gpt5 - 1.25) < 0.000001
        assert abs(cost_mini - cost_gpt5) > 0.01

    def test_gpt_5_2_not_gpt_5_pricing(self):
        from src.config import OpenAIPricing

        cost = OpenAIPricing.estimate_cost("gpt-5.2", 1_000_000, 0)
        assert abs(cost - 1.75) < 0.000001

    def test_openrouter_model_id_normalized(self):
        from src.config import OpenAIPricing

        a = OpenAIPricing.estimate_cost("gpt-5.4", 1000, 500)
        b = OpenAIPricing.estimate_cost("openai/gpt-5.4", 1000, 500)
        assert abs(a - b) < 0.000001


class _MinimalSchema(BaseModel):
    """Minimal schema for OpenRouter runner tests."""

    value: int


class TestOpenRouterRunnerMetadata:
    """Test OpenRouter run_openrouter_call returns provider_cost in metadata when present."""

    @pytest.mark.asyncio
    @patch("src.services.ai_service.openrouter_runner.AIConfig")
    async def test_openrouter_metadata_includes_provider_cost_when_usage_has_cost(
        self, mock_aiconfig
    ):
        """When OpenRouter response usage has cost, metadata includes provider_cost."""
        mock_aiconfig.OPENROUTER_API_KEY = "test-key"
        mock_aiconfig.REQUEST_TIMEOUT_SECONDS = 60
        mock_aiconfig.MAX_COMPLETION_TOKENS = 4096
        mock_aiconfig.OPENROUTER_APP_TITLE = ""
        mock_aiconfig.OPENROUTER_REFERER = ""

        from src.services.ai_service.openrouter_runner import run_openrouter_call

        fake_raw = {
            "choices": [
                {
                    "message": {
                        "content": '{"value": 42}',
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "cost": 0.00123,
            },
        }

        async def fake_retries(f, *, attempts=None, delay=None):
            return fake_raw

        _, metadata = await run_openrouter_call(
            system_prompt="",
            user_prompt="test",
            response_schema=_MinimalSchema,
            model="openai/gpt-5.2",
            operation_type="test_op",
            retry_attempts=1,
            retry_delay=0.1,
            with_retries_fn=fake_retries,
            max_tokens=4096,
        )
        assert metadata.get("provider_cost") == 0.00123
        assert metadata["prompt_tokens"] == 100
        assert metadata["completion_tokens"] == 50

    @pytest.mark.asyncio
    @patch("src.services.ai_service.openrouter_runner.AIConfig")
    async def test_openrouter_metadata_omits_provider_cost_when_usage_cost_missing(
        self, mock_aiconfig
    ):
        """When usage.cost is missing or invalid, metadata has no provider_cost."""
        mock_aiconfig.OPENROUTER_API_KEY = "test-key"
        mock_aiconfig.REQUEST_TIMEOUT_SECONDS = 60
        mock_aiconfig.MAX_COMPLETION_TOKENS = 4096
        mock_aiconfig.OPENROUTER_APP_TITLE = ""
        mock_aiconfig.OPENROUTER_REFERER = ""

        from src.services.ai_service.openrouter_runner import run_openrouter_call

        fake_raw = {
            "choices": [{"message": {"content": '{"value": 1}'}}],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
            },
        }

        async def fake_retries(f, *, attempts=None, delay=None):
            return fake_raw

        _, metadata = await run_openrouter_call(
            system_prompt="",
            user_prompt="x",
            response_schema=_MinimalSchema,
            model="openai/gpt-5.2",
            operation_type="test_op",
            retry_attempts=1,
            retry_delay=0.1,
            with_retries_fn=fake_retries,
            max_tokens=4096,
        )
        assert metadata.get("provider_cost") is None
