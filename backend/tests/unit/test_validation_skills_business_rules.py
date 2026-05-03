"""Business-rule validation for skills.technical (categorized dict vs legacy shapes)."""

from src.utils.validation import CVDataValidator


def _base_cv():
    return {
        "personal_info": {
            "full_name": "Test User",
            "email": "test@example.com",
            "location": "Test City",
        },
    }


def test_skills_categorized_dict_with_skill_passes():
    data = {
        **_base_cv(),
        "skills": {"technical": {"Programming Languages": ["Python"]}},
    }
    errors = CVDataValidator.validate_business_rules(data)
    assert not any(e.startswith("Skills:") for e in errors)


def test_skills_categorized_dict_empty_categories_fails():
    data = {**_base_cv(), "skills": {"technical": {}}}
    errors = CVDataValidator.validate_business_rules(data)
    assert any("Skills:" in e for e in errors)


def test_skills_legacy_flat_technical_list_passes():
    data = {**_base_cv(), "skills": {"technical": ["Go", "Rust"]}}
    errors = CVDataValidator.validate_business_rules(data)
    assert not any(e.startswith("Skills:") for e in errors)


def test_skills_legacy_soft_only_passes():
    data = {**_base_cv(), "skills": {"technical": {}, "soft": ["Communication"]}}
    errors = CVDataValidator.validate_business_rules(data)
    assert not any(e.startswith("Skills:") for e in errors)


def test_skills_section_whitespace_only_fails():
    data = {
        **_base_cv(),
        "skills": {"technical": {"General": ["", "   "]}, "soft": []},
    }
    errors = CVDataValidator.validate_business_rules(data)
    assert any("Skills:" in e for e in errors)
