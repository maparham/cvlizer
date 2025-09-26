"""
Clerk authentication middleware for FastAPI.

This module provides authentication using Clerk JWT tokens and user synchronization
with the local database.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Tuple
import logging
import os
import requests
import base64
import json
import time
from dotenv import load_dotenv

from ..models.base import get_db
from ..models.user import User
from ..services.clerk_sync_service import sync_clerk_user_to_local_db
from ..services.auth_service import SECRET_KEY as APP_JWT_SECRET, ALGORITHM as APP_JWT_ALG
from datetime import datetime, timezone
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

load_dotenv()

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

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
        logger.warning("ADMIN_EMAIL environment variable not set. No admin access available.")
        return False
    
    is_admin = user.email == admin_email and user.is_active
    
    if is_admin:
        logger.info(f"Admin access granted for {user.email}")
    
    return is_admin
CLERK_API_URL = "https://api.clerk.com/v1"

if not CLERK_SECRET_KEY or CLERK_SECRET_KEY == "sk_test_your_secret_key_from_clerk_dashboard":
    logger.warning("CLERK_SECRET_KEY is not set or is a placeholder. Clerk API calls will fail.")
    CLERK_SECRET_KEY = None

security = HTTPBearer()


def get_clerk_user_info(clerk_user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches user information from the Clerk Backend API.
    """
    if not CLERK_SECRET_KEY:
        logger.error("CLERK_SECRET_KEY is not configured. Cannot fetch user info from Clerk API.")
        return None

    try:
        headers = {
            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{CLERK_API_URL}/users/{clerk_user_id}", headers=headers, timeout=10)
        response.raise_for_status()
        user_data = response.json()
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
        elif e.response.status_code == 401:
            logger.error(f"Unauthorized access to Clerk API - check CLERK_SECRET_KEY")
        else:
            logger.error(f"HTTP error {e.response.status_code} fetching user {clerk_user_id} from Clerk API: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error fetching user {clerk_user_id} from Clerk API: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching user {clerk_user_id} from Clerk API: {e}")
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
        logger.warning("DEV_MODE enabled and JWKS config missing; using dev-only token decode bypass.")
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
            parts = token.split('.')
            if len(parts) != 3:
                logger.error("Invalid JWT format")
                return None
            payload_part = parts[1] + '=' * (-len(parts[1]) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_part)
            payload = json.loads(payload_bytes.decode('utf-8'))
            if not payload.get("sub"):
                logger.error("Token missing 'sub' claim")
                return None
            logger.warning("Using DEV_MODE token decode bypass. Do NOT use in production.")
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


def get_current_user_from_clerk(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
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

    # If email not present (typical for Clerk tokens), fetch via Clerk API
    if not email:
        email = None
        # Dev-only shortcut for a known admin user (unchanged behavior)
        if clerk_user_id == "user_331BlH2Mot9pY0CpTAA5uktAIxk":
            email = "mahmoud.shahrud@gmail.com"
        else:
            # Only attempt Clerk API call if backend secret is configured
            if CLERK_SECRET_KEY:
                try:
                    clerk_user_info = get_clerk_user_info(clerk_user_id)
                    if clerk_user_info and clerk_user_info.get("email_addresses"):
                        email_addresses = clerk_user_info.get("email_addresses", [])
                        primary_email_id = clerk_user_info.get("primary_email_address_id")
                        for email_addr in email_addresses:
                            if email_addr.get("id") == primary_email_id:
                                email = email_addr.get("email_address")
                                logger.info(f"Successfully retrieved email {email} for Clerk user {clerk_user_id}")
                                break
                    else:
                        logger.warning(f"No email addresses found in Clerk API response for user {clerk_user_id}")
                except Exception as e:
                    logger.error(f"Failed to fetch user info from Clerk API for {clerk_user_id}: {str(e)}")
            
            if not email:
                # Check if user already exists in database with a real email
                existing_user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
                if existing_user and not existing_user.email.endswith("@clerk.placeholder"):
                    email = existing_user.email
                    logger.info(f"Using existing email {email} from database for Clerk user {clerk_user_id}")
                else:
                    # Fallback placeholder (development convenience) - but log this as an error
                    try:
                        suffix = clerk_user_id.split('_')[1]
                        email = f"user_{suffix}@clerk.placeholder"
                        logger.error(f"Using placeholder email {email} for Clerk user {clerk_user_id} - this indicates a configuration issue")
                    except Exception:
                        email = None
                        logger.error(f"Failed to generate even placeholder email for Clerk user {clerk_user_id}")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to determine user email",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Regular Clerk token handling
        # Get additional user data from Clerk API to include last sign-in
        additional_data = {}
        clerk_user_info = get_clerk_user_info(clerk_user_id) if CLERK_SECRET_KEY else None
        
        if clerk_user_info:
            # Extract last sign-in time
            if 'last_sign_in_at' in clerk_user_info:
                additional_data['last_sign_in_at'] = clerk_user_info['last_sign_in_at']
            
            # Extract email verification status
            if 'email_addresses' in clerk_user_info and clerk_user_info['email_addresses']:
                primary_email_id = clerk_user_info.get('primary_email_address_id')
                for email_addr in clerk_user_info['email_addresses']:
                    if email_addr.get('id') == primary_email_id and 'verification' in email_addr:
                        additional_data['email_verified'] = email_addr['verification'].get('status') == 'verified'
                        break
        
        # Get or create user in local database with additional data
        user = sync_clerk_user_to_local_db(
            clerk_user_id=clerk_user_id,
            email=email,
            db=db,
            additional_data=additional_data
        )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Error getting/creating user from Clerk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication"
        )


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
        placeholder_users = db.query(User).filter(
            User.email.like("%@clerk.placeholder"),
            User.clerk_id.isnot(None)
        ).all()
        
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
                                existing_user = db.query(User).filter(
                                    User.email == new_email,
                                    User.id != user.id
                                ).first()
                                if not existing_user:
                                    user.email = new_email
                                    user.updated_at = datetime.utcnow()
                                    updated_count += 1
                                    logger.info(f"Updated user {user.clerk_id} email from {user.email} to {new_email}")
                                else:
                                    logger.warning(f"Email {new_email} is already taken by another user")
                            break
            except Exception as e:
                logger.error(f"Failed to fix placeholder email for user {user.clerk_id}: {e}")
        
        if updated_count > 0:
            db.commit()
            logger.info(f"Fixed {updated_count} placeholder emails")
        
        return updated_count
        
    except Exception as e:
        logger.error(f"Error fixing placeholder emails: {e}")
        db.rollback()
        return 0


# Alias for backward compatibility
get_current_user = get_current_user_from_clerk
