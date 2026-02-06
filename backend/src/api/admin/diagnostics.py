"""
OpenAI diagnostic API endpoints for admin operations.

This module provides administrative endpoints for testing and diagnosing
OpenAI API integration, including configuration inspection and API testing
with comprehensive error handling and metrics.
"""

import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Dict

import openai as openai_module
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter

from src.config import AIConfig, APIConfig, OpenAIPricing
from src.middleware.clerk_auth import require_admin_not_impersonating
from src.models.user import User
from src.schemas.diagnostic_schemas import (
    DiagnosticMetrics,
    DiagnosticRequestDetails,
    OpenAIConfigResponse,
    OpenAIDiagnosticRequest,
    OpenAIDiagnosticResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])

# Create limiter instance for this module
from src.utils.rate_limit import create_combined_limiter

limiter = create_combined_limiter()


@router.get("/openai/config", response_model=OpenAIConfigResponse)
async def get_openai_config(admin_user: User = Depends(require_admin_not_impersonating)):
    """
    Get current OpenAI configuration for diagnostic purposes.
    """
    try:
        # Check if API key is configured
        api_key = AIConfig.OPENAI_API_KEY
        api_key_configured = bool(api_key and api_key != "your-openai-key-here")
        # Never expose any actual characters of the API key
        api_key_prefix = "sk-***...***" if api_key_configured else "Not configured"

        # Get SDK version
        sdk_version = getattr(openai_module, "__version__", "unknown")

        return OpenAIConfigResponse(
            is_enabled=AIConfig.is_enabled(),
            model=AIConfig.OPENAI_MODEL or "Not configured",
            agent_model=AIConfig.AGENT_MODEL,
            max_tokens=AIConfig.MAX_TOKENS,
            request_timeout=AIConfig.REQUEST_TIMEOUT_SECONDS,
            max_retries=AIConfig.MAX_RETRIES,
            temperature=AIConfig.DEFAULT_TEMPERATURE,
            api_key_configured=api_key_configured,
            api_key_prefix=api_key_prefix,
            sdk_version=sdk_version,
        )

    except Exception as e:
        logger.error(f"Error getting OpenAI config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving OpenAI configuration",
        )


@router.post("/openai/test", response_model=OpenAIDiagnosticResponse)
@limiter.limit(APIConfig.ADMIN_RATE_LIMIT)
async def test_openai_api(
    request_obj: Request,
    request: OpenAIDiagnosticRequest,
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Test the OpenAI Responses API.
    Rate limited to 10 requests per minute per admin user.
    """
    if not AIConfig.is_enabled():
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error="OpenAI API key not configured",
        )

    try:
        # Prepare request parameters
        model = request.model_override or AIConfig.OPENAI_MODEL
        max_tokens = request.max_tokens or 500
        temperature = request.temperature or 0.7
        system_message = request.system_message or "You are a helpful assistant."

        # Create client and track timing
        client = openai_module.OpenAI(
            api_key=AIConfig.OPENAI_API_KEY,
            timeout=float(AIConfig.REQUEST_TIMEOUT_SECONDS),
        )
        request_start = time.time()

        # Call Responses API asynchronously to avoid blocking the event loop
        # Note: Responses API uses 'instructions' for system message and 'input' for prompt
        # It uses max_output_tokens instead of max_tokens
        # Temperature parameter is not supported in Responses API
        create_kwargs: Dict[str, Any] = {
            "model": model,
            "instructions": system_message,
            "input": request.prompt,
            "max_output_tokens": max_tokens,
            "reasoning": {"effort": "minimal", "summary": "auto"},
        }
        if AIConfig.AGENT_PROCESSING_TIER:
            create_kwargs["service_tier"] = AIConfig.AGENT_PROCESSING_TIER
        response = await asyncio.to_thread(
            client.responses.create,
            **create_kwargs,
        )
        logger.debug(f"OpenAI Response API response: {response}")

        response_time_ms = int((time.time() - request_start) * 1000)

        # Extract response text using output_text helper
        response_text = response.output_text if hasattr(response, "output_text") else None

        # If output_text not available, try to extract from output array
        if not response_text and hasattr(response, "output"):
            for item in response.output:
                if hasattr(item, "type") and item.type == "message":
                    if hasattr(item, "content") and isinstance(item.content, list):
                        for content_item in item.content:
                            if (
                                hasattr(content_item, "type")
                                and content_item.type == "output_text"
                            ):
                                response_text = content_item.text
                                break
                if response_text:
                    break

        # Extract finish status
        finish_reason = "stop"  # Default
        if hasattr(response, "output"):
            for item in response.output:
                if hasattr(item, "status") and item.status:
                    finish_reason = item.status
                    break

        # Extract token usage - Responses API may have different structure
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        cache_hit = None

        if hasattr(response, "usage"):
            prompt_tokens = getattr(response.usage, "prompt_tokens", 0) or getattr(
                response.usage, "input_tokens", 0
            )
            completion_tokens = getattr(
                response.usage, "completion_tokens", 0
            ) or getattr(response.usage, "output_tokens", 0)
            total_tokens = getattr(response.usage, "total_tokens", 0) or (
                prompt_tokens + completion_tokens
            )

            # Check for cache hit indicator
            if hasattr(response.usage, "cache_hit"):
                cache_hit = response.usage.cache_hit

        # Calculate metrics
        tokens_per_second = (
            (completion_tokens / (response_time_ms / 1000.0))
            if response_time_ms > 0
            else 0.0
        )

        # Estimate cost using centralized pricing configuration
        estimated_cost = OpenAIPricing.estimate_cost(
            model, prompt_tokens, completion_tokens
        )

        # Log the test
        logger.info(
            f"Admin diagnostic test - Responses API - "
            f"User: {admin_user.email}, Model: {model}, "
            f"Prompt length: {len(request.prompt)}, "
            f"Response time: {response_time_ms}ms, "
            f"Cache hit: {cache_hit}, Success: True"
        )

        return OpenAIDiagnosticResponse(
            success=True,
            response_text=response_text,
            api_type="responses",
            metrics=DiagnosticMetrics(
                response_time_ms=response_time_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost=estimated_cost,
                finish_reason=finish_reason,
                model_used=model,
                tokens_per_second=tokens_per_second,
                cache_hit=cache_hit,
            ),
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=system_message,
                max_tokens=max_tokens,
                temperature=temperature,
                model=model,
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(system_message),
            ),
        )

    except openai_module.APITimeoutError as e:
        logger.error(f"OpenAI API timeout in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Timeout: The request took too long to complete. Please try again with a shorter prompt or higher timeout value. Details: {str(e)}",
        )
    except openai_module.RateLimitError as e:
        logger.error(f"OpenAI API rate limit in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Rate Limit: You've exceeded the API rate limit. Please try again later. Details: {str(e)}",
        )
    except openai_module.APIConnectionError as e:
        logger.error(f"OpenAI API connection error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Connection Error: Unable to connect to OpenAI API. Please check your network connection. Details: {str(e)}",
        )
    except openai_module.AuthenticationError as e:
        logger.error(f"OpenAI API authentication error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Authentication Error: Invalid API key or credentials. Please verify your API key configuration. Details: {str(e)}",
        )
    except openai_module.APIError as e:
        logger.error(f"OpenAI API error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Error: {str(e)}",
        )
    except Exception as e:
        # Log full exception with traceback for debugging
        logger.exception(f"Unexpected error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"Unexpected Error: {str(e)}",
        )
