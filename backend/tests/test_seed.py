from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import DEFAULT_USER_EMAIL
from app.models import Meeting, MeetingSession, User
from app.seed import seed_if_empty
from app.seed_time import SEED_TIMEZONE, later_today, office_time
from app.services import dashboard, lifecycle
from app.utils.time import utc_now, utc_to_local


def tomorrow_in_india() -> date:
    """Seeding "as if it were tomorrow" keeps every seeded "later today" time in
    the future when the dashboard query runs, whatever time the tests run at."""
    return utc_to_local(utc_now(), SEED_TIMEZONE).date() + timedelta(days=1)


def default_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
    assert user is not None
    return user


def in_office_hours(start: datetime, end: datetime) -> bool:
    local_start = utc_to_local(start, SEED_TIMEZONE)
    local_end = utc_to_local(end, SEED_TIMEZONE)
    same_day = local_start.date() == local_end.date()
    return same_day and local_start.time() >= time(10, 0) and local_end.time() <= time(18, 0)


@pytest.mark.parametrize(
    ("local_now", "expected"),
    [
        ("04:00", "10:00"),  # before opening: the first slot of the day
        ("11:05", "11:30"),
        ("17:20", "17:30"),  # finishes exactly at closing time
        ("17:31", None),  # the next slot would run past 18:00
        ("20:00", None),
    ],
)
def test_later_today_stays_in_office_hours(local_now: str, expected: str | None) -> None:
    day = date(2026, 10, 7)

    slot = later_today(office_time(day, local_now))

    assert slot == (office_time(day, expected) if expected is not None else None)


def test_the_seed_fills_an_empty_database(db: Session) -> None:
    assert seed_if_empty(db, now=office_time(tomorrow_in_india(), "11:00")) is True

    alex = default_user(db)
    upcoming = dashboard.upcoming_meetings(db, alex)
    assert db.scalar(select(func.count()).select_from(User)) == 6
    assert len(upcoming) == 6  # five in the coming week, plus one later today
    assert upcoming[0].title == "Daily Standup"
    assert len(dashboard.recent_meetings(db, alex)) == 6


def test_no_meeting_is_added_today_after_office_hours(db: Session) -> None:
    seed_if_empty(db, now=office_time(tomorrow_in_india(), "18:30"))

    titles = [meeting.title for meeting in dashboard.upcoming_meetings(db, default_user(db))]

    assert len(titles) == 5
    assert "Daily Standup" not in titles


def test_seeded_times_are_in_office_hours(db: Session) -> None:
    seed_if_empty(db, now=office_time(tomorrow_in_india(), "11:00"))

    for meeting in db.scalars(select(Meeting).where(Meeting.scheduled_start.is_not(None))):
        assert meeting.scheduled_start is not None and meeting.duration_minutes is not None
        end = meeting.scheduled_start + timedelta(minutes=meeting.duration_minutes)
        assert in_office_hours(meeting.scheduled_start, end), meeting.title
    for session in db.scalars(select(MeetingSession)):
        assert session.ended_at is not None
        assert in_office_hours(session.started_at, session.ended_at)


def test_the_seed_runs_only_once(db: Session) -> None:
    seed_if_empty(db)
    meetings_before = db.scalar(select(func.count()).select_from(Meeting))

    assert seed_if_empty(db) is False
    assert db.scalar(select(func.count()).select_from(Meeting)) == meetings_before


def test_startup_ends_sessions_left_live(db: Session, alex: User) -> None:
    participant = lifecycle.create_instant_meeting(db, alex, None)
    session_id = participant.session_id

    assert lifecycle.close_stale_sessions(db) == 1

    session = db.get(MeetingSession, session_id)
    assert session is not None
    assert session.ended_at is not None
    assert [person.status for person in session.participants] == ["left"]
