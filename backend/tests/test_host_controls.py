"""Host controls over the meeting WebSocket: mute all, mute one, and remove."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Participant
from app.realtime.messages import CLOSE_REMOVED
from tests.ws_helpers import add_guest, close_code, connect, start_meeting

ONLY_HOST = {"type": "error", "message": "Only the host can do that."}
NOT_HERE = {"type": "error", "message": "That participant is no longer in the meeting."}


def test_mute_all_mutes_everyone_who_is_unmuted_except_the_host(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    talking = add_guest(live_client, host.code, "Sam")
    quiet = add_guest(live_client, host.code, "Kim")

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, talking, audio=1) as talking_socket,
        connect(live_client, quiet, audio=0) as quiet_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # Sam joined
        host_socket.receive_json()  # Kim joined
        talking_socket.receive_json()  # welcome
        talking_socket.receive_json()  # Kim joined
        quiet_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_mute_all"})

        assert talking_socket.receive_json() == {"type": "force_mute"}
        # The client mutes itself and says so, which everyone else hears about.
        talking_socket.send_json({"type": "media_state", "audio": False, "video": True})
        muted = {
            "type": "media_state",
            "participant_id": talking.participant_id,
            "audio": False,
            "video": True,
            "screen": False,
        }
        # Kim was already muted and the host is never muted, so this is the next
        # message each of them gets, not a force_mute.
        assert quiet_socket.receive_json() == muted
        assert host_socket.receive_json() == muted


def test_a_muted_participant_can_unmute_themselves(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_mute", "participant_id": guest.participant_id})
        assert guest_socket.receive_json() == {"type": "force_mute"}
        guest_socket.send_json({"type": "media_state", "audio": False, "video": True})
        assert host_socket.receive_json()["audio"] is False

        guest_socket.send_json({"type": "media_state", "audio": True, "video": True})
        assert host_socket.receive_json()["audio"] is True


@pytest.mark.parametrize("command", ["host_mute_all", "host_mute", "host_remove"])
def test_only_the_host_can_use_host_controls(
    live_client: TestClient, db: Session, command: str
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        guest_socket.receive_json()  # welcome
        # host_mute_all has no participant_id; the extra field is ignored.
        guest_socket.send_json({"type": command, "participant_id": host.participant_id})

        assert guest_socket.receive_json() == ONLY_HOST
        host_socket.receive_json()  # welcome

    host_row = db.get(Participant, host.participant_id)
    assert host_row is not None and host_row.status != "removed"


def test_the_host_removes_a_participant_who_then_cannot_reconnect(
    live_client: TestClient, db: Session
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code, "Sam")
    other = add_guest(live_client, host.code, "Kim")

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest) as guest_socket,
        connect(live_client, other) as other_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # Sam joined
        host_socket.receive_json()  # Kim joined
        guest_socket.receive_json()  # welcome
        guest_socket.receive_json()  # Kim joined
        other_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_remove", "participant_id": guest.participant_id})

        assert guest_socket.receive_json() == {"type": "removed"}
        assert close_code(guest_socket) == CLOSE_REMOVED
        left = {"type": "participant_left", "participant_id": guest.participant_id}
        assert host_socket.receive_json() == left
        assert other_socket.receive_json() == left

    db.expire_all()
    removed = db.get(Participant, guest.participant_id)
    assert removed is not None
    assert removed.status == "removed"
    assert removed.left_at is not None
    with connect(live_client, guest) as again:  # the same token, after a refresh
        assert close_code(again) == CLOSE_REMOVED


def test_a_command_for_someone_who_is_not_connected_gets_an_error(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
        socket.send_json({"type": "host_mute", "participant_id": 999_999})
        assert socket.receive_json() == NOT_HERE
        socket.send_json({"type": "host_remove", "participant_id": 999_999})
        assert socket.receive_json() == NOT_HERE


def test_the_host_cannot_remove_themselves(live_client: TestClient, db: Session) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
        socket.send_json({"type": "host_remove", "participant_id": host.participant_id})
        assert socket.receive_json()["type"] == "error"

    host_row = db.get(Participant, host.participant_id)
    assert host_row is not None and host_row.status != "removed"


def test_a_host_cannot_remove_someone_from_another_meeting(
    live_client: TestClient, db: Session
) -> None:
    host = start_meeting(live_client)
    elsewhere = start_meeting(live_client)
    stranger = add_guest(live_client, elsewhere.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, stranger) as stranger_socket,
    ):
        host_socket.receive_json()  # welcome
        stranger_socket.receive_json()  # welcome
        host_socket.send_json({"type": "host_remove", "participant_id": stranger.participant_id})
        assert host_socket.receive_json() == NOT_HERE

    db.expire_all()
    row = db.get(Participant, stranger.participant_id)
    assert row is not None and row.status != "removed"
