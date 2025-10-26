"""
Quick Start API - Unauthenticated CV and Job Description Preview

This module provides endpoints for unauthenticated users to quickly try
the CV optimization service by uploading a CV and providing a job description
(URL or text). The data is parsed and returned as a preview without being
saved to the database.

Key responsibilities:
- Accept CV file upload and job description (URL or text) without authentication
- Parse both CV and job description using existing AI services
- Return preview data without persisting to database
- Apply IP-based rate limiting to prevent abuse
- Handle errors gracefully with detailed messages

Usage:
- Used by Quick Start wizard for first-time users
- Enables "try before you buy" experience
- Requires sign-in to save and use AI optimization features
"""

import logging

from fastapi import APIRouter

from src.utils.rate_limit import create_combined_limiter

# Import sub-routers
from . import claim, preview

# Create logger instance
logger = logging.getLogger(__name__)

# Create main router with prefix and tags
router = APIRouter(prefix="/api", tags=["quick-start"])

# Include all sub-routers (each sub-router has NO prefix, just tags)
router.include_router(preview.router, prefix="/quick-start")
router.include_router(claim.router, prefix="/quick-start")

# Export limiter from preview module for backward compatibility
limiter = preview.limiter

# Export for backward compatibility
__all__ = ["router", "limiter", "logger"]
