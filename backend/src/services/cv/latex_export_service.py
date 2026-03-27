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

import logging
import os
import shutil
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from src.services.shared.template_loader import load_template, is_template_available

logger = logging.getLogger(__name__)
LATEX_REQUIRED_BIN = os.getenv("PDFLATEX_BIN", "pdflatex")


def is_latex_available() -> bool:
    """Return True if pdflatex is available on the system PATH (or PDFLATEX_BIN)."""
    return shutil.which(LATEX_REQUIRED_BIN) is not None


def _optimize_profile_picture(source_path: str, dest_path: str) -> None:
    """
    Resize and optimize profile picture for PDF embedding.
    Target: max 600px on longest side, JPEG quality 85.
    Keeps aspect ratio and converts PNG to JPEG for smaller size.
    """
    from PIL import Image

    img = Image.open(source_path)
    img.load()

    # Convert to RGB if necessary (handles PNG with transparency)
    if img.mode in ("RGBA", "LA", "P"):
        if img.mode == "P":
            img = img.convert("RGBA")
        rgb_img = Image.new("RGB", img.size, (255, 255, 255))
        rgb_img.paste(
            img,
            mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None,
        )
        img = rgb_img
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if larger than 600px on any side
    max_dimension = 600
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Save as optimized JPEG
    img.save(dest_path, "JPEG", quality=85, optimize=True)


def _tex_escape(text: str | None) -> str:
    if not text:
        return ""

    # Preserve LaTeX non-breaking spaces from Unicode NBSP while still escaping
    # literal '~' characters from user content.
    nbsp_placeholder = "\uE000"

    # First, normalize Unicode characters that LaTeX can't handle directly
    # Replace various Unicode spaces with regular space or LaTeX equivalents
    unicode_replacements = {
        "\u2013": "--",  # en-dash
        "\u2014": "---",  # em-dash
        "\u2212": "-",  # minus sign
        "\u202F": " ",  # narrow no-break space (CRITICAL: causes LaTeX errors)
        "\u00A0": nbsp_placeholder,  # non-breaking space (converted after escaping)
        "\u201C": "``",  # left double quotation mark
        "\u201D": "''",  # right double quotation mark
        "\u2018": "`",  # left single quotation mark
        "\u2019": "'",  # right single quotation mark
        "\u2026": "...",  # horizontal ellipsis
        "\u00AB": "<<",  # left-pointing double angle quotation mark
        "\u00BB": ">>",  # right-pointing double angle quotation mark
    }

    # Apply Unicode replacements first
    for unicode_char, replacement in unicode_replacements.items():
        text = text.replace(unicode_char, replacement)

    # Now apply standard LaTeX escaping for special characters
    latex_replacements = {
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
        if ch == nbsp_placeholder:
            out.append("~")
            continue
        out.append(latex_replacements.get(ch, ch))
    return "".join(out)


def _run_pdflatex(cmd: list[str], cwd: str) -> subprocess.CompletedProcess[str]:
    """Run a single pdflatex pass with robust output decoding."""
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )


def _href_url_safe(url: str) -> str:
    """Escape only TeX-special chars that would break \\href{url}{...} parsing.

    Used for URL content in \\href{} so links with _, #, &, etc. still work.
    Escapes \\ { } % to prevent injection; leaves URL-valid chars intact.
    """
    if not url:
        return ""
    replacements = {"\\": r"\textbackslash{}", "{": r"\{", "}": r"\}", "%": r"\%"}
    out = []
    for ch in url:
        out.append(replacements.get(ch, ch))
    return "".join(out)


# Template-to-macro mapping for LaTeX section commands.
# Only maps supported templates; deprecated templates and their aliases have been removed.
# Each template name must have a corresponding .tex file with matching macro definition.
SECTION_CMD_BY_TEMPLATE: Dict[str, str] = {
    "standard": "standardsection",
    "traditional": "traditionalsection",
    "spacious": "spacioussection",
    "jake": "jakesection",
}


def _section(title: str, body: str, template_name: str) -> str:
    """Create a section using the template-specific macro, with fallback."""
    escaped_title = _tex_escape(title)
    section_cmd = SECTION_CMD_BY_TEMPLATE.get(template_name)
    if section_cmd:
        return (
            f"\\needspace{{5\\baselineskip}}\n"
            f"\\{section_cmd}{{{escaped_title}}}\n{body}\\vspace{{0.5\\baselineskip}}\n"
        )
    # Fallback legacy styling
    return (
        f"\\needspace{{4\\baselineskip}}\\noindent{{\\Large\\textbf{{{escaped_title}}}}}\\\\[-1ex]\n"
        f"\\rule{{\\textwidth}}{{0.4pt}}\\\\[0.5ex]\n{body}\\vspace{{0.5\\baselineskip}}\n"
    )


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
        desc = cert.get("description", "")

        line1 = f"\\textcolor{{boldgray}}{{\\textbf{{{name}}}}}, \\textcolor{{companygray}}{{{issuer}}}"
        dates = date
        if expiry_date:
            dates = f"{date} -- {expiry_date}"
        elif date:
            dates = f"Issued: {date}"

        block = f"{line1}\\\\\n\\textit{{{dates}}}"
        if desc:
            desc_latex = _markdown_to_latex(desc)
            # Don't use \\ before itemize environments, just newline
            if desc_latex.strip().startswith("\\begin{itemize}"):
                block += f"\n{desc_latex}"
            else:
                block += f"\\\\\n{desc_latex}"
        blocks.append(block)
    return "\n\n".join(blocks)


def _format_projects(projects: List[Dict[str, Any]]) -> str:
    """Format projects section."""
    if not projects:
        return ""
    blocks: List[str] = []
    for proj in projects:
        name = _tex_escape(proj.get("name", ""))
        desc = proj.get("description", "")
        url_raw = proj.get("url", "")
        tech = proj.get("technologies", []) or []

        line1 = f"\\textcolor{{boldgray}}{{\\textbf{{{name}}}}}"
        if url_raw:
            line1 += f" (\\href{{{_href_url_safe(url_raw)}}}{{{_tex_escape(url_raw)}}})"

        block_lines = [line1]
        if desc:
            desc_latex = _markdown_to_latex(desc)
            block_lines.append(desc_latex)
        if tech:
            tech_str = ", ".join(_tex_escape(t) for t in tech)
            block_lines.append(f"\\textit{{Technologies: {tech_str}}}")

        # Use paragraph spacing between lines to avoid invalid \\\n+        # after environments like itemize
        blocks.append("\n\n".join(block_lines))
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
        desc = award.get("description", "")

        line1 = f"\\textcolor{{boldgray}}{{\\textbf{{{name}}}}}, \\textcolor{{companygray}}{{{issuer}}}"
        dates = f"Date: {date}" if date else ""
        block = f"{line1}\\\\\n\\textit{{{dates}}}"
        if desc:
            desc_latex = _markdown_to_latex(desc)
            # Don't use \\ before itemize environments, just newline
            if desc_latex.strip().startswith("\\begin{itemize}"):
                block += f"\n{desc_latex}"
            else:
                block += f"\\\\\n{desc_latex}"
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
        url_raw = pub.get("url", "")

        line1 = f"\\textbf{{{title}}}"
        block_lines = [line1]
        block_lines.append(f"\\textit{{{authors}}}")
        block_lines.append(f"{journal}")
        if date:
            block_lines.append(f"\\textit{{Published: {date}}}")
        if url_raw:
            block_lines.append(
                f"\\href{{{_href_url_safe(url_raw)}}}{{{_tex_escape(url_raw)}}}"
            )

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
        desc = vol.get("description", "")

        # Format title line with organization and location
        org_line = org
        if location:
            org_line += f", {location}"

        if end_date:
            dates = f"{start_date} -- {end_date}"
        else:
            dates = f"{start_date} -- PRESENT"

        # Use mbox to prevent date from breaking across lines
        dates_str = f"\\mbox{{{dates}}}"

        # Build content line with role and organization
        content_line = f"\\textcolor{{boldgray}}{{\\textbf{{{role}}}}} at \\textcolor{{companygray}}{{{org_line}}}"

        # Build left parbox content containing all content
        left_content = content_line
        if desc:
            desc_latex = _markdown_to_latex(desc)
            # Don't use \\ before itemize environments, just newline
            if desc_latex.strip().startswith("\\begin{itemize}"):
                left_content += f"\n{desc_latex}"
            else:
                left_content += f"\\\\\n{desc_latex}"

        # Two-column layout: left column for all content, right column for dates
        block = (
            f"\\parbox[t]{{0.7\\textwidth}}{{{left_content}}}"
            f"\\hfill"
            f"\\parbox[t]{{0.25\\textwidth}}{{\\raggedleft\\textit{{{dates_str}}}}}"
        )

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
        contact_lines.append(
            f"Email: \\href{{mailto:{_href_url_safe(email)}}}{{{_tex_escape(email)}}}"
        )
    if phone:
        contact_lines.append(f"Phone: {phone}")
    if location:
        contact_lines.append(f"Location: {location}")
    if linkedin:
        linkedin_url = _href_url_safe(ensure_protocol(linkedin))
        contact_lines.append(
            f"LinkedIn: \\href{{{linkedin_url}}}{{{_tex_escape(linkedin)}}}"
        )
    if website:
        website_url = _href_url_safe(ensure_protocol(website))
        contact_lines.append(
            f"Website: \\href{{{website_url}}}{{{_tex_escape(website)}}}"
        )
    if github:
        github_url = _href_url_safe(ensure_protocol(github))
        contact_lines.append(f"GitHub: \\href{{{github_url}}}{{{_tex_escape(github)}}}")

    if not contact_lines:
        return ""

    return "\\\\\n".join(contact_lines)


def _format_professional_summary(summary: Dict[str, Any]) -> str:
    """Format professional summary section."""
    content = summary.get("content", "")
    if not content:
        return ""
    return _markdown_to_latex(content)


def _markdown_to_latex(text: str) -> str:
    """Convert simple markdown to LaTeX formatting."""
    import re

    # Split into lines to process list items
    lines = text.split("\n")

    result = []
    in_list = False

    for line in lines:
        stripped = line.strip()

        # Preserve paragraph breaks: empty markdown lines -> blank line in LaTeX
        if stripped == "":
            if in_list:
                result.append("\\end{itemize}")
                in_list = False
            # Emit a blank line to create a new paragraph in LaTeX
            result.append("")
            continue

        # Headings: #, ##, ###, ####, #####, ######
        # Close any open list before headings
        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            if in_list:
                result.append("\\end{itemize}")
                in_list = False

            hashes, heading_text = heading_match.groups()
            level = len(hashes)

            # Escape heading content and apply inline formatting after escaping
            processed = _tex_escape(heading_text)

            # Links: [text](url) -> \href{url}{text}
            def _link_repl_heading(m: "re.Match[str]") -> str:
                label = _tex_escape(m.group(1))
                url_safe = _href_url_safe(m.group(2))
                return f"\\href{{{url_safe}}}{{{label}}}"

            processed = re.sub(r"\[([^\]]+)\]\(([^\)]+)\)", _link_repl_heading, processed)
            # Bold
            processed = re.sub(r"\*\*([^*]+)\*\*", r"\\textbf{\1}", processed)
            # Italic (single asterisks not part of bold)
            processed = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\\textit{\1}", processed)

            if level == 1:
                result.append(f"\\section*{{{processed}}}")
            elif level == 2:
                result.append(f"\\subsection*{{{processed}}}")
            elif level == 3:
                result.append(f"\\subsubsection*{{{processed}}}")
            elif level == 4:
                result.append(f"\\paragraph*{{{processed}}}")
            else:
                # Levels 5 and 6: render as bold paragraph text
                result.append(f"\\textbf{{{processed}}}")
            continue

        # Check if line is a list item (starts with - or *)
        if re.match(r"^[-*]\s+", stripped):
            if not in_list:
                result.append("\\begin{itemize}")
                in_list = True

            # Extract list item text (remove leading - or *)
            item_text = re.sub(r"^[-*]\s+", "", stripped)
            # Escape and process the item text
            item_text = _tex_escape(item_text)
            # Convert **text** to \textbf{text}
            item_text = re.sub(r"\*\*([^*]+)\*\*", r"\\textbf{\1}", item_text)
            # Convert *text* to \textit{text} (if not followed by *)
            item_text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\\textit{\1}", item_text)

            # Links inside list items
            def _link_repl_list(m: "re.Match[str]") -> str:
                label = _tex_escape(m.group(1))
                url_safe = _href_url_safe(m.group(2))
                return f"\\href{{{url_safe}}}{{{label}}}"

            item_text = re.sub(r"\[([^\]]+)\]\(([^\)]+)\)", _link_repl_list, item_text)

            # Hard line breaks: two trailing spaces in markdown line -> LaTeX newline
            has_hardbreak = bool(re.search(r"\s{2}$", line))

            if has_hardbreak:
                result.append("  \\item " + item_text + " \\\\")
            else:
                result.append("  \\item " + item_text)
        else:
            # Not a list item
            if in_list:
                result.append("\\end{itemize}")
                in_list = False

            if stripped:
                # Process paragraph text
                processed = _tex_escape(stripped)
                # Convert **text** to \\textbf{text}
                processed = re.sub(r"\*\*([^*]+)\*\*", r"\\textbf{\1}", processed)
                # Convert *text* to \\textit{text} (if not followed by *)
                processed = re.sub(
                    r"(?<!\*)\*([^*]+)\*(?!\*)", r"\\textit{\1}", processed
                )

                # Links: [text](url) -> \href{url}{text}
                def _link_repl_para(m: "re.Match[str]") -> str:
                    label = _tex_escape(m.group(1))
                    url_safe = _href_url_safe(m.group(2))
                    return f"\\href{{{url_safe}}}{{{label}}}"

                processed = re.sub(
                    r"\[([^\]]+)\]\(([^\)]+)\)", _link_repl_para, processed
                )
                # Hard line breaks: two trailing spaces in markdown line -> LaTeX newline
                has_hardbreak = bool(re.search(r"\s{2}$", line))
                if has_hardbreak:
                    processed = processed + " \\\\"
                result.append(processed)

    # Close any open list
    if in_list:
        result.append("\\end{itemize}")

    # Join with newlines
    return "\n".join(result)


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

        if end_date:
            dates_str = f"{start_date} -- {end_date}"
        else:
            dates_str = f"{start_date} -- PRESENT"

        # Use mbox to prevent date from breaking across lines
        dates_str = f"\\mbox{{{dates_str}}}"

        # Description and achievements - process description as markdown
        desc = job.get("description", "")
        achievements = _itemize(job.get("achievements", []) or [])

        # Build left parbox content (70% width) containing all content
        left_content = f"\\textcolor{{boldgray}}{{\\textbf{{{position}}}}}, \\textcolor{{companygray}}{{{company_line}}}"
        if desc:
            desc_latex = _markdown_to_latex(desc)
            # Don't use \\ before itemize environments, just newline
            if desc_latex.strip().startswith("\\begin{itemize}"):
                left_content += f"\n{desc_latex}"
            else:
                left_content += f"\\\\\n{desc_latex}"
        if achievements.strip():
            left_content += f"\n{achievements}"

        # Two-column layout: left column for all content, right column for dates
        block = (
            f"\\parbox[t]{{0.7\\textwidth}}{{{left_content}}}"
            f"\\hfill"
            f"\\parbox[t]{{0.25\\textwidth}}{{\\raggedleft\\textit{{{dates_str}}}}}"
        )

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
        academic_title = _tex_escape(edu.get("academic_title", ""))
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

        if end_date:
            dates_str = f"{start_date} -- {end_date}"
        else:
            dates_str = f"{start_date} -- PRESENT"

        # Use mbox to prevent date from breaking across lines
        dates_str = f"\\mbox{{{dates_str}}}"

        # Build title line with degree and field of study
        # Two-column layout: left column for title, right column for dates
        # Entire title is bold, academic degree shown in parentheses after field of study
        degree_part = degree
        if field_of_study:
            degree_part += f" in {field_of_study}"

        # Add academic degree in parentheses at the end if present
        if academic_title:
            title_line_str = (
                f"\\textcolor{{boldgray}}{{\\textbf{{{degree_part} ({academic_title})}}}}"
            )
        else:
            title_line_str = f"\\textcolor{{boldgray}}{{\\textbf{{{degree_part}}}}}"

        # Build left parbox content (70% width) containing all content
        left_content = (
            f"{title_line_str}, \\textcolor{{companygray}}{{{institution_line}}}"
        )
        if gpa:
            left_content += f"\\\\\n\\textit{{GPA: {gpa}}}"
        if desc:
            desc_latex = _markdown_to_latex(desc)
            # Don't use \\ before itemize environments, just newline
            if desc_latex.strip().startswith("\\begin{itemize}"):
                left_content += f"\n{desc_latex}"
            else:
                left_content += f"\\\\\n{desc_latex}"
        if achievements.strip():
            left_content += f"\n{achievements}"
        if honors.strip():
            left_content += f"\n{honors}"

        # Two-column layout: left column for all content, right column for dates
        block = (
            f"\\parbox[t]{{0.7\\textwidth}}{{{left_content}}}"
            f"\\hfill"
            f"\\parbox[t]{{0.25\\textwidth}}{{\\raggedleft\\textit{{{dates_str}}}}}"
        )

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


def _format_personal_info_header(
    pi: Dict[str, Any],
    template_name: str = "",
    include_profile_picture: bool = False,
    profile_picture_shape: str = "circle",
    profile_picture_size: str = "standard",
) -> str:
    """Format personal info header with name/title and contact.

    For template "jake": compact one-line contact (phone | email | links).
    Otherwise: 2-row contact grid with Font Awesome icons.

    If include_profile_picture is True, wrap content in left minipage and add
    right minipage with image (fixed name "profilepic"). Shape: circle (TikZ clip)
    or square (includegraphics with keepaspectratio). Size determines dimensions:
    small (2.0cm), standard (2.5cm), large (3.5cm).

    Empty personal_info (e.g. full_name="") is handled: returns "" so PDF
    still generates; AI and display use parsed.get("personal_info", {}) safely.
    """
    full_name = pi.get("full_name", "")
    academic_title = pi.get("academic_title", "")

    if not full_name:
        return ""

    def ensure_protocol(url: str) -> str:
        if url and not url.startswith(("http://", "https://")):
            return f"https://{url}"
        return url

    def contact_link(url: str, label: str) -> str:
        """Build \\href with protocol and underlined escaped label (for jake template)."""
        u = _href_url_safe(ensure_protocol(url))
        return f"\\href{{{u}}}{{\\underline{{{_tex_escape(label)}}}}}"

    email = pi.get("email", "")
    phone = _tex_escape(pi.get("phone", ""))
    location = _tex_escape(pi.get("location", ""))
    linkedin = pi.get("linkedin_url", "")
    website = pi.get("website_url", "")
    github = pi.get("github_url", "")

    # Jake-style: compact one-line header, no icons (template does not load fontawesome)
    if template_name == "jake":
        name_line = (
            f"\\textbf{{\\Huge \\scshape {_tex_escape(full_name)}}}"
            if not academic_title
            else (
                f"\\textbf{{\\Huge \\scshape {_tex_escape(full_name)}}}\\\\\n"
                f"\\normalsize{{\\textnormal{{{_tex_escape(academic_title)}}}}}"
            )
        )
        contact_parts: list[str] = []
        if phone:
            contact_parts.append(phone)
        if email:
            contact_parts.append(
                f"\\href{{mailto:{_href_url_safe(email)}}}{{\\underline{{{_tex_escape(email)}}}}}"
            )
        for url_val, label in [
            (linkedin, linkedin),
            (website, website),
            (github, github),
        ]:
            if url_val:
                contact_parts.append(contact_link(url_val, label))
        contact_line = " $|$ ".join(contact_parts) if contact_parts else ""
        if contact_line:
            return (
                f"\\begin{{center}}\n"
                f"{name_line} \\\\ \\vspace{{1pt}}\n"
                f"\\small {contact_line}\n"
                f"\\end{{center}}\n"
            )
        return f"\\begin{{center}}\n{name_line}\n\\end{{center}}\n"

    # Default: build contact items (label + text), hyperlinks where relevant
    contact_items: list[str] = []
    if location:
        contact_items.append(f"Location: {location}")
    if phone:
        contact_items.append(f"Phone: {phone}")
    if linkedin:
        lurl = _href_url_safe(ensure_protocol(linkedin))
        contact_items.append(f"LinkedIn: \\href{{{lurl}}}{{{_tex_escape(linkedin)}}}")
    if email:
        contact_items.append(
            f"Email: \\href{{mailto:{_href_url_safe(email)}}}{{{_tex_escape(email)}}}"
        )
    if website:
        wurl = _href_url_safe(ensure_protocol(website))
        contact_items.append(f"Website: \\href{{{wurl}}}{{{_tex_escape(website)}}}")
    if github:
        gurl = _href_url_safe(ensure_protocol(github))
        contact_items.append(f"GitHub: \\href{{{gurl}}}{{{_tex_escape(github)}}}")

    # Arrange into two rows and as many columns as needed
    contact_block = ""
    if contact_items:
        import math

        num_items = len(contact_items)
        num_cols = max(1, math.ceil(num_items / 2))

        row1 = contact_items[:num_cols]
        row2 = contact_items[num_cols:]
        while len(row2) < num_cols:
            row2.append("")

        # Use tabular for proper column alignment
        col_spec = "@{}" + "@{\\hspace{2em}}".join(["l"] * num_cols) + "@{}"
        row1_line = " & ".join(row1) + r" \\"
        row2_line = " & ".join(row2)

        contact_block = (
            f"\\vspace{{0.4\\baselineskip}}\n"
            f"\\small\n"
            f"\\begin{{center}}\n"
            f"\\begin{{tabular}}{{{col_spec}}}\n"
            f"{row1_line}\n"
            f"{row2_line}\n"
            f"\\end{{tabular}}\n"
            f"\\end{{center}}\n"
            f"\\normalsize\n"
        )

    # Header: centered name and optional academic title
    if academic_title:
        header = (
            f"\\begin{{center}}\n"
            f"\\LARGE\\textbf{{{_tex_escape(full_name)}}}\\\\\n"
            f"\\normalsize{{\\textnormal{{{_tex_escape(academic_title)}}}}}\n"
            f"\\end{{center}}\n"
        )
    else:
        header = (
            f"\\begin{{center}}\n"
            f"\\LARGE\\textbf{{{_tex_escape(full_name)}}}\n"
            f"\\end{{center}}\n"
        )

    # Description: formatted markdown content below contact block
    description_block = ""
    description = pi.get("description", "")
    if description:
        desc_latex = _markdown_to_latex(description)
        description_center_align = pi.get("description_center_align", False)
        # Use {\itshape ...} so paragraph breaks (\par) in desc_latex are valid
        if description_center_align:
            description_block = (
                f"\\vspace{{0.5\\baselineskip}}\n"
                f"\\begin{{center}}\n"
                f"\\begin{{minipage}}{{0.9\\textwidth}}\n"
                f"\\centering\n"
                f"{{\\itshape {desc_latex}}}\n"
                f"\\end{{minipage}}\n"
                f"\\end{{center}}\n"
            )
        else:
            description_block = (
                f"\\vspace{{0.5\\baselineskip}}\n"
                f"\\begin{{minipage}}{{0.9\\textwidth}}\n"
                f"{{\\itshape {desc_latex}}}\n"
                f"\\end{{minipage}}\n"
            )

    # Horizontal rule separator below personal info section
    separator = ""
    show_horizontal_line = pi.get("show_horizontal_line", False)
    if show_horizontal_line:
        separator = (
            "\n\\vspace{0.5\\baselineskip}\n"
            "\\rule{\\textwidth}{0.4pt}\n"
            "\\vspace{0.5\\baselineskip}\n"
        )

    body = header + contact_block + description_block + separator
    if not include_profile_picture:
        return body

    # Define size mapping
    SIZE_MAP = {"small": "2.0cm", "standard": "2.5cm", "large": "3.5cm"}
    pic_size = SIZE_MAP.get(profile_picture_size, "2.5cm")

    # Calculate radius for circle (half the width for TikZ clip)
    # and double width for includegraphics to ensure full coverage
    if profile_picture_size == "small":
        radius = "1.0cm"
        img_dim = "2.0cm"
    elif profile_picture_size == "large":
        radius = "1.75cm"
        img_dim = "3.5cm"
    else:  # standard
        radius = "1.25cm"
        img_dim = "2.5cm"

    # Layout: Center content as if picture doesn't exist, position picture absolutely on right
    # Offsets are size-aware so small pics aren't too far from edge and large pics don't overlap.
    SIZE_TO_POSITION = {
        "small": {"xshift": "-2cm", "yshift": "-2.8cm"},
        "standard": {"xshift": "-2cm", "yshift": "-3.0cm"},
        "large": {"xshift": "-1.9cm", "yshift": "-3.2cm"},
    }
    pos = SIZE_TO_POSITION.get(profile_picture_size, SIZE_TO_POSITION["standard"])

    if profile_picture_shape == "circle":
        pic_latex = (
            "\\begin{tikzpicture}[baseline=(current bounding box.center)]\n"
            f"  \\clip (0,0) circle ({radius});\n"
            "  \\node[anchor=center,inner sep=0] at (0,0) "
            f"{{\\includegraphics[width={img_dim},height={img_dim},keepaspectratio]{{profilepic}}}};\n"
            "\\end{tikzpicture}"
        )
    else:
        pic_latex = f"\\includegraphics[width={pic_size},height={pic_size},keepaspectratio]{{profilepic}}"

    # Use tikz to position picture absolutely at top right
    return (
        "\\noindent\n"
        "\\begin{tikzpicture}[remember picture,overlay]\n"
        f"  \\node[anchor=north east,inner sep=0] at ([xshift={pos['xshift']},yshift={pos['yshift']}]current page.north east) {{{pic_latex}}};\n"
        "\\end{tikzpicture}\n" + body
    )


def _generate_from_template(
    parsed: Dict[str, Any],
    title: str,
    template_name: str,
    profile_pic_path: Optional[str] = None,
    profile_pic_shape: str = "circle",
    profile_pic_size: str = "standard",
) -> str:
    """Generate LaTeX from a template by injecting formatted sections.

    Args:
        parsed: Parsed CV data dictionary
        title: Document title (filename)
        template_name: Name of the template to use
        profile_pic_path: If set, include profile picture in header (file must exist at compile time)
        profile_pic_shape: "circle" or "square" for image display
        profile_pic_size: "small", "standard", or "large" for image dimensions

    Returns:
        Complete LaTeX document with sections injected
    """
    # Load template
    template = load_template(template_name)

    # Get all section data
    pi = parsed.get("personal_info", {}) if parsed else {}
    custom_sections = parsed.get("custom_sections") or []
    summary_section = next(
        (
            s
            for s in custom_sections
            if isinstance(s, dict) and s.get("type") == "professional_summary"
        ),
        None,
    )
    summary = (
        {"content": (summary_section or {}).get("content", "")} if summary_section else {}
    )
    why_good_fit_section = next(
        (
            s
            for s in custom_sections
            if isinstance(s, dict) and s.get("id") == "why_good_fit"
        ),
        None,
    )
    why_fit = (
        {"content": (why_good_fit_section or {}).get("content", "")}
        if why_good_fit_section
        else {}
    )
    wx = parsed.get("work_experience", []) if parsed else []
    ed = parsed.get("education", []) if parsed else []
    skills = parsed.get("skills", {}) if parsed else {}
    certs = parsed.get("certifications", []) if parsed else []
    projects = parsed.get("projects", []) if parsed else []
    awards = parsed.get("awards", []) if parsed else []
    pubs = parsed.get("publications", []) if parsed else []
    volunteer = parsed.get("volunteer_experience", []) if parsed else []

    # Format personal info header (optionally with profile picture)
    personal_info_header = _format_personal_info_header(
        pi,
        template_name,
        include_profile_picture=bool(profile_pic_path),
        profile_picture_shape=profile_pic_shape or "circle",
        profile_picture_size=profile_pic_size or "standard",
    )

    # Dedicated contact section removed in favor of inline header details
    contact_info_section = ""

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
            section_id = section.get("id")
            section_title = section.get("title", "")

            # Professional summary is now a custom section (type "custom", id may be
            # "professional_summary" or UUID); content comes from custom_sections.
            if section_type == "custom":
                # Resolve any custom section by id (why_good_fit, professional_summary, etc.)
                custom_item = next(
                    (
                        s
                        for s in custom_sections
                        if isinstance(s, dict) and s.get("id") == section_id
                    ),
                    None,
                )
                if custom_item:
                    raw = (custom_item.get("content") or "").strip()
                    if raw:
                        content = _markdown_to_latex(raw)
                        title = section_title or (custom_item.get("title") or "Section")
                        content_parts.append(_section(title, content, template_name))
            elif section_type == "work_experience":
                content = _format_work_experience(wx)
                if content:
                    content_parts.append(
                        _section(
                            section_title or "Work Experience", content, template_name
                        )
                    )
            elif section_type == "education":
                content = _format_education(ed)
                if content:
                    content_parts.append(
                        _section(section_title or "Education", content, template_name)
                    )
            elif section_type == "skills":
                content = _format_skills(skills)
                if content:
                    content_parts.append(
                        _section(section_title or "Skills", content, template_name)
                    )
            elif section_type == "certifications":
                content = _format_certifications(certs)
                if content:
                    content_parts.append(
                        _section(
                            section_title or "Certifications", content, template_name
                        )
                    )
            elif section_type == "projects":
                content = _format_projects(projects)
                if content:
                    content_parts.append(
                        _section(section_title or "Projects", content, template_name)
                    )
            elif section_type == "awards":
                content = _format_awards(awards)
                if content:
                    content_parts.append(
                        _section(section_title or "Awards", content, template_name)
                    )
            elif section_type == "publications":
                content = _format_publications(pubs)
                if content:
                    content_parts.append(
                        _section(section_title or "Publications", content, template_name)
                    )
            elif section_type == "volunteer_experience":
                content = _format_volunteer_experience(volunteer)
                if content:
                    content_parts.append(
                        _section(
                            section_title or "Volunteer Experience",
                            content,
                            template_name,
                        )
                    )
    else:
        # Fallback to default order
        if summary_content := _format_professional_summary(summary):
            content_parts.append(
                _section("Professional Summary", summary_content, template_name)
            )
        if why_fit_content := _format_why_good_fit(why_fit):
            content_parts.append(
                _section("Why I'm a Good Fit", why_fit_content, template_name)
            )
        if wx_content := _format_work_experience(wx):
            content_parts.append(_section("Work Experience", wx_content, template_name))
        if ed_content := _format_education(ed):
            content_parts.append(_section("Education", ed_content, template_name))
        if skills_content := _format_skills(skills):
            content_parts.append(_section("Skills", skills_content, template_name))
        if certs_content := _format_certifications(certs):
            content_parts.append(_section("Certifications", certs_content, template_name))
        if projects_content := _format_projects(projects):
            content_parts.append(_section("Projects", projects_content, template_name))
        if awards_content := _format_awards(awards):
            content_parts.append(_section("Awards", awards_content, template_name))
        if pubs_content := _format_publications(pubs):
            content_parts.append(_section("Publications", pubs_content, template_name))
        if volunteer_content := _format_volunteer_experience(volunteer):
            content_parts.append(
                _section("Volunteer Experience", volunteer_content, template_name)
            )

    content_sections = "\n\n".join(content_parts)

    # Keep a consistent visual gap between the personal header block
    # and the first rendered section in exported PDFs.
    if personal_info_header and content_sections:
        content_sections = "\\vspace{0.5\\baselineskip}\n" + content_sections

    # Replace placeholders in template
    result = template.replace("{PERSONAL_INFO_HEADER}", personal_info_header)
    result = result.replace("{CONTACT_INFO_SECTION}", contact_info_section)
    result = result.replace("{CONTENT_SECTIONS}", content_sections)

    return result


def generate_cv_latex(
    parsed: Dict[str, Any],
    title: str,
    template_name: str,
    profile_pic_path: Optional[str] = None,
    profile_pic_shape: str = "circle",
    profile_pic_size: str = "standard",
) -> str:
    """Generate LaTeX source code for CV document.

    Respects section_config for custom ordering and visibility filtering.

    Args:
        parsed: Parsed CV data dictionary
        title: Document title (filename)
        template_name: Template name to use for generation. Must be available.
        profile_pic_path: If set, include profile picture in header (file copied at compile time)
        profile_pic_shape: "circle" or "square" for image display
        profile_pic_size: "small", "standard", or "large" for image dimensions

    Raises:
        ValueError: If template_name is not available
    """
    # Validate template is available
    if not template_name:
        raise ValueError("template_name is required")

    if not is_template_available(template_name):
        raise ValueError(f"Template '{template_name}' is not available")

    # Load template and inject content
    return _generate_from_template(
        parsed,
        title,
        template_name,
        profile_pic_path=profile_pic_path,
        profile_pic_shape=profile_pic_shape,
        profile_pic_size=profile_pic_size,
    )


def compile_pdf_from_latex(
    tex_source: str, profile_pic_path: Optional[str] = None
) -> bytes:
    """Compile LaTeX source to PDF using pdflatex and return the PDF bytes.

    If profile_pic_path is set and the file exists, it is optimized (resized,
    JPEG quality 85) and written as "profilepic.jpg" in the compilation
    directory. If path is set but file is missing, compilation proceeds
    without the image (no failure).
    """
    if not is_latex_available():
        raise RuntimeError("pdflatex is not available on the server")

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "cv.tex")
        pdf_path = os.path.join(tmpdir, "cv.pdf")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(tex_source)

        if profile_pic_path and os.path.exists(profile_pic_path):
            dest_name = "profilepic.jpg"
            dest_path = os.path.join(tmpdir, dest_name)
            try:
                _optimize_profile_picture(profile_pic_path, dest_path)
            except Exception as e:
                logger.warning("Failed to optimize profile picture for LaTeX: %s", e)

        # Run pdflatex (twice to settle references); no SyncTeX for smaller export size
        cmd = [
            LATEX_REQUIRED_BIN,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-output-format=pdf",
            "-output-directory=.",
            tex_path,
        ]

        try:
            # First pass
            result = _run_pdflatex(cmd, tmpdir)

            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                raise RuntimeError(f"LaTeX compilation failed (first pass): {error_msg}")

            # Second pass to settle references
            result = _run_pdflatex(cmd, tmpdir)

            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                raise RuntimeError(f"LaTeX compilation failed (second pass): {error_msg}")

            # Read the generated PDF
            if not os.path.exists(pdf_path):
                raise RuntimeError("PDF file was not generated")

            with open(pdf_path, "rb") as f:
                return f.read()

        except subprocess.TimeoutExpired:
            raise RuntimeError("LaTeX compilation timed out")
        except Exception as e:
            raise RuntimeError(f"LaTeX compilation failed: {str(e)}")
