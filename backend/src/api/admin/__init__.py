"""
Admin API module providing administrative endpoints for user management,
system statistics, diagnostics, and maintenance operations.

This module combines multiple sub-modules into a single unified router
with backward compatibility for existing imports.
"""

import logging

from fastapi import APIRouter

from . import activities, dashboard, diagnostics, job_description_cleanup, user_management

# Create logger and limiter instances
logger = logging.getLogger(__name__)

from src.utils.rate_limit import create_combined_limiter

limiter = create_combined_limiter()

# Create main router with prefix and tags
router = APIRouter(prefix="/admin", tags=["admin"])

# Include all sub-routers (each sub-router has NO prefix, just tags)
router.include_router(user_management.router)
router.include_router(dashboard.router)
router.include_router(activities.router)
router.include_router(diagnostics.router)
router.include_router(job_description_cleanup.router)

# Export for backward compatibility
__all__ = ["router", "limiter", "logger"]
