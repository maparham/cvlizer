"""UTC ISO 8601 formatting for API responses."""

from __future__ import annotations

from datetime import datetime, timezone


def format_datetime_utc_iso(dt: datetime | None) -> str | None:
    """Return *dt* as ISO 8601 in UTC, or None if *dt* is None.

    Naive datetimes are treated as UTC wall time (common with SQLAlchemy).
    Timezone-aware values are converted with
    :meth:`datetime.astimezone` so the instant is preserved.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.astimezone(timezone.utc).isoformat()
