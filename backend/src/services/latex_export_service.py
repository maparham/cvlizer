"""
LaTeX Export Service - CV Document Generation and PDF Compilation

This module provides comprehensive LaTeX document generation and PDF compilation
services for CV data. It converts structured CV information into professional
LaTeX documents and compiles them to PDF using pdflatex with proper error
handling and timeout management.

Key responsibilities:
- Convert structured CV data to LaTeX document format
- Handle all 10 CV sections (personal info, summary, experience, education, skills, etc.)
- Escape special characters and format data for LaTeX compatibility
- Compile LaTeX documents to PDF using pdflatex subprocess
- Manage temporary files and cleanup operations
- Handle compilation timeouts and error recovery
- Support proper dictionary item handling in list formatting
- Respect user's section_config for custom ordering and visibility

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
from typing import Any, Dict, List, Optional

from src.services.template_loader import load_template, is_template_available

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
    """Create a section with underlined heading and prevent page breaks."""
    # Use \needspace to request space before section title
    # This ensures the section title doesn't get orphaned at the bottom of a page
    escaped_title = _tex_escape(title)
    return f"\\needspace{{4\\baselineskip}}\\noindent{{\\Large\\textbf{{{escaped_title}}}}}\\\\[-1ex]\n\\rule{{\\textwidth}}{{0.4pt}}\\\\[0.5ex]\n{body}\\vspace{{0.5\\baselineskip}}\n"


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


def _format_certifications(certs: List[Dict[str, Any]]) -> str:
    """Format certifications section."""
    if not certs:
        return ""
    blocks: List[str] = []
    for cert in certs:
        name = _tex_escape(cert.get("name", ""))
        issuer = _tex_escape(cert.get("issuer", ""))
        date = _tex_escape(cert.get("date", ""))
        expiry_date = _tex_escape(cert.get("expiry_date", ""))
        desc = _tex_escape(cert.get("description", ""))

        line1 = f"\\textbf{{{name}}}, {issuer}"
        dates = date
        if expiry_date:
            dates = f"{date} -- {expiry_date}"
        elif date:
            dates = f"Issued: {date}"

        block = f"{line1}\\\\\n\\textit{{{dates}}}"
        if desc:
            block += f"\\\\\n{desc}"
        blocks.append(block)
    return "\n\n".join(blocks)


def _format_projects(projects: List[Dict[str, Any]]) -> str:
    """Format projects section."""
    if not projects:
        return ""
    blocks: List[str] = []
    for proj in projects:
        name = _tex_escape(proj.get("name", ""))
        desc = _tex_escape(proj.get("description", ""))
        url = _tex_escape(proj.get("url", ""))
        tech = proj.get("technologies", []) or []

        line1 = f"\\textbf{{{name}}}"
        if url:
            line1 += f" (\\href{{{url}}}{{{url}}})"

        block_lines = [line1]
        if desc:
            block_lines.append(desc)
        if tech:
            tech_str = ", ".join(_tex_escape(t) for t in tech)
            block_lines.append(f"\\textit{{Technologies: {tech_str}}}")

        blocks.append("\\\\\n".join(block_lines))
    return "\n\n".join(blocks)


def _format_awards(awards: List[Dict[str, Any]]) -> str:
    """Format awards section."""
    if not awards:
        return ""
    blocks: List[str] = []
    for award in awards:
        name = _tex_escape(award.get("name", ""))
        issuer = _tex_escape(award.get("issuer", ""))
        date = _tex_escape(award.get("date", ""))
        desc = _tex_escape(award.get("description", ""))

        line1 = f"\\textbf{{{name}}}, {issuer}"
        dates = f"Date: {date}" if date else ""
        block = f"{line1}\\\\\n\\textit{{{dates}}}"
        if desc:
            block += f"\\\\\n{desc}"
        blocks.append(block)
    return "\n\n".join(blocks)


def _format_publications(pubs: List[Dict[str, Any]]) -> str:
    """Format publications section."""
    if not pubs:
        return ""
    blocks: List[str] = []
    for pub in pubs:
        title = _tex_escape(pub.get("title", ""))
        authors = _tex_escape(pub.get("authors", ""))
        journal = _tex_escape(pub.get("journal", ""))
        date = _tex_escape(pub.get("date", ""))
        url = _tex_escape(pub.get("url", ""))

        line1 = f"\\textbf{{{title}}}"
        block_lines = [line1]
        block_lines.append(f"\\textit{{{authors}}}")
        block_lines.append(f"{journal}")
        if date:
            block_lines.append(f"\\textit{{Published: {date}}}")
        if url:
            block_lines.append(f"\\href{{{url}}}{{{url}}}")

        blocks.append("\\\\\n".join(block_lines))
    return "\n\n".join(blocks)


def _format_volunteer_experience(volunteer: List[Dict[str, Any]]) -> str:
    """Format volunteer experience section with dates right-aligned."""
    if not volunteer:
        return ""
    blocks: List[str] = []
    for vol in volunteer:
        role = _tex_escape(vol.get("role", ""))
        org = _tex_escape(vol.get("organization", ""))
        location = _tex_escape(vol.get("location", ""))
        start_date = _tex_escape(vol.get("start_date", ""))
        end_date = _tex_escape(vol.get("end_date", ""))
        desc = _tex_escape(vol.get("description", ""))

        # Format title line with organization and location
        org_line = org
        if location:
            org_line += f", {location}"

        dates = start_date
        if end_date:
            dates = f"{start_date} -- {end_date}"

        # Use right-aligned dates like work experience
        title_line = f"\\textbf{{{role}}} at {org_line}\\hfill\\textit{{{dates}}}"

        block = title_line
        if desc:
            block += f"\\\\\n{desc}"
        blocks.append(block)
    return "\n\n\\vspace{0.5\\baselineskip}\n".join(blocks)


def _format_contact_info(pi: Dict[str, Any]) -> str:
    """Format contact information for a separate contact section."""
    contact_lines = []

    email = pi.get("email", "")
    phone = _tex_escape(pi.get("phone", ""))
    location = _tex_escape(pi.get("location", ""))
    linkedin = pi.get("linkedin_url", "")
    website = pi.get("website_url", "")
    github = pi.get("github_url", "")

    # Helper to add http:// prefix if missing
    def ensure_protocol(url: str) -> str:
        if url and not url.startswith(("http://", "https://")):
            return f"https://{url}"
        return url

    if email:
        contact_lines.append(f"Email: \\href{{mailto:{email}}}{{{_tex_escape(email)}}}")
    if phone:
        contact_lines.append(f"Phone: {phone}")
    if location:
        contact_lines.append(f"Location: {location}")
    if linkedin:
        linkedin_url = ensure_protocol(linkedin)
        contact_lines.append(
            f"LinkedIn: \\href{{{linkedin_url}}}{{{_tex_escape(linkedin)}}}"
        )
    if website:
        website_url = ensure_protocol(website)
        contact_lines.append(
            f"Website: \\href{{{website_url}}}{{{_tex_escape(website)}}}"
        )
    if github:
        github_url = ensure_protocol(github)
        contact_lines.append(f"GitHub: \\href{{{github_url}}}{{{_tex_escape(github)}}}")

    if not contact_lines:
        return ""

    return "\\\\\n".join(contact_lines)


def _format_professional_summary(summary: Dict[str, Any]) -> str:
    """Format professional summary section."""
    content = summary.get("content", "")
    if not content:
        return ""
    return _tex_escape(content)


def _markdown_to_latex(text: str) -> str:
    """Convert simple markdown to LaTeX formatting."""
    import re

    # First escape LaTeX special characters
    text = _tex_escape(text)

    # Convert **text** to \textbf{text}
    text = re.sub(r"\*\*([^*]+)\*\*", r"\\textbf{\1}", text)

    # Convert *text* to \textit{text} (if not followed by *)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\\textit{\1}", text)

    # Split by double newlines to get paragraphs
    paragraphs = text.split("\n\n")

    result = []
    for paragraph in paragraphs:
        if paragraph.strip():
            # Within a paragraph, replace single newlines with spaces
            # to join lines that are part of the same paragraph
            paragraph = paragraph.replace("\n", " ").strip()
            result.append(paragraph)

    # Join paragraphs with double newline (LaTeX paragraph break)
    return "\n\n".join(result)


def _format_why_good_fit(why_fit: Dict[str, Any]) -> str:
    """Format Why I'm a Good Fit section, converting markdown to LaTeX."""
    if not why_fit:
        return ""
    content = why_fit.get("content", "")
    if not content:
        return ""

    return _markdown_to_latex(content)


def _format_work_experience(wx: List[Dict[str, Any]]) -> str:
    """Format work experience section with dates right-aligned."""
    if not wx:
        return ""
    blocks: List[str] = []
    for job in wx:
        position = _tex_escape(job.get("position", ""))
        company = _tex_escape(job.get("company", ""))
        location = _tex_escape(job.get("location", ""))
        start_date = _tex_escape(job.get("start_date", ""))
        end_date = _tex_escape(job.get("end_date", ""))

        # Format title line with company and location, dates right-aligned
        company_line = company
        if location:
            company_line += f", {location}"

        dates_str = start_date
        if end_date:
            dates_str = f"{start_date} -- {end_date}"

        # Use mbox to prevent date from breaking across lines
        dates_str = f"\\mbox{{{dates_str}}}"

        # Two-column layout: left column for title, right column for dates
        # Left: 70% width for flexible wrapping, Right: 25% width for dates
        title_line = (
            f"\\parbox[t]{{0.7\\textwidth}}{{\\textbf{{{position}}}, {company_line}}}"
            f"\\hfill"
            f"\\parbox[t]{{0.25\\textwidth}}{{\\raggedleft\\textit{{{dates_str}}}}}"
        )

        # Description and achievements
        desc = _tex_escape(job.get("description", ""))
        achievements = _itemize(job.get("achievements", []) or [])

        block = title_line
        if desc:
            block += f"\\\\\n{desc}"
        if achievements.strip():
            block += f"\n{achievements}"

        blocks.append(block)
    return "\n\n\\vspace{0.5\\baselineskip}\n".join(blocks)


def _format_education(ed: List[Dict[str, Any]]) -> str:
    """Format education section with dates right-aligned."""
    if not ed:
        return ""
    blocks: List[str] = []
    for edu in ed:
        degree = _tex_escape(edu.get("degree", ""))
        field_of_study = _tex_escape(edu.get("field_of_study", ""))
        institution = _tex_escape(edu.get("institution", ""))
        location = _tex_escape(edu.get("location", ""))
        gpa = _tex_escape(edu.get("gpa", ""))
        start_date = _tex_escape(edu.get("start_date", ""))
        end_date = _tex_escape(edu.get("end_date", ""))
        desc = _tex_escape(edu.get("description", ""))
        achievements = _itemize(edu.get("achievements", []) or [])
        honors = _itemize(edu.get("honors", []) or [])

        # Format title line with institution, dates right-aligned
        institution_line = institution
        if location:
            institution_line += f", {location}"

        dates_str = start_date
        if end_date:
            dates_str = f"{start_date} -- {end_date}"

        # Use mbox to prevent date from breaking across lines
        dates_str = f"\\mbox{{{dates_str}}}"

        # Build title line with degree and field of study
        # Two-column layout: left column for title, right column for dates
        title_line_str = degree
        if field_of_study:
            title_line_str += f" in {field_of_study}"

        title_line = (
            f"\\parbox[t]{{0.7\\textwidth}}{{\\textbf{{{title_line_str}}}, {institution_line}}}"
            f"\\hfill"
            f"\\parbox[t]{{0.25\\textwidth}}{{\\raggedleft\\textit{{{dates_str}}}}}"
        )

        # Add GPA if present
        block = title_line
        if gpa:
            block += f"\\\\\n\\textit{{GPA: {gpa}}}"

        # Add description, achievements, and honors
        if desc:
            block += f"\\\\\n{desc}"
        if achievements.strip():
            block += f"\n{achievements}"
        if honors.strip():
            block += f"\n{honors}"

        blocks.append(block)
    return "\n\n\\vspace{0.5\\baselineskip}\n".join(blocks)


def _format_skills(skills: Dict[str, Any]) -> str:
    """Format skills section with bold category labels."""
    if not skills:
        return ""

    blocks: List[str] = []

    # Technical Skills with bold category
    if skills.get("technical"):
        tech_items = ", ".join(_tex_escape(s) for s in skills["technical"])
        blocks.append(f"\\textbf{{Technical:}} {tech_items}")

    # Soft Skills with bold category
    if skills.get("soft"):
        soft_items = ", ".join(_tex_escape(s) for s in skills["soft"])
        blocks.append(f"\\textbf{{Soft:}} {soft_items}")

    # Languages with bold category
    if skills.get("languages"):
        lang_strs = []
        for l in skills["languages"]:
            lang_strs.append(
                f"{_tex_escape(l.get('language',''))} ({_tex_escape(l.get('proficiency',''))})"
            )
        lang_items = ", ".join(lang_strs)
        blocks.append(f"\\textbf{{Languages:}} {lang_items}")

    if not blocks:
        return ""

    return "\\\\[0.3ex]\n".join(blocks)


def _format_personal_info_header(pi: Dict[str, Any]) -> str:
    """Format personal info header (name and academic title)."""
    full_name = pi.get("full_name", "")
    academic_title = pi.get("academic_title", "")

    if not full_name:
        return ""

    if academic_title:
        return (
            f"\\begin{{center}}\n"
            f"\\LARGE\\textbf{{{_tex_escape(full_name)}}}\\\\\n"
            f"\\normalsize{{\\textnormal{{{_tex_escape(academic_title)}}}}}\n"
            f"\\end{{center}}\n"
        )
    else:
        return (
            f"\\begin{{center}}\n"
            f"\\LARGE\\textbf{{{_tex_escape(full_name)}}}\n"
            f"\\end{{center}}\n"
        )


def _generate_from_template(
    parsed: Dict[str, Any], title: str, template_name: str
) -> str:
    """Generate LaTeX from a template by injecting formatted sections.

    Args:
        parsed: Parsed CV data dictionary
        title: Document title (filename)
        template_name: Name of the template to use

    Returns:
        Complete LaTeX document with sections injected
    """
    # Load template
    template = load_template(template_name)

    # Get all section data
    pi = parsed.get("personal_info", {}) if parsed else {}
    summary = parsed.get("professional_summary", {}) if parsed else {}
    why_fit = parsed.get("why_good_fit", {}) if parsed else {}
    wx = parsed.get("work_experience", []) if parsed else []
    ed = parsed.get("education", []) if parsed else []
    skills = parsed.get("skills", {}) if parsed else {}
    certs = parsed.get("certifications", []) if parsed else []
    projects = parsed.get("projects", []) if parsed else []
    awards = parsed.get("awards", []) if parsed else []
    pubs = parsed.get("publications", []) if parsed else []
    volunteer = parsed.get("volunteer_experience", []) if parsed else []

    # Format personal info header
    personal_info_header = _format_personal_info_header(pi)

    # Format contact info section
    contact_info = _format_contact_info(pi)
    contact_info_section = (
        _section("Contact Information", contact_info) if contact_info else ""
    )

    # Get section_config for custom ordering
    section_config = parsed.get("section_config", {}) if parsed else {}
    sections = section_config.get("sections", [])

    # Generate content sections
    content_parts = []

    if sections:
        # Sort by order field
        sorted_sections = sorted(sections, key=lambda s: s.get("order", 999))
        for section in sorted_sections:
            if not section.get("visible", True):
                continue

            section_type = section.get("type") or section.get("id")
            section_title = section.get("title", "")

            if section_type == "professional_summary":
                content = _format_professional_summary(summary)
                if content:
                    content_parts.append(
                        _section(section_title or "Professional Summary", content)
                    )
            elif section_type == "why_good_fit":
                content = _format_why_good_fit(why_fit)
                if content:
                    content_parts.append(
                        _section(section_title or "Why I'm a Good Fit", content)
                    )
            elif section_type == "work_experience":
                content = _format_work_experience(wx)
                if content:
                    content_parts.append(
                        _section(section_title or "Work Experience", content)
                    )
            elif section_type == "education":
                content = _format_education(ed)
                if content:
                    content_parts.append(_section(section_title or "Education", content))
            elif section_type == "skills":
                content = _format_skills(skills)
                if content:
                    content_parts.append(_section(section_title or "Skills", content))
            elif section_type == "certifications":
                content = _format_certifications(certs)
                if content:
                    content_parts.append(
                        _section(section_title or "Certifications", content)
                    )
            elif section_type == "projects":
                content = _format_projects(projects)
                if content:
                    content_parts.append(_section(section_title or "Projects", content))
            elif section_type == "awards":
                content = _format_awards(awards)
                if content:
                    content_parts.append(_section(section_title or "Awards", content))
            elif section_type == "publications":
                content = _format_publications(pubs)
                if content:
                    content_parts.append(
                        _section(section_title or "Publications", content)
                    )
            elif section_type == "volunteer_experience":
                content = _format_volunteer_experience(volunteer)
                if content:
                    content_parts.append(
                        _section(section_title or "Volunteer Experience", content)
                    )
    else:
        # Fallback to default order
        if summary_content := _format_professional_summary(summary):
            content_parts.append(_section("Professional Summary", summary_content))
        if why_fit_content := _format_why_good_fit(why_fit):
            content_parts.append(_section("Why I'm a Good Fit", why_fit_content))
        if wx_content := _format_work_experience(wx):
            content_parts.append(_section("Work Experience", wx_content))
        if ed_content := _format_education(ed):
            content_parts.append(_section("Education", ed_content))
        if skills_content := _format_skills(skills):
            content_parts.append(_section("Skills", skills_content))
        if certs_content := _format_certifications(certs):
            content_parts.append(_section("Certifications", certs_content))
        if projects_content := _format_projects(projects):
            content_parts.append(_section("Projects", projects_content))
        if awards_content := _format_awards(awards):
            content_parts.append(_section("Awards", awards_content))
        if pubs_content := _format_publications(pubs):
            content_parts.append(_section("Publications", pubs_content))
        if volunteer_content := _format_volunteer_experience(volunteer):
            content_parts.append(_section("Volunteer Experience", volunteer_content))

    content_sections = "\n\n".join(content_parts)

    # Replace placeholders in template
    result = template.replace("{PERSONAL_INFO_HEADER}", personal_info_header)
    result = result.replace("{CONTACT_INFO_SECTION}", contact_info_section)
    result = result.replace("{CONTENT_SECTIONS}", content_sections)

    return result


def generate_cv_latex(parsed: Dict[str, Any], title: str, template_name: str) -> str:
    """Generate LaTeX source code for CV document.

    Respects section_config for custom ordering and visibility filtering.

    Args:
        parsed: Parsed CV data dictionary
        title: Document title (filename)
        template_name: Template name to use for generation. Must be available.

    Raises:
        ValueError: If template_name is not available
    """
    # Validate template is available
    if not template_name:
        raise ValueError("template_name is required")

    if not is_template_available(template_name):
        raise ValueError(f"Template '{template_name}' is not available")

    # Load template and inject content
    return _generate_from_template(parsed, title, template_name)


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
            tex_path,
        ]

        try:
            # First pass
            result = subprocess.run(
                cmd,
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise RuntimeError(
                    f"LaTeX compilation failed (first pass): {result.stderr}"
                )

            # Second pass to settle references
            result = subprocess.run(
                cmd,
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise RuntimeError(
                    f"LaTeX compilation failed (second pass): {result.stderr}"
                )

            # Read the generated PDF
            if not os.path.exists(pdf_path):
                raise RuntimeError("PDF file was not generated")

            with open(pdf_path, "rb") as f:
                return f.read()

        except subprocess.TimeoutExpired:
            raise RuntimeError("LaTeX compilation timed out")
        except Exception as e:
            raise RuntimeError(f"LaTeX compilation failed: {str(e)}")
