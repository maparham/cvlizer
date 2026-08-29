"""Unit tests for the AI attribution footnote in the LaTeX export service.

The footnote credits rahkar.pro for the job-tailored ``why_good_fit`` section.
It is opt-out per CV and must never appear on a CV that does not actually
render an AI-generated section.
"""

import pytest

from src.services.cv.cv_export_naming import resolve_show_ai_attribution
from src.services.cv.latex_export_service import (
    AI_ATTRIBUTION_TEXT,
    _format_ai_attribution,
    generate_cv_latex,
)

TEMPLATE = "standard"


def _parsed(*, with_ai_section: bool, visible: bool = True) -> dict:
    """Build a minimal parsed CV, optionally carrying the AI-tailored section."""
    custom_sections = []
    sections = [
        {"id": "work_experience", "type": "work_experience", "order": 1, "visible": True}
    ]
    if with_ai_section:
        custom_sections.append(
            {
                "id": "why_good_fit",
                "type": "cover_letter",
                "title": "Why I'm a Good Fit",
                "content": "I am a strong match for this role.",
            }
        )
        sections.append(
            {
                "id": "why_good_fit",
                "type": "custom",
                "title": "Why I'm a Good Fit",
                "order": 2,
                "visible": visible,
            }
        )

    return {
        "personal_info": {"name": "Ada Lovelace", "email": "ada@example.com"},
        "custom_sections": custom_sections,
        "work_experience": [
            {
                "position": "Engineer",
                "company": "Acme",
                "start_date": "2020-01-01",
                "end_date": "2021-01-01",
                "description": "- Did a thing",
            }
        ],
        "section_config": {"sections": sections},
    }


class TestAIAttributionFootnote:
    def test_rendered_by_default_when_ai_section_present(self):
        tex = generate_cv_latex(
            _parsed(with_ai_section=True), "My CV", template_name=TEMPLATE
        )
        assert AI_ATTRIBUTION_TEXT in tex

    def test_omitted_when_disabled(self):
        tex = generate_cv_latex(
            _parsed(with_ai_section=True),
            "My CV",
            template_name=TEMPLATE,
            show_ai_attribution=False,
        )
        assert AI_ATTRIBUTION_TEXT not in tex

    def test_omitted_when_cv_has_no_ai_section(self):
        tex = generate_cv_latex(
            _parsed(with_ai_section=False),
            "My CV",
            template_name=TEMPLATE,
            show_ai_attribution=True,
        )
        assert AI_ATTRIBUTION_TEXT not in tex

    def test_omitted_when_ai_section_hidden_from_export(self):
        tex = generate_cv_latex(
            _parsed(with_ai_section=True, visible=False),
            "My CV",
            template_name=TEMPLATE,
            show_ai_attribution=True,
        )
        assert AI_ATTRIBUTION_TEXT not in tex

    def test_rendered_without_section_config_default_order(self):
        parsed = _parsed(with_ai_section=True)
        parsed.pop("section_config")
        tex = generate_cv_latex(parsed, "My CV", template_name=TEMPLATE)
        assert AI_ATTRIBUTION_TEXT in tex

    def test_placed_at_end_of_content_before_document_end(self):
        tex = generate_cv_latex(
            _parsed(with_ai_section=True), "My CV", template_name=TEMPLATE
        )
        assert tex.index("Acme") < tex.index(AI_ATTRIBUTION_TEXT)
        assert tex.index(AI_ATTRIBUTION_TEXT) < tex.index("\\end{document}")

    def test_uses_no_parbox_so_it_cannot_force_a_blank_page(self):
        block = _format_ai_attribution()
        assert AI_ATTRIBUTION_TEXT in block
        assert "\\parbox" not in block
        assert "\\newpage" not in block
        assert "\\clearpage" not in block
        # A real numbered footnote would reflow pagination; this must stay inline.
        assert "\\footnote{" not in block

    def test_null_column_resolves_to_enabled_without_backfill(self):
        # Rows predating the column read as NULL and must still show the credit.
        assert resolve_show_ai_attribution(None) is True
        assert resolve_show_ai_attribution(True) is True
        assert resolve_show_ai_attribution(False) is False

    @pytest.mark.parametrize("template", ["standard", "spacious", "jake", "traditional"])
    def test_rendered_for_every_template(self, template):
        tex = generate_cv_latex(
            _parsed(with_ai_section=True), "My CV", template_name=template
        )
        assert AI_ATTRIBUTION_TEXT in tex
