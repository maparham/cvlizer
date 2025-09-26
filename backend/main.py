"""
Main FastAPI application for CV optimization service.

This module sets up the FastAPI application with CORS middleware, 
static file serving, and includes all API routers for authentication,
CV management, job descriptions, and AI features.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
from dotenv import load_dotenv
import logging
import asyncio
import contextlib

# Optional rate limiting - only import if available
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False

# Import API routers
from src.api.auth import router as auth_router
from src.api.cvs import router as cvs_router
from src.api.job_descriptions import router as job_descriptions_router
from src.api.ai import router as ai_router
from src.api.cv_history import router as cv_history_router
from src.api.admin import router as admin_router
from src.api.user_activities import router as user_activities_router
from src.api.impersonation import router as impersonation_router, auth_router as impersonation_auth_router

# Import services for startup cleanup
from src.services.cleanup_service import start_cleanup_service, stop_cleanup_service

# Import middleware
from src.middleware.impersonation_headers import ImpersonationHeadersMiddleware

load_dotenv()
logger = logging.getLogger("uvicorn.error")

def _is_truthy(val: str) -> bool:
    return str(val).lower() in {"1", "true", "yes", "on"}

DEV_MODE = _is_truthy(os.getenv("DEV_MODE", "true"))

app = FastAPI(
    title="CV Optimization API",
    description="API for CV upload, parsing, editing, and AI-enhanced optimization",
    version="1.0.0"
)

# Add rate limiting if available
if SLOWAPI_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add impersonation headers middleware
app.add_middleware(ImpersonationHeadersMiddleware)

# CORS middleware (configurable origins)
cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
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
app.include_router(user_activities_router)
app.include_router(impersonation_router)
app.include_router(impersonation_auth_router)

@app.get("/")
async def root():
    return {"message": "CV Optimization API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    """Startup tasks: config validation, initial cleanup, schedule periodic jobs."""
    # Fail fast on missing/placeholder secrets in non-dev
    if not DEV_MODE:
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        clerk_key = os.getenv("CLERK_SECRET_KEY")
        if not jwt_secret or jwt_secret in {"your-secret-key-here", "your-secret-key-here-change-in-production"}:
            raise RuntimeError("JWT_SECRET_KEY is missing or placeholder in non-dev mode")
        if not openai_key:
            raise RuntimeError("OPENAI_API_KEY is missing in non-dev mode")
        if not clerk_key or clerk_key == "sk_test_your_secret_key_from_clerk_dashboard":
            raise RuntimeError("CLERK_SECRET_KEY is missing or placeholder in non-dev mode")
    try:
        # Database initialization and table creation
        from src.database import create_tables
        from src.models.base import get_db
        
        # Ensure all tables are created
        create_tables()
        logger.info("Database tables created/verified successfully")
        
        # Verify database connection
        db = next(get_db())
        db.close()
        logger.info("Database connection verified successfully")
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
    logger.warning(f"HTTP {exc.status_code} {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"message": "Internal server error"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
