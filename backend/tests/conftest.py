import os
import sys
import tempfile
from pathlib import Path

import pytest

# Base et stockage isolés AVANT d'importer l'application.
_TMP = Path(tempfile.mkdtemp(prefix="lekki-tests-"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP / 'test.db'}"
os.environ["SECRET_KEY"] = "tests-only-secret-key"
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("CEREBRAS_API_KEY", "")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ["OLLAMA_URL"] = "http://127.0.0.1:9"  # aucun LLM pendant les tests
os.chdir(_TMP)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


_counter = {"n": 0}


@pytest.fixture
def make_user(client):
    def _make(prefix: str = "user"):
        _counter["n"] += 1
        username = f"{prefix}{_counter['n']}"
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": f"{username}@example.com",
                "name": f"Etudiant {username}",
                "password": "motdepasse123",
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        return {
            "id": data["user"]["id"],
            "token": data["access_token"],
            "headers": {"Authorization": f"Bearer {data['access_token']}"},
        }

    return _make
