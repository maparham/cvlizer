"""Tests for LaTeX input detection and boilerplate stripping (CV parsing)."""

from unittest.mock import AsyncMock, patch

from src.services.cv.latex_input import is_latex_source, strip_latex_boilerplate

MODERNCV_SAMPLE = r"""% CV of Jane Doe
\documentclass[11pt,a4paper,sans]{moderncv}
\moderncvstyle{classic}
\moderncvcolor{blue}
\usepackage[scale=0.75]{geometry}
\name{Jane}{Doe}
\title{Senior Engineer}
\begin{document}
\makecvtitle
\section{Experience}
\cventry{2019--2024}{Senior Engineer}{Acme Corp}{Berlin}{}{Led a team of 5. Improved throughput by 40\%.}
\section{Education}
\cventry{2015--2019}{BSc Computer Science}{TU Berlin}{}{}{}
\end{document}
"""


class TestIsLatexSource:
    def test_detects_documentclass(self):
        assert is_latex_source(MODERNCV_SAMPLE) is True

    def test_detects_body_without_preamble(self):
        text = r"""\begin{document}
\section{Experience}
\textbf{Acme Corp} --- Engineer
\end{document}"""
        assert is_latex_source(text) is True

    def test_detects_command_dense_fragment(self):
        text = r"""\section{Experience}
\textbf{Acme Corp} \hfill 2019--2024 \\
\begin{itemize}
\item Led a team of 5 engineers
\item Shipped \emph{three} major releases
\end{itemize}
\section{Education}
\textit{TU Berlin} \\
"""
        assert is_latex_source(text) is True

    def test_plain_text_cv_is_not_latex(self):
        text = """Jane Doe
Senior Engineer

Experience
Acme Corp, Berlin (2019-2024)
- Led a team of 5
- Improved throughput by 40%
"""
        assert is_latex_source(text) is False

    def test_text_with_stray_backslash_is_not_latex(self):
        text = "Skills: C:\\dev tooling, path\\to\\things, 50% travel"
        assert is_latex_source(text) is False

    def test_empty_string_is_not_latex(self):
        assert is_latex_source("") is False


class TestStripLatexBoilerplate:
    def test_drops_preamble_keeps_body(self):
        result = strip_latex_boilerplate(MODERNCV_SAMPLE)
        assert "documentclass" not in result
        assert "usepackage" not in result
        assert "moderncvstyle" not in result
        assert "Led a team of 5" in result
        assert "TU Berlin" in result

    def test_keeps_name_and_title_from_preamble(self):
        # Preamble often carries identity via \name/\title — content must survive.
        result = strip_latex_boilerplate(MODERNCV_SAMPLE)
        assert "Jane" in result
        assert "Doe" in result
        assert "Senior Engineer" in result

    def test_strips_comment_lines_and_trailing_comments(self):
        text = "\\begin{document}\n% full comment line\nReal content % trailing comment\n\\end{document}"
        result = strip_latex_boilerplate(text)
        assert "full comment line" not in result
        assert "trailing comment" not in result
        assert "Real content" in result

    def test_preserves_escaped_percent(self):
        text = "\\begin{document}\nImproved throughput by 40\\% overall\n\\end{document}"
        result = strip_latex_boilerplate(text)
        assert "40\\% overall" in result

    def test_strips_setup_commands_without_document_env(self):
        text = r"""\usepackage{fontawesome}
\newcommand{\cvitem}[1]{\textbf{#1}}
\definecolor{accent}{RGB}{0,100,200}
\section{Experience}
Acme Corp, Engineer"""
        result = strip_latex_boilerplate(text)
        assert "usepackage" not in result
        assert "newcommand" not in result
        assert "definecolor" not in result
        assert "Acme Corp" in result

    def test_shrinks_oversized_latex_under_parse_cap(self):
        # A realistic failure mode: huge preamble pushes source over the 15k cap.
        preamble_bloat = "\n".join(
            r"\newcommand{\cmd%d}[1]{\textbf{#1}}" % i for i in range(600)
        )
        body = "\\begin{document}\nJane Doe, Engineer at Acme. Led projects.\n\\end{document}"
        text = preamble_bloat + "\n" + body
        assert len(text) > 15000
        result = strip_latex_boilerplate(text)
        assert len(result) < 15000
        assert "Jane Doe" in result

    def test_plain_text_passes_through_unchanged(self):
        text = "Jane Doe\nEngineer at Acme\n- Led a team"
        assert strip_latex_boilerplate(text) == text


class TestParseCvTextWithLatex:
    """parse_cv_text_with_openai strips LaTeX boilerplate before length gate and AI call."""

    @patch("src.services.ai_service.cv_parsing.is_ai_enabled", return_value=True)
    @patch(
        "src.services.ai_service.cv_parsing.call_openai_with_schema",
        new_callable=AsyncMock,
    )
    async def test_oversized_latex_passes_length_gate_stripped(
        self, mock_call, _mock_enabled
    ):
        from src.services.ai_service.cv_parsing import parse_cv_text_with_openai

        mock_call.return_value = ({"is_valid_cv": True}, {})
        preamble_bloat = "\n".join(
            r"\newcommand{\cmd%d}[1]{\textbf{#1}}" % i for i in range(600)
        )
        text = (
            preamble_bloat
            + "\n\\begin{document}\nJane Doe, Engineer at Acme. Led projects.\n\\end{document}"
        )
        assert len(text) > 15000

        result = await parse_cv_text_with_openai(text)

        assert "error" not in result
        sent_prompt = mock_call.call_args.kwargs["user_prompt"]
        assert "newcommand" not in sent_prompt
        assert "Jane Doe" in sent_prompt

    @patch("src.services.ai_service.cv_parsing.is_ai_enabled", return_value=True)
    @patch(
        "src.services.ai_service.cv_parsing.call_openai_with_schema",
        new_callable=AsyncMock,
    )
    async def test_plain_text_sent_unchanged(self, mock_call, _mock_enabled):
        from src.services.ai_service.cv_parsing import parse_cv_text_with_openai

        mock_call.return_value = ({"is_valid_cv": True}, {})
        text = "Jane Doe\nEngineer at Acme Corp since 2019\n- Led a team of 5"

        await parse_cv_text_with_openai(text)

        assert mock_call.call_args.kwargs["user_prompt"] == text

    @patch("src.services.ai_service.cv_parsing.is_ai_enabled", return_value=True)
    @patch(
        "src.services.ai_service.cv_parsing.call_openai_with_schema",
        new_callable=AsyncMock,
    )
    async def test_prompt_mentions_markup_handling(self, mock_call, _mock_enabled):
        from src.services.ai_service.cv_parsing import parse_cv_text_with_openai

        mock_call.return_value = ({"is_valid_cv": True}, {})

        await parse_cv_text_with_openai("Jane Doe, Engineer at Acme Corp")

        system_prompt = mock_call.call_args.kwargs["system_prompt"]
        assert "LaTeX" in system_prompt
