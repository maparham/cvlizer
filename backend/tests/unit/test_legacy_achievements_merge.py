"""Unit tests for legacy_achievements_merge helpers."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.utils.legacy_achievements_merge import (
    merge_achievements_into_description,
    migrate_cv_dict,
)


class TestMergeAchievementsIntoDescription:
    def test_empty_list_removes_key_returns_false(self):
        item = {"description": "Existing desc", "achievements": []}
        changed = merge_achievements_into_description(item)
        assert changed is False
        assert "achievements" not in item
        assert item["description"] == "Existing desc"

    def test_absent_key_returns_false(self):
        item = {"description": "No achievements key"}
        changed = merge_achievements_into_description(item)
        assert changed is False
        assert item == {"description": "No achievements key"}

    def test_string_achievements_appended_to_existing_description(self):
        item = {
            "description": "Built systems",
            "achievements": ["Grew revenue 20%", "Led team of 5"],
        }
        changed = merge_achievements_into_description(item)
        assert changed is True
        assert "achievements" not in item
        assert (
            item["description"] == "Built systems\n\n- Grew revenue 20%\n- Led team of 5"
        )

    def test_string_achievements_set_when_description_empty(self):
        item = {"description": "", "achievements": ["Shipped feature X"]}
        changed = merge_achievements_into_description(item)
        assert changed is True
        assert item["description"] == "- Shipped feature X"

    def test_string_achievements_set_when_description_missing(self):
        item = {"achievements": ["Did something great"]}
        changed = merge_achievements_into_description(item)
        assert changed is True
        assert item["description"] == "- Did something great"

    def test_dict_with_bullet_key_normalized(self):
        item = {
            "description": "",
            "achievements": [
                {"bullet": "Optimised pipeline"},
                {"bullet": "Reduced latency"},
            ],
        }
        changed = merge_achievements_into_description(item)
        assert changed is True
        assert item["description"] == "- Optimised pipeline\n- Reduced latency"

    def test_mixed_str_and_bullet_dict(self):
        item = {
            "description": "Role summary",
            "achievements": ["Plain string", {"bullet": "Dict bullet"}],
        }
        merge_achievements_into_description(item)
        assert item["description"] == "Role summary\n\n- Plain string\n- Dict bullet"

    def test_empty_strings_skipped(self):
        item = {"description": "Desc", "achievements": ["", "  ", "Real achievement"]}
        changed = merge_achievements_into_description(item)
        assert changed is True
        assert item["description"] == "Desc\n\n- Real achievement"

    def test_all_blank_entries_returns_false(self):
        item = {"description": "Desc", "achievements": ["", "   "]}
        changed = merge_achievements_into_description(item)
        assert changed is False
        assert "achievements" not in item
        assert item["description"] == "Desc"

    def test_dict_without_bullet_key_skipped(self):
        item = {"description": "", "achievements": [{"other": "ignored"}, "kept"]}
        merge_achievements_into_description(item)
        assert item["description"] == "- kept"

    def test_honors_field_untouched(self):
        item = {
            "description": "Desc",
            "achievements": ["Achievement"],
            "honors": ["Cum Laude"],
        }
        merge_achievements_into_description(item)
        assert item["honors"] == ["Cum Laude"]

    def test_description_whitespace_stripped_before_append(self):
        item = {"description": "  Trimmed  ", "achievements": ["bullet"]}
        merge_achievements_into_description(item)
        assert item["description"] == "Trimmed\n\n- bullet"


class TestMigrateCvDict:
    def test_both_sections_processed(self):
        cv = {
            "work_experience": [
                {"id": "w1", "description": "Worked", "achievements": ["Achievement A"]},
                {"id": "w2", "description": "Also worked"},
            ],
            "education": [
                {"id": "e1", "description": "", "achievements": ["Graduated top 10%"]},
            ],
        }
        count = migrate_cv_dict(cv)
        assert count == 2
        assert cv["work_experience"][0]["description"] == "Worked\n\n- Achievement A"
        assert "achievements" not in cv["work_experience"][0]
        assert cv["work_experience"][1]["description"] == "Also worked"
        assert cv["education"][0]["description"] == "- Graduated top 10%"

    def test_returns_zero_when_no_achievements(self):
        cv = {
            "work_experience": [{"id": "w1", "description": "Clean"}],
            "education": [],
        }
        count = migrate_cv_dict(cv)
        assert count == 0

    def test_missing_sections_handled(self):
        cv = {}
        count = migrate_cv_dict(cv)
        assert count == 0

    def test_non_dict_items_skipped(self):
        cv = {"work_experience": ["not a dict", None]}
        count = migrate_cv_dict(cv)
        assert count == 0

    def test_empty_achievements_not_counted(self):
        cv = {"work_experience": [{"description": "Desc", "achievements": []}]}
        count = migrate_cv_dict(cv)
        assert count == 0
