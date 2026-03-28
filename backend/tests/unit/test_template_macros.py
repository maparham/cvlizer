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
    """Row 1 location | email | phone; link row website | LinkedIn | GitHub."""
    pi = {
        "full_name": "Test User",
        "location": "Vienna, Austria",
        "email": "test@example.com",
        "phone": "+10000000000",
        "website_url": "portfolio.example.dev",
        "linkedin_url": "linkedin.com/in/test",
        "github_url": "github.com/testuser",
    }
    out = _format_personal_info_header(pi, template_name="standard")
    assert out.count("\\begin{tabular}") == 1
    assert "Location:" not in out and "Phone:" not in out and "Email:" not in out
    assert "LinkedIn:" not in out and "GitHub:" not in out
    assert out.index("Vienna") < out.index("test@example.com")
    assert out.index("test@example.com") < out.index("+10000000000")
    site = out.index("portfolio.example.dev")
    li = out.index("linkedin.com/in/test")
    gh = out.index("github.com/testuser")
    assert out.index("+10000000000") < site < li < gh
    assert "&" in out[site:li] and "&" in out[li:gh]


def test_personal_info_header_single_social_uses_three_columns():
    """One link in the social row still uses three columns (no full-width row)."""
    pi = {
        "full_name": "Test User",
        "location": "Vienna, Austria",
        "email": "test@example.com",
        "phone": "+10000000000",
        "linkedin_url": "linkedin.com/in/onlysocial",
    }
    out = _format_personal_info_header(pi, template_name="standard")
    assert out.count("\\begin{tabular}") == 1
    social_line = next(l for l in out.splitlines() if "linkedin.com/in/onlysocial" in l)
    assert social_line.count(" & ") == 2


def test_second_row_social_left_packed_without_website():
    """LinkedIn + GitHub occupy columns 1–2, not 2–3, when website is absent."""
    pi = {
        "full_name": "Test User",
        "location": "Vienna, Austria",
        "email": "test@example.com",
        "phone": "+10000000000",
        "linkedin_url": "linkedin.com/in/a",
        "github_url": "github.com/gh",
    }
    out = _format_personal_info_header(pi, template_name="standard")
    row2 = out.split("\\\\[0.35ex]\n", 1)[1].split("\\\\")[0]
    assert row2.strip().startswith("\\href")
    assert row2.index("linkedin.com") < row2.index("github.com")


def test_personal_info_header_social_only_single_link_uses_minipage():
    pi = {
        "full_name": "Solo",
        "linkedin_url": "linkedin.com/in/only",
    }
    out = _format_personal_info_header(pi, template_name="standard")
    assert "\\begin{minipage}" in out
    assert "\\begin{tabular}" not in out


def test_jake_header_puts_urls_on_second_line():
    pi = {
        "full_name": "Test User",
        "location": "Vienna",
        "email": "a@b.c",
        "phone": "+1",
        "linkedin_url": "linkedin.com/in/x",
    }
    out = _format_personal_info_header(pi, template_name="jake")
    assert out.count("\\\\") >= 2
    assert out.index("Vienna") < out.index("linkedin.com/in/x")
    assert out.index("+1") < out.index("linkedin.com/in/x")
