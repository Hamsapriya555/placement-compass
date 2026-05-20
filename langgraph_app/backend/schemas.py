from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .models import RunStatus


class AgentGenerateRequest(BaseModel):
    company_name: str = Field(..., min_length=1, description="Target company for research")
    prompt: Optional[str] = Field(None, description="Optional research prompt or user context")
    run_in_background: bool = Field(
        True,
        description="If true, the workflow is queued and executes asynchronously; otherwise the request waits for completion.",
    )


class AgentGenerateResponse(BaseModel):
    run_id: str
    status: RunStatus
    stage: str
    progress: int
    created_at: datetime
    started_at: Optional[datetime] = None
    output_path: Optional[str] = None


class AgentStatusEntry(BaseModel):
    run_id: str
    company_name: str
    status: RunStatus
    stage: str
    progress: int
    created_at: datetime
    started_at: Optional[datetime] = None
    updated_at: datetime
    completed_at: Optional[datetime] = None
    output_path: Optional[str] = None
    retry_count: int
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentStatusListResponse(BaseModel):
    runs: List[AgentStatusEntry]


class HealthResponse(BaseModel):
    status: str = Field("ok", description="Service readiness status")
    uptime: datetime
    version: str
