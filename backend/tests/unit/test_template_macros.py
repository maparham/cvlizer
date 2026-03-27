import pytest

from src.services.cv.latex_export_service import (
    _format_personal_info_header,
    generate_cv_latex,
)


MINIMAL_PARSED = {
    "personal_info": {
        "full_name": "Test User",
        "email": "test@example.com",
    },
    "professional_summary": {"content": "Seasoned engineer with impact."},
    "section_config": {
        "sections": [
            {
                "type": "professional_summary",
                "title": "Summary",
                "visible": True,
                "order": 1,
            }
        ]
    },
}


@pytest.mark.parametrize(
    "template_name,expected_macro",
    [
        ("standard", "\\standardsection"),
        ("traditional", "\\traditionalsection"),
        ("spacious", "\\spacioussection"),
    ],
)
def test_generate_contains_template_section_macro(
    template_name: str, expected_macro: str
):
    latex = generate_cv_latex(MINIMAL_PARSED, title="CV", template_name=template_name)
    assert expected_macro in latex


def test_personal_info_header_social_links_below_primary_on_one_row():
    """Row 1 location | email | phone (no field labels); social row below."""
    pi = {
        "full_name": "Test User",
        "location": "Vienna, Austria",
        "email": "test@example.com",
        "phone": "+10000000000",
        "linkedin_url": "linkedin.com/in/test",
        "github_url": "github.com/testuser",
    }
    out = _format_personal_info_header(pi, template_name="standard")
    assert out.count("\\begin{tabular}") >= 2
    assert "Location:" not in out and "Phone:" not in out and "Email:" not in out
    assert "LinkedIn:" not in out and "GitHub:" not in out
    assert out.index("Vienna") < out.index("test@example.com")
    assert out.index("test@example.com") < out.index("+10000000000")
    li = out.index("linkedin.com/in/test")
    gh = out.index("github.com/testuser")
    assert out.index("+10000000000") < li < gh
    assert "&" in out[li:gh]
