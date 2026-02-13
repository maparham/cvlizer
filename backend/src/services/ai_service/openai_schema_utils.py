"""
OpenAI Responses API JSON schema utilities.

These helpers normalize Pydantic-generated JSON schemas into a shape that is
compatible with the OpenAI Responses API structured output requirements.
"""

from typing import Any, Dict, Type

from pydantic import BaseModel


def normalize_schema_for_openai(schema: Any) -> Any:
    """
    Recursively normalize JSON schema for OpenAI Responses API structured output.

    Adjustments:
    - Set ``additionalProperties: false`` on all object types.
    - Ensure ``required`` includes every key in ``properties`` (the API expects
      all declared properties to be listed as required).
    - Strip keywords alongside ``$ref`` (the API disallows extra fields such as
      ``description`` next to ``$ref``).
    """
    if not isinstance(schema, dict):
        return schema

    out = dict(schema)

    # Refs must be alone: no other keywords (e.g. description) alongside $ref.
    if "$ref" in out and len(out) > 1:
        return {"$ref": out["$ref"]}

    if out.get("type") == "object":
        out["additionalProperties"] = False
        if "properties" in out:
            prop_keys = list(out["properties"].keys())
            existing_required = set(out.get("required") or [])
            out["required"] = sorted(existing_required | set(prop_keys))

    if "properties" in out:
        out["properties"] = {
            key: normalize_schema_for_openai(value)
            for key, value in out["properties"].items()
        }

    if "items" in out:
        out["items"] = normalize_schema_for_openai(out["items"])

    for key in ("oneOf", "anyOf", "allOf"):
        if key in out and isinstance(out[key], list):
            out[key] = [normalize_schema_for_openai(value) for value in out[key]]

    if "$defs" in out:
        out["$defs"] = {
            key: normalize_schema_for_openai(value) for key, value in out["$defs"].items()
        }

    return out


def build_cv_corrections_format(response_schema: Type[BaseModel]) -> Dict[str, Any]:
    """
    Build Responses API ``text.format`` payload for CV corrections JSON schema.

    This wraps the normalized Pydantic schema in the structure expected by the
    Responses API when using JSON schema based output formatting.
    """
    schema = response_schema.model_json_schema()
    schema = normalize_schema_for_openai(schema)
    return {
        "type": "json_schema",
        "name": "cv_corrections",
        "schema": schema,
        "strict": True,
    }


# Custom JSON schema for CV quality coaching mode (prompt-by-ID).
# cv_review_v2: single issues array with nested coaching; transformed to legacy shape downstream.
CV_CORRECTIONS_COACHING_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "cv_review_v2",
    "strict": True,
    "description": (
        "Structured CV review output with minimal-diff editing "
        "and severity-based issues."
    ),
    "schema": {
        "$defs": {
            "CoachingQuestion": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "question": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 200,
                    },
                },
                "required": ["question"],
            },
            "Coaching": {
                "anyOf": [
                    {"type": "null"},
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "coaching_questions": {
                                "type": "array",
                                "minItems": 1,
                                "maxItems": 3,
                                "items": {"$ref": "#/$defs/CoachingQuestion"},
                            },
                            "direct_prompts": {
                                "type": "array",
                                "minItems": 0,
                                "maxItems": 2,
                                "items": {"type": "string", "maxLength": 300},
                            },
                        },
                        "required": ["coaching_questions", "direct_prompts"],
                    },
                ],
            },
            "Issue": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "item_type": {
                        "type": "string",
                        "enum": [
                            "personal_info",
                            "professional_summary",
                            "work_experience",
                            "education",
                            "skills",
                            "certifications",
                            "projects",
                            "awards",
                            "publications",
                            "volunteer_experience",
                        ],
                    },
                    "item_id": {
                        "type": ["string", "null"],
                        "description": (
                            "ID from CV data for work_experience, education, etc. "
                            "Null for singular sections like personal_info."
                        ),
                    },
                    "field_path": {
                        "type": "string",
                        "description": (
                            "Dot notation path to specific field, e.g., "
                            "'personal_info.description' or 'work_experience[2].position'"
                        ),
                    },
                    "issue_severity": {
                        "type": "string",
                        "enum": ["critical", "major", "minor"],
                        "description": (
                            "critical: 0-25 score, major: 26-49, minor: 50-74"
                        ),
                    },
                    "issue_category": {
                        "type": "string",
                        "enum": [
                            "offensive_language",
                            "discriminatory_content",
                            "unprofessional_tone",
                            "grammar_errors",
                            "insufficient_content",
                            "missing_impact",
                            "missing_achievements",
                            "lacks_specificity",
                            "too_brief",
                            "missing_context",
                            "weak_action_verbs",
                        ],
                    },
                    "quality_score": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": (
                            "Score for this specific field. Must be <50 to be "
                            "included as issue. Must align with severity: "
                            "critical=0-25, major=26-49, minor=50-74."
                        ),
                    },
                    "reasoning": {
                        "type": "string",
                        "minLength": 15,
                        "maxLength": 80,
                        "description": (
                            "Complete sentence explaining the issue within 80 chars. "
                            "Format: 'Contains/Missing [X]; [impact]'"
                        ),
                    },
                    "html_diff": {
                        "type": ["string", "null"],
                        "maxLength": 2000,
                        "description": (
                            "HTML diff showing corrections using <del> and <ins>."
                        ),
                    },
                    "coaching": {"$ref": "#/$defs/Coaching"},
                },
                "required": [
                    "item_type",
                    "item_id",
                    "field_path",
                    "issue_severity",
                    "issue_category",
                    "quality_score",
                    "reasoning",
                    "html_diff",
                    "coaching",
                ],
            },
            "Skill": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {
                        "type": "string",
                        "description": ("Corrected or suggested skill name"),
                    },
                    "reasoning": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 150,
                        "description": (
                            "Why this skill is included (correction reason or "
                            "relevance to experience)"
                        ),
                    },
                    "original": {
                        "type": ["string", "null"],
                        "description": (
                            "Original misspelled/incorrectly capitalized skill, "
                            "or null if this is a new suggestion"
                        ),
                    },
                },
                "required": ["skill", "reasoning", "original"],
            },
            "Skills": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "technical": {
                        "type": "array",
                        "maxItems": 50,
                        "items": {"$ref": "#/$defs/Skill"},
                        "description": (
                            "Corrected existing skills + up to 7 new suggestions"
                        ),
                    },
                    "soft": {
                        "type": "array",
                        "maxItems": 20,
                        "items": {"$ref": "#/$defs/Skill"},
                        "description": ("Up to 5 new soft skill suggestions"),
                    },
                },
                "required": ["technical", "soft"],
            },
        },
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "overall_quality_score": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": (
                    "Weighted average of all CV sections. No flagged issues = 100."
                ),
            },
            "issues": {
                "type": "array",
                "items": {"$ref": "#/$defs/Issue"},
                "description": (
                    "Only sections/fields with quality_score <50. Issues with "
                    "html_diff set must have quality_score null or >=50. Use "
                    "item_type "
                    "'professional_summary' and field_path 'professional_summary' "
                    "for summary feedback. Empty array if CV has no issues."
                ),
            },
            "skills": {"$ref": "#/$defs/Skills"},
        },
        "required": [
            "overall_quality_score",
            "issues",
            "skills",
        ],
    },
}
