from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ws_ping_echoes_each_message() -> None:
    with client.websocket_connect("/ws/ping") as websocket:
        websocket.send_text("hello")
        assert websocket.receive_text() == "hello"

        websocket.send_text("again")
        assert websocket.receive_text() == "again"
