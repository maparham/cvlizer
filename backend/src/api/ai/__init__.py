"""
AI API module.

This module combines all AI-related API endpoints into a single router
for backward compatibility while maintaining modular organization.
"""

from fastapi import APIRouter

# Import all sub-routers
from . import (
    ai_sections,
    ai_suggestions,
    drafts,
)

# Create main router
router = APIRouter(prefix="/api", tags=["ai"])

# Include all sub-routers
router.include_router(ai_sections.router)
router.include_router(ai_suggestions.router)
router.include_router(drafts.router)

# Re-export for backward compatibility
__all__ = ["router"]
