"""
Helpers for building public share URLs (no route definitions).
"""

import os

from fastapi import HTTPException, Request, status


def is_truthy_env(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("1", "true", "yes", "on")


def public_frontend_url(request: Request, resource_type: str, token: str) -> str:
    """
    Base URL for public share links returned to authenticated clients.

    Precedence when DEV_MODE is true (local/staging):
    1. PUBLIC_FRONTEND_BASE_URL — explicit; avoids backend host in links
    2. Origin — browser calls to the API
    3. First CORS_ALLOW_ORIGINS entry
    4. request.base_url — last resort for curl/CLI

    When DEV_MODE is false (production): PUBLIC_FRONTEND_BASE_URL is required
    so share links never depend on accidental headers.
    """
    dev_mode = is_truthy_env(os.getenv("DEV_MODE", "true"))
    explicit = (os.getenv("PUBLIC_FRONTEND_BASE_URL", "") or "").strip().rstrip("/")

    if not dev_mode:
        if not explicit:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PUBLIC_FRONTEND_BASE_URL must be set when DEV_MODE is false",
            )
        base_url = explicit
    else:
        base_url = explicit
        if not base_url:
            base_url = (request.headers.get("origin") or "").strip().rstrip("/")
        if not base_url:
            cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "")
            if cors_origins:
                base_url = cors_origins.split(",")[0].strip().rstrip("/")
        if not base_url:
            base_url = str(request.base_url).rstrip("/")

    route_segment = "cv" if resource_type == "cv" else "jd"
    return f"{base_url}/public/{route_segment}/{token}"
