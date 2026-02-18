"""
OpenRouter chat completions implementation for the ai_service package.

Calls OpenRouter's REST API (chat completions), then parses and validates
the response using the shared response_parsing utilities. Used when
AI_PROVIDER=openrouter. Does not support prompt_ref, reasoning, or
dashboard prompts; inline system_prompt + user_prompt only.

Uses response_format with json_schema so the model returns structured JSON
matching our Pydantic schema. Pydantic emits $ref/$defs; OpenRouter expects
inline schemas, so we dereference before sending.
"""

import copy
import logging
import time
from typing import Any, Dict, Optional, Tuple, Type

from pydantic import BaseModel

from src.config import AIConfig
from .response_parsing import parse_json_from_markdown, validate_with_schema

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _dereference_json_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inline all $ref references so OpenRouter receives a flat schema.

    OpenRouter's structured outputs expect inline definitions; Pydantic's
    model_json_schema() produces $defs + $ref. This recursively resolves
    #/$defs/X references and removes $defs from the output.
    """
    defs_map = schema.get("$defs") or {}

    def resolve(obj: Any) -> Any:
        if isinstance(obj, dict):
            if "$ref" in obj and len(obj) == 1:
                ref = obj["$ref"]
                if ref.startswith("#/$defs/"):
                    def_name = ref.split("/")[-1]
                    if def_name in defs_map:
                        return resolve(copy.deepcopy(defs_map[def_name]))
                return obj
            return {k: resolve(v) for k, v in obj.items() if k != "$defs"}
        if isinstance(obj, list):
            return [resolve(item) for item in obj]
        return obj

    return resolve(copy.deepcopy(schema))


def _normalize_schema_for_openrouter(
    schema: Dict[str, Any], *, require_all_props: bool = True
) -> None:
    """
    Normalize schema to satisfy OpenRouter/OpenAI strict mode.

    - When require_all_props is True (default): every object with 'properties'
      gets 'required' including all keys (for Pydantic-derived schemas).
    - When require_all_props is False: leave 'required' as-is (for custom
      schemas with optional fields e.g. Skill.original).
    - Every object (type=object or has properties) gets additionalProperties: false.
    Modifies schema in place.
    """
    if not isinstance(schema, dict):
        return
    if require_all_props and "properties" in schema:
        props = schema["properties"]
        if isinstance(props, dict):
            required = set(schema.get("required") or []) | set(props.keys())
            schema["required"] = list(required)
    if schema.get("type") == "object" or "properties" in schema:
        schema["additionalProperties"] = False
    for v in schema.values():
        if isinstance(v, dict):
            _normalize_schema_for_openrouter(v, require_all_props=require_all_props)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    _normalize_schema_for_openrouter(
                        item, require_all_props=require_all_props
                    )


def _build_openrouter_response_format(response_schema: Type[BaseModel]) -> Dict[str, Any]:
    """
    Build OpenRouter response_format from a Pydantic model so the API returns
    JSON matching our schema.

    OpenRouter expects:
      response_format.type = "json_schema"
      response_format.json_schema = { name, strict, schema }
      schema: inline definitions (no $ref/$defs).
    """
    raw_schema = response_schema.model_json_schema()
    schema = _dereference_json_schema(raw_schema)
    _normalize_schema_for_openrouter(schema)
    name = getattr(response_schema, "__name__", "response")
    if not isinstance(name, str) or not name.replace("_", "").isalnum():
        name = "response"
    return {
        "type": "json_schema",
        "json_schema": {
            "name": name,
            "strict": True,
            "schema": schema,
        },
    }


def _user_friendly_message_from_http(status_code: Optional[int], message: str) -> str:
    """Map HTTP/OpenRouter errors to user-friendly messages."""
    if status_code == 429:
        return (
            "Our AI service is temporarily at capacity. "
            "Please try again in a few minutes."
        )
    if status_code and 500 <= status_code < 600:
        return "There was an error connecting to our AI service. Please try again."
    if "timeout" in message.lower() or "timed out" in message.lower():
        return "The request took too long. Please try again."
    if "connection" in message.lower():
        return (
            "We couldn't reach our AI service. "
            "Please check your connection and try again."
        )
    return "An error occurred while processing your request. Please try again."


def _build_response_format_from_custom_schema(
    text_format_schema: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build OpenRouter response_format from a custom JSON schema (e.g. cv_review_v2).

    Dereferences $ref/$defs and normalizes for OpenRouter. Used so OpenRouter
    receives the same schema as OpenAI for CV quality (no original/suggested on
    issues).
    """
    inner = text_format_schema.get("schema") or text_format_schema
    schema = _dereference_json_schema(copy.deepcopy(inner))
    # Preserve optional fields (e.g. Skill.original); only set additionalProperties.
    _normalize_schema_for_openrouter(schema, require_all_props=False)
    return {
        "type": "json_schema",
        "json_schema": {
            "name": text_format_schema.get("name", "response"),
            "strict": text_format_schema.get("strict", True),
            "schema": schema,
        },
    }


async def run_openrouter_call(
    *,
    system_prompt: str,
    user_prompt: str,
    response_schema: Type[BaseModel],
    model: str,
    operation_type: str,
    retry_attempts: int,
    retry_delay: float,
    with_retries_fn: Any,
    reasoning_effort: str = "low",
    reasoning_summary: Optional[str] = None,
    use_reasoning: bool = True,
    text_format_schema: Optional[Dict[str, Any]] = None,
    max_tokens: int = ...,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Execute an OpenRouter chat completions call and return parsed data and metadata.

    Uses inline system + user messages only. No prompt_ref. When text_format_schema
    is provided (e.g. CV quality), uses it for response_format so the model output
    matches the same schema as OpenAI; otherwise builds format from response_schema.
    Response content is parsed as JSON and validated against response_schema.

    Note:
        ``max_tokens`` is required and must be provided by callers (typically
        via ``call_openai_with_schema``) so each operation can control its own
        completion token limit.
    """
    import httpx

    timeout_seconds = float(AIConfig.REQUEST_TIMEOUT_SECONDS)
    api_key = (AIConfig.OPENROUTER_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("OpenRouter API is not enabled")

    if text_format_schema:
        response_format = _build_response_format_from_custom_schema(text_format_schema)
    else:
        response_format = _build_openrouter_response_format(response_schema)

    # Preset mode: model is @preset/...; system prompt comes from OpenRouter dashboard.
    is_preset = (model or "").strip().startswith("@preset/")
    cache_control = {"type": "ephemeral", "ttl": "1d"}

    messages: list = []
    if not is_preset and system_prompt and system_prompt.strip():
        # Use cache_control for prompt caching (Anthropic/Gemini). OpenAI caches automatically.
        # See https://openrouter.ai/docs/guides/best-practices/prompt-caching
        system_content = system_prompt.strip()
        messages.append(
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": system_content,
                        "cache_control": cache_control,
                    }
                ],
            }
        )
    # User message: always use cache_control with TTL for caching.
    user_content = user_prompt.strip()
    messages.append(
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": user_content,
                    "cache_control": cache_control,
                }
            ],
        }
    )
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "response_format": response_format,
    }
    if use_reasoning:
        # gpt-5.2 and similar models support: none, low, medium, high, xhigh (not minimal)
        effort = "low" if reasoning_effort == "minimal" else reasoning_effort
        reasoning_obj: Dict[str, Any] = {"effort": effort}
        if reasoning_summary:
            reasoning_obj["summary"] = reasoning_summary
        payload["reasoning"] = reasoning_obj
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    # App attribution for OpenRouter rankings/analytics (https://openrouter.ai/docs/app-attribution)
    if AIConfig.OPENROUTER_APP_TITLE and AIConfig.OPENROUTER_APP_TITLE.strip():
        headers["X-Title"] = AIConfig.OPENROUTER_APP_TITLE.strip()
    if AIConfig.OPENROUTER_REFERER and AIConfig.OPENROUTER_REFERER.strip():
        headers["HTTP-Referer"] = AIConfig.OPENROUTER_REFERER.strip()

    start_time = time.time()

    async def _do_request() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    try:
        raw = await with_retries_fn(
            _do_request,
            attempts=retry_attempts,
            delay=retry_delay,
        )
    except httpx.HTTPStatusError as e:
        msg = _user_friendly_message_from_http(
            e.response.status_code if e.response else None,
            str(e),
        )
        err_body = ""
        if e.response is not None:
            try:
                err_body = e.response.text
            except Exception:
                pass
        logger.warning(
            "OpenRouter HTTP error for %s: %s%s",
            operation_type,
            e,
            f" | Response: {err_body[:500]}" if err_body else "",
        )
        raise RuntimeError(msg) from e
    except httpx.TimeoutException as e:
        msg = _user_friendly_message_from_http(None, str(e))
        logger.warning("OpenRouter timeout for %s: %s", operation_type, e)
        raise RuntimeError(msg) from e
    except httpx.RequestError as e:
        msg = _user_friendly_message_from_http(None, str(e))
        logger.warning("OpenRouter request error for %s: %s", operation_type, e)
        raise RuntimeError(msg) from e

    generation_time = int((time.time() - start_time) * 1000)

    choices = raw.get("choices") or []
    if not choices:
        raise RuntimeError("No text output in model response")
    message = choices[0].get("message") or {}
    content = (message.get("content") or "").strip()
    if not content:
        raise RuntimeError("We didn't get a valid response. Please try again.")

    json_str = parse_json_from_markdown(content)
    validated = validate_with_schema(json_str, response_schema, operation_type)
    if validated is None:
        raise RuntimeError(
            "Model output did not match expected schema; check logs for details"
        )
    parsed_data = validated.model_dump()

    usage = raw.get("usage") or {}
    prompt_tokens = int(usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0))
    completion_tokens = int(
        usage.get("completion_tokens", 0) or usage.get("output_tokens", 0)
    )
    tokens_used = prompt_tokens + completion_tokens

    # OpenRouter returns usage.cost (amount charged); use when valid for logging.
    provider_cost: Optional[float] = None
    raw_cost = usage.get("cost")
    if raw_cost is not None:
        try:
            cost_float = float(raw_cost)
            if cost_float >= 0:
                provider_cost = cost_float
        except (TypeError, ValueError):
            pass

    metadata: Dict[str, Any] = {
        "tokens_used": tokens_used,
        "generation_time": generation_time,
        "model_used": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cached_tokens": 0,
    }
    if provider_cost is not None:
        metadata["provider_cost"] = provider_cost
    return parsed_data, metadata
