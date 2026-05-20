from __future__ import annotations


class GraphExecutionError(Exception):
    """Raised when the LangGraph workflow fails during execution."""


class ProviderError(Exception):
    """Raised when an LLM provider or local model environment is unavailable."""


class PersistenceError(Exception):
    """Raised when optional persistence hooks fail."""


class WorkflowNotFoundError(Exception):
    """Raised when a requested workflow run ID cannot be found."""
