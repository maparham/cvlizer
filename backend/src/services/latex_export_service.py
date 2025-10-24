"""
LaTeX Export Service - CV Document Generation and PDF Compilation

This module provides comprehensive LaTeX document generation and PDF compilation
services for CV data. It converts structured CV information into professional
LaTeX documents and compiles them to PDF using pdflatex with proper error
handling and timeout management.

Key responsibilities:
- Convert structured CV data to LaTeX document format
- Handle various CV sections (personal info, experience, education, skills)
- Escape special characters and format data for LaTeX compatibility
- Compile LaTeX documents to PDF using pdflatex subprocess
- Manage temporary files and cleanup operations
- Handle compilation timeouts and error recovery
- Support proper dictionary item handling in list formatting

Usage context:
- Used by CV export endpoints for generating PDF documents
- Handles complex CV data structures and formatting
- Provides robust error handling for compilation failures
- Manages subprocess execution with timeout protection

Dependencies:
- pdflatex binary for PDF compilation
- Temporary file management for compilation workspace
- Subprocess handling with timeout and error management
- LaTeX formatting utilities for data escaping and formatting
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from typing import Any, Dict, List

LATEX_REQUIRED_BIN = os.getenv("PDFLATEX_BIN", "pdflatex")


def is_latex_available() -> bool:
    """Return True if pdflatex is available on the system PATH (or PDFLATEX_BIN)."""
    return shutil.which(LATEX_REQUIRED_BIN) is not None


def _tex_escape(text: str | None) -> str:
    if not text:
        return ""
    # Basic LaTeX escaping
    replacements = {
        "\\": r"\textbackslash{}",
        "{": r"\{",
        "}": r"\}",
        "$": r"\$",
        "&": r"\&",
        "#": r"\#",
        "_": r"\_",
        "^": r"\^{}",
        "~": r"\~{}",
        "%": r"\%",
    }
    out = []
    for ch in text:
        out.append(replacements.get(ch, ch))
    return "".join(out)


def _section(title: str, body: str) -> str:
    return f"\\section*{{{_tex_escape(title)}}}\n{body}\n"


def _itemize(items: List[str]) -> str:
    if not items:
        return ""
    body = "\n".join(
        [
            f"\\item {_tex_escape(i.get('bullet', str(i)) if isinstance(i, dict) else str(i))}"
            for i in items
            if i
        ]
    )
    return f"\\begin{{itemize}}\n{body}\n\\end{{itemize}}\n"


def generate_cv_latex(parsed: Dict[str, Any], title: str) -> str:
    pi = parsed.get("personal_info", {}) if parsed else {}
    summary = parsed.get("professional_summary", {}) if parsed else {}
    wx = parsed.get("work_experience", []) if parsed else []
    ed = parsed.get("education", []) if parsed else []
    skills = parsed.get("skills", {}) if parsed else {}

    # Header block
    header_lines = [
        _tex_escape(pi.get("full_name", "")),
        _tex_escape(pi.get("email", "")),
        _tex_escape(pi.get("phone", "")),
        _tex_escape(pi.get("location", "")),
        _tex_escape(pi.get("linkedin_url", "")),
        _tex_escape(pi.get("website_url", "")),
        _tex_escape(pi.get("github_url", "")),
    ]
    header_lines = [l for l in header_lines if l]
    header = " \\ \textbullet{} ".join(header_lines)

    # Summary block
    summary_tex = _tex_escape(summary.get("content", ""))

    # Work Experience
    wx_blocks: List[str] = []
    for job in wx:
        line1 = f"\\textbf{{{_tex_escape(job.get('position',''))}}} at {_tex_escape(job.get('company',''))}"
        dates = f"{_tex_escape(job.get('start_date',''))} -- {_tex_escape(job.get('end_date',''))}"
        desc = _tex_escape(job.get("description", ""))
        achievements = _itemize(job.get("achievements", []) or [])
        wx_blocks.append(f"{line1}\\\\\n\\textit{{{dates}}}\\\\\n{desc}\n{achievements}")
    wx_tex = "\n\n".join(wx_blocks)

    # Education
    ed_blocks: List[str] = []
    for edu in ed:
        line1 = f"\\textbf{{{_tex_escape(edu.get('degree',''))}}}, {_tex_escape(edu.get('institution',''))}"
        dates = f"{_tex_escape(edu.get('start_date',''))} -- {_tex_escape(edu.get('end_date',''))}"
        ed_blocks.append(f"{line1}\\\\\n\\textit{{{dates}}}")
    ed_tex = "\n\n".join(ed_blocks)

    # Skills
    skills_lines: List[str] = []
    if skills.get("technical"):
        skills_lines.append(
            "Technical: " + ", ".join(_tex_escape(s) for s in skills["technical"])
        )
    if skills.get("soft"):
        skills_lines.append("Soft: " + ", ".join(_tex_escape(s) for s in skills["soft"]))
    if skills.get("languages"):
        lang_strs = []
        for l in skills["languages"]:
            lang_strs.append(
                f"{_tex_escape(l.get('language',''))} ({_tex_escape(l.get('proficiency',''))})"
            )
        skills_lines.append("Languages: " + ", ".join(lang_strs))
    skills_tex = "\\\n".join(skills_lines)

    body = []
    if header:
        body.append(
            f"\\begin{{center}}\n\\Large\\textbf{{{_tex_escape(title)}}}\\\\\n{header}\n\\end{{center}}\n"
        )
    if summary_tex:
        body.append(_section("Professional Summary", summary_tex))
    if wx_tex:
        body.append(_section("Work Experience", wx_tex))
    if ed_tex:
        body.append(_section("Education", ed_tex))
    if skills_tex:
        body.append(_section("Skills", skills_tex))

    content = "\n\n".join(body)

    return f"""
\\documentclass[12pt]{{article}}
\\usepackage[margin=0.8in]{{geometry}}
\\usepackage[T1]{{fontenc}}
\\usepackage[utf8]{{inputenc}}
\\usepackage{{lmodern}}
\\usepackage{{microtype}}
\\usepackage{{hyperref}}
\\usepackage{{enumitem}}
\\usepackage{{xcolor}}
\\usepackage{{fancyhdr}}

% High quality font settings
\\renewcommand{{\\rmdefault}}{{lmr}}
\\renewcommand{{\\sfdefault}}{{lmss}}
\\renewcommand{{\\ttdefault}}{{lmtt}}

% Microtype for better typography
\\microtypesetup{{protrusion=true, expansion=true}}

% Better spacing
\\setlist[itemize]{{topsep=3pt, itemsep=2pt, parsep=1pt, partopsep=0pt}}
\\pagenumbering{{gobble}}

% High quality PDF output
\\pdfcompresslevel=0
\\pdfobjcompresslevel=0

\\begin{{document}}
{content}
\\end{{document}}
"""


def compile_pdf_from_latex(tex_source: str) -> bytes:
    """Compile LaTeX source to PDF using pdflatex and return the PDF bytes.

    Raises RuntimeError on compilation failure.
    """
    if not is_latex_available():
        raise RuntimeError("pdflatex is not available on the server")

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "cv.tex")
        pdf_path = os.path.join(tmpdir, "cv.pdf")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(tex_source)

        # Run pdflatex with high quality settings (twice to settle references if needed)
        cmd = [
            LATEX_REQUIRED_BIN,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-output-format=pdf",
            "-output-directory=.",
            "-synctex=1",
            "cv.tex",
        ]
        for _ in range(2):
            try:
                proc = subprocess.run(
                    cmd,
                    cwd=tmpdir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=20,
                )
                if proc.returncode != 0:
                    raise RuntimeError(f"pdflatex failed: {proc.stdout[-1000:]}")
            except subprocess.TimeoutExpired as e:
                captured_output = e.stdout[-1000:] if e.stdout else "No output captured"
                raise RuntimeError(
                    f"pdflatex timed out after 20 seconds. Output: {captured_output}"
                )

        if not os.path.exists(pdf_path):
            raise RuntimeError("PDF not generated")

        with open(pdf_path, "rb") as pf:
            return pf.read()
