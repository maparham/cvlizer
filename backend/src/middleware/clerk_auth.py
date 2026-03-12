"""
Clerk authentication middleware for FastAPI.

This module provides authentication using Clerk JWT tokens and user synchronization
with the local database.
"""

import base64
import json
import logging
import os
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, NamedTuple, Optional, Tuple

import requests
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from sqlalchemy.orm import Session

from src.models.base import get_db
from src.models.user import User
from src.services.auth_service import ALGORITHM as APP_JWT_ALG
from src.services.auth_service import SECRET_KEY as APP_JWT_SECRET
from src.services.clerk_sync_service import sync_clerk_user_to_local_db

load_dotenv()

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


class UserNotFoundInClerkError(Exception):
    """Raised when Clerk API returns 404 for a user (e.g. user deleted in Clerk)."""

    def __init__(self, clerk_user_id: str) -> None:
        self.clerk_user_id = clerk_user_id
        super().__init__(f"User {clerk_user_id} not found in Clerk")


# Auth mode configuration
def _is_truthy(val: Optional[str]) -> bool:
    return str(val).lower() in {"1", "true", "yes", "on"}


DEV_MODE = _is_truthy(os.getenv("DEV_MODE", "true"))
VERIFY_TOKENS = _is_truthy(os.getenv("CLERK_VERIFY_TOKENS", "true"))

# JWKS and claims configuration for production verification
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")
CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE")


def is_admin_user(user: User) -> bool:
    """
    Check if the current user has admin privileges.
    Admin user is configured via ADMIN_EMAIL environment variable.
    """
    admin_email = os.getenv("ADMIN_EMAIL")

    if not admin_email:
        logger.warning(
            "ADMIN_EMAIL environment variable not set. No admin access available."
        )
        return False

    # Strict email matching (case insensitive) and ensure user is active
    is_admin = (
        user.email.lower().strip() == admin_email.lower().strip() and user.is_active
    )

    if not is_admin:
        logger.warning(f"Admin access denied for {user.email} (expected: {admin_email})")

    return is_admin


CLERK_API_URL = "https://api.clerk.com/v1"

if (
    not CLERK_SECRET_KEY
    or CLERK_SECRET_KEY == "sk_test_your_secret_key_from_clerk_dashboard"
):
    logger.warning(
        "CLERK_SECRET_KEY is not set or is a placeholder. Clerk API calls will fail."
    )
    CLERK_SECRET_KEY = None

security = HTTPBearer()

# Cache for Clerk user info to avoid repeated API calls
_clerk_user_cache = {}
_cache_ttl = 300  # 5 minutes cache TTL


def get_clerk_user_info(clerk_user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches user information from the Clerk Backend API with caching.
    """
    if not CLERK_SECRET_KEY:
        logger.error(
            "CLERK_SECRET_KEY is not configured. Cannot fetch user info from Clerk API."
        )
        return None

    # Check cache first
    current_time = time.time()
    if clerk_user_id in _clerk_user_cache:
        cached_data, timestamp = _clerk_user_cache[clerk_user_id]
        if current_time - timestamp < _cache_ttl:
            return cached_data
        else:
            # Remove expired cache entry
            del _clerk_user_cache[clerk_user_id]

    try:
        headers = {
            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        response = requests.get(
            f"{CLERK_API_URL}/users/{clerk_user_id}", headers=headers, timeout=5
        )  # Reduced timeout
        response.raise_for_status()
        user_data = response.json()

        # Cache the result
        _clerk_user_cache[clerk_user_id] = (user_data, current_time)

        return user_data
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching user {clerk_user_id} from Clerk API")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error fetching user {clerk_user_id} from Clerk API")
        return None
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logger.warning(f"User {clerk_user_id} not found in Clerk API")
            raise UserNotFoundInClerkError(clerk_user_id) from e
        elif e.response.status_code == 401:
            logger.error(f"Unauthorized access to Clerk API - check CLERK_SECRET_KEY")
        else:
            logger.error(
                f"HTTP error {e.response.status_code} fetching user {clerk_user_id} from Clerk API: {e}"
            )
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error fetching user {clerk_user_id} from Clerk API: {e}")
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error fetching user {clerk_user_id} from Clerk API: {e}"
        )
        return None


# --- JWKS support (production verification) ---
_jwks_cache: Dict[str, Any] = {}
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS = 900  # 15 minutes


def _b64url_to_int(b: str) -> int:
    padded = b + "=" * (-len(b) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(padded.encode("utf-8")), "big")


def _load_jwks() -> Dict[str, Any]:
    global _jwks_cache, _jwks_cache_time
    if not CLERK_JWKS_URL:
        raise RuntimeError("CLERK_JWKS_URL is not configured")
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    resp = requests.get(CLERK_JWKS_URL, timeout=5)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict) or "keys" not in data:
        raise ValueError("Invalid JWKS received from Clerk")
    _jwks_cache = data
    _jwks_cache_time = now
    return _jwks_cache


def _get_public_key_for_kid(kid: str) -> Tuple[Optional[Any], Optional[str]]:
    """Return (public_key, alg) for the given kid from JWKS, or (None, None)."""
    try:
        jwks = _load_jwks()
        for k in jwks.get("keys", []):
            if k.get("kid") == kid and k.get("kty") == "RSA":
                n = _b64url_to_int(k.get("n"))
                e = _b64url_to_int(k.get("e"))
                public_numbers = rsa.RSAPublicNumbers(e, n)
                public_key = public_numbers.public_key(default_backend())
                return public_key, k.get("alg", "RS256")
    except Exception as e:
        logger.error(f"Failed to get public key for kid={kid}: {e}")
    return None, None


def _should_use_dev_bypass() -> bool:
    # Bypass only when explicitly in dev and verification isn't required
    if not VERIFY_TOKENS and DEV_MODE:
        return True
    # If required config is missing and we're in dev, allow bypass to keep local DX
    required = all([CLERK_JWKS_URL, CLERK_ISSUER, CLERK_AUDIENCE])
    if DEV_MODE and not required:
        logger.warning(
            "DEV_MODE enabled and JWKS config missing; using dev-only token decode bypass."
        )
        return True
    return False


def verify_clerk_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a Clerk JWT token and return the payload.

    Behavior:
    - In production (or when verification is enabled): verify signature via Clerk JWKS and validate claims.
    - In development, if verification config is missing and DEV_MODE=true: fall back to base64 decode (insecure, for local only).
    """
    # 1) Try dev bypass if allowed
    if _should_use_dev_bypass():
        try:
            parts = token.split(".")
            if len(parts) != 3:
                logger.error("Invalid JWT format")
                return None
            payload_part = parts[1] + "=" * (-len(parts[1]) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_part)
            payload = json.loads(payload_bytes.decode("utf-8"))
            if not payload.get("sub"):
                logger.error("Token missing 'sub' claim")
                return None
            logger.warning(
                "Using DEV_MODE token decode bypass. Do NOT use in production."
            )
            return payload
        except Exception as e:
            logger.error(f"Dev bypass decode failed: {e}")
            return None

    # 2) Attempt Clerk JWKS verification
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg") or "RS256"
        if not kid:
            raise ValueError("Missing 'kid' in JWT header")
        public_key, resolved_alg = _get_public_key_for_kid(kid)
        if not public_key:
            raise ValueError("Unable to resolve public key for token")
        alg_to_use = resolved_alg or alg
        options = {"verify_aud": bool(CLERK_AUDIENCE)}
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg_to_use],
            audience=CLERK_AUDIENCE if CLERK_AUDIENCE else None,
            issuer=CLERK_ISSUER if CLERK_ISSUER else None,
            options=options,
        )
        return payload
    except Exception as e:
        logger.error(f"Clerk JWKS verification failed: {e}")

    return None


def _resolve_email_for_sync(
    clerk_user_id: str,
    token_email: Optional[str],
    db: Session,
) -> Optional[str]:
    """
    Resolve email for syncing a Clerk user to the local database.

    Tries, in order: token email, dev shortcut for known admin, Clerk API,
    existing DB user email, placeholder. Used by both full and lightweight
    auth paths when user must be created or looked up.
    """
    if token_email:
        return token_email
    # Dev-only shortcut for a known admin user (unchanged behavior)
    if clerk_user_id == "user_331BlH2Mot9pY0CpTAA5uktAIxk":
        return "mahmoud.shahrud@gmail.com"
    # Only attempt Clerk API call if backend secret is configured
    if CLERK_SECRET_KEY:
        try:
            clerk_user_info = get_clerk_user_info(clerk_user_id)
            if clerk_user_info and clerk_user_info.get("email_addresses"):
                email_addresses = clerk_user_info.get("email_addresses", [])
                primary_email_id = clerk_user_info.get("primary_email_address_id")
                for email_addr in email_addresses:
                    if email_addr.get("id") == primary_email_id:
                        return email_addr.get("email_address")
            else:
                logger.warning(
                    f"No email addresses found in Clerk API response for user {clerk_user_id}"
                )
        except Exception as e:
            logger.error(
                f"Failed to fetch user info from Clerk API for {clerk_user_id}: {str(e)}"
            )
    # Check if user already exists in database with a real email
    existing_user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
    if existing_user and not existing_user.email.endswith("@clerk.placeholder"):
        logger.info(
            f"Using existing email {existing_user.email} from database for Clerk user {clerk_user_id}"
        )
        return existing_user.email
    # Fallback placeholder (development convenience) - but log this as an error
    try:
        suffix = clerk_user_id.split("_")[1]
        placeholder = f"user_{suffix}@clerk.placeholder"
        logger.error(
            f"Using placeholder email {placeholder} for Clerk user {clerk_user_id} - this indicates a configuration issue"
        )
        return placeholder
    except Exception:
        logger.error(
            f"Failed to generate even placeholder email for Clerk user {clerk_user_id}"
        )
        return None


def get_current_user_from_clerk(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from Clerk token.

    This function:
    1. Validates the Clerk JWT token
    2. Extracts user information
    3. Syncs the user to local database if needed
    4. Returns the local User object
    """
    token = credentials.credentials

    # Verify the Clerk token
    payload = verify_clerk_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user information from token
    clerk_user_id = payload.get("sub")
    email = payload.get("email")

    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = _resolve_email_for_sync(clerk_user_id, email, db)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to determine user email",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch Clerk user info once; used to detect deleted users and to build sync data
    clerk_user_info = None
    try:
        clerk_user_info = get_clerk_user_info(clerk_user_id) if CLERK_SECRET_KEY else None
    except UserNotFoundInClerkError:
        # User was deleted in Clerk; do not sync. Reject so frontend can log out.
        existing_local = db.query(User).filter(User.clerk_id == clerk_user_id).first()
        if existing_local:
            logger.warning(
                f"User {clerk_user_id} exists locally but was deleted in Clerk - rejecting auth"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists in Clerk",
            headers={"WWW-Authenticate": "Bearer"},
        )

    existing_local = db.query(User).filter(User.clerk_id == clerk_user_id).first()
    if clerk_user_info is None and existing_local:
        # Clerk unreachable (timeout/error) but we have a local user; allow login without syncing
        if not existing_local.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
            )
        return existing_local

    # Build additional data when we have Clerk info; then sync (create or update)
    additional_data = {}
    if clerk_user_info:
        if "last_sign_in_at" in clerk_user_info:
            additional_data["last_sign_in_at"] = clerk_user_info["last_sign_in_at"]
        if "email_addresses" in clerk_user_info and clerk_user_info["email_addresses"]:
            primary_email_id = clerk_user_info.get("primary_email_address_id")
            for email_addr in clerk_user_info["email_addresses"]:
                if (
                    email_addr.get("id") == primary_email_id
                    and "verification" in email_addr
                ):
                    additional_data["email_verified"] = (
                        email_addr["verification"].get("status") == "verified"
                    )
                    break

    try:
        user = sync_clerk_user_to_local_db(
            clerk_user_id=clerk_user_id,
            email=email,
            db=db,
            additional_data=additional_data,
        )
    except RuntimeError as e:
        logger.error(f"Error syncing user with authentication provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error syncing user with authentication provider",
        ) from e
    except Exception as e:
        logger.error(f"Error getting/creating user from Clerk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication",
        ) from e

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    return user


def fix_placeholder_emails(db: Session) -> int:
    """
    Fix users with placeholder emails by fetching real emails from Clerk API.
    This is a utility function to clean up existing users with @clerk.placeholder emails.

    Returns:
        int: Number of users updated
    """
    if not CLERK_SECRET_KEY:
        logger.error("CLERK_SECRET_KEY is not configured. Cannot fix placeholder emails.")
        return 0

    try:
        # Find users with placeholder emails
        placeholder_users = (
            db.query(User)
            .filter(User.email.like("%@clerk.placeholder"), User.clerk_id.isnot(None))
            .all()
        )

        updated_count = 0
        for user in placeholder_users:
            try:
                clerk_user_info = get_clerk_user_info(user.clerk_id)
                if clerk_user_info and clerk_user_info.get("email_addresses"):
                    email_addresses = clerk_user_info.get("email_addresses", [])
                    primary_email_id = clerk_user_info.get("primary_email_address_id")
                    for email_addr in email_addresses:
                        if email_addr.get("id") == primary_email_id:
                            new_email = email_addr.get("email_address")
                            if new_email and new_email != user.email:
                                # Check if this email is already taken by another user
                                existing_user = (
                                    db.query(User)
                                    .filter(User.email == new_email, User.id != user.id)
                                    .first()
                                )
                                if not existing_user:
                                    user.email = new_email
                                    user.updated_at = datetime.now(timezone.utc)
                                    updated_count += 1
                                    logger.info(
                                        f"Updated user {user.clerk_id} email from {user.email} to {new_email}"
                                    )
                                else:
                                    logger.warning(
                                        f"Email {new_email} is already taken by another user"
                                    )
                            break
            except Exception as e:
                logger.error(
                    f"Failed to fix placeholder email for user {user.clerk_id}: {e}"
                )

        if updated_count > 0:
            db.commit()
            logger.info(f"Fixed {updated_count} placeholder emails")

        return updated_count

    except Exception as e:
        logger.error(f"Error fixing placeholder emails: {e}")
        db.rollback()
        return 0


# Impersonation support


class AuthContext(NamedTuple):
    """Authentication context with impersonation support."""

    effective_user: User  # The user whose permissions are being used
    original_user: User  # The actual authenticated user (admin during impersonation)
    is_impersonating: bool


def get_current_user_with_impersonation(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    request: Optional[Any] = None,
) -> AuthContext:
    """
    Get the current authenticated user with impersonation support.

    This function:
    1. Validates the Clerk JWT token to get the original user
    2. Checks for impersonation session cookie
    3. Validates impersonation session if present
    4. Returns AuthContext with effective and original users

    During impersonation:
    - effective_user: The user being impersonated
    - original_user: The admin performing impersonation
    - is_impersonating: True

    Normal authentication:
    - effective_user: The authenticated user
    - original_user: Same as effective_user
    - is_impersonating: False
    """
    # Get the original authenticated user
    original_user = get_current_user_from_clerk(credentials, db)

    # If no request object, return normal auth context
    if not request:
        return AuthContext(
            effective_user=original_user,
            original_user=original_user,
            is_impersonating=False,
        )

    # Check for impersonation session cookie
    impersonation_cookie = getattr(request, "cookies", {}).get("impersonation_session")
    if not impersonation_cookie:
        return AuthContext(
            effective_user=original_user,
            original_user=original_user,
            is_impersonating=False,
        )

    # Validate impersonation session
    try:
        from src.services.impersonation_service import validate_session

        # Get client metadata for validation
        admin_ip = None
        admin_user_agent = None
        if hasattr(request, "headers"):
            # Extract IP from headers
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                admin_ip = forwarded_for.split(",")[0].strip()
            elif hasattr(request, "client") and request.client:
                admin_ip = request.client.host

            admin_user_agent = request.headers.get("User-Agent")

        session = validate_session(db, impersonation_cookie, admin_ip, admin_user_agent)
        if not session:
            # Invalid session, return normal auth context
            return AuthContext(
                effective_user=original_user,
                original_user=original_user,
                is_impersonating=False,
            )

        # Verify the original user is the admin for this session
        if original_user.id != session.admin_id:
            logger.warning(
                f"Impersonation session admin mismatch: token user {original_user.id}, session admin {session.admin_id}"
            )
            return AuthContext(
                effective_user=original_user,
                original_user=original_user,
                is_impersonating=False,
            )

        # Return impersonation context
        return AuthContext(
            effective_user=session.target_user,
            original_user=original_user,
            is_impersonating=True,
        )

    except Exception as e:
        logger.error(f"Error validating impersonation session: {str(e)}")
        # On error, return normal auth context
        return AuthContext(
            effective_user=original_user,
            original_user=original_user,
            is_impersonating=False,
        )


def get_effective_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the effective user (the user whose permissions should be used).

    This is a convenience function that returns just the effective user
    from the authentication context. Use this for most authorization checks.
    """
    auth_context = get_current_user_with_impersonation(credentials, db, request)
    return auth_context.effective_user


def require_admin_not_impersonating(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Require admin privileges and ensure not currently impersonating.

    This function should be used for admin-only operations that should
    not be available during impersonation (like starting new impersonation
    sessions or accessing sensitive admin functions).
    """
    auth_context = get_current_user_with_impersonation(credentials, db, request)

    if not is_admin_user(auth_context.original_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    if auth_context.is_impersonating:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin operations not available during impersonation",
        )

    return auth_context.original_user


def require_admin_allow_impersonating(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Require admin privileges but allow during impersonation.

    This function should be used for admin-only operations that need to
    be available during impersonation (like ending impersonation sessions).
    """
    auth_context = get_current_user_with_impersonation(credentials, db, request)

    if not is_admin_user(auth_context.original_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    return auth_context.original_user


# Alias for backward compatibility
def get_current_user_lightweight(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Lightweight user authentication for endpoints that don't need full user sync.

    Validates the Clerk JWT token, gets existing user from database, and returns
    the local User object. If the user is not yet in the local database (e.g.
    first request after sign-up), syncs them from Clerk so dashboard and
    high-frequency endpoints (impersonation status, CV list, job descriptions)
    work without redirect loops.
    """
    token = credentials.credentials

    # Verify the Clerk token
    payload = verify_clerk_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user information from token
    clerk_user_id = payload.get("sub")
    token_email = payload.get("email")

    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get existing user from database (no Clerk API calls when user exists)
    user = db.query(User).filter(User.clerk_id == clerk_user_id).first()

    if not user:
        # First request: sync user to local DB so we don't 401 and trigger redirect loop
        email = _resolve_email_for_sync(clerk_user_id, token_email, db)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to determine user email",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = sync_clerk_user_to_local_db(
            clerk_user_id=clerk_user_id,
            email=email,
            db=db,
            additional_data={},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    return user


def get_effective_user_lightweight(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the effective user (the user whose permissions should be used) with
    lightweight authentication and impersonation support.

    This function combines the performance benefits of get_current_user_lightweight
    (no expensive Clerk API calls) with impersonation cookie checking from
    get_effective_user. Perfect for CV and job description endpoints that need
    to work efficiently while respecting admin impersonation.

    During impersonation:
    - Returns the target user being impersonated
    - Admin's real identity is authenticated via JWT token

    Normal authentication:
    - Returns the authenticated user directly from database
    """
    # Get the original authenticated user (lightweight - no Clerk API calls)
    original_user = get_current_user_lightweight(credentials, db)

    # Check for impersonation session cookie
    impersonation_cookie = request.cookies.get("impersonation_session")
    if not impersonation_cookie:
        return original_user

    # Validate impersonation session
    try:
        from src.services.impersonation_service import validate_session

        # Get client metadata for validation
        admin_ip = None
        admin_user_agent = None
        if hasattr(request, "headers"):
            # Extract IP from headers
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                admin_ip = forwarded_for.split(",")[0].strip()
            elif hasattr(request, "client") and request.client:
                admin_ip = request.client.host

            admin_user_agent = request.headers.get("User-Agent")

        session = validate_session(db, impersonation_cookie, admin_ip, admin_user_agent)
        if not session:
            # Invalid session, return original user
            return original_user

        # Verify the original user is the admin for this session
        if original_user.id != session.admin_id:
            logger.warning(
                f"Impersonation session admin mismatch: token user {original_user.id}, session admin {session.admin_id}"
            )
            return original_user

        # Return impersonated user
        return session.target_user

    except Exception as e:
        logger.error(f"Error validating impersonation session: {str(e)}")
        # On error, return original user
        return original_user


get_current_user = get_current_user_from_clerk
