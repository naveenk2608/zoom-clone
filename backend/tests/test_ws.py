"""The meeting WebSocket: admission, presence, media flags, leaving and ending."""

import asyncio
import time
from typing import Any

import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models import Participant
from app.realtime import actions
from app.realtime.messages import CLOSE_ENDED, CLOSE_INVALID_TOKEN, CLOSE_REMOVED
from tests.ws_helpers import (
    Person,
    add_guest,
    close_code,
    connect,
    only_session,
    start_meeting,
    wait,
)


def test_a_bad_token_is_closed_with_4001(live_client: TestClient) -> None:
    host = start_meeting(live_client)

    with connect(live_client, Person(host.code, 0, "not-a-real-token")) as socket:
        assert close_code(socket) == CLOSE_INVALID_TOKEN


def test_a_token_for_another_meeting_is_closed_with_4001(live_client: TestClient) -> None:
    first = start_meeting(live_client)
    second = start_meeting(live_client)

    with connect(live_client, Person(second.code, first.participant_id, first.token)) as socket:
        assert close_code(socket) == CLOSE_INVALID_TOKEN


def test_welcome_lists_the_others_and_the_others_hear_of_the_newcomer(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code, "Sam")

    with connect(live_client, host, audio=0, video=1) as host_socket:
        welcome = host_socket.receive_json()
        assert welcome["type"] == "welcome"
        assert welcome["self"]["role"] == "host"
        assert welcome["participants"] == []

        with connect(live_client, guest, audio=1, video=0) as guest_socket:
            host_entry: dict[str, Any] = {
                "id": host.participant_id,
                "display_name": "Alex Morgan",
                "role": "host",
                "audio": False,
                "video": True,
                "screen": False,
            }
            assert guest_socket.receive_json()["participants"] == [host_entry]
            assert host_socket.receive_json() == {
                "type": "participant_joined",
                "participant": {
                    "id": guest.participant_id,
                    "display_name": "Sam",
                    "role": "attendee",
                    "audio": True,
                    "video": False,
                    "screen": False,
                },
            }


def test_media_state_reaches_the_others(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "media_state", "audio": False, "video": False})

        assert host_socket.receive_json() == {
            "type": "media_state",
            "participant_id": guest.participant_id,
            "audio": False,
            "video": False,
            "screen": False,  # left out by the sender, so not sharing
        }


def test_screen_sharing_reaches_the_others_and_newcomers(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket:
        host_socket.receive_json()  # welcome
        host_socket.send_json(
            {"type": "media_state", "audio": True, "video": False, "screen": True}
        )

        with connect(live_client, guest) as guest_socket:
            # The newcomer learns from welcome that the host is sharing.
            (sharing_host,) = guest_socket.receive_json()["participants"]
            assert sharing_host["screen"] is True
            assert sharing_host["video"] is False
            host_socket.receive_json()  # participant_joined

            host_socket.send_json(
                {"type": "media_state", "audio": True, "video": False, "screen": False}
            )
            assert guest_socket.receive_json()["screen"] is False


def test_a_signal_reaches_only_the_participant_it_is_for(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)
    offer = {"kind": "description", "description": {"type": "offer", "sdp": "v=0"}}

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "signal", "to": 999_999, "data": offer})  # nobody
        guest_socket.send_json({"type": "signal", "to": host.participant_id, "data": offer})

        # The first signal was dropped, so the next message the host gets is the second.
        assert host_socket.receive_json() == {
            "type": "signal",
            "from": guest.participant_id,
            "data": offer,
        }


def test_only_the_host_can_end_the_meeting(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        guest_socket.receive_json()  # welcome
        guest_socket.send_json({"type": "host_end"})

        error = guest_socket.receive_json()
        assert error == {"type": "error", "message": "Only the host can do that."}
        host_socket.receive_json()  # welcome


def test_an_unknown_message_gets_an_error(live_client: TestClient) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
        socket.send_json({"type": "dance"})

        assert socket.receive_json()["type"] == "error"


SLOW_CLOSE_SECONDS = 1.5


def test_one_slow_close_does_not_hold_up_ending_the_meeting_for_the_others(
    live_client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    host = start_meeting(live_client)
    slow = add_guest(live_client, host.code, "Sam")
    other = add_guest(live_client, host.code, "Kim")

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, slow) as slow_socket,
        connect(live_client, other) as other_socket,
    ):
        for _ in range(3):
            host_socket.receive_json()  # welcome, then Sam and Kim joining
        for _ in range(2):
            slow_socket.receive_json()  # welcome, then Kim joining
        other_socket.receive_json()  # welcome

        # Sam's browser takes a long time to answer the close. Sam joined before
        # Kim, so closing one socket after another would make Kim wait for it.
        slow_connection = actions.manager.find(only_session(db).id, slow.participant_id)
        assert slow_connection is not None

        async def slow_close(code: int = 1000, reason: str | None = None) -> None:
            await asyncio.sleep(SLOW_CLOSE_SECONDS)

        monkeypatch.setattr(slow_connection.websocket, "close", slow_close)

        started = time.monotonic()
        host_socket.send_json({"type": "host_end"})

        assert other_socket.receive_json() == {"type": "meeting_ended"}
        assert close_code(other_socket) == CLOSE_ENDED
        assert time.monotonic() - started < SLOW_CLOSE_SECONDS
        assert not actions.manager.lock(host.code).locked()  # Sam's close isn't holding it
        assert slow_socket.receive_json() == {"type": "meeting_ended"}


def test_the_host_ending_the_meeting_ends_it_for_everyone(
    live_client: TestClient, db: Session
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_end"})

        assert guest_socket.receive_json() == {"type": "meeting_ended"}
        assert close_code(guest_socket) == CLOSE_ENDED
        assert host_socket.receive_json() == {"type": "meeting_ended"}
        assert close_code(host_socket) == CLOSE_ENDED

    session = only_session(db)
    assert session.ended_at is not None
    assert {person.status for person in session.participants} == {"left"}
    with connect(live_client, guest) as late_socket:  # the session is over
        assert close_code(late_socket) == CLOSE_ENDED


def test_leaving_tells_the_others_and_the_last_to_leave_ends_the_session(
    live_client: TestClient, db: Session
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "leave"})
        left = host_socket.receive_json()
        assert left == {"type": "participant_left", "participant_id": guest.participant_id}
        assert only_session(db).ended_at is None  # the host is still in

        host_socket.send_json({"type": "leave"})
        assert close_code(host_socket) == 1000

    assert only_session(db).ended_at is not None


def test_a_dropped_last_connection_ends_the_session_after_the_grace_period(
    live_client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(actions, "GRACE_SECONDS", 0.3)
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
    # Leaving the block closes the socket without a leave message: a dropped connection.
    wait(live_client, 0.05)
    assert only_session(db).ended_at is None  # still inside the grace period

    wait(live_client, 0.6)
    assert only_session(db).ended_at is not None


def test_reconnecting_inside_the_grace_period_keeps_the_meeting(
    live_client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(actions, "GRACE_SECONDS", 0.3)
    host = start_meeting(live_client)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
    wait(live_client, 0.05)
    db.expire_all()
    participant = db.get(Participant, host.participant_id)
    assert participant is not None and participant.status == "left"

    with connect(live_client, host) as socket:  # a refresh
        assert socket.receive_json()["type"] == "welcome"
        wait(live_client, 0.6)  # longer than the grace period
        db.expire_all()
        assert participant.status == "in_meeting"
        assert participant.left_at is None
        assert only_session(db).ended_at is None


def test_a_refresh_works_when_the_old_socket_is_already_gone(
    live_client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host) as old_socket:
        old_socket.receive_json()  # welcome
        old = actions.manager.find(only_session(db).id, host.participant_id)
        assert old is not None

        # The browser dropped the old page before the server noticed, so
        # closing that socket fails the way Starlette reports a lost peer.
        async def already_gone(code: int = 1000, reason: str | None = None) -> None:
            raise WebSocketDisconnect(code=1006)

        monkeypatch.setattr(old.websocket, "close", already_gone)

        with connect(live_client, host) as new_socket:  # the refreshed page
            assert new_socket.receive_json()["type"] == "welcome"
            new_socket.send_json({"type": "chat", "body": "still here"})
            assert new_socket.receive_json()["body"] == "still here"  # the connection survived


def test_a_removed_participant_cannot_reconnect(live_client: TestClient, db: Session) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)
    participant = db.get(Participant, guest.participant_id)
    assert participant is not None
    participant.status = "removed"
    db.commit()

    with connect(live_client, guest) as socket:
        assert close_code(socket) == CLOSE_REMOVED
