"""Puts data straight into the test database, for cases the API can't create:
other hosts, meetings in the past and finished sessions."""

import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Meeting, MeetingSession, Participant, User
from app.models.participant import ParticipantRole
from app.services.meeting_codes import generate_meeting_code


def add_user(db: Session, name: str) -> User:
    email = name.lower().replace(" ", ".") + "@example.com"
    user = User(name=name, email=email, avatar_color="#0E72ED")
    db.add(user)
    db.commit()
    return user


def add_scheduled_meeting(
    db: Session, host: User, start: datetime, minutes: int = 60, title: str = "Planning"
) -> Meeting:
    meeting = Meeting(
        meeting_code=generate_meeting_code(),
        host=host,
        meeting_type="scheduled",
        title=title,
        scheduled_start=start,
        duration_minutes=minutes,
        timezone="UTC",
    )
    db.add(meeting)
    db.commit()
    return meeting


def add_session(
    db: Session,
    meeting: Meeting,
    started_at: datetime,
    ended_at: datetime | None,
    guests: tuple[str, ...] = (),
    member: User | None = None,
) -> MeetingSession:
    """A session that is live when ended_at is None. Guests join by name only;
    `member` joins as a signed-in attendee."""
    session = MeetingSession(meeting=meeting, started_at=started_at, ended_at=ended_at)
    db.add(session)
    for name in guests:
        db.add(new_participant(session, name, None))
    if member is not None:
        db.add(new_participant(session, member.name, member))
    db.commit()
    return session


def new_participant(
    session: MeetingSession, name: str, user: User | None, role: ParticipantRole = "attendee"
) -> Participant:
    return Participant(
        session=session,
        user_id=user.id if user is not None else None,
        display_name=name,
        role=role,
        status="in_meeting" if session.ended_at is None else "left",
        join_token=secrets.token_urlsafe(24),
        joined_at=session.started_at,
        left_at=session.ended_at,
    )
