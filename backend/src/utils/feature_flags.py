"""
Feature Flags Utility Module.

This module provides utilities for checking feature flags from environment variables.
Feature flags allow enabling/disabling functionality without code changes.
"""
import os
from typing import Optional


def _get_bool_env(key: str, default: bool = False) -> bool:
    """
    Get a boolean value from an environment variable.

    Args:
        key: Environment variable name
        default: Default value if not set

    Returns:
        Boolean value
    """
    value = os.getenv(key)
    if value is None:
        return default

    return value.lower() in ('true', '1', 'yes', 'on')


def is_cv_history_enabled() -> bool:
    """
    Check if CV history recording is enabled.

    The ENABLE_CV_HISTORY environment variable controls whether the backend
    should record CV history snapshots. When disabled, all history recording
    operations are skipped to improve performance and reduce database storage.

    This should be coordinated with the frontend VITE_SHOW_HISTORY_PANEL flag.

    Returns:
        True if CV history is enabled, False otherwise
    """
    return _get_bool_env('ENABLE_CV_HISTORY', default=False)


def is_ai_enabled() -> bool:
    """
    Check if AI features are enabled.

    Returns:
        True if AI features are enabled, False otherwise
    """
    # AI is enabled if we have an OpenAI API key
    api_key = os.getenv('OPENAI_API_KEY')
    return bool(api_key and api_key.strip())


def is_impersonation_enabled() -> bool:
    """
    Check if admin impersonation is enabled.

    Returns:
        True if impersonation is enabled, False otherwise
    """
    return _get_bool_env('IMPERSONATION_ENABLED', default=True)


def is_dev_mode() -> bool:
    """
    Check if development mode is enabled.

    Returns:
        True if dev mode is enabled, False otherwise
    """
    return _get_bool_env('DEV_MODE', default=False)


def is_debug_enabled() -> bool:
    """
    Check if debug logging is enabled.

    Returns:
        True if debug is enabled, False otherwise
    """
    return _get_bool_env('DEBUG', default=False)
