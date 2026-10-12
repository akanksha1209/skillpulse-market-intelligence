"""Test configuration: isolated SQLite file + forced demo mode (no network calls)."""

from __future__ import annotations

import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="skillpulse-tests-")
os.environ["DATABASE_PATH"] = os.path.join(_TMP, "skillpulse-test.db")
os.environ["FORCE_DEMO"] = "true"
os.environ.pop("SERPAPI_API_KEY", None)
os.environ.pop("OPENAI_API_KEY", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database() -> None:
    init_db()


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def analysis(client: TestClient) -> dict:
    """One demo analysis reused by the whole suite."""
    response = client.post("/api/search", json={"query": "machine learning engineer India", "location": "India"})
    assert response.status_code == 200, response.text
    return response.json()["analysis"]
