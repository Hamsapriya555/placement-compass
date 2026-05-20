from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any

from langchain_ollama import OllamaLLM

from ..config.settings import settings
from ..graph_state.state import (
    AuditLogEntry,
    ConsolidatedCompanyRecord,
    GraphState,
    ModelResponse,
)

LOGGER = logging.getLogger(__name__)

RETRY_FIELDS = [
    "company_name",
    "industry",
    "description",
    "headquarters",
    "founded_year",
    "website",
    "employee_count",
    "revenue",
    "ceo_name",
    "operating_countries",
    "competitors",
    "strengths",
    "weaknesses",
    "confidence_score",
]


def _strip_code_blocks(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def _ollama_generate_json(model_name: str, prompt: str) -> tuple[dict[str, Any], str]:
    if model_name == "phi3:mini":
        LOGGER.info("Using Ollama model: phi3:mini")
    else:
        LOGGER.info("Using Ollama model: %s", model_name)
    client = OllamaLLM(model=model_name, temperature=settings.temperature)
    if hasattr(client, "agenerate"):
        result = await client.agenerate([prompt])
        raw = str(result.generations[0][0].text) if result.generations else str(result)
    else:
        loop = asyncio.get_running_loop()
        raw = await loop.run_in_executor(None, client.generate, prompt)

    raw_text = _strip_code_blocks(str(raw))
    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, dict):
            return parsed, raw_text
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw_text, flags=re.S)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed, raw_text
        except json.JSONDecodeError:
            pass

    LOGGER.warning("Retry model %s returned malformed JSON", model_name)
    return {}, raw_text


def _build_retry_prompt(state: GraphState) -> str:
    locked_data = {
        field: getattr(state.consolidated_record, field)
        for field in RETRY_FIELDS
        if field not in state.failed_fields
    }
    return (
        "You are a local company intelligence repair agent. "
        "You must regenerate only the failed fields. "
        "Do not modify locked fields. Return only valid JSON. "
        f"Company: {state.company_name}\n"
        f"Locked data: {locked_data}\n"
        f"Failed fields: {state.failed_fields}\n"
    )


def _apply_patch(
    record: ConsolidatedCompanyRecord,
    patch: dict[str, Any],
    failed_fields: list[str],
) -> ConsolidatedCompanyRecord:
    data = record.model_dump(mode="python")
    for field in failed_fields:
        if field not in patch:
            continue
        value = patch[field]
        if value in (None, "", []):
            continue
        if field == "founded_year":
            try:
                value = int(value)
            except (TypeError, ValueError):
                continue
        if field == "employee_count":
            try:
                value = int(value)
            except (TypeError, ValueError):
                continue
        if field in {"operating_countries", "competitors", "strengths", "weaknesses"}:
            if not isinstance(value, list):
                value = [str(value)]
        data[field] = value
    data["updated_at"] = datetime.utcnow()
    return ConsolidatedCompanyRecord(**data)


def _select_retry_model(attempt: int) -> str:
    index = min(attempt, len(settings.retry_models) - 1)
    return settings.retry_models[index]


async def run_retry_handler(state: GraphState) -> dict[str, Any]:
    if not state.failed_fields:
        LOGGER.info("Retry handler skipped: no failed fields")
        return {"updated_at": datetime.utcnow()}

    if state.retry_count >= settings.max_retries:
        LOGGER.warning("Retry limit reached for %s", state.company_name)
        audit = AuditLogEntry(
            actor="retry_handler",
            action="retry_exhausted",
            message=f"Max retry attempts reached: {state.retry_count}",
            metadata={"failed_fields": state.failed_fields},
        )
        state.audit_logs.append(audit)
        state.updated_at = datetime.utcnow()
        return {
            "audit_logs": state.audit_logs,
            "updated_at": state.updated_at,
        }

    next_model = _select_retry_model(state.retry_count)
    prompt = _build_retry_prompt(state)
    start = datetime.utcnow()
    patch, raw_output = await _ollama_generate_json(next_model, prompt)
    duration_seconds = (datetime.utcnow() - start).total_seconds()

    updated_record = _apply_patch(state.consolidated_record, patch, state.failed_fields)
    still_failed = [field for field in state.failed_fields if getattr(updated_record, field) in (None, "", [])]
    patched = [field for field in state.failed_fields if field not in still_failed]

    response = ModelResponse(
        model_name=next_model,
        stage="retry",
        raw_output=raw_output,
        parsed_json=patch,
        started_at=start,
        finished_at=datetime.utcnow(),
        duration_seconds=duration_seconds,
    )

    audit = AuditLogEntry(
        actor="retry_handler",
        action="retry_attempt",
        message=f"Retry attempt {state.retry_count + 1} using {next_model}",
        metadata={
            "model": next_model,
            "patched_fields": patched,
            "still_failed": still_failed,
        },
    )

    state.consolidated_record = updated_record
    state.retry_count += 1
    state.failed_fields = still_failed
    state.model_responses.append(response)
    state.audit_logs.append(audit)
    state.execution_metadata["last_retry_model"] = next_model
    state.execution_metadata["last_retry_patched"] = patched
    state.timestamps["retry_completed_at"] = datetime.utcnow().isoformat()
    state.updated_at = datetime.utcnow()

    return {
        "consolidated_record": state.consolidated_record,
        "failed_fields": state.failed_fields,
        "retry_count": state.retry_count,
        "model_responses": state.model_responses,
        "audit_logs": state.audit_logs,
        "execution_metadata": state.execution_metadata,
        "timestamps": state.timestamps,
        "updated_at": state.updated_at,
    }


def should_retry(state: GraphState) -> str:
    if state.failed_fields and state.retry_count < settings.max_retries:
        return "retry"
    return "finalize"
