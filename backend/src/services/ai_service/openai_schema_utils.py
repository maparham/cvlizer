"""
OpenAI Responses API JSON schema utilities.

Provides CV_CORRECTIONS_COACHING_FORMAT (full CV quality analysis),
SINGLE_ISSUE_RESPONSE_FORMAT (single-field coaching / field retry),
CV_PARSING_RESPONSE_FORMAT (structured CV parsing output), and
AI_SUGGESTIONS_RESPONSE_FORMAT (job fit + optimization suggestions).
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

    - Set additionalProperties: false on fixed-key objects (not on dynamic-key maps).
    - Ensure every object with 'properties' also has a 'required' array that
      includes *all* property keys (OpenAI/OpenRouter strict mode requirement).
    Modifies schema in place.
    """
    if not isinstance(schema, dict):
        return
    # OpenAI structured outputs require every object schema to declare
    # ``properties`` (possibly empty). Pydantic RootModel[Dict[...]] omits it.
    if schema.get("type") == "object" and "properties" not in schema:
        schema["properties"] = {}
        schema.setdefault("required", [])
    # When concrete properties are present, ensure "required" includes all keys.
    # This is required by OpenAI strict mode for object schemas.
    props = schema.get("properties")
    if isinstance(props, dict):
        # Exclude map-type fields (Dict[K, V]) from required: OpenAI strict mode rejects
        # objects where a required key's schema uses additionalProperties as a sub-schema.
        non_map_keys = {
            k
            for k, v in props.items()
            if not (
                isinstance(v, dict) and isinstance(v.get("additionalProperties"), dict)
            )
        }
        original_required = set(schema.get("required") or [])
        schema["required"] = list(original_required & non_map_keys | non_map_keys)
        # For object schemas with explicit fixed keys, disallow extra keys.
        # Preserve dynamic-key maps (additionalProperties is a JSON Schema object).
        if not isinstance(schema.get("additionalProperties"), dict):
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

# AI suggestions (job fit + optimization): hand-crafted to avoid OpenAI strict-mode
# rejections caused by Pydantic's $ref+siblings (→ allOf), anyOf[ref,ref] (→ union),
# and map-type required fields.
#
# IMPORTANT: When changing ItemSuggestionSchema / AISuggestionsResponseSchema, update
# the hand-crafted schema below to match and run:
#   pytest backend/tests/unit/test_openai_schema_utils.py::test_ai_suggestions_contract
#
# Uses a single merged ItemSuggestion object where
# low-score-only fields are nullable so the schema stays strict-compatible.
_ITEM_SUGGESTION_DEF: Dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "description": (
        "CV item suggestion. item_type='high_score': only id/current_content_score "
        "needed. item_type='low_score': all fields required (nullable ones set to null "
        "for high_score items)."
    ),
    "properties": {
        "item_type": {
            "type": "string",
            "enum": ["high_score", "low_score"],
            "description": "high_score=score>=50 (no edits), low_score=score<50 (edits included)",
        },
        "id": {"type": "string", "minLength": 1, "description": "Item ID from CV data"},
        "current_content_score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "description": "Content relevance score 0-100 vs job description",
        },
        "original": {
            "type": ["string", "null"],
            "description": "Original description text; null for high_score items",
        },
        "suggested": {
            "type": ["string", "null"],
            "description": "Improved description; null for high_score items",
        },
        "reasoning": {
            "type": ["string", "null"],
            "description": "Reason for suggestion; null for high_score items",
        },
        "importance": {
            "type": ["string", "null"],
            "enum": ["highly_recommended", "standard", None],
            "description": "'highly_recommended' or 'standard'; null for high_score items",
        },
        "html_diff": {
            "type": ["string", "null"],
            "description": "HTML diff with <del>/<ins>; null or empty for high_score items",
        },
    },
    "required": [
        "item_type",
        "id",
        "current_content_score",
        "original",
        "suggested",
        "reasoning",
        "importance",
        "html_diff",
    ],
}

_PROFESSIONAL_SUMMARY_DEF: Dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "suggested_text": {"type": "string", "default": ""},
        "original_text": {"type": "string", "default": ""},
        "key_changes": {"type": "array", "items": {"type": "string"}},
        "html_diff": {
            "type": "string",
            "default": "",
            "description": "HTML-formatted diff: <del>removed</del> <ins>added</ins>",
        },
    },
    "required": ["suggested_text", "original_text", "key_changes", "html_diff"],
}

_SKILL_SUGGESTION_DEF: Dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "skill": {"type": "string", "minLength": 1},
        "reasoning": {"type": "string", "minLength": 1},
    },
    "required": ["skill", "reasoning"],
}

AI_SUGGESTIONS_RESPONSE_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "ai_suggestions_response",
    "strict": True,
    "description": (
        "Job fit analysis and optimization suggestions: skills by category, "
        "optional summary, work/education item suggestions."
    ),
    "schema": {
        "$defs": {
            "ItemSuggestion": _ITEM_SUGGESTION_DEF,
            "ProfessionalSummary": _PROFESSIONAL_SUMMARY_DEF,
            "SkillSuggestion": _SKILL_SUGGESTION_DEF,
        },
        "type": "object",
        "additionalProperties": False,
        "properties": {
            # Job fit fields
            "title": {
                "type": ["string", "null"],
                "description": "Dynamic title e.g. 'Hello Company!'",
            },
            "confidence_score": {"type": "integer", "minimum": 1, "maximum": 100},
            "fit_analysis": {"type": "string", "minLength": 50},
            "key_matches": {"type": "array", "items": {"type": "string"}},
            "missing_skills": {"type": "array", "items": {"type": "string"}},
            "suggested_improvements": {"type": "array", "items": {"type": "string"}},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "weaknesses": {"type": "array", "items": {"type": "string"}},
            # Optimization fields
            "skills": {
                "type": "object",
                "description": "Skill suggestions grouped by dynamic category name",
                "properties": {},
                "required": [],
                "additionalProperties": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/SkillSuggestion"},
                },
            },
            "professional_summary": {
                "anyOf": [
                    {"$ref": "#/$defs/ProfessionalSummary"},
                    {"type": "null"},
                ],
                "description": "Include only when professional summary is visible in CV; null if no changes needed",
            },
            "work_experience": {
                "type": "array",
                "items": {"$ref": "#/$defs/ItemSuggestion"},
                "description": "One entry per work experience item",
            },
            "education": {
                "type": "array",
                "items": {"$ref": "#/$defs/ItemSuggestion"},
                "description": "One entry per education item",
            },
        },
        "required": [
            "title",
            "confidence_score",
            "fit_analysis",
            "key_matches",
            "missing_skills",
            "suggested_improvements",
            "strengths",
            "weaknesses",
            "skills",
            "professional_summary",
            "work_experience",
            "education",
        ],
    },
}
