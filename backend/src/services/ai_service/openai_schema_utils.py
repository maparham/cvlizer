"""
OpenAI Responses API JSON schema utilities.

Provides CV_CORRECTIONS_COACHING_FORMAT (full CV quality analysis),
SINGLE_ISSUE_RESPONSE_FORMAT (single-field coaching / field retry), and
CV_PARSING_RESPONSE_FORMAT (structured CV parsing output).
Shared defs (CoachingQuestion, Coaching, Issue) are defined once and reused.
"""

from typing import Any, Dict, Type

from pydantic import BaseModel

from src.config import AIConfig
from src.schemas.ai_response_schemas import CVParsingResponseSchema

# Shared $defs used by both full coaching and single-issue schemas.
# Issue: quality_score and coaching are optional (type ["integer","null"]) so single-field
# can omit them. Full-analysis (CV_CORRECTIONS_COACHING_FORMAT) must set quality_score
# for each issue; single-field (SINGLE_ISSUE_RESPONSE_FORMAT) may set null.
SHARED_ISSUE_DEFS: Dict[str, Any] = {
    "CoachingQuestion": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "question": {
                "type": "string",
                "minLength": 10,
                "maxLength": 100,
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
                        "maxItems": 2,
                        "items": {"$ref": "#/$defs/CoachingQuestion"},
                    },
                    "direct_prompts": {
                        "type": "array",
                        "minItems": 0,
                        "maxItems": 1,
                        "items": {"type": "string", "maxLength": 150},
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
                    "custom",
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
                "description": "ID from CV data for work_experience, education, etc. Null for singular sections like personal_info.",
            },
            "field_path": {
                "type": "string",
                "description": "Dot notation path to the field. Examples: personal_info.description; work_experience[0].description (numeric index OK for work_experience/education); custom_sections[section_id].content where section_id is the section's id from the CV (e.g. custom_sections[why_good_fit].content or custom_sections[uuid].content). For custom sections, always use the section id, never a numeric index.",
            },
            "issue_severity": {
                "type": "string",
                "enum": ["critical", "major", "minor"],
                "description": "critical: 0-25 score, major: 26-49, minor: 50-74",
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
                "type": ["integer", "null"],
                "minimum": 0,
                "maximum": 100,
                "description": "Score for this specific field (0–100). Align with severity: critical=0-25, major=26-49, minor=50-74.",
            },
            "reasoning": {
                "type": "string",
                "minLength": 15,
                "maxLength": 60,
                "description": "Complete sentence explaining the issue within 60 chars. Format: 'Issue: [X]; Impact: [Y]' or 'Contains/Missing [X]; [impact]'",
            },
            "html_diff": {
                "type": ["string", "null"],
                "maxLength": AIConfig.CV_QUALITY_HTML_DIFF_MAX_LENGTH,
                "description": "HTML diff showing corrections using <del> and <ins>.",
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
}

# Full CV quality schema adds Skill and Skills defs and root with overall_quality_score, issues, skills.
CV_CORRECTIONS_COACHING_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "cv_review_v2",
    "strict": True,
    "description": "Structured CV review output with minimal-diff editing and severity-based issues.",
    "schema": {
        "$defs": {
            **SHARED_ISSUE_DEFS,
            "Skill": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {
                        "type": "string",
                        "description": "Corrected or suggested skill name",
                    },
                    "reasoning": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 80,
                        "description": "Why this skill is included (correction reason or relevance to experience)",
                    },
                    "original": {
                        "type": ["string", "null"],
                        "description": "Exact string from the CV when correcting (typo/rephrase); null for new suggestions. Required so the UI can replace correctly.",
                    },
                },
                "required": ["skill", "reasoning", "original"],
            },
            "Skills": {
                "type": "object",
                "description": "Dynamic skill categories where each key is a category and each value is an array of skill suggestions.",
                # OpenAI structured outputs require object schemas to declare ``properties``
                # (even when empty); map-style keys use ``additionalProperties`` below.
                "properties": {},
                "required": [],
                "additionalProperties": {
                    "type": "array",
                    "maxItems": 6,
                    "items": {"$ref": "#/$defs/Skill"},
                },
            },
        },
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "overall_quality_score": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "Start at 100; deduct per issue by severity (critical −12, major −6, minor −3); cap each section's deduction at 15; total deduction = sum of capped section deductions. No issues = 100.",
            },
            "issues": {
                "type": "array",
                "items": {"$ref": "#/$defs/Issue"},
                "description": "At most one issue per (field_path, item_id). Combine all corrections for a field into one issue. Use item_type 'custom' and item_id = custom section id for custom/summary sections. Empty array if CV has no issues.",
            },
            "skills": {"$ref": "#/$defs/Skills"},
        },
        "required": ["overall_quality_score", "issues", "skills"],
    },
}

# Single-field coaching (field retry): same Issue def, root is just one "issue".
SINGLE_ISSUE_RESPONSE_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "single_field_issue",
    "strict": True,
    "description": "Single issue output for one description field coaching.",
    "schema": {
        "$defs": SHARED_ISSUE_DEFS,
        "type": "object",
        "additionalProperties": False,
        "properties": {"issue": {"$ref": "#/$defs/Issue"}},
        "required": ["issue"],
    },
}


def _set_additional_properties_false(schema: Dict[str, Any]) -> None:
    """
    Recursively normalize Pydantic-derived JSON schema for OpenAI/OpenRouter.

    - Set additionalProperties: false on every object.
    - Ensure every object with 'properties' also has a 'required' array that
      includes *all* property keys (OpenAI/OpenRouter strict mode requirement).
    Modifies schema in place.
    """
    if not isinstance(schema, dict):
        return
    # When concrete properties are present, ensure "required" includes all keys.
    # This is required by OpenAI strict mode for object schemas.
    props = schema.get("properties")
    if isinstance(props, dict):
        # Only include keys that are actually in properties (filter out dict-type fields)
        property_keys = set(props.keys())
        original_required = set(schema.get("required") or [])
        # Intersect with property keys to avoid including dict-type fields
        schema["required"] = list(original_required & property_keys | property_keys)
        # For object schemas with explicit properties, disallow extra keys.
        # NOTE: Do not blindly override map/dictionary schemas that use
        # additionalProperties as a nested schema (e.g. Dict[str, List[str]]).
        schema["additionalProperties"] = False
    elif schema.get("type") == "object" and "additionalProperties" not in schema:
        # Keep previous behavior for plain object schemas that don't define
        # map-style additionalProperties.
        schema["additionalProperties"] = False
    for v in schema.values():
        if isinstance(v, dict):
            _set_additional_properties_false(v)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    _set_additional_properties_false(item)


def _format_from_pydantic(
    model: Type[BaseModel],
    name: str,
    description: str,
) -> Dict[str, Any]:
    """Build OpenAI/OpenRouter text format dict from a Pydantic model schema."""
    raw_schema = model.model_json_schema()
    _set_additional_properties_false(raw_schema)
    return {
        "type": "json_schema",
        "name": name,
        "strict": True,
        "description": description,
        "schema": raw_schema,
    }


# CV parsing: structured output attached to the API call (not embedded in prompt).
CV_PARSING_RESPONSE_FORMAT: Dict[str, Any] = _format_from_pydantic(
    CVParsingResponseSchema,
    name="cv_parsing_response",
    description="Structured CV parsing output with personal_info, work_experience, education, skills, etc.",
)
