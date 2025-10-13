"""
History validation utilities for CV history operations.

This module provides validation functions for CV history data to ensure
data integrity and prevent invalid operations.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum


class ChangeType(str, Enum):
    """Valid change types for CV history entries."""

    MANUAL_SAVE = "manual_save"
    AUTO_SAVE = "auto_save"
    SECTION_EDIT = "section_edit"
    BULK_CHANGE = "bulk_change"
    INITIAL_LOAD = "initial_load"
    BEFORE_AI_OPTIMIZE = "before_ai_optimize"
    RESTORE_POINT = "restore_point"


class ValidationError(Exception):
    """Custom validation error for history operations."""

    pass


def validate_cv_data(cv_data: Dict[str, Any]) -> List[str]:
    """
    Validate CV data structure for history storage.

    Args:
        cv_data: The CV data dictionary to validate

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    if not isinstance(cv_data, dict):
        errors.append("CV data must be a dictionary")
        return errors

    # Check data size limit (5MB max for a single CV snapshot)
    data_size = calculate_data_size(cv_data)
    max_size = 5 * 1024 * 1024  # 5MB
    if data_size > max_size:
        errors.append(
            f"CV data too large ({data_size} bytes). Maximum allowed: {max_size} bytes"
        )

    # Check required top-level fields
    required_fields = ["personal_info"]
    for field in required_fields:
        if field not in cv_data:
            errors.append(f"Missing required field: {field}")

    # Validate personal_info if present
    if "personal_info" in cv_data:
        personal_info = cv_data["personal_info"]
        if not isinstance(personal_info, dict):
            errors.append("personal_info must be a dictionary")
        else:
            # Check for essential personal info fields
            if not personal_info.get("full_name", "").strip():
                errors.append("personal_info.full_name is required")

    # Validate array sections have proper structure
    array_sections = [
        "work_experience",
        "education",
        "projects",
        "certifications",
        "awards",
        "publications",
        "volunteer_experience",
    ]

    for section in array_sections:
        if section in cv_data:
            section_data = cv_data[section]
            if not isinstance(section_data, list):
                errors.append(f"{section} must be an array")
            else:
                # Validate each item has an ID
                for i, item in enumerate(section_data):
                    if not isinstance(item, dict):
                        errors.append(f"{section}[{i}] must be an object")
                    elif not item.get("id"):
                        errors.append(f"{section}[{i}] missing required 'id' field")

    return errors


def validate_change_type(change_type: str) -> bool:
    """
    Validate that change_type is one of the allowed values.

    Args:
        change_type: The change type to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        ChangeType(change_type)
        return True
    except ValueError:
        return False


def validate_description_and_label(
    description: str = None, label: str = None
) -> List[str]:
    """
    Validate description and label fields.

    Args:
        description: Optional description text
        label: Optional label text

    Returns:
        List of validation error messages
    """
    errors = []

    if description is not None:
        if len(description.strip()) > 1000:
            errors.append("Description cannot exceed 1000 characters")
        if not description.strip():
            errors.append("Description cannot be empty if provided")

    if label is not None:
        if len(label.strip()) > 255:
            errors.append("Label cannot exceed 255 characters")
        if not label.strip():
            errors.append("Label cannot be empty if provided")

    return errors


def calculate_data_size(cv_data: Dict[str, Any]) -> int:
    """
    Calculate the approximate size of CV data for storage tracking.

    Args:
        cv_data: The CV data dictionary

    Returns:
        Approximate size in bytes
    """
    import json

    try:
        return len(json.dumps(cv_data, ensure_ascii=False).encode("utf-8"))
    except Exception:
        # Fallback estimation
        return len(str(cv_data).encode("utf-8"))


class ValidatedCreateHistoryRequest(BaseModel):
    """Validated version of CreateHistoryRequest with proper validation."""

    cv_data: Dict[str, Any] = Field(..., description="The CV data snapshot")
    change_type: ChangeType = Field(
        ..., description="Type of change that triggered this snapshot"
    )
    description: Optional[str] = Field(
        None, description="Human-readable description", max_length=1000
    )
    label: Optional[str] = Field(
        None, description="Optional user-provided label", max_length=255
    )
    is_automatic: bool = Field(True, description="Whether this was an automatic snapshot")
    is_initial: bool = Field(False, description="Whether this is the initial version")

    @validator("cv_data")
    def validate_cv_data_structure(cls, v):
        """Validate the CV data structure."""
        errors = validate_cv_data(v)
        if errors:
            raise ValueError(f"Invalid CV data: {'; '.join(errors)}")
        return v

    @validator("description")
    def validate_description_content(cls, v):
        """Validate description content."""
        if v is not None and not v.strip():
            raise ValueError("Description cannot be empty if provided")
        return v.strip() if v else None

    @validator("label")
    def validate_label_content(cls, v):
        """Validate label content."""
        if v is not None and not v.strip():
            raise ValueError("Label cannot be empty if provided")
        return v.strip() if v else None
