"""Builds the rows behind the demo data: meetings, finished sessions and their participants."""

import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Meeting, MeetingSession, Participant, User
from app.models.participant import ParticipantRole
from app.seed_time import SEED_TIMEZONE
from app.services.meeting_codes import generate_meeting_code


def add_meeting(
    db: Session,
    codes: set[str],
    host: User,
    title: str,
    *,
    created_at: datetime,
    start: datetime | None = None,
    minutes: int | None = None,
    description: str | None = None,
) -> Meeting:
    """A scheduled meeting when a start is given, otherwise an instant one."""
    meeting = Meeting(
        meeting_code=unused_code(codes),
        host=host,
        meeting_type="scheduled" if start is not None else "instant",
        title=title,
        description=description,
        scheduled_start=start,
        duration_minutes=minutes,
        timezone=SEED_TIMEZONE if start is not None else None,
        created_at=created_at,
    )
    db.add(meeting)
    return meeting


def unused_code(codes: set[str]) -> str:
    """The database is empty, so only codes made by this seed can clash."""
    code = generate_meeting_code()
    while code in codes:
        code = generate_meeting_code()
    codes.add(code)
    return code


def add_ended_session(
    db: Session,
    meeting: Meeting,
    started_at: datetime,
    minutes: int,
    members: list[User],
    guests: list[str],
) -> None:
    """A finished session. Members are signed-in users; guests are names only."""
    ended_at = started_at + timedelta(minutes=minutes)
    session = MeetingSession(meeting=meeting, started_at=started_at, ended_at=ended_at)
    db.add(session)
    for user in members:
        role: ParticipantRole = "host" if user is meeting.host else "attendee"
        add_past_participant(db, session, user.name, user, role)
    for name in guests:
        add_past_participant(db, session, name, None, "attendee")


def add_past_participant(
    db: Session, session: MeetingSession, name: str, user: User | None, role: ParticipantRole
) -> None:
    db.add(
        Participant(
            session=session,
            user_id=user.id if user is not None else None,
            display_name=name,
            role=role,
            status="left",
            join_token=secrets.token_urlsafe(24),
            joined_at=session.started_at,
            left_at=session.ended_at,
        )
    )
