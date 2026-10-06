"""Meetings: lookup, derived status, the API view, and the scheduling rules."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Meeting, Participant, User
from app.schemas.join import JoinOut, ParticipantOut
from app.schemas.meeting import HostOut, MeetingOut, MeetingStatus, ScheduleIn
from app.services.errors import Conflict, InvalidInput, NotAllowed, NotFound
from app.services.meeting_codes import add_with_unique_code, is_valid_meeting_code
from app.utils.time import local_to_utc, utc_now, utc_to_local

INVALID_MEETING_ID = "This meeting ID is not valid. Please check and try again."
# Allows for the time spent filling in the form before pressing Save.
PAST_START_GRACE = timedelta(minutes=5)


def get_meeting_by_code(db: Session, code: str) -> Meeting:
    if not is_valid_meeting_code(code):
        raise NotFound(INVALID_MEETING_ID)
    meeting = db.scalar(select(Meeting).where(Meeting.meeting_code == code))
    if meeting is None:
        raise NotFound(INVALID_MEETING_ID)
    return meeting


def meeting_status(meeting: Meeting) -> MeetingStatus:
    """Derived, never stored. The order of the checks matters."""
    if meeting.cancelled_at is not None:
        return "cancelled"
    if meeting.live_session is not None:
        return "live"
    if meeting.meeting_type == "instant":
        return "ended"  # instant meetings are single-use
    return "scheduled"


def to_meeting_out(meeting: Meeting) -> MeetingOut:
    start_date = None
    start_time = None
    if meeting.scheduled_start is not None and meeting.timezone is not None:
        # The edit form shows the wall-clock time in the zone the host picked.
        local_start = utc_to_local(meeting.scheduled_start, meeting.timezone)
        start_date = local_start.date()
        start_time = local_start.strftime("%H:%M")

    return MeetingOut(
        meeting_code=meeting.meeting_code,
        title=meeting.title,
        description=meeting.description,
        meeting_type=meeting.meeting_type,
        status=meeting_status(meeting),
        scheduled_start=meeting.scheduled_start,
        start_date=start_date,
        start_time=start_time,
        duration_minutes=meeting.duration_minutes,
        timezone=meeting.timezone,
        mute_on_entry=meeting.mute_on_entry,
        host_video_on=meeting.host_video_on,
        participant_video_on=meeting.participant_video_on,
        invite_link=f"{settings.frontend_base_url}/j/{meeting.meeting_code}",
        host=HostOut(name=meeting.host.name, avatar_color=meeting.host.avatar_color),
        created_at=meeting.created_at,
    )


def to_join_out(participant: Participant) -> JoinOut:
    return JoinOut(
        meeting=to_meeting_out(participant.session.meeting),
        participant=ParticipantOut(
            id=participant.id, display_name=participant.display_name, role=participant.role
        ),
        join_token=participant.join_token,
    )


def create_scheduled_meeting(db: Session, host: User, data: ScheduleIn) -> Meeting:
    meeting = Meeting(host=host, meeting_type="scheduled")
    apply_schedule(meeting, data)
    add_with_unique_code(db, meeting)
    db.commit()
    return meeting


def update_scheduled_meeting(db: Session, user: User, meeting: Meeting, data: ScheduleIn) -> None:
    require_host(user, meeting, "Only the host can edit this meeting.")
    if meeting.cancelled_at is not None:
        raise Conflict("A cancelled meeting can't be edited.")
    if meeting.meeting_type == "instant":
        raise Conflict("An instant meeting can't be edited.")
    apply_schedule(meeting, data)
    db.commit()


def cancel_meeting(db: Session, user: User, meeting: Meeting) -> None:
    """Soft delete: the meeting and its past sessions stay in the database."""
    require_host(user, meeting, "Only the host can delete this meeting.")
    if meeting.live_session is not None:
        raise Conflict("This meeting is in progress. End it before deleting it.")
    if meeting.cancelled_at is None:
        meeting.cancelled_at = utc_now()
        db.commit()


def require_host(user: User, meeting: Meeting, message: str) -> None:
    if meeting.host_id != user.id:
        raise NotAllowed(message)


def apply_schedule(meeting: Meeting, data: ScheduleIn) -> None:
    """Copies the Schedule form onto the meeting (used by create and edit)."""
    start = start_in_utc(data)  # checked before anything changes
    meeting.title = data.title
    meeting.description = data.description
    meeting.scheduled_start = start
    meeting.duration_minutes = data.duration_minutes
    meeting.timezone = data.timezone
    meeting.mute_on_entry = data.mute_on_entry
    meeting.host_video_on = data.host_video_on
    meeting.participant_video_on = data.participant_video_on


def start_in_utc(data: ScheduleIn) -> datetime:
    start = local_to_utc(data.start_date, data.start_time, data.timezone)
    if start < utc_now() - PAST_START_GRACE:
        raise InvalidInput("The start time can't be in the past.")
    return start
