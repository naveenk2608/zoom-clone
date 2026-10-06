from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting, add_session, add_user


def test_upcoming_lists_live_meetings_then_unfinished_ones_by_start(
    client: TestClient, db: Session, alex: User
) -> None:
    now = utc_now()
    later = add_scheduled_meeting(db, alex, now + timedelta(days=2))
    sooner = add_scheduled_meeting(db, alex, now + timedelta(days=1))
    # Its time slot has started but nobody has joined yet, so it is still upcoming.
    running_late = add_scheduled_meeting(db, alex, now - timedelta(minutes=30), minutes=60)
    add_scheduled_meeting(db, alex, now - timedelta(days=1), minutes=60)  # finished
    cancelled = add_scheduled_meeting(db, alex, now + timedelta(days=1))
    cancelled.cancelled_at = now
    db.commit()
    priya = add_user(db, "Priya Sharma")
    add_scheduled_meeting(db, priya, now + timedelta(days=1))  # someone else's
    live = client.post("/api/meetings/instant").json()["meeting"]["meeting_code"]

    upcoming = client.get("/api/meetings/upcoming").json()

    assert [item["meeting_code"] for item in upcoming] == [
        live,
        running_late.meeting_code,
        sooner.meeting_code,
        later.meeting_code,
    ]


def test_recent_lists_hosted_and_attended_sessions_newest_first(
    client: TestClient, db: Session, alex: User
) -> None:
    now = utc_now()
    priya = add_user(db, "Priya Sharma")
    hosted = add_scheduled_meeting(db, alex, now - timedelta(days=1), title="Hosted")
    start = now - timedelta(hours=2)
    add_session(db, hosted, start, start + timedelta(minutes=44, seconds=40), ("Sam", "Sam", "Lee"))
    attended = add_scheduled_meeting(db, priya, now - timedelta(days=1), title="Attended")
    add_session(db, attended, now - timedelta(hours=4), now - timedelta(hours=3), member=alex)
    other = add_scheduled_meeting(db, priya, now - timedelta(days=1), title="Not Alex's")
    add_session(db, other, now - timedelta(minutes=50), now - timedelta(minutes=20), ("Lee",))
    live = add_scheduled_meeting(db, alex, now - timedelta(minutes=10), title="Still live")
    add_session(db, live, now - timedelta(minutes=10), None, ("Sam",))

    recent = client.get("/api/meetings/recent").json()

    assert [item["title"] for item in recent] == ["Hosted", "Attended"]
    assert recent[0]["duration_minutes"] == 45  # 44 min 40 s, rounded
    assert recent[0]["participant_count"] == 2  # "Sam" joined twice but counts once


def test_recent_shows_at_most_20_sessions(client: TestClient, db: Session, alex: User) -> None:
    now = utc_now()
    meeting = add_scheduled_meeting(db, alex, now - timedelta(days=2))
    for hours_ago in range(1, 26):
        start = now - timedelta(hours=hours_ago)
        add_session(db, meeting, start, start + timedelta(minutes=30))

    assert len(client.get("/api/meetings/recent").json()) == 20
