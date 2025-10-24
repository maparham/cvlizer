"""
User Service Module

This module handles user management operations including user deletion
with complete data cleanup and Clerk integration.
"""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.user import User
from ..models.cv import CV
from ..config import AuthConfig
from .file_service import delete_file

logger = logging.getLogger(__name__)


def delete_user_and_all_data(
    db: Session,
    user_id: str,
    clerk_id: Optional[str] = None,
    delete_from_clerk: bool = True,
) -> Dict[str, Any]:
    """
    Delete a user and all their associated data from the database, disk, and optionally Clerk.

    This function performs a complete deletion:
    1. Collects all CV file paths for cleanup
    2. Deletes user from database (cascades to all related records)
    3. Deletes physical files from disk
    4. Optionally deletes user from Clerk (if clerk_id provided and delete_from_clerk=True)

    Args:
        db: Database session
        user_id: ID of the user to delete
        clerk_id: Clerk user ID (optional, for Clerk deletion)
        delete_from_clerk: Whether to delete the user from Clerk (default: True)

    Returns:
        Dict with deletion summary including:
        - success: bool
        - message: str
        - deleted_cvs: int
        - deleted_files: int
        - clerk_deleted: bool
        - errors: list of error messages if any

    Raises:
        Exception: If critical deletion operations fail
    """
    errors = []
    deleted_cvs = 0
    deleted_files = 0
    clerk_deleted = False

    try:
        # Step 1: Get user and verify existence
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "success": False,
                "message": "User not found",
                "deleted_cvs": 0,
                "deleted_files": 0,
                "clerk_deleted": False,
                "errors": ["User does not exist"],
            }

        user_email = user.email
        logger.info(f"Starting deletion process for user: {user_email} (ID: {user_id})")

        # Step 2: Collect all CV file paths before deletion
        cv_file_paths = []
        cvs = db.query(CV).filter(CV.user_id == user_id).all()
        deleted_cvs = len(cvs)
        for cv in cvs:
            if cv.file_path:
                cv_file_paths.append(cv.file_path)

        logger.info(f"Found {deleted_cvs} CVs with {len(cv_file_paths)} files to delete")

        # Step 3: Delete user from database
        # First manually delete records with NOT NULL constraints on user_id
        try:
            from ..models.user_activity import UserActivity, UserSession
            from ..models.ai_usage_log import AIUsageLog
            from ..models.impersonation_session import ImpersonationSession

            # Delete user activities first (they have NOT NULL constraint)
            activities_deleted = (
                db.query(UserActivity).filter(UserActivity.user_id == user_id).delete()
            )
            sessions_deleted = (
                db.query(UserSession).filter(UserSession.user_id == user_id).delete()
            )

            # Delete AI usage logs (they also have NOT NULL constraint)
            ai_logs_deleted = (
                db.query(AIUsageLog).filter(AIUsageLog.user_id == user_id).delete()
            )

            # Delete impersonation sessions where user is the target (they have NOT NULL constraint on target_user_id)
            impersonation_sessions_deleted = (
                db.query(ImpersonationSession)
                .filter(ImpersonationSession.target_user_id == user_id)
                .delete()
            )

            logger.info(
                f"Deleted {activities_deleted} activities, {sessions_deleted} sessions, {ai_logs_deleted} AI usage logs, and {impersonation_sessions_deleted} impersonation sessions"
            )

            # Now delete the user (cascade will handle other related records)
            db.delete(user)
            db.commit()
            logger.info(f"Successfully deleted user {user_email} from database")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete user from database: {str(e)}")
            raise Exception(f"Database deletion failed: {str(e)}")

        # Step 4: Delete physical files from disk
        for file_path in cv_file_paths:
            try:
                if delete_file(file_path):
                    deleted_files += 1
                else:
                    logger.warning(f"File not found or already deleted: {file_path}")
            except Exception as e:
                error_msg = f"Failed to delete file {file_path}: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)

        logger.info(f"Deleted {deleted_files}/{len(cv_file_paths)} files from disk")

        # Step 5: Delete from Clerk if requested and clerk_id provided
        if delete_from_clerk and clerk_id:
            try:
                import requests
                import time

                # Use direct HTTP request to Clerk API
                headers = {
                    "Authorization": f"Bearer {AuthConfig.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                }

                # STEP 1: Revoke all sessions FIRST (force immediate logout)
                logger.info(f"Step 1: Revoking all sessions for user {clerk_id}")

                # Get all sessions for the user
                sessions_response = requests.get(
                    f"https://api.clerk.com/v1/sessions?user_id={clerk_id}",
                    headers=headers,
                )

                if sessions_response.status_code == 200:
                    sessions_data = sessions_response.json()
                    sessions = (
                        sessions_data.get("data", sessions_data)
                        if isinstance(sessions_data, dict)
                        else sessions_data
                    )
                    logger.info(f"Found {len(sessions)} sessions to revoke")

                    # Revoke each session
                    for session in sessions:
                        session_id = session.get("id", session.get("session_id"))
                        if session_id:
                            revoke_response = requests.post(
                                f"https://api.clerk.com/v1/sessions/{session_id}/revoke",
                                headers=headers,
                            )
                            if revoke_response.status_code == 200:
                                logger.info(
                                    f"✅ Successfully revoked session {session_id}"
                                )
                            else:
                                logger.warning(
                                    f"⚠️ Failed to revoke session {session_id}: {revoke_response.text}"
                                )
                else:
                    logger.warning(
                        f"Could not get sessions: {sessions_response.status_code} - {sessions_response.text}"
                    )

                # STEP 2: Wait for JWT invalidation to propagate
                logger.info(
                    "Step 2: Waiting 5 seconds for JWT invalidation to propagate..."
                )
                time.sleep(5)
                logger.info("JWT invalidation delay completed")

                # STEP 3: Delete user from Clerk
                logger.info(f"Step 3: Deleting user {clerk_id} from Clerk")
                response = requests.delete(
                    f"https://api.clerk.com/v1/users/{clerk_id}", headers=headers
                )

                if response.status_code == 200:
                    clerk_deleted = True
                    logger.info(f"✅ Successfully deleted user from Clerk: {clerk_id}")

                    # STEP 4: Verify deletion
                    logger.info("Step 4: Verifying user deletion from Clerk")
                    verify_response = requests.get(
                        f"https://api.clerk.com/v1/users/{clerk_id}", headers=headers
                    )
                    if verify_response.status_code == 404:
                        logger.info(
                            f"✅ Verified: User {clerk_id} successfully deleted from Clerk"
                        )
                    else:
                        logger.warning(
                            f"⚠️ User {clerk_id} still exists in Clerk (status: {verify_response.status_code})"
                        )
                        logger.warning(f"Clerk response: {verify_response.text}")
                else:
                    error_msg = f"Clerk API returned status {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            except Exception as e:
                error_msg = f"Failed to delete from Clerk: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                # Don't raise - local data is already deleted, which is primary goal

        # Success!
        success_msg = f"Successfully deleted user {user_email}"
        if clerk_deleted:
            success_msg += " (including Clerk account)"
        elif delete_from_clerk and clerk_id and not clerk_deleted:
            success_msg += " (local data deleted, but Clerk deletion failed - manual cleanup may be needed)"

        logger.info(success_msg)

        return {
            "success": True,
            "message": success_msg,
            "deleted_cvs": deleted_cvs,
            "deleted_files": deleted_files,
            "clerk_deleted": clerk_deleted,
            "errors": errors if errors else None,
        }

    except Exception as e:
        error_msg = f"User deletion failed: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "deleted_cvs": deleted_cvs,
            "deleted_files": deleted_files,
            "clerk_deleted": clerk_deleted,
            "errors": errors + [str(e)],
        }
