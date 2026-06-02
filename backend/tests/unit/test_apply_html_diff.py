"""
Unit tests for apply_html_diff (patch-based find-replace).

Covers:
- Full-text html_diff (legacy format) — backward compatibility
- Partial html_diff (changed lines/sentences only) — new compact format
- Multiple patches in one diff
- Disambiguation via context when the same phrase appears twice
- Deletion-only patches
- Standalone insertion patches
- Edge cases: empty inputs, no markup
"""

import pytest
from src.services.ai_service.writing_corrections_service import apply_html_diff


class TestApplyHtmlDiffLegacyFullText:
    """Backward-compatible: full-text html_diff still works correctly."""

    def test_simple_replacement(self):
        original = "My sumary text."
        html_diff = "My <del>sumary</del><ins>summary</ins> text."
        assert apply_html_diff(original, html_diff) == "My summary text."

    def test_replacement_at_end_of_sentence(self):
        original = "I grew up in northeast Iran."
        html_diff = "I grew up in <del>northeast</del><ins>northeastern</ins> Iran."
        assert apply_html_diff(original, html_diff) == "I grew up in northeastern Iran."

    def test_multiple_replacements_in_full_text(self):
        original = "Working in dev jobs and Teaching CS courses."
        html_diff = "<del>Working</del><ins>Worked</ins> in dev jobs and <del>Teaching</del><ins>Taught</ins> CS courses."
        assert (
            apply_html_diff(original, html_diff)
            == "Worked in dev jobs and Taught CS courses."
        )

    def test_deletion_only(self):
        original = "too overqualified for the job"
        html_diff = "<del>too </del>overqualified for the job"
        assert apply_html_diff(original, html_diff) == "overqualified for the job"

    def test_no_markup_returns_html_diff_directly(self):
        original = "anything"
        html_diff = "plain text no tags"
        assert apply_html_diff(original, html_diff) == "plain text no tags"

    def test_empty_html_diff_returns_original(self):
        assert apply_html_diff("original text", "") == "original text"
        assert apply_html_diff("original text", "   ") == "original text"


class TestApplyHtmlDiffPartial:
    """New compact format: html_diff contains only the changed line(s)."""

    def test_single_changed_sentence_among_many(self):
        original = (
            "I did a PhD in CS.\n\n"
            "I grew up in northeast Iran.\n\n"
            "I moved to Europe when I was 28."
        )
        # html_diff contains only the changed sentence
        html_diff = "I grew up in <del>northeast</del><ins>northeastern</ins> Iran."
        result = apply_html_diff(original, html_diff)
        assert result == (
            "I did a PhD in CS.\n\n"
            "I grew up in northeastern Iran.\n\n"
            "I moved to Europe when I was 28."
        )

    def test_single_changed_bullet_among_many(self):
        original = (
            "- Worked in software development jobs in Tehran\n"
            "- Teaching fundamental CS courses in several institutes\n"
            "- Other unchanged bullet"
        )
        html_diff = "- <del>Teaching</del><ins>Taught</ins> fundamental CS courses in several institutes"
        result = apply_html_diff(original, html_diff)
        assert result == (
            "- Worked in software development jobs in Tehran\n"
            "- Taught fundamental CS courses in several institutes\n"
            "- Other unchanged bullet"
        )

    def test_multiple_changed_bullets_as_partial_diff(self):
        original = (
            "- Working in software dev jobs\n"
            "- Teaching CS courses\n"
            "- Unchanged bullet"
        )
        html_diff = (
            "- <del>Working</del><ins>Worked</ins> in software dev jobs\n"
            "- <del>Teaching</del><ins>Taught</ins> CS courses"
        )
        result = apply_html_diff(original, html_diff)
        assert result == (
            "- Worked in software dev jobs\n" "- Taught CS courses\n" "- Unchanged bullet"
        )

    def test_two_patches_in_same_changed_line(self):
        original = "- Working in numerous software dev jobs in Tehran"
        html_diff = "- <del>Working</del><ins>Worked</ins> in numerous software <del>dev</del><ins>development</ins> jobs in Tehran"
        result = apply_html_diff(original, html_diff)
        assert result == "- Worked in numerous software development jobs in Tehran"


class TestApplyHtmlDiffDisambiguation:
    """Context is used to pick the right occurrence when old text appears twice."""

    def test_same_word_twice_context_selects_first(self):
        original = "I studied at a university. She studied at another university."
        # Diff targets the first "university"
        html_diff = "I studied at a <del>university</del><ins>University</ins>."
        result = apply_html_diff(original, html_diff)
        assert result == "I studied at a University. She studied at another university."

    def test_same_word_twice_context_selects_second(self):
        original = "I studied at a university. She studied at another university."
        # Diff targets the second "university" via different context
        html_diff = "She studied at another <del>university</del><ins>University</ins>."
        result = apply_html_diff(original, html_diff)
        assert result == "I studied at a university. She studied at another University."


class TestApplyHtmlDiffEdgeCases:
    """Edge cases that should not raise or corrupt text."""

    def test_patch_not_found_returns_original_unchanged(self):
        original = "completely different text"
        html_diff = "<del>northeast</del><ins>northeastern</ins>"
        # Patch text not in original — should return original unchanged
        result = apply_html_diff(original, html_diff)
        assert result == original

    def test_empty_original_with_no_markup(self):
        assert apply_html_diff("", "") == ""

    def test_standalone_insertion_with_context(self):
        original = "I grew up in Iran."
        # Insert " northeastern" after "in"
        html_diff = "I grew up in<ins> northeastern</ins> Iran."
        result = apply_html_diff(original, html_diff)
        assert result == "I grew up in northeastern Iran."

    def test_deletion_only_removes_text(self):
        original = "not quite happy with this choice"
        html_diff = "<del>not quite </del>happy with this choice"
        assert apply_html_diff(original, html_diff) == "happy with this choice"

    def test_multiline_original_with_del_ins_across_bullet(self):
        original = "- Left because it was purely tedious development work and I felt too overqualified for the job"
        html_diff = "- Left because it was purely tedious development work and I felt <del>too </del>overqualified for the job."
        result = apply_html_diff(original, html_diff)
        assert "too " not in result
        assert "overqualified" in result
