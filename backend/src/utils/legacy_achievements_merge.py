"""
One-time migration helpers: fold legacy ``achievements`` list fields into ``description``.

These functions are used by ``backend/scripts/migrate_legacy_achievements.py`` and are
kept in ``src/`` so they can be imported cleanly from the script's sys.path bootstrap.
They have no runtime usage inside the request path after the DB migration is complete.
"""

from __future__ import annotations


def merge_achievements_into_description(item: dict) -> bool:
    """Merge ``item["achievements"]`` into ``item["description"]``. Returns True if changed.

    Normalisation rules:
    - ``str`` element → used as-is (stripped).
    - ``dict`` element with ``"bullet"`` key → use that string (stripped).
    - Empty/blank elements are skipped.

    If ``achievements`` is absent or empty the key is silently removed and the
    function returns False (no meaningful change).
    """
    achievements = item.get("achievements")
    if not achievements:
        item.pop("achievements", None)
        return False

    lines: list[str] = []
    for a in achievements:
        if isinstance(a, str) and a.strip():
            lines.append(a.strip())
        elif (
            isinstance(a, dict)
            and isinstance(a.get("bullet"), str)
            and a["bullet"].strip()
        ):
            lines.append(a["bullet"].strip())

    item.pop("achievements")

    if not lines:
        return False

    bullet_block = "\n".join(f"- {line}" for line in lines)
    desc = (item.get("description") or "").strip()
    item["description"] = f"{desc}\n\n{bullet_block}" if desc else bullet_block
    return True


def migrate_cv_dict(cv_data: dict) -> int:
    """Apply ``merge_achievements_into_description`` to every work/education item.

    Returns the number of items that were changed (had non-empty achievements merged).
    """
    count = 0
    for section in ("work_experience", "education"):
        for item in cv_data.get(section) or []:
            if isinstance(item, dict) and merge_achievements_into_description(item):
                count += 1
    return count
