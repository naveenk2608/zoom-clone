"""Who is in a meeting right now, as far as the database is concerned.

These are the database steps behind the live meeting socket: letting a
participant in, marking them left, and ending the session.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MeetingSession, Participant
from app.models.participant import ParticipantRole
from app.services.errors import Gone, NotAllowed, Unauthorized
from app.services.lifecycle import ALREADY_HOSTED, end_session, has_host_in_meeting
from app.utils.time import utc_now

MEETING_ENDED_MESSAGE = "This meeting has been ended by host."
REMOVED_MESSAGE = "You have been removed from this meeting by the host."


@dataclass(frozen=True)
class RoomMember:
    """Plain data about an admitted participant, safe to use after the DB session closes."""

    participant_id: int
    session_id: int
    display_name: str
    role: ParticipantRole


def admit(db: Session, code: str, token: str) -> RoomMember:
    """Checks a join token for a meeting and marks its owner as in the meeting.

    Reconnecting with the same token (after a refresh) puts a participant who
    had left back in the meeting, unless they were the host and someone started
    the meeting on another device while they were away. That token is then
    refused, and the app sends them to the pre-join page to join as a participant.
    """
    participant = db.scalar(select(Participant).where(Participant.join_token == token))
    if participant is None or participant.session.meeting.meeting_code != code:
        raise Unauthorized("This join link is not valid.")
    if participant.status == "removed":
        raise NotAllowed(REMOVED_MESSAGE)
    if participant.session.ended_at is not None:
        raise Gone(MEETING_ENDED_MESSAGE)
    if participant.status == "left" and participant.role == "host":
        if has_host_in_meeting(participant.session):
            raise Unauthorized(ALREADY_HOSTED)
    if participant.status == "left":
        participant.status = "in_meeting"
        participant.left_at = None
        db.commit()
    return RoomMember(
        participant_id=participant.id,
        session_id=participant.session_id,
        display_name=participant.display_name,
        role=participant.role,
    )


def mark_left(db: Session, participant_id: int) -> None:
    participant = db.get(Participant, participant_id)
    if participant is not None and participant.status == "in_meeting":
        participant.status = "left"
        participant.left_at = utc_now()
        db.commit()


def mark_removed(db: Session, participant_id: int) -> None:
    """The host removed them. `admit` refuses removed participants, so their token stops working."""
    participant = db.get(Participant, participant_id)
    if participant is not None:
        participant.status = "removed"
        participant.left_at = utc_now()
        db.commit()


def end_live_session(db: Session, session_id: int) -> None:
    """Ends the session and marks everyone in it as left. Safe to call twice."""
    session = db.get(MeetingSession, session_id)
    if session is not None and session.ended_at is None:
        end_session(session, utc_now())
        db.commit()
