from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Callable, Optional

from langgraph.graph import END, StateGraph

from ..agents.research.llm_clients import run_research_agent
from ..consolidation.consolidation_agent import run_consolidation_agent
from ..retry.retry_handler import run_retry_handler, should_retry
from ..graph_state.state import AuditLogEntry, GraphState
from ..utils.serializer import save_output_json
from ..validation.validation_node import run_validation_node
from ..config.settings import settings

LOGGER = logging.getLogger(__name__)

NODE_RESEARCH_LLAMA3 = "research_llama3"
NODE_RESEARCH_QWEN2 = "research_qwen2"
NODE_RESEARCH_MISTRAL = "research_mistral"
NODE_CONSOLIDATE = "consolidate"
NODE_VALIDATE = "validate"
NODE_RETRY = "retry"
NODE_FINALIZE = "finalize"

STAGE_PROGRESS: dict[str, int] = {
    NODE_RESEARCH_LLAMA3: 15,
    NODE_RESEARCH_QWEN2: 30,
    NODE_RESEARCH_MISTRAL: 45,
    NODE_CONSOLIDATE: 65,
    NODE_VALIDATE: 80,
    NODE_RETRY: 90,
    NODE_FINALIZE: 100,
}

STAGE_LABELS: dict[str, str] = {
    NODE_RESEARCH_LLAMA3: "researching",
    NODE_RESEARCH_QWEN2: "researching",
    NODE_RESEARCH_MISTRAL: "researching",
    NODE_CONSOLIDATE: "grounding",
    NODE_VALIDATE: "validating",
    NODE_RETRY: "retrying",
    NODE_FINALIZE: "finalizing",
}

ProgressCallback = Callable[[str, int], None]


def _apply_partial(gs: GraphState, partial: dict[str, Any]) -> dict[str, Any]:
    clean_partial = {k: v for k, v in partial.items() if v is not None or k in partial}
    updated = gs.model_copy(update=clean_partial)
    return updated.model_dump(mode="python")


def _emit_progress(
    gs: GraphState,
    node_name: str,
    progress_callback: Optional[ProgressCallback],
) -> None:
    stage = STAGE_LABELS.get(node_name, "processing")
    percent = STAGE_PROGRESS.get(node_name, 0)
    gs.execution_metadata["current_stage"] = stage
    gs.execution_metadata["progress_percentage"] = percent
    gs.execution_metadata["last_stage_at"] = datetime.utcnow().isoformat()
    history = gs.execution_metadata.setdefault("progress_history", [])
    history.append(
        {
            "stage": stage,
            "progress": percent,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    if progress_callback:
        progress_callback(stage, percent)


def _wrap_node(
    node_name: str,
    node_fn: Callable[[dict[str, Any]], Any],
    progress_callback: Optional[ProgressCallback],
) -> Callable[[dict[str, Any]], Any]:
    async def wrapper(state: dict[str, Any]) -> dict[str, Any]:
        gs = GraphState.model_validate(state)
        _emit_progress(gs, node_name, progress_callback)
        return await node_fn(state)

    return wrapper


async def _research_llama3(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    model = settings.model_sequence[0] if settings.model_sequence else "phi3:mini"
    LOGGER.info("[NODE] %s -- company=%s model=%s", NODE_RESEARCH_LLAMA3, gs.company_name, model)
    updated = await run_research_agent(gs, model, NODE_RESEARCH_LLAMA3)
    return updated.model_dump(mode="python")


async def _research_qwen2(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    model = settings.model_sequence[1] if len(settings.model_sequence) > 1 else "phi3:mini"
    LOGGER.info("[NODE] %s -- company=%s model=%s", NODE_RESEARCH_QWEN2, gs.company_name, model)
    updated = await run_research_agent(gs, model, NODE_RESEARCH_QWEN2)
    return updated.model_dump(mode="python")


async def _research_mistral(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    model = settings.model_sequence[2] if len(settings.model_sequence) > 2 else "phi3:mini"
    LOGGER.info("[NODE] %s -- company=%s model=%s", NODE_RESEARCH_MISTRAL, gs.company_name, model)
    updated = await run_research_agent(gs, model, NODE_RESEARCH_MISTRAL)
    return updated.model_dump(mode="python")


async def _consolidate(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    LOGGER.info(
        "[NODE] %s -- company=%s outputs=%d",
        NODE_CONSOLIDATE,
        gs.company_name,
        len(gs.research_outputs),
    )
    updated = await run_consolidation_agent(gs)
    return updated.model_dump(mode="python")


async def _validate(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    LOGGER.info("[NODE] %s -- company=%s", NODE_VALIDATE, gs.company_name)
    partial = await run_validation_node(gs)
    return _apply_partial(gs, partial)


async def _retry(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    LOGGER.info(
        "[NODE] %s -- company=%s retry_count=%d failed_fields=%s",
        NODE_RETRY,
        gs.company_name,
        gs.retry_count + 1,
        gs.failed_fields,
    )
    partial = await run_retry_handler(gs)
    return _apply_partial(gs, partial)


async def _finalize(state: dict[str, Any]) -> dict[str, Any]:
    gs = GraphState.model_validate(state)
    LOGGER.info("[NODE] %s -- company=%s", NODE_FINALIZE, gs.company_name)
    output_path = save_output_json(gs)
    audit = AuditLogEntry(
        actor="finalize",
        action="output_written",
        message=f"Final JSON output written to {output_path}",
        metadata={"output_path": output_path},
    )
    return {
        "output_path": output_path,
        "audit_logs": gs.audit_logs + [audit],
        "timestamps": {**gs.timestamps, "output_written_at": datetime.utcnow().isoformat()},
        "updated_at": datetime.utcnow(),
    }


def _route_after_validate(state: dict[str, Any]) -> str:
    gs = GraphState.model_validate(state)
    decision = should_retry(gs)
    LOGGER.info("[EDGE] validate -> %s", decision)
    return decision


def build_workflow(progress_callback: Optional[ProgressCallback] = None) -> Any:
    graph = StateGraph(dict)

    graph.add_node(
        NODE_RESEARCH_LLAMA3,
        _wrap_node(NODE_RESEARCH_LLAMA3, _research_llama3, progress_callback),
    )
    graph.add_node(
        NODE_RESEARCH_QWEN2,
        _wrap_node(NODE_RESEARCH_QWEN2, _research_qwen2, progress_callback),
    )
    graph.add_node(
        NODE_RESEARCH_MISTRAL,
        _wrap_node(NODE_RESEARCH_MISTRAL, _research_mistral, progress_callback),
    )
    graph.add_node(
        NODE_CONSOLIDATE,
        _wrap_node(NODE_CONSOLIDATE, _consolidate, progress_callback),
    )
    graph.add_node(
        NODE_VALIDATE,
        _wrap_node(NODE_VALIDATE, _validate, progress_callback),
    )
    graph.add_node(
        NODE_RETRY,
        _wrap_node(NODE_RETRY, _retry, progress_callback),
    )
    graph.add_node(
        NODE_FINALIZE,
        _wrap_node(NODE_FINALIZE, _finalize, progress_callback),
    )

    graph.set_entry_point(NODE_RESEARCH_LLAMA3)
    graph.add_edge(NODE_RESEARCH_LLAMA3, NODE_RESEARCH_QWEN2)
    graph.add_edge(NODE_RESEARCH_QWEN2, NODE_RESEARCH_MISTRAL)
    graph.add_edge(NODE_RESEARCH_MISTRAL, NODE_CONSOLIDATE)
    graph.add_edge(NODE_CONSOLIDATE, NODE_VALIDATE)
    graph.add_conditional_edges(
        NODE_VALIDATE,
        _route_after_validate,
        {"retry": NODE_RETRY, "finalize": NODE_FINALIZE},
    )
    graph.add_edge(NODE_RETRY, NODE_VALIDATE)
    graph.add_edge(NODE_FINALIZE, END)

    compiled = graph.compile()
    LOGGER.info("LangGraph workflow compiled successfully")
    return compiled


workflow = build_workflow()
