from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any

from langchain_ollama import OllamaLLM

from ...config.settings import settings
from ...graph_state.state import AuditLogEntry, GraphState, ModelResponse, ResearchOutput

LOGGER = logging.getLogger(__name__)

RESEARCH_FIELDS = [
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


async def _ollama_generate(model_name: str, prompt: str) -> str:
    if model_name == "phi3:mini":
        LOGGER.info("Using Ollama model: phi3:mini")
    else:
        LOGGER.info("Using Ollama model: %s", model_name)
    client = OllamaLLM(model=model_name, temperature=settings.temperature)
    if hasattr(client, "agenerate"):
        result = await client.agenerate([prompt])
        if hasattr(result, "generations") and result.generations:
            return str(result.generations[0][0].text)
        return str(result)

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, client.generate, prompt)


def _build_research_prompt(company_name: str, model_name: str) -> str:
    return (
        "You are a local enterprise research assistant. "
        "Generate a coherent company intelligence profile for the target company. "
        "Return only valid JSON with the exact requested keys. "
        "Do not include markdown, explanations, or extra fields. "
        "If information is unavailable, use null.\n"
        f"Company: {company_name}\n"
        f"Model: {model_name}\n"
        "Required keys: "
        + ", ".join(RESEARCH_FIELDS)
        + "."
    )


def _parse_json(raw_text: str) -> dict[str, Any]:
    raw_text = _strip_code_blocks(raw_text)
    try:
        payload = json.loads(raw_text)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", raw_text, flags=re.S)
    if match:
        try:
            payload = json.loads(match.group(0))
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            pass
    return {}


async def run_research_agent(state: GraphState, model_name: str, stage: str) -> GraphState:
    prompt = _build_research_prompt(state.company_name or "", model_name)
    start = datetime.utcnow()
    raw_output = await _ollama_generate(model_name, prompt)
    duration_seconds = (datetime.utcnow() - start).total_seconds()
    parsed = _parse_json(raw_output)

    parsed_output = {
        key: parsed.get(key)
        for key in RESEARCH_FIELDS
        if key in parsed and parsed.get(key) is not None
    }

    confidence = parsed.get("confidence_score")
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    research_output = ResearchOutput(
        model_name=model_name,
        stage=stage,
        company_name=state.company_name or "",
        parsed_output=parsed_output,
        confidence_score=confidence,
        provenance=[],
        created_at=start,
        updated_at=datetime.utcnow(),
        duration_seconds=duration_seconds,
    )

    response = ModelResponse(
        model_name=model_name,
        stage=stage,
        raw_output=raw_output,
        parsed_json=parsed_output,
        started_at=start,
        finished_at=datetime.utcnow(),
        duration_seconds=duration_seconds,
    )

    audit = AuditLogEntry(
        actor=stage,
        action="research_complete",
        message=f"{model_name} produced research output for {state.company_name}",
        metadata={
            "model": model_name,
            "duration_seconds": duration_seconds,
            "fields": list(parsed_output.keys()),
        },
    )

    state.research_outputs.append(research_output)
    state.model_responses.append(response)
    state.audit_logs.append(audit)
    state.execution_metadata[f"{stage}_duration_seconds"] = duration_seconds
    state.timestamps[f"{stage}_completed_at"] = datetime.utcnow().isoformat()
    state.updated_at = datetime.utcnow()
    return state
