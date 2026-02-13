"""
Unit tests for timeline_analyzer.

Tests date parsing (including YYYY-MM normalization) and gap detection.
"""

import pytest
from datetime import datetime

from src.utils.timeline_analyzer import (
    _normalize_date_for_parse,
    parse_date,
    analyze_timeline_gaps,
    calculate_gap_months,
)


class TestNormalizeDateForParse:
    """Test month-only date normalization."""

    def test_yyyy_mm_normalized_to_first_of_month(self):
        assert _normalize_date_for_parse("2020-06") == "2020-06-01"
        assert _normalize_date_for_parse("2019-01") == "2019-01-01"

    def test_yyyy_mm_dd_unchanged(self):
        assert _normalize_date_for_parse("2020-06-15") == "2020-06-15"
        assert _normalize_date_for_parse("2019-01-01") == "2019-01-01"

    def test_empty_returns_none(self):
        assert _normalize_date_for_parse("") is None
        assert _normalize_date_for_parse("   ") is None

    def test_invalid_yyyy_mm_returned_unchanged(self):
        # Invalid month 13 -> strptime would fail; helper returns as-is
        result = _normalize_date_for_parse("2020-13")
        assert result == "2020-13"  # parse_date will then return None


class TestParseDate:
    """Test parse_date with normalized input."""

    def test_month_only_parses_as_first_of_month(self):
        assert parse_date("2020-06") == datetime(2020, 6, 1)
        assert parse_date("2019-12") == datetime(2019, 12, 1)

    def test_full_date_parses(self):
        assert parse_date("2020-06-15") == datetime(2020, 6, 15)
        assert parse_date("2019-01-01") == datetime(2019, 1, 1)

    def test_empty_returns_none(self):
        assert parse_date("") is None
        assert parse_date("   ") is None

    def test_invalid_returns_none(self):
        assert parse_date("not-a-date") is None
        assert parse_date("2020-13-01") is None


class TestAnalyzeTimelineGapsWithMonthOnlyDates:
    """Test that timeline gap logic accepts month-only dates."""

    def test_month_only_dates_used_in_gap_detection(self):
        cv_data = {
            "work_experience": [
                {
                    "id": "w1",
                    "start_date": "2020-06",
                    "end_date": "2021-03",
                    "current": False,
                    "position": "Dev",
                    "company": "Co",
                },
                {
                    "id": "w2",
                    "start_date": "2021-07",
                    "end_date": "2022-01",
                    "current": False,
                    "position": "Dev",
                    "company": "Co2",
                },
            ],
            "education": [],
        }
        gaps = analyze_timeline_gaps(cv_data)
        assert len(gaps) == 1
        assert gaps[0]["gap_duration_months"] >= 3
        assert gaps[0]["gap_type"] == "work_experience"

    def test_full_dates_still_work(self):
        cv_data = {
            "work_experience": [
                {
                    "id": "w1",
                    "start_date": "2020-06-01",
                    "end_date": "2021-03-15",
                    "current": False,
                    "position": "Dev",
                    "company": "Co",
                },
                {
                    "id": "w2",
                    "start_date": "2021-07-01",
                    "end_date": "2022-01-01",
                    "current": False,
                    "position": "Dev",
                    "company": "Co2",
                },
            ],
            "education": [],
        }
        gaps = analyze_timeline_gaps(cv_data)
        assert len(gaps) == 1
