from datetime import datetime, timezone

from fastapi.testclient import TestClient

from langgraph_app.backend import main as backend_main
from langgraph_app.backend.models import RunStatus
from langgraph_app.backend.service import workflow_service


def test_health_endpoint_returns_ok(monkeypatch) -> None:
    monkeypatch.setattr(backend_main, "validate_ollama_models", lambda *args, **kwargs: None)
    client = TestClient(backend_main.app)

    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == backend_main.settings.api_version


def test_post_generate_queues_run(monkeypatch) -> None:
    monkeypatch.setattr(backend_main, "validate_ollama_models", lambda *args, **kwargs: None)

    async def fake_start_run(company_name, user_input=None, background=True):
        from langgraph_app.backend.models import WorkflowRun

        now = datetime.now(timezone.utc)
        run = WorkflowRun(
            run_id="test-run-id",
            company_name=company_name,
            user_input=user_input,
            status=RunStatus.queued,
            stage="queued",
            progress=0,
            created_at=now,
            updated_at=now,
        )
        return run

    monkeypatch.setattr(workflow_service, "start_run", fake_start_run)
    client = TestClient(backend_main.app)

    response = client.post(
        "/v1/agent/generate",
        json={"company_name": "Example Corp", "prompt": "Research Example Corp", "run_in_background": True},
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["run_id"] == "test-run-id"
    assert payload["status"] == RunStatus.queued
    assert payload["stage"] == "queued"
