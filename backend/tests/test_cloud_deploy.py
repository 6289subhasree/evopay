"""Behaviour needed for Firebase Hosting + Cloud Run deployments."""
import importlib

import pytest
from fastapi.testclient import TestClient

import auth
import database

PASSWORD = "correct-horse-42"


@pytest.fixture()
def app_client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "cloud.db")
    auth.clear_rate_limits()
    from main import app
    with TestClient(app) as client:
        yield client


def signup(client, email="judge@example.com"):
    response = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD, "display_name": "Judge"})
    assert response.status_code == 201, response.text
    return response


def test_api_responses_are_never_cached(app_client):
    response = app_client.get("/api/health")
    assert response.headers["cache-control"] == "private, no-store"


def test_csrf_header_still_required_when_proxy_strips_csrf_cookie(app_client):
    signup(app_client)
    csrf = app_client.cookies.get(auth.CSRF_COOKIE)
    # Simulate Firebase Hosting: only the session cookie reaches the backend.
    app_client.cookies.delete(auth.CSRF_COOKIE)
    assert app_client.post("/api/attacks/generate", json={"attack_type": "card_testing"}).status_code == 403
    assert app_client.post("/api/attacks/generate", json={"attack_type": "card_testing"}, headers={"X-CSRF-Token": "forged"}).status_code == 403
    assert app_client.post("/api/attacks/generate", json={"attack_type": "card_testing"}, headers={"X-CSRF-Token": csrf}).status_code == 200


def test_mismatched_csrf_cookie_is_rejected(app_client):
    signup(app_client)
    csrf = app_client.cookies.get(auth.CSRF_COOKIE)
    app_client.cookies.set(auth.CSRF_COOKIE, "something-else")
    assert app_client.post("/api/attacks/generate", json={"attack_type": "card_testing"}, headers={"X-CSRF-Token": csrf}).status_code == 403


def test_session_cookie_name_is_configurable(tmp_path, monkeypatch):
    monkeypatch.setenv("EVOPAY_SESSION_COOKIE", "__session")
    reloaded = importlib.reload(auth)
    try:
        assert reloaded.SESSION_COOKIE == "__session"
    finally:
        monkeypatch.delenv("EVOPAY_SESSION_COOKIE")
        importlib.reload(auth)


def test_starter_workspace_is_opt_in_and_realistic(app_client, monkeypatch):
    signup(app_client, "empty@example.com")
    assert app_client.get("/api/transactions").json() == []

    app_client.cookies.clear()
    monkeypatch.setenv("EVOPAY_STARTER_WORKSPACE", "true")
    signup(app_client, "starter@example.com")
    transactions = app_client.get("/api/transactions?limit=200").json()
    incidents = app_client.get("/api/incidents").json()
    attacks = app_client.get("/api/attacks").json()
    assert len(attacks) == 3
    assert len(incidents) == 3
    assert len(transactions) > 40
    assert {item["status"] for item in transactions} >= {"ALLOWED", "BLOCKED"}
    assert all(item["location"] != "Simulation Lab" and not item["id"].startswith("SYN-") for item in transactions)


def test_analyst_requires_login_and_reports_missing_key(app_client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert app_client.post("/api/analyst", json={"mode": "chat"}).status_code == 401
    signup(app_client)
    csrf = app_client.cookies.get(auth.CSRF_COOKIE)
    response = app_client.post("/api/analyst", json={"mode": "chat", "question": "hi"}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 503
