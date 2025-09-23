"""
Clerk user synchronization service.

This module handles synchronizing Clerk users with the local database,
ensuring that users authenticated via Clerk have corresponding records
in the local database for CV and data relationships.
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from ..models.user import User

logger = logging.getLogger(__name__)


def sync_clerk_user_to_local_db(
    clerk_user_id: str, 
    email: str, 
    db: Session,
    additional_data: Optional[Dict[str, Any]] = None
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
                if 'email_verified' in additional_data and user.email_verified != additional_data['email_verified']:
                    user.email_verified = additional_data['email_verified']
                    updated = True
                
                # Update last login
                if 'last_sign_in_at' in additional_data:
                    user.last_login = datetime.fromisoformat(additional_data['last_sign_in_at'].replace('Z', '+00:00'))
                    updated = True
            
            if updated:
                user.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(user)
                logger.info(f"Updated existing user {clerk_user_id} in local database")
            
            return user
        
        # If no user found by Clerk ID, check if user exists by email (migration case)
        existing_user_by_email = db.query(User).filter(User.email == email).first()
        
        if existing_user_by_email:
            if not existing_user_by_email.clerk_id:
                # This is likely a user from the old system, link them to Clerk
                existing_user_by_email.clerk_id = clerk_user_id
                if additional_data and 'email_verified' in additional_data:
                    existing_user_by_email.email_verified = additional_data['email_verified']
                existing_user_by_email.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_user_by_email)
                logger.info(f"Linked existing user {email} to Clerk ID {clerk_user_id}")
                return existing_user_by_email
            else:
                # User exists with different Clerk ID - this is a conflict
                logger.warning(f"User with email {email} already exists with different Clerk ID {existing_user_by_email.clerk_id}")
                # For now, update the existing user's Clerk ID (this might be a user switching accounts)
                existing_user_by_email.clerk_id = clerk_user_id
                if additional_data and 'email_verified' in additional_data:
                    existing_user_by_email.email_verified = additional_data['email_verified']
                existing_user_by_email.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_user_by_email)
                logger.info(f"Updated existing user {email} to new Clerk ID {clerk_user_id}")
                return existing_user_by_email
        
        # Create new user
        user_data = {
            'clerk_id': clerk_user_id,
            'email': email,
            'is_active': True,
            'email_verified': False,  # Default, will be updated if provided
        }
        
        if additional_data:
            if 'email_verified' in additional_data:
                user_data['email_verified'] = additional_data['email_verified']
            if 'last_sign_in_at' in additional_data:
                user_data['last_login'] = datetime.fromisoformat(additional_data['last_sign_in_at'].replace('Z', '+00:00'))
        
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
    clerk_user_data: Optional[Dict[str, Any]] = None
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
    # Try to get existing user first
    user = get_user_by_clerk_id(db, clerk_user_id)
    
    if user:
        return user
    
    # Create/sync user
    additional_data = {}
    if clerk_user_data:
        # Extract relevant fields from Clerk user data
        if 'emailAddresses' in clerk_user_data and clerk_user_data['emailAddresses']:
            primary_email = next((addr for addr in clerk_user_data['emailAddresses'] if addr.get('id') == clerk_user_data.get('primaryEmailAddressId')), None)
            if primary_email and 'verification' in primary_email:
                additional_data['email_verified'] = primary_email['verification'].get('status') == 'verified'
        
        if 'lastSignInAt' in clerk_user_data:
            additional_data['last_sign_in_at'] = clerk_user_data['lastSignInAt']
    
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


