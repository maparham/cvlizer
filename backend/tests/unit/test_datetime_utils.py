"""Unit tests for datetime_utils."""

from datetime import datetime, timedelta, timezone

from src.utils.datetime_utils import format_datetime_utc_iso


def test_format_datetime_utc_iso_none():
    assert format_datetime_utc_iso(None) is None


def test_format_datetime_utc_iso_naive_as_utc_wall_time():
    dt = datetime(2024, 1, 1, 15, 0, 0)
    assert format_datetime_utc_iso(dt) == "2024-01-01T15:00:00+00:00"


def test_format_datetime_utc_iso_aware_converts_to_utc():
    tz_plus_5 = timezone(timedelta(hours=5))
    dt = datetime(2024, 1, 1, 15, 0, 0, tzinfo=tz_plus_5)
    assert format_datetime_utc_iso(dt) == "2024-01-01T10:00:00+00:00"


def test_format_datetime_utc_iso_already_utc():
    dt = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    assert format_datetime_utc_iso(dt) == "2024-01-01T10:00:00+00:00"
