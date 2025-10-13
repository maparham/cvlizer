import pytest
from unittest.mock import Mock, patch
from src.services.ai_service import generate_cv_section, parse_cv_text_with_openai
from src.services.ai_usage_service import calculate_cost
import json


class TestAIService:
    """Test cases for AI service"""

    @pytest.mark.asyncio
    @patch("src.services.ai_service.section_generation.get_openai_client")
    async def test_generate_cv_section_success(self, mock_get_client):
        """Test successful AI section generation"""
        # Setup mock client for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        # Responses API returns content in output items with type='message'
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = json.dumps(
            {
                "title": "Why I'm a Good Fit",
                "content": "Generated content here",
                "key_points": ["Point 1", "Point 2"],
            }
        )
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=80, completion_tokens=70)
        mock_client.responses.create.return_value = mock_response

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        assert result["title"] == "Why I'm a Good Fit"
        assert result["section_content"] == "Generated content here"
        assert result["key_points"] == ["Point 1", "Point 2"]
        assert result["tokens_used"] == 150  # prompt_tokens (80) + completion_tokens (70)
        assert result["model_used"] == "gpt-5-nano"
        assert "generation_time" in result

    @pytest.mark.asyncio
    @patch("src.services.ai_service.section_generation.get_openai_client")
    async def test_generate_cv_section_json_parse_error(self, mock_get_client):
        """Test AI section generation with JSON parse error"""
        # Setup mock client for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = "Invalid JSON content"
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=60, completion_tokens=40)
        mock_client.responses.create.return_value = mock_response

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        assert result["title"] == "AI Generated Section"
        assert result["section_content"] == "Invalid JSON content"
        assert result["key_points"] == []
        assert result["tokens_used"] == 100  # prompt_tokens (60) + completion_tokens (40)

    @pytest.mark.asyncio
    @patch("src.services.ai_service.section_generation.get_openai_client")
    async def test_generate_cv_section_api_error(self, mock_get_client):
        """Test AI section generation with API error"""
        # Setup mock client that raises exception
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.create.side_effect = Exception("API Error")

        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"

        result = await generate_cv_section(cv_data, job_description, "why_good_fit")

        assert (
            "I apologize, but I'm unable to generate content" in result["section_content"]
        )
        assert result["title"] == "AI Generated Section"
        assert result["key_points"] == []
        assert result["tokens_used"] == 0
        assert result["error"] == "API Error"

    @patch("src.services.ai_service.cv_parsing.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_success(self, mock_get_client):
        """Test successful CV text parsing with OpenAI"""
        # Setup mock client for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = json.dumps(
            {
                "personal_info": {"full_name": "John Doe", "email": "john@example.com"},
                "work_experience": [{"company": "Tech Corp", "position": "Developer"}],
            }
        )
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=100, completion_tokens=80)
        mock_client.responses.create.return_value = mock_response

        text_content = "John Doe\nDeveloper at Tech Corp"

        result = await parse_cv_text_with_openai(text_content)

        assert result["personal_info"]["full_name"] == "John Doe"
        assert result["personal_info"]["email"] == "john@example.com"
        assert len(result["work_experience"]) == 1
        assert result["work_experience"][0]["company"] == "Tech Corp"

    @patch("src.services.ai_service.cv_parsing.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_json_error(self, mock_get_client):
        """Test CV text parsing with JSON parse error"""
        # Setup mock client for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = "Invalid JSON"
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=100, completion_tokens=50)
        mock_client.responses.create.return_value = mock_response

        text_content = "John Doe\nDeveloper at Tech Corp"

        result = await parse_cv_text_with_openai(text_content)

        assert "parse_error" in result
        assert "Failed to parse as JSON" in result["parse_error"]
        assert result["professional_summary"]["content"] == text_content[:500]

    @patch("src.services.ai_service.cv_parsing.get_openai_client")
    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_api_error(self, mock_get_client):
        """Test CV text parsing with API error"""
        # Setup mock client that raises exception
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.create.side_effect = Exception("API Error")

        text_content = "John Doe\nDeveloper at Tech Corp"

        result = await parse_cv_text_with_openai(text_content)

        assert "parse_error" in result
        assert "OpenAI API error" in result["parse_error"]
        assert result["professional_summary"]["content"] == text_content[:500]

    @pytest.mark.asyncio
    async def test_parse_cv_text_with_openai_empty_content(self):
        """Test CV text parsing with empty content"""
        text_content = ""

        with patch(
            "src.services.ai_service.cv_parsing.get_openai_client"
        ) as mock_get_client:
            # Setup mock client for Responses API
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            mock_response = Mock()
            mock_output_item = Mock()
            mock_output_item.type = "message"
            mock_output_item.content = json.dumps(
                {
                    "personal_info": {"full_name": ""},
                    "professional_summary": {"content": ""},
                }
            )
            mock_response.output = [mock_output_item]
            mock_response.usage = Mock(prompt_tokens=50, completion_tokens=30)
            mock_client.responses.create.return_value = mock_response

            result = await parse_cv_text_with_openai(text_content)

            assert result["personal_info"]["full_name"] == ""
            assert result["professional_summary"]["content"] == ""


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
