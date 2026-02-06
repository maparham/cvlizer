"""
Main FastAPI application for CV optimization service.

This module sets up the FastAPI application with CORS middleware,
static file serving, and includes all API routers for authentication,
CV management, job descriptions, and AI features.
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# Rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.admin import router as admin_router
from src.api.admin_ai_usage import router as admin_ai_usage_router
from src.api.ai import router as ai_router

# Import API routers
from src.api.auth import router as auth_router
from src.api.cv_history import router as cv_history_router
from src.api.cvs import router as cvs_router
from src.api.impersonation import auth_router as impersonation_auth_router
from src.api.impersonation import router as impersonation_router
from src.api.job_descriptions import router as job_descriptions_router
from src.api.quick_start import router as quick_start_router
from src.api.user_activities import router as user_activities_router

# Import middleware
from src.middleware.impersonation_headers import ImpersonationHeadersMiddleware
from src.middleware.rate_limit_user import RateLimitUserMiddleware

# Import rate limiting utilities
from src.utils.rate_limit import create_combined_limiter

# Import services for startup cleanup
from src.services.cleanup_service import (
    cancel_running_ai_tasks_on_startup,
    start_cleanup_service,
    stop_cleanup_service,
)

# Logging setup
from src.utils.logging_setup import setup_logging

# Configuration imports
from src.config import AIConfig

load_dotenv()

# Setup logging to both console and file
setup_logging()

# Suppress SQLite StaticPool connection reset errors
# These are harmless cleanup errors under high concurrency that don't affect functionality
logging.getLogger("sqlalchemy.pool.impl.StaticPool").setLevel(logging.CRITICAL)

logger = logging.getLogger("uvicorn.error")


def _is_truthy(val: str) -> bool:
    return str(val).lower() in {"1", "true", "yes", "on"}


DEV_MODE = _is_truthy(os.getenv("DEV_MODE", "true"))

app = FastAPI(
    title="CV Optimization API",
    description="API for CV upload, parsing, editing, and AI-enhanced optimization",
    version="1.0.0",
)

# Add rate limiting (always enabled, tracks both IP and user ID)
limiter = create_combined_limiter()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add rate limiting user middleware (must be before rate limiting)
app.add_middleware(RateLimitUserMiddleware)

# Add impersonation headers middleware
app.add_middleware(ImpersonationHeadersMiddleware)

# CORS middleware (configurable origins)
cors_origins = os.getenv(
    "CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]
if not DEV_MODE and any(o == "*" for o in cors_origins):
    raise RuntimeError("Unsafe CORS origin '*' is not allowed in non-dev mode")
logger.info(f"CORS allow_origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Do NOT mount uploads publicly; serve via authenticated endpoints only

# Include API routers
app.include_router(auth_router)
app.include_router(cvs_router)
app.include_router(job_descriptions_router)
app.include_router(ai_router)
app.include_router(cv_history_router)
app.include_router(admin_router)
app.include_router(admin_ai_usage_router)
app.include_router(user_activities_router)
app.include_router(impersonation_router)
app.include_router(impersonation_auth_router)
app.include_router(quick_start_router)


@app.get("/")
async def root():
    return {"message": "CV Optimization API is running!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Startup tasks: config validation, initial cleanup, schedule periodic jobs."""
    # Log AI model and effort configuration
    logger.info("=" * 60)
    logger.info("AI Configuration:")
    logger.info(f"  Model: {AIConfig.OPENAI_MODEL}")
    logger.info(f"  Parsing Model: {AIConfig.OPENAI_PARSING_MODEL}")
    logger.info(f"  Agent Model: {AIConfig.AGENT_MODEL}")
    logger.info(f"  Reasoning Effort: {AIConfig.REASONING_EFFORT}")
    logger.info(f"  Parsing Effort: {AIConfig.OPENAI_PARSING_EFFORT}")
    logger.info(
        f"  Agent Processing Tier: {AIConfig.AGENT_PROCESSING_TIER or '(not set)'}"
    )
    logger.info("=" * 60)

    # Fail fast on missing/placeholder secrets in non-dev
    if not DEV_MODE:
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        clerk_key = os.getenv("CLERK_SECRET_KEY")
        if not jwt_secret or jwt_secret in {
            "your-secret-key-here",
            "your-secret-key-here-change-in-production",
        }:
            raise RuntimeError("JWT_SECRET_KEY is missing or placeholder in non-dev mode")
        if not openai_key:
            raise RuntimeError("OPENAI_API_KEY is missing in non-dev mode")
        if not clerk_key or clerk_key == "sk_test_your_secret_key_from_clerk_dashboard":
            raise RuntimeError(
                "CLERK_SECRET_KEY is missing or placeholder in non-dev mode"
            )
    try:
        # Database initialization and table creation
        from src.database import create_tables
        from src.models.base import get_db, get_pool_status

        # Ensure all tables are created
        create_tables()
        logger.info("Database tables created/verified successfully")

        # Verify database connection
        db = next(get_db())
        db.close()
        logger.info("Database connection verified successfully")

        # Log connection pool configuration and status
        try:
            pool_status = get_pool_status()
            logger.info(f"Database connection pool status: {pool_status}")
        except Exception as pool_error:
            logger.warning(f"Could not retrieve pool status: {pool_error}")

        # Cancel all running AI tasks on startup (connections lost during restart)
        cancel_running_ai_tasks_on_startup()

    except Exception as e:
        logger.warning(f"Database initialization check failed: {e}")

    # Start cleanup service for background maintenance
    try:
        await start_cleanup_service()
        logger.info("Cleanup service started successfully")
    except Exception as e:
        logger.error(f"Failed to start cleanup service: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    try:
        await stop_cleanup_service()
        logger.info("Cleanup service stopped")
    except Exception as e:
        logger.error(f"Error stopping cleanup service: {e}")

    logger.info("Application shutting down")


# Global error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        f"HTTP {exc.status_code} {request.method} {request.url.path}: {exc.detail}"
    )
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"message": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
