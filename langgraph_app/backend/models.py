from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class WorkflowRun(BaseModel):
    run_id: str
    company_name: str
    user_input: Optional[str] = None
    status: RunStatus = RunStatus.queued
    stage: str = "initialized"
    progress: int = 0
    created_at: datetime
    started_at: Optional[datetime] = None
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    output_path: Optional[str] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    last_state: Optional[Dict[str, Any]] = None
