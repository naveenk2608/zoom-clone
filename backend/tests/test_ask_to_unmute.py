"""The host's "Ask to Unmute": only a request, sent to one muted person."""

from fastapi.testclient import TestClient

from tests.ws_helpers import add_guest, connect, start_meeting


def test_the_host_asks_a_muted_participant_who_then_unmutes_themselves(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, audio=0) as guest_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_ask_unmute", "participant_id": guest.participant_id})
        assert guest_socket.receive_json() == {"type": "ask_unmute"}

        # The server never unmutes anyone: the mic turns on only when the
        # person says yes and their client reports it.
        guest_socket.send_json({"type": "media_state", "audio": True, "video": True})
        unmuted = host_socket.receive_json()
        assert unmuted["type"] == "media_state"
        assert unmuted["audio"] is True


def test_asking_someone_who_is_not_muted_sends_nothing(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, audio=1) as guest_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_ask_unmute", "participant_id": guest.participant_id})
        host_socket.send_json({"type": "chat", "body": "next"})

        # No ask_unmute came first: the next message the guest gets is the chat.
        assert guest_socket.receive_json()["body"] == "next"


def test_asking_someone_who_left_gets_an_error(live_client: TestClient) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
        socket.send_json({"type": "host_ask_unmute", "participant_id": 999_999})
        assert socket.receive_json() == {
            "type": "error",
            "message": "That participant is no longer in the meeting.",
        }
