"""Meeting lifecycle: starting meetings, joining them, and ending sessions."""

import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingSession, Participant, User
from app.models.participant import ParticipantRole
from app.services.errors import Conflict, Gone, NotAllowed
from app.services.host_keys import issue_host_key, require_host_key
from app.services.meeting_codes import add_with_unique_code
from app.utils.time import utc_now

ALREADY_HOSTED = "This meeting is already being hosted on another device."


def create_instant_meeting(
    db: Session, host: User, title: str | None
) -> tuple[Participant, str]:
    """New meeting: the meeting, its live session and the host's participant row, in one commit.

    Returns the host's participant row and the meeting's host key, which is never sent again.
    """
    if title is None:
        title = f"{host.name}'s Zoom Meeting"
    meeting = Meeting(host=host, meeting_type="instant", title=title)
    host_key = issue_host_key(meeting)
    add_with_unique_code(db, meeting)  # the first write in this transaction
    session = start_session(db, meeting)
    participant = add_participant(db, session, user=host, display_name=host.name, role="host")
    db.commit()
    return participant, host_key


def start_meeting(db: Session, user: User, meeting: Meeting, host_key: str | None) -> Participant:
    """The host starts the meeting, or rejoins it if it is already live.

    A live session has at most one host in it. A host who refreshes the page
    reconnects with their join token and never comes back here.
    """
    if meeting.host_id != user.id:
        raise NotAllowed("Only the host can start this meeting.")
    require_host_key(meeting, host_key)
    check_can_join(meeting)
    live = meeting.live_session
    if live is not None and has_host_in_meeting(live):
        raise Conflict(ALREADY_HOSTED)
    session = live_or_new_session(db, meeting)
    participant = add_participant(db, session, user=user, display_name=user.name, role="host")
    try:
        db.commit()
    except IntegrityError as error:
        # Another Start won the race between our check and our INSERT, and the
        # one-host index rejected ours.
        db.rollback()
        if not is_host_clash(error):
            raise
        raise Conflict(ALREADY_HOSTED) from None
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
    """The meeting's live session, or a new one when none is running.

    Two people can join at the same moment and both find no live session. The
    one-live-session index then rejects the second INSERT, so that request rolls
    back and joins the session that won. Because of that rollback, call this
    before any other write in the transaction.
    """
    if meeting.live_session is not None:
        return meeting.live_session
    session = start_session(db, meeting)
    try:
        db.flush()  # INSERT now, so a clash with another join shows up here
        return session
    except IntegrityError as error:
        db.rollback()
        if not is_live_session_clash(error):
            raise
    # The rollback expired `meeting`, so this reloads its sessions from the database.
    winner = meeting.live_session
    if winner is None:
        raise RuntimeError("Another join started a session, but it has already ended")
    return winner


def is_live_session_clash(error: IntegrityError) -> bool:
    """True when the one-live-session-per-meeting index rejected the INSERT."""
    return "meeting_sessions.meeting_id" in str(error.orig)


def has_host_in_meeting(session: MeetingSession) -> bool:
    return any(
        person.role == "host" and person.status == "in_meeting" for person in session.participants
    )


def is_host_clash(error: IntegrityError) -> bool:
    """True when the one-host-per-session index rejected the INSERT."""
    return "participants.session_id" in str(error.orig)


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
