"""
Section count utility for CV responses.

Computes the number of visible sections with data from parsed_data.
Used by all CV response endpoints; frontend displays this value as-is.
"""


def count_visible_sections_with_data(parsed_data: dict | None) -> int:
    """
    Return the number of visible sections that have data.

    Uses section_config.sections when present (counting visible sections
    with data, including custom sections), otherwise counts standard
    section types that have data.
    """
    if not parsed_data or not isinstance(parsed_data, dict):
        return 0

    def has_data(section_type: str, section_id: str | None = None) -> bool:
        if section_type == "personal_info":
            pi = parsed_data.get("personal_info") or {}
            return bool((pi.get("full_name") or "").strip())
        if section_type == "professional_summary":
            ps = parsed_data.get("professional_summary") or {}
            return bool((ps.get("content") or "").strip())
        if section_type == "work_experience":
            return bool(parsed_data.get("work_experience"))
        if section_type == "education":
            return bool(parsed_data.get("education"))
        if section_type == "skills":
            s = parsed_data.get("skills") or {}
            return bool(s.get("technical") or s.get("soft") or s.get("languages"))
        if section_type == "certifications":
            return bool(parsed_data.get("certifications"))
        if section_type == "projects":
            return bool(parsed_data.get("projects"))
        if section_type == "awards":
            return bool(parsed_data.get("awards"))
        if section_type == "publications":
            return bool(parsed_data.get("publications"))
        if section_type == "volunteer_experience":
            return bool(parsed_data.get("volunteer_experience"))
        if section_type == "custom" and section_id:
            for item in parsed_data.get("custom_sections") or []:
                if item.get("id") == section_id and (item.get("content") or "").strip():
                    return True
            return False
        return False

    section_config = parsed_data.get("section_config") or {}
    sections = section_config.get("sections")

    if not sections:
        count = 0
        for st in (
            "personal_info",
            "professional_summary",
            "work_experience",
            "education",
            "skills",
            "certifications",
            "projects",
            "awards",
            "publications",
            "volunteer_experience",
        ):
            if has_data(st, None):
                count += 1
        return count

    return sum(
        1
        for s in sections
        if s.get("visible", True)
        and (
            has_data(s.get("type", ""), s.get("id"))
            if s.get("type") == "custom"
            else has_data(s.get("type", ""), None)
        )
    )
