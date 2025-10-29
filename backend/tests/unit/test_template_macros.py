import pytest

from src.services.latex_export_service import generate_cv_latex


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
        ("compact", "\\compactsection"),
        ("traditional", "\\traditionalsection"),
        ("spacious", "\\spacioussection"),
    ],
)
def test_generate_contains_template_section_macro(
    template_name: str, expected_macro: str
):
    latex = generate_cv_latex(MINIMAL_PARSED, title="CV", template_name=template_name)
    assert expected_macro in latex
