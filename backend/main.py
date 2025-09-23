"""
Main FastAPI application for CV optimization service.

This module sets up the FastAPI application with CORS middleware, 
static file serving, and includes all API routers for authentication,
CV management, job descriptions, and AI features.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

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
# from src.api.clerk_webhooks import router as clerk_webhooks_router

load_dotenv()

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

# CORS middleware (configurable origins)
cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Mount static files for uploaded CVs with caching headers
app.mount("/uploads", StaticFiles(directory="uploads", html=True), name="uploads")

# Include API routers
app.include_router(auth_router)
app.include_router(cvs_router)
app.include_router(job_descriptions_router)
app.include_router(ai_router)
app.include_router(cv_history_router)
app.include_router(admin_router)
# app.include_router(clerk_webhooks_router)

@app.get("/")
async def root():
    return {"message": "CV Optimization API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
