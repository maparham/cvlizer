"""
Format Pydantic ValidationError into user-facing error strings for CV validation.

Used by get_validation_errors in validation.py for advisory display after save
and by the /validate endpoint. Keeps validation.py focused on business rules.
Field labels are kept explicit to keep formatting predictable and lightweight.
"""

from typing import Dict, List, Tuple

from pydantic import ValidationError

# (section_key, field_key) -> label used in user-facing messages.
# Only required/commonly-validated fields need explicit labels; others fall back
# to Title Case from the raw field key.
_FIELD_LABELS: Dict[Tuple[str, str], str] = {
    ("personal_info", "full_name"): "Full name",
    ("personal_info", "email"): "Email",
    ("personal_info", "location"): "Location",
    ("custom_sections", "id"): "ID",
    ("custom_sections", "title"): "Title",
    ("work_experience", "company"): "Company",
    ("work_experience", "position"): "Position",
    ("work_experience", "start_date"): "Start date",
    ("education", "institution"): "Institution",
    ("education", "degree"): "Degree",
    ("education", "start_date"): "Start date",
    ("skills", "language"): "Language",
    ("skills", "proficiency"): "Proficiency",
    ("certifications", "name"): "Name",
    ("certifications", "issuer"): "Issuer",
    ("certifications", "date"): "Date",
    ("projects", "name"): "Name",
    ("projects", "description"): "Description",
    ("awards", "name"): "Name",
    ("awards", "issuer"): "Issuer",
    ("awards", "date"): "Date",
    ("publications", "title"): "Title",
    ("publications", "authors"): "Authors",
    ("publications", "journal"): "Journal",
    ("publications", "date"): "Date",
    ("volunteer_experience", "organization"): "Organization",
    ("volunteer_experience", "role"): "Role",
    ("volunteer_experience", "start_date"): "Start date",
}


def format_validation_errors(exc: ValidationError) -> List[str]:
    """
    Turn Pydantic ValidationError into user-facing strings for frontend.

    Returns strings like "Personal Info: Full name is required" or
    "Work Experience #1: Position is required".
    """
    return _format_pydantic_errors(exc)


def _field_label(field_key: str, section_key: str = "") -> str:
    """Human-readable label from schema metadata; fallback: field_key.title()."""
    sk = section_key.lower() if section_key else ""
    return _FIELD_LABELS.get((sk, field_key.lower()), field_key.replace("_", " ").title())


def _format_pydantic_errors(exc: ValidationError) -> List[str]:
    """Turn Pydantic ValidationError into user-facing strings for frontend."""
    result: List[str] = []
    section_display = {
        "personal_info": "Personal Info",
        "custom_sections": "Custom section",
        "work_experience": "Work Experience",
        "education": "Education",
        "skills": "Skills",
        "certifications": "Certification",
        "projects": "Project",
        "awards": "Award",
        "publications": "Publication",
        "volunteer_experience": "Volunteer experience",
    }
    for err in exc.errors():
        loc = list(err.get("loc", []))
        raw_msg = err.get("msg", "Validation failed")
        while loc and loc[0] in ("body", "parsed_data"):
            loc.pop(0)
        if not loc:
            result.append(raw_msg)
            continue
        section_key = str(loc[0]).lower()
        display = section_display.get(section_key, section_key.replace("_", " ").title())
        # Extract field from path (e.g. ["awards", 0, "issuer"] -> "issuer")
        field_key = None
        if len(loc) >= 3 and isinstance(loc[2], str):
            field_key = str(loc[2]).lower()
        elif len(loc) >= 2 and isinstance(loc[1], str):
            field_key = str(loc[1]).lower()
        if field_key:
            label = _field_label(field_key, section_key)
            msg = f"{label} is required" if label != "Authors" else "Authors are required"
        else:
            msg = raw_msg
        if len(loc) >= 2 and isinstance(loc[1], int):
            result.append(f"{display} #{loc[1] + 1}: {msg}")
        else:
            result.append(f"{display}: {msg}")
    return result
