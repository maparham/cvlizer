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
