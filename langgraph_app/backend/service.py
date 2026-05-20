from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from ..config.settings import settings
from ..graph_state.state import AuditLogEntry, GraphState
from ..utils.ollama_validation import validate_ollama_models
from ..workflows.workflow_graph import build_workflow
from .errors import GraphExecutionError, PersistenceError, ProviderError, WorkflowNotFoundError
from .models import RunStatus, WorkflowRun
from .persistence import persist_run_snapshot

LOGGER = logging.getLogger(__name__)


class WorkflowExecutionService:
    def __init__(self) -> None:
        self._runs: dict[str, WorkflowRun] = {}
        self._lock = asyncio.Lock()

    def initialize(self) -> None:
        LOGGER.debug("WorkflowExecutionService initialized")

    async def start_run(
        self,
        company_name: str,
        user_input: None | str = None,
        background: bool = True,
    ) -> WorkflowRun:
        run_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        run = WorkflowRun(
            run_id=run_id,
            company_name=company_name,
            user_input=user_input,
            status=RunStatus.queued,
            stage="queued",
            progress=0,
            created_at=now,
            updated_at=now,
            metadata={"session_id": run_id},
        )
        async with self._lock:
            self._runs[run_id] = run

        if background:
            asyncio.create_task(self._execute_run(run_id, company_name, user_input))
            return run

        await self._execute_run(run_id, company_name, user_input)
        return run

    def list_runs(self) -> list[WorkflowRun]:
        return list(self._runs.values())

    def get_run(self, run_id: str) -> WorkflowRun:
        run = self._runs.get(run_id)
        if not run:
            raise WorkflowNotFoundError(f"Workflow run not found: {run_id}")
        return run

    async def _execute_run(
        self,
        run_id: str,
        company_name: str,
        user_input: None | str = None,
    ) -> None:
        run = self._runs.get(run_id)
        if run is None:
            raise WorkflowNotFoundError(f"Workflow run not found: {run_id}")

        run.status = RunStatus.running
        run.stage = "initializing"
        run.progress = 5
        run.started_at = datetime.now(timezone.utc)
        run.updated_at = run.started_at

        try:
            validate_ollama_models(settings.model_sequence + settings.retry_models)
        except Exception as exc:
            run.status = RunStatus.failed
            run.stage = "failed"
            run.progress = 100
            run.error = str(exc)
            run.completed_at = datetime.now(timezone.utc)
            run.updated_at = datetime.now(timezone.utc)
            LOGGER.exception("Ollama validation failed for run %s", run_id)
            return

        progress_callback = lambda stage, progress: self._handle_progress_update(run_id, stage, progress)
        workflow = build_workflow(progress_callback=progress_callback)

        initial_state = self._create_initial_state(company_name, user_input, run_id)
        try:
            final_dict = await workflow.ainvoke(initial_state)
            final_state = GraphState.model_validate(final_dict)
            run.last_state = final_dict
            run.output_path = final_state.output_path
            run.retry_count = final_state.retry_count
            run.stage = "completed"
            run.progress = 100
            run.status = RunStatus.completed
            run.completed_at = datetime.now(timezone.utc)
            run.updated_at = datetime.now(timezone.utc)
            run.metadata["timestamps"] = final_state.timestamps
            run.metadata["validation_results"] = [v.model_dump(mode="python") for v in final_state.validation_results]
            run.metadata["audit_logs"] = [a.model_dump(mode="python") for a in final_state.audit_logs]
            if settings.persistence_enabled:
                persist_run_snapshot(run)
        except Exception as exc:
            run.status = RunStatus.failed
            run.stage = "failed"
            run.progress = 100
            run.error = str(exc)
            run.completed_at = datetime.now(timezone.utc)
            run.updated_at = datetime.now(timezone.utc)
            LOGGER.exception("Workflow execution failed for run %s", run_id)
            if settings.persistence_enabled:
                try:
                    persist_run_snapshot(run)
                except PersistenceError:
                    LOGGER.exception("Failed to persist failed run %s", run_id)
            return

    def _handle_progress_update(self, run_id: str, stage: str, progress: int) -> None:
        run = self._runs.get(run_id)
        if not run:
            return
        run.stage = stage
        run.progress = progress
        run.updated_at = datetime.now(timezone.utc)
        run.metadata.setdefault("progress_history", []).append(
            {
                "stage": stage,
                "progress": progress,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    def _create_initial_state(
        self,
        company_name: str,
        user_input: None | str,
        run_id: str,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        session_id = str(uuid.uuid4())
        state = GraphState(
            session_id=session_id,
            user_input=user_input or f"Research company: {company_name}",
            company_name=company_name,
            retry_count=0,
            execution_metadata={
                "platform": "LangGraph Company Intelligence API",
                "version": settings.api_version,
                "session_id": session_id,
                "run_id": run_id,
                "initiated_at": now.isoformat(),
            },
            timestamps={"started_at": now.isoformat()},
            created_at=now,
            updated_at=now,
        )
        return state.model_dump(mode="python")


workflow_service = WorkflowExecutionService()


def get_workflow_service() -> WorkflowExecutionService:
    return workflow_service
