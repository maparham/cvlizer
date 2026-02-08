"""
Helper for executing OpenAI Responses API calls for AI services.

This module encapsulates the branching logic between inline system/user prompts
and pre-made dashboard prompts (prompt-by-ID), while remaining independent of
``common.py`` to avoid circular imports.
"""

import asyncio
import json
import logging
import time
from typing import Any, Callable, Dict, Optional, Tuple, Type

from openai.types.shared_params import Reasoning
from pydantic import BaseModel

from src.config import AIConfig

from .response_parsing import (
    extract_response_data,
    parse_json_from_markdown,
    validate_with_schema,
)

logger = logging.getLogger(__name__)


def _extract_output_text(response: Any) -> Optional[str]:
    """
    Extract aggregated text from a Responses API response output.

    Falls back to ``extract_response_data`` to support older SDK formats.
    """
    if hasattr(response, "output_text"):
        return response.output_text
    content, _, _ = extract_response_data(response)
    return content


def _log_prompts(
    *,
    use_prompt_ref: bool,
    operation_type: str,
    system_prompt: Optional[str],
    user_prompt: Optional[str],
    prompt_ref: Optional[Dict[str, Any]],
    prompt_variables: Optional[Dict[str, str]],
) -> None:
    """Log prompt information at DEBUG level with safe truncation."""
    max_preview_chars = 2000
    if use_prompt_ref and prompt_ref is not None and prompt_variables is not None:
        logger.debug(
            "[%s] Prompt ref: id=%s, version=%s, variables keys=%s",
            operation_type,
            prompt_ref.get("id"),
            prompt_ref.get("version"),
            list(prompt_variables.keys()),
        )
        for var_name, var_value in prompt_variables.items():
            if var_value.startswith("CV DATA: "):
                continue  # Do not log CV data (privacy / noise)
            logger.debug(
                "[%s] Prompt variable %s (len=%d):\n%s",
                operation_type,
                var_name,
                len(var_value),
                var_value[:max_preview_chars],
            )
    else:
        if system_prompt is not None:
            logger.debug(
                "[%s] System prompt (len=%d): %s",
                operation_type,
                len(system_prompt),
                system_prompt[:max_preview_chars],
            )
        if user_prompt is not None:
            logger.debug(
                "[%s] User prompt (len=%d): %s",
                operation_type,
                len(user_prompt),
                user_prompt[:max_preview_chars],
            )


async def run_openai_call(
    *,
    client: Any,
    model: str,
    reasoning_effort: str,
    reasoning_summary: Optional[str],
    use_prompt_ref: bool,
    use_reasoning: bool,
    system_prompt: Optional[str],
    user_prompt: Optional[str],
    response_schema: Type[BaseModel],
    operation_type: str,
    retry_attempts: int,
    retry_delay: float,
    text_verbosity: Optional[str],
    prompt_ref: Optional[Dict[str, Any]],
    prompt_variables: Optional[Dict[str, str]],
    get_seed_for_operation: Callable[[str], Optional[int]],
    with_retries_fn: Callable[..., Any],
    extract_cached_tokens_fn: Callable[[Any], int],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Execute an OpenAI Responses API call and return parsed data and metadata.

    This function contains the core branching logic used by
    ``call_openai_with_schema`` while keeping dependencies injected so it can
    live outside ``common.py``.
    """
    start_time = time.time()

    _log_prompts(
        use_prompt_ref=use_prompt_ref,
        operation_type=operation_type,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        prompt_ref=prompt_ref,
        prompt_variables=prompt_variables,
    )

    # Execute either prompt-by-ID or inline prompt branch
    if use_prompt_ref and prompt_ref is not None and prompt_variables is not None:
        # Branch: pre-made prompt by ID; use responses.create with prompt and variables (no schema).
        prompt_payload: Dict[str, Any] = {
            "id": prompt_ref["id"],
            "variables": prompt_variables,
        }
        if prompt_ref.get("version"):
            prompt_payload["version"] = prompt_ref["version"]
        call_kwargs_base: Dict[str, Any] = {
            "model": model,
            "prompt": prompt_payload,
        }
        if text_verbosity:
            call_kwargs_base["text"] = {"verbosity": text_verbosity}
        if AIConfig.AGENT_PROCESSING_TIER:
            call_kwargs_base["service_tier"] = AIConfig.AGENT_PROCESSING_TIER

        async def _call_create():
            return await asyncio.to_thread(
                client.responses.create,
                **call_kwargs_base,
            )

        response = await with_retries_fn(
            _call_create, attempts=retry_attempts, delay=retry_delay
        )
        generation_time = int((time.time() - start_time) * 1000)

        if getattr(response, "status", None) == "incomplete":
            detail = getattr(
                getattr(response, "incomplete_details", None), "reason", None
            )
            raise RuntimeError(f"Model response incomplete: {detail or 'unknown reason'}")

        # Check for refusal in output content
        if hasattr(response, "output") and response.output:
            for item in response.output:
                if getattr(item, "content", None):
                    contents = (
                        item.content if isinstance(item.content, list) else [item.content]
                    )
                    for c in contents:
                        if getattr(c, "type", None) == "refusal":
                            msg = (
                                getattr(c, "refusal", None) or "Model refused the request"
                            )
                            raise RuntimeError(msg)

        output_text = _extract_output_text(response)
        if not output_text:
            raise RuntimeError("No text output in model response")
        raw_content = parse_json_from_markdown(output_text)
        validated = validate_with_schema(raw_content, response_schema, operation_type)
        if validated is None:
            raise RuntimeError(
                "Model output did not match expected schema; check logs for details"
            )
        parsed_data = validated.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        cached_tokens = extract_cached_tokens_fn(response)
    else:
        # Branch: inline system + user prompt; use responses.parse
        call_kwargs: Dict[str, Any] = {
            "model": model,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "text_format": response_schema,
        }
        if AIConfig.AGENT_PROCESSING_TIER:
            call_kwargs["service_tier"] = AIConfig.AGENT_PROCESSING_TIER
        if use_reasoning:
            reasoning_kw: Dict[str, str] = {"effort": reasoning_effort}
            if reasoning_summary:
                reasoning_kw["summary"] = reasoning_summary
            call_kwargs["reasoning"] = Reasoning(**reasoning_kw)
        else:
            call_kwargs["temperature"] = AIConfig.AI_REASONING_TEMPERATURE
        if text_verbosity:
            call_kwargs["text"] = {"verbosity": text_verbosity}
        seed = get_seed_for_operation(operation_type)
        if seed is not None:
            call_kwargs["seed"] = seed

        async def _call_parse():
            return await asyncio.to_thread(
                client.responses.parse,
                **call_kwargs,
            )

        response = await with_retries_fn(
            _call_parse, attempts=retry_attempts, delay=retry_delay
        )
        generation_time = int((time.time() - start_time) * 1000)
        parsed_data = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        cached_tokens = extract_cached_tokens_fn(response)

    tokens_used = prompt_tokens + completion_tokens

    # Log OpenAI response metadata (all non-trivial info from the API)
    logger.debug(
        "[%s] OpenAI response metadata - model=%s, "
        "prompt_tokens=%s, completion_tokens=%s, cached_tokens=%s, generation_time_ms=%s",
        operation_type,
        model,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        generation_time,
    )

    # Log parsed AI response preview at DEBUG level (truncated for safety)
    try:
        response_json = json.dumps(parsed_data, ensure_ascii=False)
        logger.debug(
            "[%s] AI response (len=%d): %s",
            operation_type,
            len(response_json),
            response_json[:2000],
        )
    except Exception as serialize_error:  # pragma: no cover - defensive logging
        logger.debug(
            "[%s] Failed to serialize AI response for logging: %s",
            operation_type,
            str(serialize_error),
        )

    metadata: Dict[str, Any] = {
        "tokens_used": tokens_used,
        "generation_time": generation_time,
        "model_used": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cached_tokens": cached_tokens,
    }

    return parsed_data, metadata
