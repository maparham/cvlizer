"""
OpenAI Responses API JSON schema utilities.

Provides CV_CORRECTIONS_COACHING_FORMAT: the JSON schema used for CV quality
analysis (proofread and coaching modes) structured output.
"""

from typing import Any, Dict


# JSON schema for CV quality analysis (proofread + coaching modes).
# Wrapper adds type for Responses API; inner schema matches cv_review_v2 spec.
CV_CORRECTIONS_COACHING_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": "cv_review_v2",
    "strict": True,
    "description": "Structured CV review output with minimal-diff editing and severity-based issues.",
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
                        "description": "ID from CV data for work_experience, education, etc. Null for singular sections like personal_info.",
                    },
                    "field_path": {
                        "type": "string",
                        "description": "Dot notation path to specific field, e.g., 'personal_info.description' or 'work_experience[2].position'",
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
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Score for this specific field. Must be <50 to be included as issue. Must align with severity: critical=0-25, major=26-49, minor=50-74.",
                    },
                    "reasoning": {
                        "type": "string",
                        "minLength": 15,
                        "maxLength": 80,
                        "description": "Complete sentence explaining the issue within 80 chars. Format: 'Contains/Missing [X]; [impact]'",
                    },
                    "html_diff": {
                        "type": ["string", "null"],
                        "maxLength": 2000,
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
                        "maxLength": 150,
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
                "additionalProperties": False,
                "properties": {
                    "technical": {
                        "type": "array",
                        "maxItems": 50,
                        "items": {"$ref": "#/$defs/Skill"},
                        "description": "Corrected existing skills + up to 7 new suggestions",
                    },
                    "soft": {
                        "type": "array",
                        "maxItems": 20,
                        "items": {"$ref": "#/$defs/Skill"},
                        "description": "Up to 5 new soft skill suggestions",
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
                "description": "Weighted average of all CV sections. No flagged issues = 100.",
            },
            "issues": {
                "type": "array",
                "items": {"$ref": "#/$defs/Issue"},
                "description": "Only sections/fields with quality_score <50. Issues with html_diff set must have quality_score null or >=50. Use item_type 'professional_summary' and field_path 'professional_summary' for summary feedback. Empty array if CV has no issues.",
            },
            "skills": {"$ref": "#/$defs/Skills"},
        },
        "required": ["overall_quality_score", "issues", "skills"],
    },
}
