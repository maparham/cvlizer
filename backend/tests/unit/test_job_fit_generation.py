"""
Unit tests for job fit generation with required field validation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import json

from src.services.ai_service import analyze_job_fit_sync
from src.api.ai import generate_job_fit_sync


class TestAnalyzeJobFitSync:
    """Test analyze_job_fit_sync function with field validation"""

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_with_full_response(self, mock_get_client):
        """Test analyze_job_fit_sync when AI returns complete JSON"""
        # Setup mock client and response for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        # Responses API returns content in output items with type='message'
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = json.dumps(
            {
                "confidence_score": 85,
                "fit_analysis": "Candidate is a great fit",
                "generated_at": "2025-01-01T12:00:00Z",
                "key_matches": ["Python", "FastAPI"],
                "missing_skills": ["Docker"],
                "suggested_improvements": ["Add cloud experience"],
                "strengths": ["Strong backend"],
                "weaknesses": ["Limited DevOps"],
            }
        )
        mock_response.output = [mock_output_item]
        # Token usage in Responses API
        mock_response.usage = Mock(prompt_tokens=300, completion_tokens=200)
        mock_client.responses.create.return_value = mock_response

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python", "FastAPI"]},
            job_description="Looking for Python developer",
        )

        # Verify required fields are present
        assert result["confidence_score"] == 85
        assert result["fit_analysis"] == "Candidate is a great fit"
        assert result["generated_at"] == "2025-01-01T12:00:00Z"
        assert (
            result["tokens_used"] == 500
        )  # prompt_tokens (300) + completion_tokens (200)
        # Model name comes from env OPENAI_MODEL (could be gpt-5 or gpt-5-nano)
        assert result["model_used"] in ["gpt-5", "gpt-5-nano"]
        assert "error" not in result

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_missing_confidence_score(self, mock_get_client):
        """Test analyze_job_fit_sync when AI response is missing confidence_score"""
        # Setup mock client and response for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = json.dumps(
            {
                "fit_analysis": "Candidate is a great fit",
                # confidence_score intentionally missing
                "key_matches": ["Python"],
            }
        )
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=250, completion_tokens=150)
        mock_client.responses.create.return_value = mock_response

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python"]}, job_description="Python developer"
        )

        # Fallback value should be applied
        assert result["confidence_score"] == 50
        assert result["fit_analysis"] == "Candidate is a great fit"
        assert "generated_at" in result
        assert (
            result["tokens_used"] == 400
        )  # prompt_tokens (250) + completion_tokens (150)

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_missing_generated_at(self, mock_get_client):
        """Test analyze_job_fit_sync when AI response is missing generated_at"""
        # Setup mock client and response for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = json.dumps(
            {
                "confidence_score": 75,
                "fit_analysis": "Good match",
                # generated_at intentionally missing
            }
        )
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=200, completion_tokens=150)
        mock_client.responses.create.return_value = mock_response

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python"]}, job_description="Python developer"
        )

        # Fallback timestamp should be generated
        assert result["confidence_score"] == 75
        assert "generated_at" in result
        assert isinstance(result["generated_at"], str)
        # Should be ISO format
        datetime.fromisoformat(result["generated_at"].replace("Z", "+00:00"))

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_json_parse_failure(self, mock_get_client):
        """Test analyze_job_fit_sync when JSON parsing fails"""
        # Setup mock client and response for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = "This is not valid JSON at all!"
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=200, completion_tokens=100)
        mock_client.responses.create.return_value = mock_response

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python"]}, job_description="Python developer"
        )

        # Should use fallback values
        assert result["confidence_score"] == 50
        assert result["fit_analysis"] == "This is not valid JSON at all!"
        assert "generated_at" in result
        assert (
            result["tokens_used"] == 300
        )  # prompt_tokens (200) + completion_tokens (100)

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_api_exception(self, mock_get_client):
        """Test analyze_job_fit_sync when OpenAI API raises exception"""
        # Setup mock client that raises exception
        mock_client = Mock()
        mock_get_client.return_value = mock_client
        mock_client.responses.create.side_effect = Exception("API timeout")

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python"]}, job_description="Python developer"
        )

        # Should return error result with required fields
        assert "error" in result
        assert "API timeout" in result["error"]
        assert result["confidence_score"] == 0
        assert result["fit_analysis"] == ""
        assert "generated_at" in result

    @patch("src.services.ai_service.job_fit.get_openai_client")
    def test_analyze_job_fit_sync_with_markdown_code_block(self, mock_get_client):
        """Test analyze_job_fit_sync when AI returns JSON wrapped in markdown"""
        # Setup mock client and response for Responses API
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        mock_response = Mock()
        mock_output_item = Mock()
        mock_output_item.type = "message"
        mock_output_item.content = """```json
{
    "confidence_score": 90,
    "fit_analysis": "Excellent match",
    "generated_at": "2025-01-02T10:00:00Z"
}
```"""
        mock_response.output = [mock_output_item]
        mock_response.usage = Mock(prompt_tokens=280, completion_tokens=170)
        mock_client.responses.create.return_value = mock_response

        result = analyze_job_fit_sync(
            cv_data={"skills": ["Python", "FastAPI"]},
            job_description="Senior Python developer",
        )

        # Should correctly parse JSON from markdown
        assert result["confidence_score"] == 90
        assert result["fit_analysis"] == "Excellent match"
        assert result["generated_at"] == "2025-01-02T10:00:00Z"

    def test_analyze_job_fit_sync_ai_disabled(self):
        """Test analyze_job_fit_sync when AI is disabled"""
        with patch("src.services.ai_service.job_fit.is_ai_enabled", return_value=False):
            result = analyze_job_fit_sync(
                cv_data={"skills": ["Python"]}, job_description="Python developer"
            )

            # Should return error with required fields
            assert "error" in result
            assert result["confidence_score"] == 0
            assert result["fit_analysis"] == ""
            assert "generated_at" in result


class TestGenerateJobFitSync:
    """Test generate_job_fit_sync background task function"""

    @patch("src.api.ai.SessionLocal")
    @patch("src.services.ai_service.analyze_job_fit_sync")
    def test_generate_job_fit_sync_success_with_required_fields(
        self, mock_analyze, mock_session_local
    ):
        """Test generate_job_fit_sync when AI returns complete result"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_draft = Mock()
        mock_draft.id = "draft-123"
        mock_db.query().filter().first.return_value = mock_draft

        # AI service returns complete result with required fields
        mock_analyze.return_value = {
            "confidence_score": 85,
            "fit_analysis": "Great match",
            "generated_at": "2025-01-01T12:00:00Z",
            "key_matches": ["Python"],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": ["Strong backend"],
            "weaknesses": [],
            "tokens_used": 500,
            "generation_time": 2500,
            "model_used": "gpt-5",
        }

        # Execute
        generate_job_fit_sync(
            task_id="draft-123",
            cv_data={"skills": ["Python"]},
            job_description="Python developer",
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
        )

        # Verify draft was updated correctly
        assert mock_draft.is_generating is False
        assert mock_draft.generation_error is None
        assert mock_draft.draft_data == mock_analyze.return_value
        assert mock_draft.tokens_used == 500
        assert mock_draft.generation_time == 2500
        assert mock_draft.ai_model == "gpt-5"
        mock_db.commit.assert_called()

    @patch("src.api.ai.SessionLocal")
    @patch("src.services.ai_service.analyze_job_fit_sync")
    def test_generate_job_fit_sync_missing_confidence_score(
        self, mock_analyze, mock_session_local
    ):
        """Test generate_job_fit_sync when AI result is missing confidence_score"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_draft = Mock()
        mock_draft.id = "draft-123"
        mock_db.query().filter().first.return_value = mock_draft

        # AI service returns result WITHOUT confidence_score
        mock_analyze.return_value = {
            # confidence_score missing!
            "fit_analysis": "Good match",
            "generated_at": "2025-01-01T12:00:00Z",
            "tokens_used": 400,
        }

        # Execute
        generate_job_fit_sync(
            task_id="draft-123",
            cv_data={"skills": ["Python"]},
            job_description="Python developer",
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
        )

        # Verify draft was marked with error
        assert mock_draft.is_generating is False
        assert "confidence_score" in mock_draft.generation_error
        mock_db.commit.assert_called()

    @patch("src.api.ai.SessionLocal")
    @patch("src.services.ai_service.analyze_job_fit_sync")
    def test_generate_job_fit_sync_missing_generated_at(
        self, mock_analyze, mock_session_local
    ):
        """Test generate_job_fit_sync when AI result is missing generated_at"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_draft = Mock()
        mock_draft.id = "draft-123"
        mock_db.query().filter().first.return_value = mock_draft

        # AI service returns result WITHOUT generated_at
        mock_analyze.return_value = {
            "confidence_score": 80,
            "fit_analysis": "Good match",
            # generated_at missing!
            "tokens_used": 400,
        }

        # Execute
        generate_job_fit_sync(
            task_id="draft-123",
            cv_data={"skills": ["Python"]},
            job_description="Python developer",
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
        )

        # Verify draft was marked with error
        assert mock_draft.is_generating is False
        assert "generated_at" in mock_draft.generation_error
        mock_db.commit.assert_called()

    @patch("src.api.ai.SessionLocal")
    @patch("src.services.ai_service.analyze_job_fit_sync")
    def test_generate_job_fit_sync_ai_error(self, mock_analyze, mock_session_local):
        """Test generate_job_fit_sync when AI service returns error"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_draft = Mock()
        mock_draft.id = "draft-123"
        mock_db.query().filter().first.return_value = mock_draft

        # AI service returns error
        mock_analyze.return_value = {
            "error": "OpenAI API timeout",
            "confidence_score": 0,
            "fit_analysis": "",
        }

        # Execute
        generate_job_fit_sync(
            task_id="draft-123",
            cv_data={"skills": ["Python"]},
            job_description="Python developer",
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
        )

        # Verify draft was marked with error
        assert mock_draft.is_generating is False
        assert mock_draft.generation_error == "OpenAI API timeout"
        mock_db.commit.assert_called()

    @patch("src.api.ai.SessionLocal")
    @patch("src.services.ai_service.analyze_job_fit_sync")
    def test_generate_job_fit_sync_exception_handling(
        self, mock_analyze, mock_session_local
    ):
        """Test generate_job_fit_sync handles exceptions gracefully"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        # First call: get draft (raises exception)
        # Second call: error handling session (succeeds)
        mock_draft = Mock()
        mock_draft.id = "draft-123"
        mock_db.query().filter().first.return_value = mock_draft

        # AI service raises exception
        mock_analyze.side_effect = Exception("Unexpected error")

        # Execute
        generate_job_fit_sync(
            task_id="draft-123",
            cv_data={"skills": ["Python"]},
            job_description="Python developer",
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
        )

        # Verify error was caught and draft updated
        # The function creates a new session for error handling
        assert mock_session_local.call_count >= 1
