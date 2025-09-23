"""
Clerk authentication middleware for FastAPI.

This module provides authentication using Clerk JWT tokens and user synchronization
with the local database.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
import os
import requests
import base64
import json
from dotenv import load_dotenv

from ..models.base import get_db
from ..models.user import User
from ..services.clerk_sync_service import sync_clerk_user_to_local_db

load_dotenv()

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
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
        response = requests.get(f"{CLERK_API_URL}/users/{clerk_user_id}", headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching user {clerk_user_id} from Clerk API: {e}")
        return None


def verify_clerk_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Clerk JWT token and return the payload.
    """
    try:
        # For development, decode without verification using base64
        # TODO: Implement proper JWT verification for production
        import base64
        import json
        
        # Split the JWT token into parts
        parts = token.split('.')
        if len(parts) != 3:
            logger.error("Invalid JWT format")
            return None
        
        # Decode the payload (middle part)
        payload_part = parts[1]
        # Add padding if needed
        payload_part += '=' * (4 - len(payload_part) % 4)
        
        payload_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Basic validation
        if not payload.get("sub"):
            logger.error("Token missing 'sub' claim")
            return None
        
        # Clerk session tokens don't contain email - we need to fetch it from Clerk API
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            logger.error("Token missing user ID")
            return None
        
        # Try to get user info from Clerk API
        email = None
        
        # First try the hardcoded mapping for known admin user (development only)
        if clerk_user_id == "user_331BlH2Mot9pY0CpTAA5uktAIxk":
            email = "mahmoud.shahrud@gmail.com"
        else:
            # For other users, try to fetch from Clerk API
            clerk_user_info = get_clerk_user_info(clerk_user_id)
            
            if clerk_user_info and clerk_user_info.get("email_addresses"):
                # Get primary email from Clerk API response
                email_addresses = clerk_user_info.get("email_addresses", [])
                primary_email_id = clerk_user_info.get("primary_email_address_id")
                
                for email_addr in email_addresses:
                    if email_addr.get("id") == primary_email_id:
                        email = email_addr.get("email_address")
                        break
                
                if not email:
                    logger.error("Could not extract email from Clerk API response")
            else:
                logger.warning("Could not fetch user info from Clerk API, using fallback")
                # Fallback: create a placeholder email based on user ID
                email = f"user_{clerk_user_id.split('_')[1]}@clerk.placeholder"
        
        if not email:
            logger.error(f"Could not determine email for Clerk user: {clerk_user_id}")
            return None
        
        # Add email to payload
        payload["email"] = email
        payload["clerk_user_id"] = clerk_user_id
            
        return payload
        
    except Exception as e:
        logger.error(f"Error verifying Clerk token: {str(e)}")
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
    
    if not clerk_user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Get or create user in local database
        user = sync_clerk_user_to_local_db(
            clerk_user_id=clerk_user_id,
            email=email,
            db=db
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


# Alias for backward compatibility
get_current_user = get_current_user_from_clerk
