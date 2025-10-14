"""
One-time script to fix stuck job descriptions with is_parsing=True.

This script identifies and fixes job description records that are stuck in
the "parsing" state due to background task failures or crashes.

Usage:
    python fix_stuck_job_descriptions.py [--auto-confirm]
"""

import os
import sys
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models.base import SessionLocal
from src.models.job_description import JobDescription


def fix_stuck_job_descriptions(auto_confirm=False):
    """
    Find and fix job descriptions that are stuck in is_parsing=True state.

    A job description is considered "stuck" if:
    - is_parsing=True
    - created_at is more than 10 minutes ago (parsing should complete faster)
    """
    db = SessionLocal()
    try:
        # Find job descriptions stuck in parsing state for more than 10 minutes
        ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)

        stuck_jds = (
            db.query(JobDescription)
            .filter(
                JobDescription.is_parsing.is_(True),
                JobDescription.created_at < ten_minutes_ago,
            )
            .all()
        )

        if not stuck_jds:
            print("✓ No stuck job descriptions found.")
            return

        print(f"Found {len(stuck_jds)} stuck job description(s):")
        print()

        for jd in stuck_jds:
            print(f"ID: {jd.id}")
            print(f"  User ID: {jd.user_id}")
            print(f"  CV ID: {jd.cv_id}")
            print(f"  Title: {jd.title or 'N/A'}")
            print(f"  Source URL: {jd.source_url or 'N/A'}")
            print(f"  Created: {jd.created_at}")
            print("  Current Status: is_parsing=True")
            print()

        if not auto_confirm:
            response = (
                input(f"Fix these {len(stuck_jds)} job description(s)? (yes/no): ")
                .strip()
                .lower()
            )

            if response != "yes":
                print("Aborted.")
                return

        # Fix each stuck job description
        fixed_count = 0
        for jd in stuck_jds:
            jd.is_parsing = False
            jd.parse_error = (
                "Parsing timed out or failed. Please try again or enter "
                "the job description manually."
            )
            fixed_count += 1

        db.commit()
        print(f"✓ Fixed {fixed_count} job description(s).")
        print()
        print("Users will now see an error message and can:")
        print("  1. Delete the failed job description")
        print("  2. Try parsing the URL again")
        print("  3. Manually enter the job description text")

    except Exception as e:
        db.rollback()
        print(f"✗ Error: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Fix Stuck Job Descriptions")
    print("=" * 60)
    print()

    # Check for auto-confirm flag
    auto_confirm = "--auto-confirm" in sys.argv or "-y" in sys.argv
    fix_stuck_job_descriptions(auto_confirm=auto_confirm)
