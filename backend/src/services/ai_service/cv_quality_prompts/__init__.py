"""
CV quality analysis system prompts.

Public API: build_system_prompt(correction_mode) returns the system prompt
for the given mode. User prompt (CV data) is built in cv_quality_service.

Modes: proofread_mode (proofread), coach_mode (coaching).
"""

from . import coach_mode
from . import proofread_mode


def build_system_prompt(correction_mode: str) -> str:
    """
    Return the system prompt for the given correction_mode.

    Args:
        correction_mode: 'proofread' or 'coaching'

    Returns:
        Full system prompt string.

    Raises:
        ValueError: If correction_mode is not supported.
    """
    if correction_mode == "proofread":
        return proofread_mode.build_proofread_mode_system_prompt()
    if correction_mode == "coaching":
        return coach_mode.build_coach_mode_system_prompt()
    raise ValueError(f"Unknown correction_mode: {correction_mode!r}")
