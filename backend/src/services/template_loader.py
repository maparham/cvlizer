"""
Template Loader Service - Load and manage LaTeX CV templates

This module provides functionality to load LaTeX templates from the templates directory,
read template metadata, and manage template availability.

Key responsibilities:
- Load template .tex files from templates directory
- Provide template metadata from config.json
- List available templates
- Validate template files

Usage context:
- Used by CV export system to select and load templates
- Templates stored in backend/src/templates/ directory
- Each template is a .tex file with section placeholders
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional

# Path to templates directory (assuming running from backend/)
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
CONFIG_FILE = TEMPLATES_DIR / "config.json"


def load_template(template_name: str) -> str:
    """Load a template .tex file by name.

    Args:
        template_name: Name of the template (without .tex extension)

    Returns:
        Template content as string

    Raises:
        FileNotFoundError: If template file doesn't exist
    """
    template_path = TEMPLATES_DIR / f"{template_name}.tex"

    if not template_path.exists():
        raise FileNotFoundError(f"Template {template_name} not found at {template_path}")

    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


def list_templates() -> List[str]:
    """List all available template names.

    Returns:
        List of template names (without .tex extension)
    """
    templates = []
    if not TEMPLATES_DIR.exists():
        return templates

    for file in TEMPLATES_DIR.glob("*.tex"):
        template_name = file.stem
        templates.append(template_name)

    return sorted(templates)


def get_template_metadata() -> List[Dict[str, str]]:
    """Get metadata for all templates from config.json.

    Returns:
        List of template metadata dictionaries with name, displayName, description
    """
    if not CONFIG_FILE.exists():
        return []

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config.get("templates", [])
    except (json.JSONDecodeError, IOError):
        return []


def get_template_metadata_by_name(template_name: str) -> Optional[Dict[str, str]]:
    """Get metadata for a specific template.

    Args:
        template_name: Name of the template

    Returns:
        Template metadata dict or None if not found
    """
    templates = get_template_metadata()
    for template in templates:
        if template.get("name") == template_name:
            return template
    return None


def get_default_template() -> Optional[str]:
    """Get the default template name from config.json.

    Returns:
        Default template name if configured, None otherwise
    """
    if not CONFIG_FILE.exists():
        return None

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config.get("defaultTemplate")
    except (json.JSONDecodeError, IOError):
        return None


def is_template_available(template_name: str) -> bool:
    """Check if a template is available.

    Args:
        template_name: Name of the template

    Returns:
        True if template exists, False otherwise
    """
    template_path = TEMPLATES_DIR / f"{template_name}.tex"
    return template_path.exists()
