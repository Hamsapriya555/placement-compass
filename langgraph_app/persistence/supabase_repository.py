from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from ..graph_state.state import GraphState


def run_persistence_node(state: GraphState) -> dict[str, Any]:
    """Deprecated persistence node. Local JSON output is handled in workflow finalization."""
    return {
        "audit_logs": state.audit_logs,
        "updated_at": datetime.utcnow(),
    }
