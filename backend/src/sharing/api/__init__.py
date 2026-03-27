"""
Public sharing HTTP API: unauthenticated public routes and authenticated share settings.
"""

from fastapi import APIRouter

from src.sharing.api.cv_public import router as cv_public_router
from src.sharing.api.jd_public import router as jd_public_router
from src.sharing.api.share_settings import router as share_settings_router

router = APIRouter(prefix="/api", tags=["public-shares"])

router.include_router(cv_public_router)
router.include_router(jd_public_router)
router.include_router(share_settings_router)
