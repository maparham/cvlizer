"""
CV parsing service for handling CV content extraction and AI parsing.

This module provides specialized functions for:
- OpenAI-based CV content parsing
- Text extraction from various file formats
- Parsing error handling and fallback responses
"""


def parse_cv_with_openai(file_content: bytes, filename: str, content_type: str) -> dict:
    """Parse CV content using OpenAI"""
    from .file_service import extract_text_from_file
    from .ai_service import parse_cv_text_with_openai
    
    try:
        # Extract text from file
        text_content = extract_text_from_file(file_content, content_type)
        
        # Parse with OpenAI
        parsed_data = parse_cv_text_with_openai(text_content)
        
        return parsed_data
    except Exception as e:
        # Return error structure if parsing fails
        return {
            "error": f"Failed to parse CV: {str(e)}",
            "raw_text": file_content.decode('utf-8', errors='ignore')[:1000] + "..." if len(file_content) > 1000 else file_content.decode('utf-8', errors='ignore')
        }


def parse_cv_text_with_openai(text_content: str) -> dict:
    """Parse CV text content using OpenAI - wrapper for ai_service function"""
    from .ai_service import parse_cv_text_with_openai as ai_parse
    return ai_parse(text_content)


def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text from file content - wrapper for file_service function"""
    from .file_service import extract_text_from_file as file_extract
    return file_extract(file_content, content_type)
