from __future__ import annotations

from langsmith import Client

client = Client()

import logging
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ..config.settings import settings
from ..utils.logging import configure_logging
from ..utils.ollama_validation import validate_ollama_models
from .errors import GraphExecutionError, PersistenceError, ProviderError, WorkflowNotFoundError
from .routes.agent import router as agent_router
from .routes.health import router as health_router
from .service import workflow_service


LOGGER = logging.getLogger(__name__)

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    openapi_url="/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.include_router(agent_router, prefix="/v1")
app.include_router(health_router, prefix="/v1")


@app.on_event("startup")
async def startup_event() -> None:
    configure_logging("INFO")
    LOGGER.info("Starting FastAPI backend for LangGraph")
    try:
        validate_ollama_models(settings.model_sequence + settings.retry_models)
        LOGGER.info("Ollama model validation completed")
    except Exception as exc:
        LOGGER.warning("Startup model validation failed: %s", exc)
    workflow_service.initialize()


@app.exception_handler(WorkflowNotFoundError)
async def workflow_not_found_handler(request: Request, exc: WorkflowNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"status": "error", "message": str(exc)},
    )


@app.exception_handler(GraphExecutionError)
async def graph_execution_handler(request: Request, exc: GraphExecutionError) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Workflow execution failed. Please retry or check the run status."},
    )


@app.exception_handler(ProviderError)
async def provider_error_handler(request: Request, exc: ProviderError) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"status": "error", "message": "LLM provider or local model environment is unavailable."},
    )


@app.exception_handler(PersistenceError)
async def persistence_error_handler(request: Request, exc: PersistenceError) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal persistence error occurred."},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    LOGGER.exception("Unhandled exception during request processing")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error"},
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"status": "ok", "version": settings.api_version, "timestamp": datetime.utcnow().isoformat()}
