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
# Attached to responses.create so the model output conforms to this structure.
CV_CORRECTIONS_COACHING_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "cv_corrections",
    "strict": True,
    "schema": {
        "$defs": {
            "CoachingQuestion": {
                "type": "object",
                "additionalProperties": False,
                "properties": {"question": {"type": "string", "minLength": 10}},
                "required": ["question"],
            },
            "FieldCorrection": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "field_name": {"type": "string"},
                    "html_diff": {"type": "string", "pattern": "<(del|ins)>"},
                    "reasoning": {"type": "string", "maxLength": 200},
                },
                "required": ["field_name", "html_diff", "reasoning"],
            },
            "WritingCorrection": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "item_id": {"type": "string"},
                    "section": {"type": "string"},
                    "importance": {
                        "type": "string",
                        "enum": ["highly_recommended", "standard"],
                    },
                    "field_corrections": {
                        "type": "array",
                        "minItems": 1,
                        "items": {"$ref": "#/$defs/FieldCorrection"},
                    },
                },
                "required": ["item_id", "section", "importance", "field_corrections"],
            },
            "LowQualityItem": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "item_type": {"type": "string"},
                    "item_id": {"type": "string"},
                    "section": {"type": "string"},
                    "quality_score": {
                        "type": "integer",
                        "minimum": 0,
                        "exclusiveMaximum": 50,
                    },
                    "reasoning": {"type": "string", "maxLength": 200},
                    "html_diff": {"type": "string", "pattern": "<(del|ins)>"},
                    "coaching_questions": {
                        "type": ["array", "null"],
                        "items": {"$ref": "#/$defs/CoachingQuestion"},
                    },
                },
                "required": [
                    "item_type",
                    "item_id",
                    "section",
                    "quality_score",
                    "reasoning",
                    "html_diff",
                    "coaching_questions",
                ],
            },
            "ContentCoaching": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "item_id": {"type": "string"},
                    "section": {"type": "string"},
                    "issue_category": {
                        "type": "string",
                        "enum": [
                            "insufficient_content",
                            "missing_impact",
                            "too_brief",
                            "missing_achievements",
                            "lacks_specificity",
                            "missing_context",
                            "weak_action_verbs",
                        ],
                    },
                    "coaching_questions": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 3,
                        "items": {"$ref": "#/$defs/CoachingQuestion"},
                    },
                    "direct_prompts": {
                        "type": "array",
                        "maxItems": 2,
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "item_id",
                    "section",
                    "issue_category",
                    "coaching_questions",
                    "direct_prompts",
                ],
            },
            "ProfessionalSummary": {
                "type": ["object", "null"],
                "additionalProperties": False,
                "properties": {
                    "original_text": {"type": "string"},
                    "key_changes": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "html_diff": {"type": ["string", "null"]},
                    "coaching_questions": {
                        "type": ["array", "null"],
                        "items": {"$ref": "#/$defs/CoachingQuestion"},
                    },
                },
                "required": [
                    "original_text",
                    "key_changes",
                    "html_diff",
                    "coaching_questions",
                ],
            },
            "Skill": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {"type": "string"},
                    "reasoning": {"type": "string", "maxLength": 100},
                    "original": {"type": ["string", "null"]},
                },
                "required": ["skill", "reasoning", "original"],
            },
            "Skills": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "technical": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/Skill"},
                    },
                    "soft": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/Skill"},
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
            },
            "writing_corrections": {
                "type": "array",
                "items": {"$ref": "#/$defs/WritingCorrection"},
            },
            "professional_summary": {"$ref": "#/$defs/ProfessionalSummary"},
            "skills": {"$ref": "#/$defs/Skills"},
            "content_coaching": {
                "type": "array",
                "items": {"$ref": "#/$defs/ContentCoaching"},
            },
            "work_experience": {
                "type": "array",
                "items": {"$ref": "#/$defs/LowQualityItem"},
            },
            "education": {
                "type": "array",
                "items": {"$ref": "#/$defs/LowQualityItem"},
            },
        },
        "required": [
            "overall_quality_score",
            "writing_corrections",
            "professional_summary",
            "skills",
            "content_coaching",
            "work_experience",
            "education",
        ],
    },
}
