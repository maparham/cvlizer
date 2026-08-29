"""
CV export template resolution and safe filenames for PDF/LaTeX exports.

Shared by authenticated export routes and public share PDF download so router
modules do not import each other for naming helpers.
"""

import re
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status

from src.services.shared.template_loader import (
    get_default_template,
    is_template_available,
)

# Stem of original_filename is considered generic; use parsed full_name for filename.
_GENERIC_TITLE_STEMS = ("cv", "resume", "document", "new cv")


def resolve_export_template(template: Optional[str]) -> str:
    """
    Resolve to a valid template name for export.
    Uses query param if valid, else default from config, else "standard" if available.
    Raises HTTPException 503 if no template is available.
    """
    if template and is_template_available(template):
        return template
    default = get_default_template()
    if default and is_template_available(default):
        return default
    if is_template_available("standard"):
        return "standard"
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="No export template available. Please configure defaultTemplate in templates config.",
    )


def resolve_show_ai_attribution(value: Optional[bool]) -> bool:
    """
    Resolve the per-CV AI attribution setting to a concrete flag.

    The column is nullable so the migration needs no backfill: rows predating
    the feature read as NULL and must behave as opt-in (credit shown).
    """
    return True if value is None else bool(value)


def cv_title_for_filename(cv: Any) -> str:
    """
    Build a safe filename base from the CV's title (original_filename).
    Uses the stem only (extension is never included). When the stem is generic
    (e.g. resume, document), falls back to parsed personal_info.full_name so
    exports get a meaningful name (e.g. Jane_Doe). When no meaningful name is
    available, returns "CV".
    """
    raw = (cv.original_filename or "CV").strip()
    stem = raw.rsplit(".", 1)[0].strip() if "." in raw else raw
    stem_lower = stem.lower()

    if stem_lower in _GENERIC_TITLE_STEMS:
        personal_info = (cv.parsed_data or {}).get("personal_info") or {}
        full_name = (personal_info.get("full_name") or "").strip()
        if not full_name:
            for field in ("name", "fullName", "fullname", "first_name", "last_name"):
                if field in personal_info and personal_info[field]:
                    full_name = str(personal_info[field]).strip()
                    break
        base = full_name if full_name else "CV"
    else:
        base = stem

    with_underscores = base.replace(".", "_")
    safe = re.sub(r"[^A-Za-z0-9_\-\s]+", " ", with_underscores).strip()
    safe = re.sub(r"[\s\-]+", "_", safe).strip("_") or "CV"
    return safe


def export_filename_for_cv(
    cv: Any, ext: str, employer_suffix: Optional[str] = None
) -> str:
    """Build export filename: title_base_YYYYMMDD[_employer].ext.

    Naming contract:
    - Template choice affects rendering only.
    - Filename suffix is employer name when available, otherwise omitted.
    """
    base = cv_title_for_filename(cv)
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    if employer_suffix:
        return f"{base}_{date_str}_{employer_suffix}.{ext}"
    return f"{base}_{date_str}.{ext}"
