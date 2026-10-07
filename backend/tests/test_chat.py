"""Meeting chat over the WebSocket: delivery, saving, validation, and no history for newcomers."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ChatMessage
from tests.ws_helpers import add_guest, connect, start_meeting


def test_a_message_reaches_everyone_and_is_saved(live_client: TestClient, db: Session) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code, "Sam")

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "chat", "body": "  Hello everyone  "})

        to_host = host_socket.receive_json()
        to_sender = guest_socket.receive_json()  # the sender gets it back too
        assert to_host == to_sender
        assert to_host["type"] == "chat"
        assert to_host["from"] == {"id": guest.participant_id, "display_name": "Sam"}
        assert to_host["body"] == "Hello everyone"  # trimmed
        assert datetime.fromisoformat(to_host["sent_at"]).utcoffset() is not None

    saved = db.query(ChatMessage).one()
    assert saved.id == to_host["id"]
    assert saved.participant_id == guest.participant_id
    assert saved.body == "Hello everyone"


def test_newcomers_do_not_see_earlier_messages(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket:
        host_socket.receive_json()  # welcome
        host_socket.send_json({"type": "chat", "body": "Before you came"})
        assert host_socket.receive_json()["type"] == "chat"

        with connect(live_client, guest) as guest_socket:
            welcome = guest_socket.receive_json()
            assert welcome["type"] == "welcome"
            assert "Before you came" not in str(welcome)
            host_socket.receive_json()  # participant_joined

            host_socket.send_json({"type": "chat", "body": "After you came"})
            # No replay: the next thing the guest gets is the new message.
            assert guest_socket.receive_json()["body"] == "After you came"


@pytest.mark.parametrize("body", ["", "   ", "x" * 2001])
def test_an_empty_or_too_long_message_is_refused(
    live_client: TestClient, db: Session, body: str
) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
        socket.send_json({"type": "chat", "body": body})
        assert socket.receive_json()["type"] == "error"

    assert db.query(ChatMessage).count() == 0


def test_messages_stay_inside_their_meeting(live_client: TestClient) -> None:
    first = start_meeting(live_client)
    second = start_meeting(live_client)

    with connect(live_client, first) as first_socket, connect(live_client, second) as second_socket:
        first_socket.receive_json()  # welcome
        second_socket.receive_json()  # welcome

        first_socket.send_json({"type": "chat", "body": "Only for the first meeting"})
        second_socket.send_json({"type": "chat", "body": "Only for the second meeting"})

        assert first_socket.receive_json()["body"] == "Only for the first meeting"
        assert second_socket.receive_json()["body"] == "Only for the second meeting"
