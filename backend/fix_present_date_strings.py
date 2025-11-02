"""
One-time script to clean "Present" strings from end_date fields in CV data.

This script identifies and fixes CV records that have the string "Present" in
end_date fields, converting them to null/empty values to maintain data integrity.

Usage:
    python fix_present_date_strings.py [--auto-confirm]
"""

import os
import sys
from typing import Dict, Any, List

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models.base import SessionLocal
from src.models.cv import CV


def clean_present_strings(cv_data: Dict[str, Any]) -> tuple[Dict[str, Any], bool]:
    """
    Clean "Present" strings from end_date fields in CV data.

    Returns:
        tuple: (cleaned_data, was_modified)
    """
    import copy

    if not cv_data or not isinstance(cv_data, dict):
        return cv_data, False

    modified = False
    # Use deep copy to avoid modifying original nested structures
    cleaned_data = copy.deepcopy(cv_data)

    # Clean work_experience section
    if "work_experience" in cleaned_data and isinstance(
        cleaned_data["work_experience"], list
    ):
        for exp in cleaned_data["work_experience"]:
            if not isinstance(exp, dict):
                continue

            # If current=true, ensure end_date is null
            if exp.get("current", False):
                if exp.get("end_date") not in (None, ""):
                    exp["end_date"] = None
                    modified = True
            # Remove "Present" string from end_date
            elif "end_date" in exp and exp["end_date"]:
                end_date_str = str(exp["end_date"]).strip()
                if end_date_str.lower() == "present":
                    exp["end_date"] = None
                    modified = True

    # Clean education section
    if "education" in cleaned_data and isinstance(cleaned_data["education"], list):
        for edu in cleaned_data["education"]:
            if not isinstance(edu, dict):
                continue

            # Remove "Present" string from end_date
            if "end_date" in edu and edu["end_date"]:
                end_date_str = str(edu["end_date"]).strip()
                if end_date_str.lower() == "present":
                    edu["end_date"] = None
                    modified = True

    # Clean volunteer_experience section
    if "volunteer_experience" in cleaned_data and isinstance(
        cleaned_data["volunteer_experience"], list
    ):
        for volunteer in cleaned_data["volunteer_experience"]:
            if not isinstance(volunteer, dict):
                continue

            # Remove "Present" string from end_date
            if "end_date" in volunteer and volunteer["end_date"]:
                end_date_str = str(volunteer["end_date"]).strip()
                if end_date_str.lower() == "present":
                    volunteer["end_date"] = None
                    modified = True

    return cleaned_data, modified


def fix_present_date_strings(auto_confirm=False):
    """
    Find and fix CVs with "Present" strings in end_date fields.
    """
    db = SessionLocal()
    try:
        # Find all CVs
        all_cvs = db.query(CV).all()

        if not all_cvs:
            print("✓ No CVs found.")
            return

        print(
            f"Scanning {len(all_cvs)} CV(s) for 'Present' strings in end_date fields..."
        )
        print()

        fixed_count = 0
        affected_sections = []

        for cv in all_cvs:
            if not cv.parsed_data or not isinstance(cv.parsed_data, dict):
                continue

            cleaned_data, was_modified = clean_present_strings(cv.parsed_data)

            if was_modified:
                # Track what was fixed
                sections_fixed = []
                original_data = cv.parsed_data

                # Check work_experience
                if "work_experience" in original_data:
                    for i, exp in enumerate(original_data.get("work_experience", [])):
                        if isinstance(exp, dict) and exp.get("end_date"):
                            end_date_str = str(exp["end_date"]).strip()
                            if end_date_str.lower() == "present" or (
                                exp.get("current") and exp.get("end_date")
                            ):
                                sections_fixed.append(f"work_experience[{i}]")

                # Check education
                if "education" in original_data:
                    for i, edu in enumerate(original_data.get("education", [])):
                        if isinstance(edu, dict) and edu.get("end_date"):
                            end_date_str = str(edu["end_date"]).strip()
                            if end_date_str.lower() == "present":
                                sections_fixed.append(f"education[{i}]")

                # Check volunteer_experience
                if "volunteer_experience" in original_data:
                    for i, volunteer in enumerate(
                        original_data.get("volunteer_experience", [])
                    ):
                        if isinstance(volunteer, dict) and volunteer.get("end_date"):
                            end_date_str = str(volunteer["end_date"]).strip()
                            if end_date_str.lower() == "present":
                                sections_fixed.append(f"volunteer_experience[{i}]")

                affected_sections.append(
                    {
                        "cv_id": cv.id,
                        "filename": cv.original_filename,
                        "sections": sections_fixed,
                    }
                )

        if not affected_sections:
            print("✓ No CVs with 'Present' strings in end_date fields found.")
            return

        print(f"Found {len(affected_sections)} CV(s) with 'Present' strings:")
        print()

        for item in affected_sections:
            print(f"  • {item['filename']} (ID: {item['cv_id']})")
            for section in item["sections"]:
                print(f"    - {section}")
        print()

        if not auto_confirm:
            response = (
                input(f"Fix {len(affected_sections)} CV(s)? (yes/no): ").strip().lower()
            )
            if response not in ("yes", "y"):
                print("Aborted.")
                return

        print()
        print("Fixing CVs...")

        # Apply fixes
        for cv in all_cvs:
            if not cv.parsed_data or not isinstance(cv.parsed_data, dict):
                continue

            cleaned_data, was_modified = clean_present_strings(cv.parsed_data)

            if was_modified:
                cv.parsed_data = cleaned_data
                fixed_count += 1

        # Commit all changes
        db.commit()

        print(f"✓ Successfully fixed {fixed_count} CV(s).")
        print()
        print("Migration complete!")

    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Fix 'Present' strings in end_date fields"
    )
    parser.add_argument(
        "--auto-confirm",
        action="store_true",
        help="Skip confirmation prompt",
    )

    args = parser.parse_args()
    fix_present_date_strings(auto_confirm=args.auto_confirm)
