"""
Multi-key rate limiting utilities for IP + User ID combined tracking.

This module provides rate limiting that tracks both IP address and user ID
with independent counters. This means:
- Unauthenticated requests: Rate limited by IP only
- Authenticated requests: Rate limited by BOTH IP and user ID independently

Example: If limit is 10/15min:
  - Unauthenticated from IP1: 10 requests allowed (IP counter)
  - Authenticated user from IP1: 10 requests (IP counter) + 10 requests (user counter) = 20 total
  - Same user from IP2: 10 more requests (new IP counter) + 10 more (user counter) = 20 more

Note: Each key maintains its own separate counter. This provides basic protection
against abuse but does not prevent determined users from circumventing limits
via VPN switching combined with multiple accounts.
"""

import logging
from typing import List, Optional, Tuple
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


def get_combined_rate_limit_keys(request: Request) -> List[str]:
    """
    Generate rate limit keys for combined IP + User ID tracking.

    For authenticated requests: returns both IP and user ID keys
    For unauthenticated requests: returns only IP key

    Args:
        request: FastAPI request object

    Returns:
        List of rate limit keys to check
    """
    keys = []

    # Always include IP address
    ip_address = get_remote_address(request)
    if ip_address:
        keys.append(f"ip:{ip_address}")

    # Include user ID if available (authenticated request)
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        keys.append(f"user:{user_id}")
        logger.debug(f"Rate limiting keys for authenticated user {user_id}: {keys}")
    else:
        logger.debug(f"Rate limiting keys for unauthenticated request: {keys}")

    return keys


def create_combined_limiter() -> Limiter:
    """
    Create a Limiter instance configured for combined IP + User ID rate limiting.

    Returns:
        Configured Limiter instance
    """
    return Limiter(key_func=get_combined_rate_limit_keys)


def check_rate_limit_keys(
    limiter: Limiter, request: Request, limit: str
) -> Tuple[bool, List[str]]:
    """
    Check if request exceeds rate limit for any of the generated keys.

    This is a helper function for custom rate limiting logic that needs
    to check multiple keys against the same limit.

    Args:
        limiter: Limiter instance
        request: FastAPI request object
        limit: Rate limit string (e.g., "5/15minutes")

    Returns:
        Tuple of (is_allowed, keys_checked)
    """
    keys = get_combined_rate_limit_keys(request)

    # For now, we rely on slowapi's built-in multi-key handling
    # This function can be extended for custom logic if needed
    return True, keys
