from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ..schemas import HealthResponse
from ...config.settings import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(uptime=datetime.now(timezone.utc), version=settings.api_version)
