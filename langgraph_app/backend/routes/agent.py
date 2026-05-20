from __future__ import annotations

from fastapi import APIRouter, Depends, status

from ..schemas import (
    AgentGenerateRequest,
    AgentGenerateResponse,
    AgentStatusEntry,
    AgentStatusListResponse,
)
from ..service import WorkflowExecutionService, get_workflow_service
from ..models import RunStatus

router = APIRouter(tags=["agent"])


@router.post(
    "/agent/generate",
    response_model=AgentGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_agent_report(
    request: AgentGenerateRequest,
    service: WorkflowExecutionService = Depends(get_workflow_service),
) -> AgentGenerateResponse:
    run = await service.start_run(
        company_name=request.company_name,
        user_input=request.prompt,
        background=request.run_in_background,
    )
    return AgentGenerateResponse(
        run_id=run.run_id,
        status=run.status,
        stage=run.stage,
        progress=run.progress,
        created_at=run.created_at,
        started_at=run.started_at,
        output_path=run.output_path,
    )


@router.get(
    "/agent/status",
    response_model=AgentStatusListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_agent_runs(
    service: WorkflowExecutionService = Depends(get_workflow_service),
) -> AgentStatusListResponse:
    run_list = service.list_runs()
    return AgentStatusListResponse(runs=[AgentStatusEntry(**run.model_dump()) for run in run_list])


@router.get(
    "/agent/status/{run_id}",
    response_model=AgentStatusEntry,
    status_code=status.HTTP_200_OK,
)
async def get_agent_run_status(
    run_id: str,
    service: WorkflowExecutionService = Depends(get_workflow_service),
) -> AgentStatusEntry:
    run = service.get_run(run_id)
    return AgentStatusEntry(**run.model_dump())
