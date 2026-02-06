"""
Application Configuration Module

This module centralizes all configuration constants used throughout the backend.
Values are read from environment variables with sensible defaults.
"""

import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# AI / OpenAI Configuration
# ============================================================================


class AIConfig:
    """AI and OpenAI related configuration"""

    # OpenAI API Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL")  # Required: Must be set in .env
    OPENAI_PARSING_MODEL: str = os.getenv(
        "OPENAI_PARSING_MODEL"
    )  # Required: Used for CV and job description parsing

    # Agent Model Configuration (for future agent-based features)
    AGENT_MODEL: str = os.getenv(
        "AGENT_MODEL"
    )  # Optional: Reserved for future agent implementations
    AGENT_PROCESSING_TIER: str = os.getenv("AGENT_PROCESSING_TIER", "") or ""
    # When set: "flex" or "standard". When empty: not sent to API (no default).

    # Token limits
    MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "4000"))
    MAX_PROMPT_TOKENS: int = int(os.getenv("AI_MAX_PROMPT_TOKENS", "3000"))
    MAX_COMPLETION_TOKENS: int = int(os.getenv("AI_MAX_COMPLETION_TOKENS", "1000"))

    # Retry configuration
    MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "3"))
    RETRY_DELAY_SECONDS: float = float(os.getenv("AI_RETRY_DELAY", "1.0"))

    # Timeouts
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("AI_TIMEOUT", "60"))

    # Temperature and creativity settings
    DEFAULT_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))

    # Reasoning effort: "low", "medium", or "high"
    # - low: Faster, cheaper, may take shortcuts
    # - medium: Balanced quality and cost (recommended)
    # - high: Better quality, slower, more expensive
    REASONING_EFFORT: str = os.getenv("AI_REASONING_EFFORT", "low")

    # Parsing-specific reasoning effort (for CV and JD parsing)
    # Defaults to "minimal" for faster parsing operations
    # Options: "minimal", "low", "medium", "high"
    OPENAI_PARSING_EFFORT: str = os.getenv("OPENAI_PARSING_EFFORT", "minimal")

    # CV Quality Analysis verbosity (for Response API text verbosity)
    # Defaults to "low" for concise quality feedback
    # Options: "low", "medium", "high"
    CV_QUALITY_VERBOSITY: str = os.getenv("CV_QUALITY_VERBOSITY", "low")

    # Temperature for all AI reasoning calls (where AI_REASONING_EFFORT is used).
    # Lower values (e.g. 0) give more consistent output.
    AI_REASONING_TEMPERATURE: float = float(os.getenv("AI_REASONING_TEMPERATURE", "0"))
    # Optional fixed seed for reproducibility; set to empty to disable
    CV_QUALITY_SEED: Optional[int] = (
        int(x)
        if (x := os.getenv("CV_QUALITY_SEED", "").strip()) and x.isdigit()
        else None
    )

    # Pre-made prompt by OpenAI ID for CV quality.
    # When set, CV quality uses the dashboard prompt instead of inline system/user prompts.
    # The dashboard prompt must include a placeholder named CV_QUALITY_PROMPT_CV_VARIABLE
    # (e.g. {{cv_data}}); the app injects the same CV JSON string as the current user message.
    # Set to empty string in env to use inline prompts instead.
    CV_QUALITY_PROMPT_ID: str = os.getenv(
        "CV_QUALITY_PROMPT_ID",
        "pmpt_6984b849ab288190a1e49b2dcaf93e4b05b5c8950389ceb8",
    )
    CV_QUALITY_PROMPT_VERSION: str = os.getenv("CV_QUALITY_PROMPT_VERSION", "7")
    # Coach mode (coaching): separate prompt ID. When set, coaching uses this prompt.
    CV_QUALITY_COACH_PROMPT_ID: str = os.getenv(
        "CV_QUALITY_COACH_PROMPT_ID",
        "pmpt_6985147fbb988196a0c7eb4ed2af6eb00735859b2912416e",
    )
    CV_QUALITY_COACH_PROMPT_VERSION: str = os.getenv(
        "CV_QUALITY_COACH_PROMPT_VERSION", ""
    )  # Empty = use latest
    CV_QUALITY_PROMPT_CV_VARIABLE: str = os.getenv(
        "CV_QUALITY_PROMPT_CV_VARIABLE", "cv_data"
    )

    @classmethod
    def is_enabled(cls) -> bool:
        """Check if AI features are enabled"""
        return bool(cls.OPENAI_API_KEY and cls.OPENAI_API_KEY != "your-openai-key-here")


# ============================================================================
# Database Configuration
# ============================================================================


class DatabaseConfig:
    """Database related configuration"""

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")

    # Pool configuration - timeout and recycle
    POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))

    @classmethod
    def is_test_environment(cls) -> bool:
        """
        Check if running in test environment.

        Detects test execution via PYTEST_CURRENT_TEST environment variable,
        which is set by pytest during test runs (including Playwright tests).
        """
        return bool(os.getenv("PYTEST_CURRENT_TEST"))

    @classmethod
    def get_database_type(cls) -> str:
        """
        Detect database type from DATABASE_URL.

        Returns:
            'sqlite', 'postgresql', 'mysql', or 'unknown'
        """
        url = cls.DATABASE_URL.lower()
        if url.startswith("sqlite"):
            return "sqlite"
        elif url.startswith("postgresql") or url.startswith("postgres"):
            return "postgresql"
        elif url.startswith("mysql"):
            return "mysql"
        return "unknown"

    @classmethod
    def is_poolable_database(cls) -> bool:
        """
        Check if database supports standard connection pooling.

        SQLite uses different pooling mechanisms (StaticPool) than
        PostgreSQL/MySQL which benefit from full connection pooling.
        """
        return cls.get_database_type() in ["postgresql", "mysql"]

    @classmethod
    def get_pool_size(cls) -> int:
        """
        Get pool size with environment-aware defaults.

        Environment-specific defaults:
        - Test: 20 connections (sized for 12 concurrent Playwright test streams on 8-core machine)
        - Production: 10 connections (MVP with up to 10 simultaneous users + background tasks)
        - Development: 5 connections (single developer testing)

        Can be overridden via DB_POOL_SIZE environment variable.
        """
        env_value = os.getenv("DB_POOL_SIZE")
        if env_value:
            return int(env_value)

        # Environment-aware defaults
        if cls.is_test_environment():
            return 20  # Handle 12 concurrent test streams with headroom
        elif AppConfig.is_production():
            return 10  # 10 simultaneous users + background tasks
        else:
            return 5  # Single developer in development

    @classmethod
    def get_max_overflow(cls) -> int:
        """
        Get max overflow with environment-aware defaults.

        Environment-specific defaults:
        - Test: 10 overflow (additional capacity for test spikes)
        - Production: 10 overflow (production burst capacity)
        - Development: 5 overflow (development burst capacity)

        Can be overridden via DB_MAX_OVERFLOW environment variable.
        """
        env_value = os.getenv("DB_MAX_OVERFLOW")
        if env_value:
            return int(env_value)

        # Environment-aware defaults
        if cls.is_test_environment():
            return 10  # Additional capacity for test spikes
        elif AppConfig.is_production():
            return 10  # Production overflow capacity
        else:
            return 5  # Development overflow

    # Note: Use get_pool_size() and get_max_overflow() methods to retrieve values
    # with environment-aware defaults. Legacy code may access POOL_SIZE/MAX_OVERFLOW
    # but should migrate to using the getter methods.


# ============================================================================
# Background Task Configuration
# ============================================================================


class BackgroundTaskConfig:
    """Background task processing configuration"""

    # Thread pool workers
    WORKERS: int = int(os.getenv("BACKGROUND_TASK_WORKERS", "3"))
    CV_PARSE_WORKERS: int = int(os.getenv("CV_PARSE_WORKERS", "2"))

    # Task timeouts (in seconds)
    DEFAULT_TIMEOUT: int = int(os.getenv("TASK_TIMEOUT", "300"))
    CV_PARSE_TIMEOUT: int = int(os.getenv("CV_PARSE_TIMEOUT", "120"))
    AI_GENERATION_TIMEOUT: int = int(os.getenv("AI_GENERATION_TIMEOUT", "180"))
    URL_PARSING_TIMEOUT: int = int(os.getenv("URL_PARSING_TIMEOUT", "60"))

    # Delays
    URL_PARSING_DELAY_SECONDS: float = float(os.getenv("URL_PARSING_DELAY", "1.0"))


# ============================================================================
# File Upload Configuration
# ============================================================================


class FileConfig:
    """File upload related configuration"""

    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default

    ALLOWED_CV_TYPES: list = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    ALLOWED_CV_EXTENSIONS: list = [".pdf", ".doc", ".docx"]

    # Upload directory
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")


# ============================================================================
# Authentication Configuration
# ============================================================================


class AuthConfig:
    """Authentication and authorization configuration"""

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "your-secret-key-change-in-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Clerk Configuration
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "")
    CLERK_ISSUER: str = os.getenv("CLERK_ISSUER", "")
    CLERK_AUDIENCE: str = os.getenv("CLERK_AUDIENCE", "")
    CLERK_VERIFY_TOKENS: bool = os.getenv("CLERK_VERIFY_TOKENS", "true").lower() == "true"

    # Admin Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")

    # Session Configuration
    USER_INFO_CACHE_TTL_SECONDS: int = int(
        os.getenv("USER_INFO_CACHE_TTL", "300")
    )  # 5 minutes


# ============================================================================
# API Configuration
# ============================================================================


class APIConfig:
    """API related configuration"""

    # CORS
    CORS_ALLOW_ORIGINS: list = os.getenv(
        "CORS_ALLOW_ORIGINS", "http://localhost:5173"
    ).split(",")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]

    # Rate Limiting
    # Note: Rate limiting is always enabled
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # AI Rate Limiting - Parsing Tasks (CV/JD parsing from files/URLs)
    AI_PARSING_RATE_LIMIT: str = os.getenv("AI_PARSING_RATE_LIMIT", "10/15minutes")

    # AI Rate Limiting - Reasoning Tasks (enhancement, optimization, suggestions, analysis)
    AI_REASONING_RATE_LIMIT: str = os.getenv("AI_REASONING_RATE_LIMIT", "5/15minutes")

    # Admin/Testing Rate Limit
    ADMIN_RATE_LIMIT: str = os.getenv("ADMIN_RATE_LIMIT", "10/minute")

    # API Versioning
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")


# ============================================================================
# Logging Configuration
# ============================================================================


class LoggingConfig:
    """Logging configuration"""

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv(
        "LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    LOG_FILE: str = os.getenv("LOG_FILE", "app.log")
    LOG_FILE_ENABLED: bool = os.getenv("LOG_FILE_ENABLED", "false").lower() == "true"


# ============================================================================
# Application Configuration
# ============================================================================


class AppConfig:
    """General application configuration"""

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    DEV_MODE: bool = os.getenv("DEV_MODE", "true").lower() == "true"

    # Application Info
    APP_NAME: str = "CV Optimizer"
    APP_VERSION: str = "1.0.0"

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production"""
        return cls.ENVIRONMENT.lower() == "production"

    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development"""
        return cls.ENVIRONMENT.lower() == "development"


# ============================================================================
# Validation Configuration
# ============================================================================


class ValidationConfig:
    """Validation rules and limits"""

    # Job Description Validation
    MIN_JOB_DESCRIPTION_LENGTH: int = int(os.getenv("MIN_JOB_DESC_LENGTH", "50"))
    MAX_JOB_DESCRIPTION_LENGTH: int = int(os.getenv("MAX_JOB_DESC_LENGTH", "10000"))

    # CV Content Validation
    MIN_CV_CONTENT_LENGTH: int = int(os.getenv("MIN_CV_LENGTH", "100"))
    MAX_CV_CONTENT_LENGTH: int = int(os.getenv("MAX_CV_LENGTH", "50000"))

    # Section Content Validation
    MAX_SECTION_CONTENT_LENGTH: int = int(os.getenv("MAX_SECTION_LENGTH", "5000"))

    # URL Validation
    ALLOWED_URL_SCHEMES: list = ["http", "https"]
    URL_TIMEOUT_SECONDS: int = int(os.getenv("URL_TIMEOUT", "10"))


# ============================================================================
# AI Usage Tracking Configuration
# ============================================================================


class AIUsageConfig:
    """AI usage tracking and cost configuration"""

    # Model Pricing (per 1M tokens)
    # Last verified: October 2025
    # Source: https://openai.com/api/pricing/
    # Note: Cached input tokens cost 10% of regular input price
    MODEL_PRICING: Dict[str, Dict[str, float]] = {
        "gpt-4o-mini": {"input_price_per_1m": 0.150, "output_price_per_1m": 0.600},
        "gpt-4o": {"input_price_per_1m": 2.50, "output_price_per_1m": 10.00},
        "gpt-3.5-turbo": {"input_price_per_1m": 0.50, "output_price_per_1m": 1.50},
        "gpt-5": {"input_price_per_1m": 1.25, "output_price_per_1m": 10.00},
        "gpt-5.1": {"input_price_per_1m": 1.25, "output_price_per_1m": 10.00},
        "gpt-5.2": {"input_price_per_1m": 1.75, "output_price_per_1m": 14.00},
        "gpt-5-mini": {"input_price_per_1m": 0.250, "output_price_per_1m": 2.000},
        "gpt-5-nano": {"input_price_per_1m": 0.050, "output_price_per_1m": 0.400},
        "gpt-5-pro": {"input_price_per_1m": 15.00, "output_price_per_1m": 120.00},
    }

    # Default pricing for unknown models
    DEFAULT_INPUT_PRICE_PER_1M: float = 0.150
    DEFAULT_OUTPUT_PRICE_PER_1M: float = 0.600

    # Service tier cost multipliers (OpenAI: flex=50%, standard=100%, priority=200%)
    # Unknown or missing tier defaults to 1.0 (standard).
    TIER_COST_MULTIPLIER: Dict[str, float] = {
        "flex": 0.5,
        "standard": 1.0,
        "priority": 2.0,
    }

    # Usage limits
    USAGE_TRACKING_ENABLED: bool = (
        os.getenv("USAGE_TRACKING_ENABLED", "true").lower() == "true"
    )
    MAX_TOKENS_PER_USER_PER_DAY: int = int(os.getenv("MAX_TOKENS_PER_USER_DAY", "100000"))


# ============================================================================
# OpenAI Pricing Helper
# ============================================================================


class OpenAIPricing:
    """Helper class for OpenAI pricing calculations"""

    @classmethod
    def estimate_cost(
        cls, model: str, prompt_tokens: int, completion_tokens: int
    ) -> float:
        """
        Estimate the cost of an OpenAI API call based on token usage.

        Args:
            model: OpenAI model name (e.g., "gpt-4o-mini", "gpt-4o")
            prompt_tokens: Number of input/prompt tokens used
            completion_tokens: Number of output/completion tokens generated

        Returns:
            Estimated cost in USD
        """
        # Find the pricing for the model (case-insensitive match)
        model_lower = model.lower()
        pricing = None

        for model_key, model_pricing in AIUsageConfig.MODEL_PRICING.items():
            if model_key.lower() in model_lower:
                pricing = model_pricing
                break

        # Use default pricing if model not found
        if not pricing:
            input_cost = (
                prompt_tokens / 1_000_000
            ) * AIUsageConfig.DEFAULT_INPUT_PRICE_PER_1M
            output_cost = (
                completion_tokens / 1_000_000
            ) * AIUsageConfig.DEFAULT_OUTPUT_PRICE_PER_1M
        else:
            input_cost = (prompt_tokens / 1_000_000) * pricing["input_price_per_1m"]
            output_cost = (completion_tokens / 1_000_000) * pricing["output_price_per_1m"]

        return input_cost + output_cost


# ============================================================================
# Export Configuration Classes
# ============================================================================

# Export all config classes for easy import
__all__ = [
    "AIConfig",
    "DatabaseConfig",
    "BackgroundTaskConfig",
    "FileConfig",
    "AuthConfig",
    "APIConfig",
    "LoggingConfig",
    "AppConfig",
    "ValidationConfig",
    "AIUsageConfig",
    "OpenAIPricing",
]


# ============================================================================
# Convenience Functions
# ============================================================================


def get_config_dict() -> Dict[str, Any]:
    """Get all configuration as a dictionary (useful for debugging)"""
    return {
        "ai": {
            "model": AIConfig.OPENAI_MODEL,
            "enabled": AIConfig.is_enabled(),
            "max_tokens": AIConfig.MAX_TOKENS,
        },
        "database": {
            "url": DatabaseConfig.DATABASE_URL,
        },
        "background_tasks": {
            "workers": BackgroundTaskConfig.WORKERS,
        },
        "file": {
            "max_size": FileConfig.MAX_FILE_SIZE,
        },
        "app": {
            "environment": AppConfig.ENVIRONMENT,
            "debug": AppConfig.DEBUG,
        },
    }


def validate_config() -> list:
    """Validate configuration and return list of warnings/errors"""
    warnings = []

    if not AIConfig.OPENAI_API_KEY or AIConfig.OPENAI_API_KEY == "your-openai-key-here":
        warnings.append("OPENAI_API_KEY not configured - AI features will be disabled")

    if not AIConfig.OPENAI_MODEL:
        warnings.append("OPENAI_MODEL not configured in .env - REQUIRED for AI features")

    if not AIConfig.OPENAI_PARSING_MODEL:
        warnings.append(
            "OPENAI_PARSING_MODEL not configured in .env - REQUIRED for CV and job description parsing"
        )

    if not AIConfig.AGENT_MODEL:
        warnings.append(
            "AGENT_MODEL not configured in .env - Optional (reserved for future agent features)"
        )

    if not AuthConfig.CLERK_SECRET_KEY:
        warnings.append("CLERK_SECRET_KEY not configured - authentication may fail")

    if (
        AuthConfig.JWT_SECRET_KEY == "your-secret-key-change-in-production"
        and AppConfig.is_production()
    ):
        warnings.append(
            "JWT_SECRET_KEY using default value in production - SECURITY RISK"
        )

    if AppConfig.is_production() and AppConfig.DEBUG:
        warnings.append("DEBUG mode enabled in production - not recommended")

    return warnings
