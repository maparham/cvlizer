"""
Diagnostic schemas for OpenAI API testing.
"""

from typing import Optional
from pydantic import BaseModel, Field


class OpenAIDiagnosticRequest(BaseModel):
    """Request schema for OpenAI diagnostic tests."""
    model_config = {"protected_namespaces": ()}

    prompt: str = Field(..., description="The prompt to test")
    system_message: Optional[str] = Field(
        default="You are a helpful assistant.",
        description="System message for the model"
    )
    max_tokens: Optional[int] = Field(
        default=500,
        ge=1,
        le=4000,
        description="Maximum tokens in response"
    )
    temperature: Optional[float] = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Temperature for response randomness"
    )
    model_override: Optional[str] = Field(
        default=None,
        description="Optional model override"
    )


class DiagnosticMetrics(BaseModel):
    """Metrics from diagnostic test."""
    model_config = {"protected_namespaces": ()}

    response_time_ms: int = Field(..., description="Response time in milliseconds")
    prompt_tokens: int = Field(..., description="Number of prompt tokens")
    completion_tokens: int = Field(..., description="Number of completion tokens")
    total_tokens: int = Field(..., description="Total tokens used")
    estimated_cost: float = Field(..., description="Estimated cost in USD")
    finish_reason: str = Field(..., description="Reason for completion finish")
    model_used: str = Field(..., description="Model that was used")
    tokens_per_second: float = Field(..., description="Tokens generated per second")
    cache_hit: Optional[bool] = Field(default=None, description="Whether cache was hit")


class DiagnosticRequestDetails(BaseModel):
    """Details about the diagnostic request."""

    prompt: str = Field(..., description="The prompt that was sent")
    system_message: str = Field(..., description="System message used")
    max_tokens: int = Field(..., description="Max tokens setting")
    temperature: float = Field(..., description="Temperature setting")
    model: str = Field(..., description="Model used")
    timestamp: str = Field(..., description="ISO timestamp of request")
    prompt_length: int = Field(..., description="Character length of prompt")
    system_length: int = Field(..., description="Character length of system message")


class OpenAIDiagnosticResponse(BaseModel):
    """Response schema for OpenAI diagnostic tests."""

    success: bool = Field(..., description="Whether the test succeeded")
    response_text: Optional[str] = Field(default=None, description="Response from the model")
    api_type: str = Field(default="responses", description="API type used (always 'responses')")
    metrics: Optional[DiagnosticMetrics] = Field(default=None, description="Performance metrics")
    request_details: DiagnosticRequestDetails = Field(..., description="Details about the request")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class OpenAIConfigResponse(BaseModel):
    """Configuration details for OpenAI."""

    is_enabled: bool = Field(..., description="Whether AI is enabled")
    model: str = Field(..., description="Default model name")
    agent_model: Optional[str] = Field(default=None, description="Agent model name")
    max_tokens: int = Field(..., description="Maximum tokens")
    request_timeout: int = Field(..., description="Request timeout in seconds")
    max_retries: int = Field(..., description="Maximum retries")
    temperature: float = Field(..., description="Default temperature")
    api_key_configured: bool = Field(..., description="Whether API key is configured")
    api_key_prefix: str = Field(..., description="First 8 chars of API key (masked)")
    sdk_version: str = Field(..., description="OpenAI SDK version")
