from __future__ import annotations
import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=False)


class Settings(BaseModel):
    model_sequence: List[str] = Field(default_factory=lambda: [
        "llama3.1:8b",
        "qwen2.5:7b",
        "mistral:7b",
    ])
    retry_models: List[str] = Field(default_factory=lambda: [
        "qwen2.5:7b",
        "mistral:7b",
    ])
    phi3_model: str = Field(default="phi3:mini")
    max_retries: int = Field(default=3)
    timeout_seconds: int = Field(default=60)
    temperature: float = Field(default=0.0)
    output_dir: Path = Field(default=ROOT_DIR / "outputs")
    log_dir: Path = Field(default=ROOT_DIR / "logs")
    api_title: str = Field(default="LangGraph Company Intelligence API")
    api_version: str = Field(default="v1")
    persistence_enabled: bool = Field(default=False)
    persistence_dir: Path = Field(default=ROOT_DIR / "persistence")

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            model_sequence=[
                os.environ.get("MODEL_LLAMA", "llama3.1:8b"),
                os.environ.get("MODEL_QWEN", "qwen2.5:7b"),
                os.environ.get("MODEL_MISTRAL", "mistral:7b"),
            ],
            retry_models=[
                os.environ.get("MODEL_QWEN", "qwen2.5:7b"),
                os.environ.get("MODEL_MISTRAL", "mistral:7b"),
            ],
            max_retries=int(os.environ.get("MAX_RETRY_ATTEMPTS", "3")),
            timeout_seconds=int(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "60")),
            phi3_model=os.environ.get("MODEL_PHI3", "phi3:mini"),
            temperature=float(os.environ.get("OLLAMA_TEMPERATURE", "0.0")),
            output_dir=Path(os.environ.get("OUTPUT_DIR", str(ROOT_DIR / "outputs"))),
            log_dir=Path(os.environ.get("LOG_DIR", str(ROOT_DIR / "logs"))),
            api_title=os.environ.get("API_TITLE", "LangGraph Company Intelligence API"),
            api_version=os.environ.get("API_VERSION", "v1"),
            persistence_enabled=os.environ.get("PERSISTENCE_ENABLED", "false").lower() in ("1", "true", "yes"),
            persistence_dir=Path(os.environ.get("PERSISTENCE_DIR", str(ROOT_DIR / "persistence"))),
        )


settings = Settings.from_env()
