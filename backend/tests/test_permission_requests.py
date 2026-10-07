"""Ask to Unmute, Ask to Start Video, Mute and Stop Video: the host's per-person controls.

Being asked lets one person turn their mic or camera on while that isn't
allowed, until the host mutes them or stops their video again.
"""

import pytest
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession

from tests.ws_helpers import Person, add_guest, connect, start_meeting

# For each device: the setting, the media_state field, and the host's commands and messages.
DEVICES = [
    ("allow_self_unmute", "audio", "can_unmute", "host_ask_unmute", "ask_unmute",
     "host_mute", "force_mute"),
    ("allow_self_video", "video", "can_start_video", "host_ask_start_video", "ask_start_video",
     "host_stop_video", "force_video_off"),
]


def settle(host_socket: WebSocketTestSession, guest_socket: WebSocketTestSession) -> None:
    host_socket.receive_json()  # welcome
    host_socket.receive_json()  # participant_joined
    guest_socket.receive_json()  # welcome


def turn_on(socket: WebSocketTestSession, field: str) -> None:
    socket.send_json({"type": "media_state", "audio": field == "audio", "video": field == "video"})


@pytest.mark.parametrize(("setting", "field", "can", "ask", "asked", "stop", "stopped"), DEVICES)
def test_asking_lets_one_person_turn_it_on_until_the_host_turns_it_off(
    live_client: TestClient,
    setting: str,
    field: str,
    can: str,
    ask: str,
    asked: str,
    stop: str,
    stopped: str,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, audio=0, video=0) as guest_socket,
    ):
        settle(host_socket, guest_socket)
        host_socket.send_json({"type": "host_set_permissions", setting: False})
        host_socket.receive_json()  # permissions
        assert guest_socket.receive_json()["permissions"][can] is False

        # Asked: allowed now (told first, so the button is ready), then the request.
        host_socket.send_json({"type": ask, "participant_id": guest.participant_id})
        assert guest_socket.receive_json()["permissions"][can] is True
        assert guest_socket.receive_json() == {"type": asked}
        turn_on(guest_socket, field)
        assert host_socket.receive_json()[field] is True

        # Turned off by the host: the permission goes with it.
        host_socket.send_json({"type": stop, "participant_id": guest.participant_id})
        assert guest_socket.receive_json()["permissions"][can] is False
        assert guest_socket.receive_json() == {"type": stopped}
        guest_socket.send_json({"type": "media_state", "audio": False, "video": False})
        assert host_socket.receive_json()[field] is False

        turn_on(guest_socket, field)  # not allowed any more
        assert host_socket.receive_json()[field] is False
        assert guest_socket.receive_json() == {"type": stopped}


def test_stop_video_turns_a_camera_off_even_when_video_is_allowed(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        settle(host_socket, guest_socket)
        host_socket.send_json({"type": "host_stop_video", "participant_id": guest.participant_id})
        assert guest_socket.receive_json() == {"type": "force_video_off"}  # no permission change


def test_asking_someone_whose_camera_is_on_sends_nothing(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, video=1) as guest_socket,
    ):
        settle(host_socket, guest_socket)
        msg = {"type": "host_ask_start_video", "participant_id": guest.participant_id}
        host_socket.send_json(msg)
        host_socket.send_json({"type": "chat", "body": "next"})
        assert guest_socket.receive_json()["type"] == "chat"


def test_a_person_who_was_asked_keeps_the_permission_after_reconnecting(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket:
        with connect(live_client, guest, audio=0) as guest_socket:
            settle(host_socket, guest_socket)
            host_socket.send_json({"type": "host_set_permissions", "allow_self_unmute": False})
            host_socket.receive_json()  # permissions
            guest_socket.receive_json()  # permissions
            msg = {"type": "host_ask_unmute", "participant_id": guest.participant_id}
            host_socket.send_json(msg)
            guest_socket.receive_json()  # permissions
            guest_socket.receive_json()  # ask_unmute

        with connect(live_client, guest, audio=1) as again:  # a refresh
            welcome = again.receive_json()
            assert welcome["permissions"]["can_unmute"] is True
            assert welcome["self"]["audio"] is True


def test_settings_belong_to_one_meeting(live_client: TestClient) -> None:
    first = start_meeting(live_client)
    second = start_meeting(live_client)
    guest = add_guest(live_client, second.code)

    with connect(live_client, first) as first_socket:
        first_socket.receive_json()  # welcome
        first_socket.send_json({"type": "host_set_permissions", "allow_self_unmute": False})
        first_socket.receive_json()  # permissions

        with connect(live_client, Person(second.code, guest.participant_id, guest.token)) as other:
            assert other.receive_json()["permissions"]["can_unmute"] is True
