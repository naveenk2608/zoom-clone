from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Meeting, MeetingSession, Participant, User
from app.services.lifecycle import end_session, join_meeting, start_meeting
from app.services.meetings import INVALID_MEETING_ID
from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting, add_user


@pytest.mark.parametrize("code", ["99999999999", "123", "abcdefghijk", "123 4567 8901"])
def test_unknown_or_malformed_codes_are_not_found(client: TestClient, code: str) -> None:
    info = client.get(f"/api/meetings/{code}")
    join = client.post(f"/api/meetings/{code}/join", json={"display_name": "Sam"})

    for response in (info, join):
        assert response.status_code == 404
        assert response.json() == {"detail": INVALID_MEETING_ID}


def test_an_instant_meeting_is_live_with_its_host(client: TestClient) -> None:
    response = client.post("/api/meetings/instant")

    assert response.status_code == 200
    joined = response.json()
    assert joined["meeting"]["status"] == "live"
    assert joined["meeting"]["title"] == "Alex Morgan's Zoom Meeting"
    assert joined["participant"]["display_name"] == "Alex Morgan"
    assert joined["participant"]["role"] == "host"
    assert len(joined["join_token"]) >= 32


def test_an_instant_meeting_can_have_its_own_title(client: TestClient) -> None:
    response = client.post("/api/meetings/instant", json={"title": "Quick sync"})

    assert response.json()["meeting"]["title"] == "Quick sync"


def test_joining_makes_a_guest_attendee_and_starts_the_session(
    client: TestClient, db: Session, alex: User
) -> None:
    meeting = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1))

    response = client.post(
        f"/api/meetings/{meeting.meeting_code}/join", json={"display_name": "  Sam  "}
    )

    assert response.status_code == 200
    joined = response.json()
    assert joined["participant"]["role"] == "attendee"
    assert joined["participant"]["display_name"] == "Sam"
    assert joined["meeting"]["status"] == "live"  # the first join started a session
    participant = db.get(Participant, joined["participant"]["id"])
    assert participant is not None
    assert participant.user_id is None  # joining always makes a guest, even for the host


def test_a_second_join_uses_the_same_session(client: TestClient, db: Session, alex: User) -> None:
    meeting = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1))

    client.post(f"/api/meetings/{meeting.meeting_code}/join", json={"display_name": "Sam"})
    client.post(f"/api/meetings/{meeting.meeting_code}/join", json={"display_name": "Lee"})

    sessions = db.scalars(
        select(MeetingSession).where(MeetingSession.meeting_id == meeting.id)
    ).all()
    assert len(sessions) == 1
    assert len(sessions[0].participants) == 2


def test_a_cancelled_meeting_is_gone(client: TestClient, db: Session, alex: User) -> None:
    meeting = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1))
    client.delete(f"/api/meetings/{meeting.meeting_code}")

    response = client.post(
        f"/api/meetings/{meeting.meeting_code}/join", json={"display_name": "Sam"}
    )

    assert response.status_code == 410
    assert response.json() == {"detail": "This meeting has been cancelled."}


def test_an_ended_instant_meeting_is_gone(client: TestClient, db: Session) -> None:
    code = client.post("/api/meetings/instant").json()["meeting"]["meeting_code"]
    session = db.scalar(
        select(MeetingSession).join(MeetingSession.meeting).where(Meeting.meeting_code == code)
    )
    assert session is not None
    end_session(session, utc_now())
    db.commit()

    join = client.post(f"/api/meetings/{code}/join", json={"display_name": "Sam"})
    start = client.post(f"/api/meetings/{code}/start")

    assert client.get(f"/api/meetings/{code}").json()["status"] == "ended"
    assert join.status_code == 410
    assert join.json() == {"detail": "This meeting has ended."}
    assert start.status_code == 410


def test_only_the_host_can_start(client: TestClient, db: Session) -> None:
    priya = add_user(db, "Priya Sharma")
    meeting = add_scheduled_meeting(db, priya, utc_now() + timedelta(hours=1))

    response = client.post(f"/api/meetings/{meeting.meeting_code}/start")

    assert response.status_code == 403


def test_starting_links_the_host_to_their_user(client: TestClient, db: Session, alex: User) -> None:
    meeting = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1))

    joined = client.post(f"/api/meetings/{meeting.meeting_code}/start").json()

    assert joined["participant"]["role"] == "host"
    assert joined["meeting"]["status"] == "live"
    participant = db.get(Participant, joined["participant"]["id"])
    assert participant is not None
    assert participant.user_id == alex.id


# Two people join at the same moment. Each request runs in its own database
# session, and both look before either writes, so both see no live session and
# both try to start one. The one-live-session index rejects the second INSERT.


def load_meeting(db: Session, meeting_id: int) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    assert meeting is not None
    return meeting


def test_joining_at_the_same_moment_shares_one_session(
    db: Session, session_factory: sessionmaker[Session], alex: User
) -> None:
    meeting_id = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1)).id

    with session_factory() as early, session_factory() as late:
        late_view = load_meeting(late, meeting_id)
        assert late_view.live_session is None  # read before the early join commits
        winner_id = join_meeting(early, load_meeting(early, meeting_id), "Sam").session_id

        late_join = join_meeting(late, late_view, "Lee")

        assert late_join.session_id == winner_id
    sessions = db.scalars(
        select(MeetingSession).where(MeetingSession.meeting_id == meeting_id)
    ).all()
    assert len(sessions) == 1
    assert {person.display_name for person in sessions[0].participants} == {"Sam", "Lee"}


def test_starting_while_someone_joins_shares_one_session(
    db: Session, session_factory: sessionmaker[Session], alex: User
) -> None:
    meeting_id = add_scheduled_meeting(db, alex, utc_now() + timedelta(hours=1)).id

    with session_factory() as attendee, session_factory() as host:
        host_view = load_meeting(host, meeting_id)
        host_user = host.get(User, alex.id)
        assert host_user is not None
        assert host_view.live_session is None  # read before the attendee's join commits
        winner_id = join_meeting(attendee, load_meeting(attendee, meeting_id), "Sam").session_id

        host_join = start_meeting(host, host_user, host_view)

        assert host_join.session_id == winner_id
        assert host_join.role == "host"
