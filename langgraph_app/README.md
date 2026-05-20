# LangGraph Company Intelligence Platform

Offline production-grade platform built with Python, LangGraph, LangChain, Pydantic, and local Ollama models.

## What is included

- sequential multi-agent research workflow using local Ollama models
- deterministic consolidation, validation, retry, and JSON serialization
- no cloud model providers, no API key requirements
- modular architecture in `agents/`, `validation/`, `graph_state/`, `workflows/`, and `utils/`
- `requirements.txt` tuned for Ollama-based local execution
- structured output stored in `outputs/`

## FastAPI Backend

- new FastAPI service lives in `backend/`
- exposes REST workflow submission and status endpoints
- supports asynchronous run management with progress tracking
- includes optional persistence hooks via `PERSISTENCE_ENABLED`

## Running the FastAPI Backend

1. Install Python dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

2. Run the API server from the `langgraph_app` folder:

   ```bash
   uvicorn langgraph_app.backend.main:app --host 0.0.0.0 --port 8000
   ```

3. API endpoints:

   - `POST /v1/agent/generate`
   - `GET /v1/agent/status`
   - `GET /v1/agent/status/{run_id}`
   - `GET /v1/health`

## Environment Variables

- `MODEL_PHI3` — optional phi3 local Ollama model
- `MODEL_LLAMA`, `MODEL_QWEN`, `MODEL_MISTRAL` — Ollama model names
- `MAX_RETRY_ATTEMPTS` — retry loop limit
- `OLLAMA_TIMEOUT_SECONDS` — model timeout
- `OUTPUT_DIR` — JSON output directory
- `LOG_DIR` — log folder
- `PERSISTENCE_ENABLED` — enable optional run persistence
- `PERSISTENCE_DIR` — persistence output folder
