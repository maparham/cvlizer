"""
Clerk user synchronization service.

This module handles synchronizing Clerk users with the local database,
ensuring that users authenticated via Clerk have corresponding records
in the local database for CV and data relationships.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.models.user import User

logger = logging.getLogger(__name__)


def sync_clerk_user_to_local_db(
    clerk_user_id: str,
    email: str,
    db: Session,
    additional_data: Optional[Dict[str, Any]] = None,
) -> User:
    """
    Synchronize a Clerk user to the local database.

    Creates a local user record if it doesn't exist, or updates existing record.

    Args:
        clerk_user_id: The Clerk user ID
        email: User's email address
        db: Database session
        additional_data: Optional additional user data from Clerk

    Returns:
        User: The local user record
    """
    try:
        # First, verify the user actually exists in Clerk before syncing
        import requests
        import os

        clerk_secret_key = os.getenv("CLERK_SECRET_KEY")
        if clerk_secret_key:
            try:
                headers = {
                    "Authorization": f"Bearer {clerk_secret_key}",
                    "Content-Type": "application/json",
                }

                # Check if user exists in Clerk
                clerk_response = requests.get(
                    f"https://api.clerk.com/v1/users/{clerk_user_id}", headers=headers
                )

                if clerk_response.status_code == 404:
                    logger.warning(
                        f"User {clerk_user_id} ({email}) does not exist in Clerk - preventing sync"
                    )
                    raise Exception(
                        f"User {clerk_user_id} was deleted from Clerk and should not be synced"
                    )
                elif clerk_response.status_code != 200:
                    logger.warning(
                        f"Clerk API returned {clerk_response.status_code} for user {clerk_user_id} - proceeding with sync"
                    )

            except requests.RequestException as e:
                logger.warning(
                    f"Could not verify user existence in Clerk: {e} - proceeding with sync"
                )

        # First, try to find user by Clerk ID
        user = db.query(User).filter(User.clerk_id == clerk_user_id).first()

        if user:
            # Update existing user if needed
            updated = False
            if user.email != email:
                user.email = email
                updated = True

            if additional_data:
                # Update email verification status if provided
                if (
                    "email_verified" in additional_data
                    and user.email_verified != additional_data["email_verified"]
                ):
                    user.email_verified = additional_data["email_verified"]
                    updated = True

                # Update last login (only if it's significantly different to avoid constant updates)
                if "last_sign_in_at" in additional_data:
                    last_sign_in = additional_data["last_sign_in_at"]
                    new_last_login = None

                    if isinstance(last_sign_in, int):
                        # Check if it's milliseconds (13 digits) or seconds (10 digits)
                        if last_sign_in > 1e12:  # Millisecond timestamp
                            new_last_login = datetime.fromtimestamp(last_sign_in / 1000)
                        else:  # Second timestamp
                            new_last_login = datetime.fromtimestamp(last_sign_in)
                    elif isinstance(last_sign_in, str):
                        # ISO string format
                        new_last_login = datetime.fromisoformat(
                            last_sign_in.replace("Z", "+00:00")
                        )
                    else:
                        # Try to convert to datetime directly
                        new_last_login = last_sign_in

                    # Only update if last_login is None or differs by more than 1 minute
                    # This prevents constant database writes for every API call
                    if new_last_login:
                        if user.last_login is None:
                            user.last_login = new_last_login
                            updated = True
                        else:
                            time_diff = abs(
                                (new_last_login - user.last_login).total_seconds()
                            )
                            if (
                                time_diff > 60
                            ):  # Only update if more than 1 minute difference
                                user.last_login = new_last_login
                                updated = True

            if updated:
                user.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(user)
                logger.debug(f"Updated existing user {clerk_user_id} in local database")

            return user

        # If no user found by Clerk ID, check if user exists by email (migration case)
        existing_user_by_email = db.query(User).filter(User.email == email).first()

        if existing_user_by_email:
            if not existing_user_by_email.clerk_id:
                # This is likely a user from the old system, link them to Clerk
                existing_user_by_email.clerk_id = clerk_user_id
                if additional_data and "email_verified" in additional_data:
                    existing_user_by_email.email_verified = additional_data[
                        "email_verified"
                    ]
                existing_user_by_email.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_user_by_email)
                logger.info(f"Linked existing user {email} to Clerk ID {clerk_user_id}")
                return existing_user_by_email
            else:
                # User exists with different Clerk ID - this is a conflict
                logger.warning(
                    f"User with email {email} already exists with different Clerk ID {existing_user_by_email.clerk_id}"
                )
                # For now, update the existing user's Clerk ID (this might be a user switching accounts)
                existing_user_by_email.clerk_id = clerk_user_id
                if additional_data and "email_verified" in additional_data:
                    existing_user_by_email.email_verified = additional_data[
                        "email_verified"
                    ]
                existing_user_by_email.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_user_by_email)
                logger.info(
                    f"Updated existing user {email} to new Clerk ID {clerk_user_id}"
                )
                return existing_user_by_email

        # Create new user
        user_data = {
            "clerk_id": clerk_user_id,
            "email": email,
            "is_active": True,
            "email_verified": False,  # Default, will be updated if provided
        }

        if additional_data:
            if "email_verified" in additional_data:
                user_data["email_verified"] = additional_data["email_verified"]
            if "last_sign_in_at" in additional_data:
                last_sign_in = additional_data["last_sign_in_at"]
                if isinstance(last_sign_in, int):
                    # Check if it's milliseconds (13 digits) or seconds (10 digits)
                    if last_sign_in > 1e12:  # Millisecond timestamp
                        user_data["last_login"] = datetime.fromtimestamp(
                            last_sign_in / 1000
                        )
                    else:  # Second timestamp
                        user_data["last_login"] = datetime.fromtimestamp(last_sign_in)
                elif isinstance(last_sign_in, str):
                    # ISO string format
                    user_data["last_login"] = datetime.fromisoformat(
                        last_sign_in.replace("Z", "+00:00")
                    )
                else:
                    # Try to convert to datetime directly
                    user_data["last_login"] = last_sign_in

        new_user = User(**user_data)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"Created new user {clerk_user_id} in local database")
        return new_user

    except Exception as e:
        logger.error(f"Error syncing Clerk user {clerk_user_id}: {str(e)}")
        db.rollback()
        raise


def get_user_by_clerk_id(db: Session, clerk_user_id: str) -> Optional[User]:
    """
    Get a user by their Clerk ID.

    Args:
        db: Database session
        clerk_user_id: The Clerk user ID

    Returns:
        User or None: The user record if found
    """
    return db.query(User).filter(User.clerk_id == clerk_user_id).first()


def get_or_create_user_from_clerk(
    clerk_user_id: str,
    email: str,
    db: Session,
    clerk_user_data: Optional[Dict[str, Any]] = None,
) -> User:
    """
    Get an existing user or create a new one from Clerk data.

    This is a convenience function that combines getting and syncing.

    Args:
        clerk_user_id: The Clerk user ID
        email: User's email address
        db: Database session
        clerk_user_data: Optional full Clerk user data

    Returns:
        User: The local user record
    """
    # Create/sync user with additional data
    additional_data = {}
    if clerk_user_data:
        # Extract relevant fields from Clerk user data
        if "emailAddresses" in clerk_user_data and clerk_user_data["emailAddresses"]:
            primary_email = next(
                (
                    addr
                    for addr in clerk_user_data["emailAddresses"]
                    if addr.get("id") == clerk_user_data.get("primaryEmailAddressId")
                ),
                None,
            )
            if primary_email and "verification" in primary_email:
                additional_data["email_verified"] = (
                    primary_email["verification"].get("status") == "verified"
                )

        if "lastSignInAt" in clerk_user_data:
            additional_data["last_sign_in_at"] = clerk_user_data["lastSignInAt"]

    return sync_clerk_user_to_local_db(clerk_user_id, email, db, additional_data)


def migrate_existing_users_to_clerk(db: Session) -> int:
    """
    Migration helper to prepare existing users for Clerk integration.

    This sets clerk_id to None for existing users so they can be linked
    when they first sign in with Clerk.

    Args:
        db: Database session

    Returns:
        int: Number of users updated
    """
    try:
        # Find users without clerk_id
        users_without_clerk = db.query(User).filter(User.clerk_id.is_(None)).all()

        count = 0
        for user in users_without_clerk:
            # Just ensure they're ready for Clerk linking
            # The actual linking happens when they sign in with Clerk
            user.updated_at = datetime.utcnow()
            count += 1

        if count > 0:
            db.commit()
            logger.info(f"Prepared {count} existing users for Clerk integration")

        return count

    except Exception as e:
        logger.error(f"Error migrating existing users: {str(e)}")
        db.rollback()
        raise
