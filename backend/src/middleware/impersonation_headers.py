"""
Impersonation Headers Middleware

This middleware adds observability headers to responses when an admin is
impersonating a user, providing clear indication of impersonation state
for debugging and monitoring purposes.

Key responsibilities:
- Detect active impersonation sessions from request context
- Add X-Impersonating and X-Impersonating-User headers to responses
- Ensure headers are only added during valid impersonation sessions
- Maintain performance by leveraging existing auth context
"""

import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.middleware.clerk_auth import get_current_user_with_impersonation
from src.models.base import get_db

logger = logging.getLogger(__name__)


class ImpersonationHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add impersonation headers to responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add impersonation headers if applicable."""
        response = await call_next(request)

        # Only add headers for successful responses
        if response.status_code >= 400:
            return response

        try:
            # Check if this is an authenticated request with impersonation
            # We need to be careful not to interfere with the auth flow
            if hasattr(request.state, "impersonation_context"):
                # If auth context was already established, use it
                auth_context = request.state.impersonation_context
                if auth_context.is_impersonating:
                    response.headers["X-Impersonating"] = "true"
                    response.headers[
                        "X-Impersonating-User"
                    ] = auth_context.effective_user.id
            else:
                # OPTIMIZATION: Skip expensive auth check for non-impersonation scenarios
                # Only check for impersonation cookie - if no cookie exists, skip the expensive API call
                impersonation_cookie = request.cookies.get("impersonation_session")

                if not impersonation_cookie:
                    # No impersonation cookie = no impersonation happening, skip expensive checks
                    return response

                # Only do expensive auth check if impersonation cookie exists
                try:
                    from fastapi.security import HTTPBearer

                    from src.models.base import get_db

                    security = HTTPBearer(auto_error=False)
                    credentials = await security(request)

                    if credentials:
                        db = next(get_db())
                        try:
                            auth_context = get_current_user_with_impersonation(
                                request, credentials, db
                            )

                            if auth_context.is_impersonating:
                                response.headers["X-Impersonating"] = "true"
                                response.headers[
                                    "X-Impersonating-User"
                                ] = auth_context.effective_user.id
                        finally:
                            db.close()
                except Exception:
                    # Don't let header addition break the response
                    pass

        except Exception as e:
            # Log error but don't break the response
            logger.debug(f"Error adding impersonation headers: {e}")

        return response
