"""Proofread branch: detect any skill suggestion lists in quality response."""

from src.services.ai_service.cv_quality_service import (
    _proofread_skill_suggestions_present,
)


def test_detects_legacy_technical_list():
    assert _proofread_skill_suggestions_present(
        {"technical": [{"skill": "X", "reasoning": "y" * 15}]}
    )


def test_detects_dynamic_category():
    assert _proofread_skill_suggestions_present(
        {"Soft Skills": [{"skill": "Leadership", "reasoning": "z" * 15}]}
    )


def test_empty_skills_false():
    assert not _proofread_skill_suggestions_present({})
    assert not _proofread_skill_suggestions_present({"technical": [], "soft": []})
    assert not _proofread_skill_suggestions_present(None)
