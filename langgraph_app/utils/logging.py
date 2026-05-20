"""Structured logging helpers for the platform."""

from __future__ import annotations
import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    for noisy in ("httpx", "httpcore", "openai", "groq", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
