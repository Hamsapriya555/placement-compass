from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

from ..config.settings import settings
from .errors import PersistenceError

if TYPE_CHECKING:
    from .models import WorkflowRun


def persist_run_snapshot(run: "WorkflowRun") -> None:
    if not settings.persistence_enabled:
        return

    try:
        persistence_dir = Path(settings.persistence_dir)
        persistence_dir.mkdir(parents=True, exist_ok=True)
        file_path = persistence_dir / f"run_{run.run_id}.json"
        with file_path.open("w", encoding="utf-8") as handle:
            json.dump(run.model_dump(mode="python"), handle, indent=2, default=str)
    except Exception as exc:
        raise PersistenceError(
            f"Failed to persist workflow run {run.run_id}: {exc}"
        ) from exc
