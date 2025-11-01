"""
AI service for CV parsing and content generation using OpenAI.

This module provides functions for parsing CV content with OpenAI
and generating AI-enhanced CV sections tailored to job descriptions.

This is a package that organizes AI functionality into specialized
submodules while maintaining backward compatibility through re-exports.

All OpenAI interactions are unified through call_openai_with_schema for
consistent error handling, retry logic, token tracking, and usage logging.
"""

# Re-export AI suggestions functions
from .ai_suggestions_service import generate_ai_suggestions

# Re-export common utilities and types
from .common import (
    JobFitResult,
    call_openai_with_schema,
    extract_cached_tokens,
    is_ai_enabled,
)

# Re-export content enhancement functions
from .content_enhancement import enhance_content

# Re-export CV parsing functions
from .cv_parsing import parse_cv_text_with_openai

# Re-export CV status functions
from .cv_status import check_cv_ai_enhancement_status, mark_cv_as_ai_enhanced

# Re-export job extraction functions
from .job_extraction import extract_job_description_with_ai

# Re-export job fit analysis functions
from .job_fit import analyze_job_fit_sync

# Re-export section generation functions
from .section_generation import generate_cv_section

# Define public API
__all__ = [
    # Common utilities and types
    "is_ai_enabled",
    "extract_cached_tokens",
    "call_openai_with_schema",
    "JobFitResult",
    # AI suggestions (job fit + optimization in one call)
    "generate_ai_suggestions",
    # Job fit analysis
    "analyze_job_fit_sync",
    # CV parsing
    "parse_cv_text_with_openai",
    # Section generation
    "generate_cv_section",
    # Content enhancement
    "enhance_content",
    # Job extraction
    "extract_job_description_with_ai",
    # CV status
    "check_cv_ai_enhancement_status",
    "mark_cv_as_ai_enhanced",
]
