"""One host per live session: Start refuses a second host, and a host who refreshes keeps the role."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.models import Meeting, Participant, User
from app.realtime.messages import CLOSE_INVALID_TOKEN
from app.services.errors import Conflict
from app.services.lifecycle import ALREADY_HOSTED, start_meeting
from app.services.presence import mark_left
from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting, add_session, new_participant
from tests.ws_helpers import Person, add_guest, close_code, connect, only_session, wait


def new_meeting_code(db: Session, host: User) -> str:
    return add_scheduled_meeting(db, host, utc_now() + timedelta(hours=1)).meeting_code


def start(client: TestClient, code: str) -> Response:
    return client.post(f"/api/meetings/{code}/start")


def start_as_person(client: TestClient, code: str) -> Person:
    joined = start(client, code).json()
    return Person(code, joined["participant"]["id"], joined["join_token"])


def test_a_second_start_is_refused_while_the_host_is_in_the_meeting(
    client: TestClient, db: Session, alex: User
) -> None:
    code = new_meeting_code(db, alex)

    first = start(client, code)
    second = start(client, code)

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json() == {"detail": ALREADY_HOSTED}


def test_start_works_again_once_the_host_has_left(
    client: TestClient, db: Session, alex: User
) -> None:
    code = new_meeting_code(db, alex)
    first_host = start(client, code).json()["participant"]["id"]
    add_guest(client, code)  # keeps the session live after the host leaves
    mark_left(db, first_host)  # what the server does when the host's socket closes

    again = start(client, code)

    assert again.status_code == 200
    assert again.json()["participant"]["role"] == "host"
    assert len(only_session(db).participants) == 3  # the same session, with a new host row


def test_a_host_who_refreshes_keeps_the_role(
    live_client: TestClient, db: Session, alex: User
) -> None:
    code = new_meeting_code(db, alex)
    host = start_as_person(live_client, code)

    with connect(live_client, host) as socket:
        socket.receive_json()  # welcome
    wait(live_client, 0.05)  # the server marks the host left when the connection drops
    participant = db.get(Participant, host.participant_id)
    assert participant is not None and participant.status == "left"

    with connect(live_client, host) as socket:  # the refreshed page, with the saved token
        assert socket.receive_json()["self"]["role"] == "host"
        assert start(live_client, code).status_code == 409


def test_a_host_replaced_while_away_cannot_reconnect_as_host(
    live_client: TestClient, db: Session, alex: User
) -> None:
    code = new_meeting_code(db, alex)
    first_host = start_as_person(live_client, code)
    guest = add_guest(live_client, code)

    with connect(live_client, guest) as guest_socket:  # keeps the session live
        guest_socket.receive_json()  # welcome
        with connect(live_client, first_host) as host_socket:
            host_socket.receive_json()  # welcome
        wait(live_client, 0.05)  # the server marks the host left when the connection drops

        assert start(live_client, code).status_code == 200  # another device takes over

        with connect(live_client, first_host) as socket:
            assert close_code(socket) == CLOSE_INVALID_TOKEN  # sent to the pre-join page


def test_starting_on_two_devices_at_the_same_moment_makes_one_host(
    db: Session, session_factory: sessionmaker[Session], alex: User
) -> None:
    """Both requests look before either writes, so both pass the check. The
    one-host index rejects the second INSERT, which becomes the same 409."""
    meeting_id = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1)).id

    with session_factory() as early, session_factory() as late:
        late_meeting = late.get(Meeting, meeting_id)
        late_user = late.get(User, alex.id)
        early_meeting = early.get(Meeting, meeting_id)
        early_user = early.get(User, alex.id)
        assert late_meeting is not None and late_user is not None
        assert early_meeting is not None and early_user is not None
        assert late_meeting.live_session is None  # read before the early start commits

        start_meeting(early, early_user, early_meeting, None)  # factory meetings have no key
        with pytest.raises(Conflict):
            start_meeting(late, late_user, late_meeting, None)

    hosts = db.scalars(select(Participant).where(Participant.role == "host")).all()
    assert len(hosts) == 1


def test_the_database_allows_one_host_in_the_meeting_per_session(
    db: Session, alex: User
) -> None:
    meeting = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1))
    session = add_session(db, meeting, utc_now(), None)
    db.add(new_participant(session, alex.name, alex, role="host"))
    db.commit()

    db.add(new_participant(session, alex.name, alex, role="host"))
    with pytest.raises(IntegrityError):
        db.commit()
