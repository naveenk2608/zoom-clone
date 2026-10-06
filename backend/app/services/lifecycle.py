"""Meeting lifecycle: starting meetings, joining them, and ending sessions."""

import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingSession, Participant, User
from app.models.participant import ParticipantRole
from app.services.errors import Gone, NotAllowed
from app.services.meeting_codes import add_with_unique_code
from app.utils.time import utc_now


def create_instant_meeting(db: Session, host: User, title: str | None) -> Participant:
    """New meeting: the meeting, its live session and the host's participant row, in one commit."""
    if title is None:
        title = f"{host.name}'s Zoom Meeting"
    meeting = Meeting(host=host, meeting_type="instant", title=title)
    add_with_unique_code(db, meeting)  # the first write in this transaction
    session = start_session(db, meeting)
    participant = add_participant(db, session, user=host, display_name=host.name, role="host")
    db.commit()
    return participant


def start_meeting(db: Session, user: User, meeting: Meeting) -> Participant:
    """The host starts the meeting, or rejoins it if it is already live."""
    if meeting.host_id != user.id:
        raise NotAllowed("Only the host can start this meeting.")
    check_can_join(meeting)
    session = live_or_new_session(db, meeting)
    participant = add_participant(db, session, user=user, display_name=user.name, role="host")
    db.commit()
    return participant


def join_meeting(db: Session, meeting: Meeting, display_name: str) -> Participant:
    """Anyone with the code joins as a guest attendee.

    Attendees may join a scheduled meeting before the host, like Zoom's
    "join anytime" option: the first join starts the session.
    """
    check_can_join(meeting)
    session = live_or_new_session(db, meeting)
    participant = add_participant(
        db, session, user=None, display_name=display_name, role="attendee"
    )
    db.commit()
    return participant


def check_can_join(meeting: Meeting) -> None:
    if meeting.cancelled_at is not None:
        raise Gone("This meeting has been cancelled.")
    if meeting.meeting_type == "instant" and meeting.live_session is None:
        raise Gone("This meeting has ended.")  # instant meetings are single-use


def live_or_new_session(db: Session, meeting: Meeting) -> MeetingSession:
    if meeting.live_session is not None:
        return meeting.live_session
    return start_session(db, meeting)


def start_session(db: Session, meeting: Meeting) -> MeetingSession:
    session = MeetingSession(meeting=meeting, started_at=utc_now())
    db.add(session)
    return session


def add_participant(
    db: Session,
    session: MeetingSession,
    *,
    user: User | None,
    display_name: str,
    role: ParticipantRole,
) -> Participant:
    """A new join. Hosts are linked to their user; guests (user=None) are not."""
    participant = Participant(
        session=session,
        user_id=user.id if user is not None else None,
        display_name=display_name,
        role=role,
        status="in_meeting",
        join_token=secrets.token_urlsafe(24),
        joined_at=utc_now(),
    )
    db.add(participant)
    return participant


def end_session(session: MeetingSession, ended_at: datetime) -> None:
    """Ends the session and marks everyone still in it as left. The caller commits."""
    session.ended_at = ended_at
    for participant in session.participants:
        if participant.status == "in_meeting":
            participant.status = "left"
            participant.left_at = ended_at


def close_stale_sessions(db: Session) -> int:
    """Runs at startup: after a restart nobody is connected, so no session is live."""
    live_sessions = db.scalars(
        select(MeetingSession).where(MeetingSession.ended_at.is_(None))
    ).all()
    now = utc_now()
    for session in live_sessions:
        end_session(session, now)
    db.commit()
    return len(live_sessions)
