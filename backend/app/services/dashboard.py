"""The queries behind the dashboard's Upcoming and Recent lists."""

from datetime import datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Meeting, MeetingSession, Participant, User
from app.schemas.meeting import RecentMeetingOut
from app.utils.time import utc_now

LONGEST_MEETING = timedelta(minutes=1440)
RECENT_LIMIT = 20


def upcoming_meetings(db: Session, user: User) -> list[Meeting]:
    """The user's meetings that are live or haven't finished yet: live ones first,
    then the rest by start time."""
    now = utc_now()
    has_live_session = Meeting.sessions.any(MeetingSession.ended_at.is_(None))
    # A meeting that started more than 24 hours ago has finished, whatever its
    # duration, so this filter can use the (host_id, scheduled_start) index.
    started_recently = Meeting.scheduled_start > now - LONGEST_MEETING
    candidates = db.scalars(
        select(Meeting)
        .where(Meeting.host_id == user.id, Meeting.cancelled_at.is_(None))
        .where(or_(has_live_session, started_recently))
        .order_by(Meeting.scheduled_start)
        .options(selectinload(Meeting.sessions), selectinload(Meeting.host))
    ).all()

    live = [meeting for meeting in candidates if meeting.live_session is not None]
    not_over = [
        meeting
        for meeting in candidates
        if meeting.live_session is None and ends_after(meeting, now)
    ]
    return live + not_over


def ends_after(meeting: Meeting, moment: datetime) -> bool:
    if meeting.scheduled_start is None or meeting.duration_minutes is None:
        return False
    end = meeting.scheduled_start + timedelta(minutes=meeting.duration_minutes)
    return end > moment


def recent_meetings(db: Session, user: User) -> list[RecentMeetingOut]:
    """Ended sessions of meetings the user hosted or took part in, newest first."""
    attended = select(Participant.session_id).where(Participant.user_id == user.id)
    sessions = db.scalars(
        select(MeetingSession)
        .join(MeetingSession.meeting)
        .where(MeetingSession.ended_at.is_not(None))
        .where(or_(Meeting.host_id == user.id, MeetingSession.id.in_(attended)))
        .order_by(MeetingSession.ended_at.desc())
        .limit(RECENT_LIMIT)
        .options(selectinload(MeetingSession.meeting), selectinload(MeetingSession.participants))
    ).all()
    return [to_recent_out(session) for session in sessions]


def to_recent_out(session: MeetingSession) -> RecentMeetingOut:
    if session.ended_at is None:
        raise ValueError("Only ended sessions are listed in Recent")
    minutes = round((session.ended_at - session.started_at).total_seconds() / 60)
    names = {participant.display_name for participant in session.participants}
    return RecentMeetingOut(
        session_id=session.id,
        meeting_code=session.meeting.meeting_code,
        title=session.meeting.title,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_minutes=minutes,
        participant_count=len(names),
    )
