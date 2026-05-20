# =============================================================================
# Dockerfile — LangGraph + FastAPI Backend
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder): install Python dependencies into a venv
#   Stage 2 (runtime): copy only the venv + app code — no build tools in prod
#
# Ollama runs on the HOST, not inside this container.
# The container reaches Ollama via host.docker.internal:11434 (set via env).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

# System-level build dependencies (compile wheels for any C-ext packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libffi-dev \
        libssl-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create an isolated virtual environment so Stage 2 can copy it cleanly
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Upgrade pip inside the venv for faster, more reliable installs
RUN pip install --upgrade pip setuptools wheel

# --------------------------------------------------------------------------
# Dependency caching layer:
# Copy ONLY requirements.txt first so Docker cache is reused on code changes.
# --------------------------------------------------------------------------
WORKDIR /build
COPY langgraph_app/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Ensure langsmith and ollama are present as explicit top-level packages
# (they are transitive deps of langchain / langchain-ollama, but being
# explicit guarantees the right versions are available for direct imports)
RUN pip install --no-cache-dir langsmith ollama


# ---------------------------------------------------------------------------
# Stage 2 — Runtime (lean production image)
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL maintainer="LangGraph Team"
LABEL description="LangGraph + FastAPI Company Intelligence Backend"
LABEL version="1.0.0"

# Minimal runtime OS packages (curl needed for healthcheck probe)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user for security ─────────────────────────────────────────────
RUN groupadd --system appgroup && \
    useradd  --system --gid appgroup --create-home --home-dir /home/appuser appuser

# ── Copy venv from builder ─────────────────────────────────────────────────
ENV VIRTUAL_ENV=/opt/venv
COPY --from=builder "$VIRTUAL_ENV" "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# ── Application working directory ─────────────────────────────────────────
WORKDIR /app

# ── Copy application source ────────────────────────────────────────────────
# Copy the langgraph_app Python package (preserves full package structure)
COPY langgraph_app/ ./langgraph_app/

# ── Runtime directories (outputs, logs, persistence) ──────────────────────
# These directories are writable by appuser.
# In docker-compose they are mounted as named volumes for persistence.
RUN mkdir -p /app/langgraph_app/outputs \
             /app/langgraph_app/logs \
             /app/langgraph_app/persistence \
    && chown -R appuser:appgroup /app

# ── Python environment config ──────────────────────────────────────────────
# Prevents .pyc files in the image and enables real-time stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Ensures Python finds the langgraph_app package from /app
ENV PYTHONPATH=/app

# ── Ollama connectivity ────────────────────────────────────────────────────
# Both env vars are set here as DEFAULTS; they are overridden by docker-compose
# or any runtime --env flag.
# OLLAMA_HOST  → consumed by the `ollama` Python client (Client())
# OLLAMA_BASE_URL → consumed by langchain-ollama (ChatOllama / OllamaLLM)
# On Windows / Mac with Docker Desktop, host.docker.internal resolves to
# the host machine. On Linux you need extra_hosts: host-gateway in compose.
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434

# ── LangSmith defaults (overridden by compose env_file) ───────────────────
ENV LANGCHAIN_TRACING_V2=false
ENV LANGCHAIN_ENDPOINT=https://api.smith.langchain.com

# ── FastAPI / uvicorn defaults ─────────────────────────────────────────────
ENV HOST=0.0.0.0
ENV PORT=8000
ENV LOG_LEVEL=info
ENV WORKERS=1

# ── Expose port ────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Switch to non-root user ────────────────────────────────────────────────
USER appuser

# ── Healthcheck ────────────────────────────────────────────────────────────
# Docker polls GET /v1/health every 30s; container is "healthy" after 3 passes
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/v1/health || exit 1

# ── Startup command ────────────────────────────────────────────────────────
# uvicorn is launched from /app so `langgraph_app` is a valid top-level package.
# --no-access-log keeps output clean; structured app logs are emitted via the
# configure_logging() call inside startup_event().
CMD ["uvicorn", "langgraph_app.backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info", \
     "--no-access-log"]
