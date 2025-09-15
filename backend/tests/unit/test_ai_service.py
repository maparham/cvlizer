import pytest
from unittest.mock import Mock, patch
from src.services.ai_service import generate_cv_section, parse_cv_text_with_openai
import json


class TestAIService:
    """Test cases for AI service"""
    
    @patch('src.services.ai_service.openai.ChatCompletion.acreate')
    async def test_generate_cv_section_success(self, mock_openai):
        """Test successful AI section generation"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "title": "Why I'm a Good Fit",
            "content": "Generated content here",
            "key_points": ["Point 1", "Point 2"]
        })
        mock_response.usage.total_tokens = 150
        mock_openai.return_value = mock_response
        
        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"
        
        result = await generate_cv_section(cv_data, job_description, "why_good_fit")
        
        assert result["title"] == "Why I'm a Good Fit"
        assert result["content"] == "Generated content here"
        assert result["key_points"] == ["Point 1", "Point 2"]
        assert result["tokens_used"] == 150
        assert result["ai_model"] == "gpt-4o-mini"
        assert "generation_time" in result
    
    @patch('src.services.ai_service.openai.ChatCompletion.acreate')
    async def test_generate_cv_section_json_parse_error(self, mock_openai):
        """Test AI section generation with JSON parse error"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Invalid JSON content"
        mock_response.usage.total_tokens = 100
        mock_openai.return_value = mock_response
        
        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"
        
        result = await generate_cv_section(cv_data, job_description, "why_good_fit")
        
        assert result["title"] == "AI Generated Section"
        assert result["content"] == "Invalid JSON content"
        assert result["key_points"] == []
        assert result["tokens_used"] == 100
    
    @patch('src.services.ai_service.openai.ChatCompletion.acreate')
    async def test_generate_cv_section_api_error(self, mock_openai):
        """Test AI section generation with API error"""
        mock_openai.side_effect = Exception("API Error")
        
        cv_data = {"experience": "5 years"}
        job_description = "Looking for experienced developer"
        
        result = await generate_cv_section(cv_data, job_description, "why_good_fit")
        
        assert "I apologize, but I'm unable to generate content" in result["section_content"]
        assert result["title"] == "AI Generated Section"
        assert result["key_points"] == []
        assert result["tokens_used"] == 0
        assert result["error"] == "API Error"
    
    @patch('src.services.ai_service.openai.ChatCompletion.create')
    def test_parse_cv_text_with_openai_success(self, mock_openai):
        """Test successful CV text parsing with OpenAI"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "personal_info": {
                "full_name": "John Doe",
                "email": "john@example.com"
            },
            "work_experience": [
                {
                    "company": "Tech Corp",
                    "position": "Developer"
                }
            ]
        })
        mock_openai.return_value = mock_response
        
        text_content = "John Doe\nDeveloper at Tech Corp"
        
        result = parse_cv_text_with_openai(text_content)
        
        assert result["personal_info"]["full_name"] == "John Doe"
        assert result["personal_info"]["email"] == "john@example.com"
        assert len(result["work_experience"]) == 1
        assert result["work_experience"][0]["company"] == "Tech Corp"
    
    @patch('src.services.ai_service.openai.ChatCompletion.create')
    def test_parse_cv_text_with_openai_json_error(self, mock_openai):
        """Test CV text parsing with JSON parse error"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Invalid JSON"
        mock_openai.return_value = mock_response
        
        text_content = "John Doe\nDeveloper at Tech Corp"
        
        result = parse_cv_text_with_openai(text_content)
        
        assert "parse_error" in result
        assert "Failed to parse as JSON" in result["parse_error"]
        assert result["professional_summary"]["content"] == text_content[:500]
    
    @patch('src.services.ai_service.openai.ChatCompletion.create')
    def test_parse_cv_text_with_openai_api_error(self, mock_openai):
        """Test CV text parsing with API error"""
        mock_openai.side_effect = Exception("API Error")
        
        text_content = "John Doe\nDeveloper at Tech Corp"
        
        result = parse_cv_text_with_openai(text_content)
        
        assert "parse_error" in result
        assert "OpenAI API error" in result["parse_error"]
        assert result["professional_summary"]["content"] == text_content[:500]
    
    def test_parse_cv_text_with_openai_empty_content(self):
        """Test CV text parsing with empty content"""
        text_content = ""
        
        with patch('src.services.ai_service.openai.ChatCompletion.create') as mock_openai:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = json.dumps({
                "personal_info": {"full_name": ""},
                "professional_summary": {"content": ""}
            })
            mock_openai.return_value = mock_response
            
            result = parse_cv_text_with_openai(text_content)
            
            assert result["personal_info"]["full_name"] == ""
            assert result["professional_summary"]["content"] == ""
