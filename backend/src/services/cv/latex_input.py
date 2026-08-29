"""Detect LaTeX CV sources and strip boilerplate before AI parsing.

Pasted LaTeX CVs carry markup bloat (preamble, comments, macro definitions)
that can push the source past the parse length cap without adding content.
The AI parser reads LaTeX body markup fine, so stripping stays conservative:
remove setup noise, keep the human-readable body untouched.
"""

import re

_LATEX_MARKERS = (r"\documentclass", r"\begin{document}")

# Commands like \textbf{...}, \section{...}, \item — used as a density signal.
_COMMAND_RE = re.compile(r"\\[a-zA-Z]+\s*(\{|\[)|\\(item|hfill|par)\b|\\\\")

# Preamble/setup lines safe to drop even without a document environment.
_SETUP_LINE_RE = re.compile(
    r"^\s*\\(documentclass|usepackage|newcommand|renewcommand|providecommand"
    r"|definecolor|colorlet|moderncvstyle|moderncvcolor|pagestyle|geometry"
    r"|setlength|setmainfont|setsansfont|input|RequirePackage|PassOptionsToPackage"
    r"|hypersetup|titleformat|titlespacing|newenvironment|DeclareRobustCommand)\b"
)

# Preamble commands whose braced arguments hold real content worth keeping.
_CONTENT_PREAMBLE_RE = re.compile(
    r"^\s*\\(name|title|firstname|familyname|address|phone|email|homepage|social)\b(.*)$"
)


def is_latex_source(text: str) -> bool:
    """Return True when text looks like LaTeX source rather than plain text."""
    if not text:
        return False
    if any(marker in text for marker in _LATEX_MARKERS):
        return True
    # Fragment without preamble: require several commands and a meaningful density.
    hits = _COMMAND_RE.findall(text)
    if len(hits) < 4:
        return False
    lines = [ln for ln in text.splitlines() if ln.strip()]
    command_lines = sum(1 for ln in lines if _COMMAND_RE.search(ln))
    return command_lines >= max(2, len(lines) // 4)


def _strip_comments(text: str) -> str:
    """Remove % comments (full-line and trailing), preserving escaped \\%."""
    out_lines = []
    for line in text.splitlines():
        cut = None
        for m in re.finditer(r"%", line):
            i = m.start()
            if i > 0 and line[i - 1] == "\\":
                continue
            cut = i
            break
        if cut is not None:
            line = line[:cut].rstrip()
            if not line:
                continue
        out_lines.append(line)
    return "\n".join(out_lines)


def _extract_braced_args(line: str) -> str:
    """Return the brace-group contents of a command line, space-joined."""
    return " ".join(re.findall(r"\{([^{}]*)\}", line))


def strip_latex_boilerplate(text: str) -> str:
    """Strip LaTeX preamble/comments/setup noise; return plain text unchanged."""
    if not is_latex_source(text):
        return text

    text = _strip_comments(text)

    begin = text.find(r"\begin{document}")
    if begin != -1:
        preamble, body = text[:begin], text[begin + len(r"\begin{document}") :]
        end = body.find(r"\end{document}")
        if end != -1:
            body = body[:end]
        # Salvage identity content (e.g. \name{Jane}{Doe}) from the preamble.
        kept = []
        for line in preamble.splitlines():
            m = _CONTENT_PREAMBLE_RE.match(line)
            if m:
                kept.append(_extract_braced_args(line))
        text = "\n".join(kept + [body])
    else:
        text = "\n".join(ln for ln in text.splitlines() if not _SETUP_LINE_RE.match(ln))

    # Collapse runs of blank lines left behind by stripping.
    return re.sub(r"\n{3,}", "\n\n", text).strip("\n")
