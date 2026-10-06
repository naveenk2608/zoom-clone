from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_a_configured_origin() -> None:
    origin = settings.cors_origin_list[0]

    response = client.options(
        "/api/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_an_unknown_origin() -> None:
    response = client.options(
        "/api/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in response.headers
