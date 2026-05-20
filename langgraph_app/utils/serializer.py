from __future__ import annotations
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from ..config.settings import settings
from ..graph_state.state import GraphState


def _slugify(value: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", value.strip().lower())
    name = re.sub(r"_+", "_", name)
    return name[:64].strip("_") or "company"


def save_output_json(state: GraphState) -> str:
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    output_folder = settings.output_dir / timestamp
    output_folder.mkdir(parents=True, exist_ok=True)

    company_slug = _slugify(state.company_name or "company")
    filename = f"company_intelligence_{company_slug}.json"
    file_path = output_folder / filename

    payload = {
        "session_id": state.session_id,
        "company_name": state.company_name,
        "created_at": state.created_at.isoformat(),
        "updated_at": state.updated_at.isoformat(),
        "consolidated_record": state.consolidated_record.model_dump(mode="python"),
        "validation_results": [v.model_dump(mode="python") for v in state.validation_results],
        "failed_fields": state.failed_fields,
        "retry_count": state.retry_count,
        "audit_logs": [a.model_dump(mode="python") for a in state.audit_logs],
        "execution_metadata": state.execution_metadata,
        "timestamps": state.timestamps,
        "model_responses": [m.model_dump(mode="python") for m in state.model_responses],
    }

    with file_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)

    return str(file_path)
