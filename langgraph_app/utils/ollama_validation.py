from __future__ import annotations

from typing import Iterable

from ollama import Client


def list_installed_ollama_models() -> list[str]:
    client = Client()
    response = client.list()
    return [model.model for model in getattr(response, "models", []) if getattr(model, "model", None)]


def validate_ollama_models(required_models: Iterable[str]) -> None:
    required = list(dict.fromkeys(required_models))
    try:
        installed = set(list_installed_ollama_models())
    except Exception as exc:
        raise RuntimeError(
            "Unable to query local Ollama. Ensure the Ollama daemon is running and `ollama` is installed. "
            "You can verify with `ollama list`."
        ) from exc

    missing = [model for model in required if model not in installed]
    if missing:
        installed_models = ", ".join(sorted(installed)) or "none"
        missing_models = ", ".join(missing)
        raise RuntimeError(
            "Missing local Ollama models: "
            f"{missing_models}. Installed models: {installed_models}. "
            "Install the missing models with `ollama pull <model>` or set MODEL_LLAMA, MODEL_QWEN, MODEL_MISTRAL environment variables to an available local model."
        )
