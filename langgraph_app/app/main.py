"""
Main Entrypoint
===============
Bootstraps the Company Intelligence Platform, creates an initial
GraphState, executes the LangGraph workflow, and logs results.

Usage
-----
    python -m langgraph_app.app.main --company "Google"
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

from ..config.settings import settings
from ..graph_state.state import GraphState
from ..utils.logging import configure_logging
from ..utils.ollama_validation import validate_ollama_models
from ..workflows.workflow_graph import workflow

LOGGER = logging.getLogger(__name__)


def _create_initial_state(
    company_name: str,
    user_input: Optional[str] = None,
) -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    state = GraphState(
        session_id=session_id,
        company_name=company_name,
        user_input=user_input or f"Research company: {company_name}",
        retry_count=0,
        execution_metadata={
            "platform": "Company Intelligence Platform",
            "version": "1.0.0",
            "session_id": session_id,
            "initiated_at": now.isoformat(),
        },
        timestamps={"started_at": now.isoformat()},
        created_at=now,
        updated_at=now,
    )
    return state.model_dump(mode="python")


def _print_summary(state: GraphState) -> None:
    passed = sum(1 for result in state.validation_results if result.passed)
    total = len(state.validation_results)

    LOGGER.info("%s", "=" * 60)
    LOGGER.info("PIPELINE COMPLETE")
    LOGGER.info("%s", "=" * 60)
    LOGGER.info("Company: %s", state.company_name)
    LOGGER.info("Output Path: %s", state.output_path)
    LOGGER.info("Failed Fields: %s", state.failed_fields or "None")
    LOGGER.info("Retry Count: %d", state.retry_count)
    LOGGER.info("Validation: %d/%d passed", passed, total)
    LOGGER.info("%s", "=" * 60)


async def run(
    company_name: str,
    user_input: Optional[str] = None,
    log_level: str = "INFO",
) -> GraphState:
    configure_logging(log_level)
    LOGGER.info("Starting Company Intelligence Platform for %s", company_name)

    validate_ollama_models(settings.model_sequence + settings.retry_models)

    initial_state = _create_initial_state(company_name, user_input)
    final_dict = await workflow.ainvoke(initial_state)
    final_state = GraphState.model_validate(final_dict)

    _print_summary(final_state)
    return final_state


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Company Intelligence Platform — LangGraph sequential pipeline"
    )
    parser.add_argument("--company", "-c", required=True, help="Target company name")
    parser.add_argument("--prompt", "-p", default=None, help="Optional research prompt")
    parser.add_argument(
        "--log-level",
        "-l",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    try:
        asyncio.run(run(args.company, args.prompt, args.log_level))
        sys.exit(0)
    except Exception as exc:
        LOGGER.exception("Pipeline failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
