"""
CV Management API - Unified Router

This module aggregates all CV-related API endpoints into a single router
for backward compatibility with existing imports.

The CV API is split into logical modules:
- upload: File upload and parsing
- crud: CRUD operations
- export: PDF/LaTeX export
- preview: Preview generation
"""

from fastapi import APIRouter

from .upload import router as upload_router
from .crud import router as crud_router
from .export import router as export_router
from .preview import router as preview_router

# Create unified router with same prefix as original
router = APIRouter(prefix="/api/cvs", tags=["cvs"])

# Include all sub-routers (no additional prefix needed as they use relative paths)
router.include_router(upload_router)
router.include_router(crud_router)
router.include_router(export_router)
router.include_router(preview_router)
