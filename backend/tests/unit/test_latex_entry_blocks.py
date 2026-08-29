"""Unit tests for dated CV entry blocks in the LaTeX export service.

Entries must not be wrapped in \\parbox: an unbreakable box pushes a tall
entry to the next page and strands the section heading above it.
"""

from src.services.cv.latex_export_service import (
    _format_education,
    _format_volunteer_experience,
    _format_work_experience,
)


class TestEntriesArePageBreakable:
    def test_work_experience_emits_no_parbox(self):
        out = _format_work_experience(
            [
                {
                    "position": "Engineer",
                    "company": "Acme",
                    "start_date": "2020-01-01",
                    "end_date": "2021-01-01",
                    "description": "- Did a thing\n- Did another thing",
                }
            ]
        )
        assert "\\parbox" not in out

    def test_education_emits_no_parbox(self):
        out = _format_education(
            [
                {
                    "degree": "BSc",
                    "field_of_study": "Physics",
                    "institution": "Uni",
                    "start_date": "2010-01-01",
                    "end_date": "2013-01-01",
                }
            ]
        )
        assert "\\parbox" not in out

    def test_volunteer_emits_no_parbox(self):
        out = _format_volunteer_experience(
            [
                {
                    "role": "Mentor",
                    "organization": "Club",
                    "start_date": "2019-01-01",
                    "end_date": "2020-01-01",
                    "description": "Helped out.",
                }
            ]
        )
        assert "\\parbox" not in out

    def test_body_is_outside_the_heading_box(self):
        """Bullets must sit after the heading minipages, not inside them."""
        out = _format_work_experience(
            [
                {
                    "position": "Engineer",
                    "company": "Acme",
                    "start_date": "2020-01-01",
                    "end_date": "2021-01-01",
                    "description": "- A bullet",
                }
            ]
        )
        assert out.index("\\end{minipage}") < out.index("\\begin{itemize}")

    def test_heading_reserves_space_and_stays_with_body(self):
        out = _format_work_experience(
            [
                {
                    "position": "Engineer",
                    "company": "Acme",
                    "start_date": "2020-01-01",
                    "end_date": "2021-01-01",
                    "description": "- A bullet",
                }
            ]
        )
        assert "\\needspace" in out
        assert "\\nopagebreak" in out

    def test_dates_still_render_right_aligned(self):
        out = _format_work_experience(
            [
                {
                    "position": "Engineer",
                    "company": "Acme",
                    "start_date": "2020-01-01",
                    "end_date": None,
                }
            ]
        )
        assert "\\raggedleft" in out
        assert "PRESENT" in out


class TestDegreeFieldNotDuplicated:
    def test_field_appended_when_degree_omits_it(self):
        out = _format_education(
            [
                {
                    "degree": "MSc",
                    "field_of_study": "Computer Science",
                    "institution": "Uni",
                    "start_date": "2010-01-01",
                    "end_date": "2012-01-01",
                }
            ]
        )
        assert "MSc in Computer Science" in out

    def test_field_not_appended_when_degree_already_names_it(self):
        out = _format_education(
            [
                {
                    "degree": "MSc in Computer Science",
                    "field_of_study": "Computer Science",
                    "institution": "Uni",
                    "start_date": "2010-01-01",
                    "end_date": "2012-01-01",
                }
            ]
        )
        assert "in Computer Science in Computer Science" not in out

    def test_match_is_case_insensitive(self):
        out = _format_education(
            [
                {
                    "degree": "PhD in COMPUTER SCIENCE",
                    "field_of_study": "Computer Science",
                    "institution": "Uni",
                    "start_date": "2018-01-01",
                    "end_date": "2022-01-01",
                }
            ]
        )
        assert out.lower().count("computer science") == 1
