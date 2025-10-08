"""
Content enhancement service for improving CV text quality.

This module provides functions for enhancing CV content with stronger
language, action verbs, metrics, and professional terminology.
"""
import time
import asyncio
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.config import AIConfig
from .common import (
    get_openai_client,
    is_ai_enabled,
    extract_response_data,
    parse_json_from_markdown,
    log_ai_usage_safe,
    with_retries,
    RETRY_ATTEMPTS,
    RETRY_DELAY
)

logger = logging.getLogger(__name__)


# ============================================================================
# Content Enhancement Functions
# ============================================================================

async def enhance_content(
    original_content: str,
    content_type: str = "bullet_point",
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Enhance a piece of content with stronger language and metrics.
    
    Args:
        original_content: The content to enhance
        content_type: Type of content (bullet_point, paragraph, summary, etc.)
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
    
    Returns:
        Dictionary containing:
        - suggestions: List of 3-4 enhanced versions
        - overall_improvements: List of specific improvements made
        - tokens_used: Number of tokens used
        - generation_time: Generation time in milliseconds
        - model_used: AI model identifier
    """
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "suggestions": [],
            "improvements": [],
            "confidence_scores": []
        }
    
    prompt = f"""
    Enhance this {content_type} to make it more impactful and professional. Generate 4 different improved versions.

    Original Content:
    "{original_content}"

    For each suggestion, focus on:
    1. Stronger action verbs (led, implemented, optimized, delivered, etc.)
    2. Quantified results where possible (percentages, numbers, timeframes)
    3. Industry-specific terminology
    4. More compelling impact statements
    5. Professional language and tone

    Return JSON format:
    {{
        "suggestions": [
            {{
                "content": "Enhanced version 1...",
                "improvements": ["Added metrics", "Stronger verb", "Industry terms"],
                "confidence_score": 85
            }},
            {{
                "content": "Enhanced version 2...",
                "improvements": ["Quantified results", "Action-oriented", "Specific impact"],
                "confidence_score": 90
            }},
            {{
                "content": "Enhanced version 3...",
                "improvements": ["Professional tone", "Technical details", "Business impact"],
                "confidence_score": 88
            }},
            {{
                "content": "Enhanced version 4...",
                "improvements": ["Concise format", "Key achievements", "Measurable outcomes"],
                "confidence_score": 82
            }}
        ],
        "overall_improvements": [
            "Added specific metrics and quantifiable results",
            "Used stronger action verbs",
            "Incorporated industry-specific terminology",
            "Improved overall impact and professionalism"
        ]
    }}
    """
    
    try:
        start_time = time.time()
        client = get_openai_client()
        
        async def _call():
            return await asyncio.to_thread(
                client.responses.create,
                model=AIConfig.OPENAI_MODEL,
                instructions="You are a professional CV writer and content optimization expert. Enhance content to be more impactful, specific, and professional.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )

        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)
        
        generation_time = int((time.time() - start_time) * 1000)
        
        # Extract content and token usage
        content, prompt_tokens, completion_tokens = extract_response_data(response)
        tokens_used = prompt_tokens + completion_tokens
        
        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="enhance_content",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Parse JSON response - handle markdown code blocks
        try:
            json_content = parse_json_from_markdown(content)
            result = json.loads(json_content)
            suggestions = result.get("suggestions", [])
            overall_improvements = result.get("overall_improvements", [])
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            suggestions = [{"content": content, "improvements": ["Enhanced content"], "confidence_score": 75}]
            overall_improvements = ["Content enhanced for better impact"]
        
        return {
            "suggestions": suggestions,
            "overall_improvements": overall_improvements,
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="enhance_content",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        return {
            "error": f"Error enhancing content: {str(e)}",
            "suggestions": [],
            "overall_improvements": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }

