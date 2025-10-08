"""
Application Configuration Module

This module centralizes all configuration constants used throughout the backend.
Values are read from environment variables with sensible defaults.
"""
import os
from typing import Dict, Any
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
    
    # Agent Model Configuration (for job description parsing)
    AGENT_MODEL: str = os.getenv("AGENT_MODEL")  # Required: Must be set in .env
    AGENT_PROCESSING_TIER: str = os.getenv("AGENT_PROCESSING_TIER", "flex")  # Processing tier: "flex" or "standard"

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
    POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
    MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))


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
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
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
    USER_INFO_CACHE_TTL_SECONDS: int = int(os.getenv("USER_INFO_CACHE_TTL", "300"))  # 5 minutes


# ============================================================================
# API Configuration
# ============================================================================

class APIConfig:
    """API related configuration"""

    # CORS
    CORS_ALLOW_ORIGINS: list = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

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
        "LOG_FORMAT",
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
    MODEL_PRICING: Dict[str, Dict[str, float]] = {
        "gpt-4o-mini": {
            "input_price_per_1m": 0.150,
            "output_price_per_1m": 0.600
        },
        "gpt-4o": {
            "input_price_per_1m": 2.50,
            "output_price_per_1m": 10.00
        },
        "gpt-3.5-turbo": {
            "input_price_per_1m": 0.50,
            "output_price_per_1m": 1.50
        },
        "gpt-5-mini": {
            "input_price_per_1m": 0.250,
            "output_price_per_1m": 2.000
        },
        "gpt-5-nano": {
            "input_price_per_1m": 0.050,
            "output_price_per_1m": 0.400
        }
    }

    # Default pricing for unknown models
    DEFAULT_INPUT_PRICE_PER_1M: float = 0.150
    DEFAULT_OUTPUT_PRICE_PER_1M: float = 0.600

    # Usage limits
    USAGE_TRACKING_ENABLED: bool = os.getenv("USAGE_TRACKING_ENABLED", "true").lower() == "true"
    MAX_TOKENS_PER_USER_PER_DAY: int = int(os.getenv("MAX_TOKENS_PER_USER_DAY", "100000"))


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
        }
    }


def validate_config() -> list:
    """Validate configuration and return list of warnings/errors"""
    warnings = []

    if not AIConfig.OPENAI_API_KEY or AIConfig.OPENAI_API_KEY == "your-openai-key-here":
        warnings.append("OPENAI_API_KEY not configured - AI features will be disabled")

    if not AIConfig.OPENAI_MODEL:
        warnings.append("OPENAI_MODEL not configured in .env - REQUIRED for AI features")
    
    if not AIConfig.AGENT_MODEL:
        warnings.append("AGENT_MODEL not configured in .env - REQUIRED for job description parsing")

    if not AuthConfig.CLERK_SECRET_KEY:
        warnings.append("CLERK_SECRET_KEY not configured - authentication may fail")

    if AuthConfig.JWT_SECRET_KEY == "your-secret-key-change-in-production" and AppConfig.is_production():
        warnings.append("JWT_SECRET_KEY using default value in production - SECURITY RISK")

    if AppConfig.is_production() and AppConfig.DEBUG:
        warnings.append("DEBUG mode enabled in production - not recommended")

    return warnings
