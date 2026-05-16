"""Tests for OpenAI JSON schema normalization used with structured outputs."""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.schemas.ai_response_schemas import AISuggestionsResponseSchema  # noqa: E402

_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_openai_schema_utils():
    """Load module without importing ``ai_service`` package ``__init__.py``."""
    path = _BACKEND_ROOT / "src/services/ai_service/openai_schema_utils.py"
    spec = importlib.util.spec_from_file_location(
        "_openai_schema_utils_for_tests",
        path,
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def osu():
    return _load_openai_schema_utils()


def _walk_objects_missing_properties(obj, path="$"):
    """Yield JSON-schema paths where type object lacks ``properties``."""
    if isinstance(obj, dict):
        if obj.get("type") == "object" and "properties" not in obj:
            yield path
        for key, val in obj.items():
            yield from _walk_objects_missing_properties(val, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from _walk_objects_missing_properties(item, f"{path}[{i}]")


def test_ai_suggestions_format_has_properties_on_all_objects(osu):
    """OpenAI rejects map-like RootModels unless ``properties`` is present (may be empty)."""
    schema = osu.AI_SUGGESTIONS_RESPONSE_FORMAT["schema"]
    missing = list(_walk_objects_missing_properties(schema))
    assert not missing, "object schemas missing 'properties' at:\n" + json.dumps(
        missing[:20], indent=2
    )


def test_skills_map_keeps_additional_properties_schema(osu):
    """Dynamic skill categories must retain additionalProperties as a value schema.

    Skills is inlined in properties (not a $defs entry) in the hand-crafted schema.
    """
    schema = osu.AI_SUGGESTIONS_RESPONSE_FORMAT["schema"]
    skills_def = schema["properties"]["skills"]
    assert skills_def.get("type") == "object"
    assert isinstance(skills_def.get("additionalProperties"), dict)
    assert skills_def["additionalProperties"].get("type") == "array"
    # Must not appear in required (map-type fields are excluded from required)
    assert "skills" not in (skills_def.get("required") or [])


def test_set_additional_properties_preserves_dict_maps(osu):
    raw = {
        "type": "object",
        "additionalProperties": {"type": "string"},
    }
    osu._set_additional_properties_false(raw)
    assert raw["properties"] == {}
    assert isinstance(raw["additionalProperties"], dict)


def test_ai_suggestions_contract(osu):
    """Hand-crafted schema and Pydantic schema must accept the same minimal valid object.

    Builds a minimal payload that satisfies every required field in
    AI_SUGGESTIONS_RESPONSE_FORMAT (nullable fields set to null, arrays empty),
    then validates it with AISuggestionsResponseSchema to confirm both agree.
    """
    # Verify top-level property keys match model fields
    hand_crafted_keys = set(
        osu.AI_SUGGESTIONS_RESPONSE_FORMAT["schema"]["properties"].keys()
    )
    pydantic_keys = set(AISuggestionsResponseSchema.model_fields.keys())
    assert hand_crafted_keys == pydantic_keys, (
        f"Key mismatch between hand-crafted schema and Pydantic model.\n"
        f"  Only in hand-crafted: {hand_crafted_keys - pydantic_keys}\n"
        f"  Only in Pydantic:     {pydantic_keys - hand_crafted_keys}"
    )

    # Minimal valid payload — nullable fields set to null, arrays empty
    minimal_payload = {
        "title": None,
        "confidence_score": 50,
        "fit_analysis": "A" * 50,  # min_length=50
        "key_matches": [],
        "missing_skills": [],
        "suggested_improvements": [],
        "strengths": [],
        "weaknesses": [],
        "skills": {},
        "professional_summary": None,
        "work_experience": [],
        "education": [],
    }

    # Must not raise
    parsed = AISuggestionsResponseSchema.model_validate(minimal_payload)
    assert parsed.confidence_score == 50
