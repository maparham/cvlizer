"""
Middleware to set user_id in request state for rate limiting.

This middleware extracts the user ID from authenticated requests and sets it
in request.state for use by the combined rate limiting system.
"""

import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from src.middleware.clerk_auth import verify_clerk_token
from src.models.base import SessionLocal

logger = logging.getLogger(__name__)


class RateLimitUserMiddleware(BaseHTTPMiddleware):
    """
    Middleware to set user_id in request state for rate limiting.

    This middleware runs before rate limiting to ensure user_id is available
    for the combined IP + user ID rate limiting system.

    Note: We manually extract the user ID here because FastAPI dependency
    injection is not available at the middleware level.
    """

    async def dispatch(self, request: Request, call_next):
        """
        Extract user ID and set in request state.

        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain

        Returns:
            Response from next handler
        """
        try:
            # Get authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")

                # Verify the Clerk token and extract user ID
                payload = verify_clerk_token(token)
                if payload and payload.get("sub"):
                    clerk_user_id = payload.get("sub")

                    # Check for impersonation session cookie
                    impersonation_cookie = getattr(request, "cookies", {}).get(
                        "impersonation_session"
                    )

                    if impersonation_cookie:
                        # Check if this is a valid impersonation session
                        db = SessionLocal()
                        try:
                            from src.services.impersonation_service import (
                                validate_session,
                            )

                            # Get client metadata for validation
                            admin_ip = None
                            admin_user_agent = None
                            if hasattr(request, "headers"):
                                forwarded_for = request.headers.get("X-Forwarded-For")
                                if forwarded_for:
                                    admin_ip = forwarded_for.split(",")[0].strip()
                                elif hasattr(request, "client") and request.client:
                                    admin_ip = request.client.host
                                admin_user_agent = request.headers.get("User-Agent")

                            session = validate_session(
                                db, impersonation_cookie, admin_ip, admin_user_agent
                            )

                            if session and session.is_active:
                                # Use impersonated user's ID for rate limiting
                                request.state.user_id = session.impersonated_user_id
                            else:
                                # Invalid/expired session - use original user ID
                                request.state.user_id = clerk_user_id
                                logger.warning(
                                    f"Invalid or expired impersonation session for user: {clerk_user_id}"
                                )
                        finally:
                            db.close()
                    else:
                        # No impersonation - use clerk_user_id directly from token
                        # Note: We use clerk_user_id for performance (avoids DB query)
                        # The actual User.id will be set during auth
                        request.state.user_id = clerk_user_id
                else:
                    logger.debug("Invalid or missing token payload")
            else:
                # No auth header - this is normal for unauthenticated requests
                pass

        except Exception as e:
            # If user extraction fails, treat as unauthenticated (no user_id set)
            logger.warning(f"Failed to extract user for rate limiting: {e}")

        # Continue to next middleware/handler
        response = await call_next(request)
        return response
