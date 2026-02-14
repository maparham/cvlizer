import json
from unittest.mock import Mock, patch

import pytest

from src.services.ai_service import generate_cv_section, parse_cv_text_with_openai
from src.services.ai_usage_service import calculate_cost


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

    @patch("src.services.ai_service.common.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_success(self, mock_get_client):
        """Test successful CV text parsing with OpenAI using responses.parse()"""
        # Setup mock client for Responses API with parse()
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        # Mock parsed response object
        from src.schemas.ai_response_schemas import (
            CVParsingResponseSchema,
            PersonalInfoResponseSchema,
            WorkExperienceItemSchema,
        )

        mock_parsed_output = CVParsingResponseSchema(
            personal_info=PersonalInfoResponseSchema(
                full_name="John Doe", email="john@example.com"
            ),
            work_experience=[
                WorkExperienceItemSchema(company="Tech Corp", position="Developer")
            ],
        )

        mock_response = Mock(spec=["output_parsed", "usage"])
        mock_response.output_parsed = mock_parsed_output
        mock_response.usage = Mock()
        mock_response.usage.input_tokens = 100
        mock_response.usage.output_tokens = 80
        mock_client.responses.parse.return_value = mock_response

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
