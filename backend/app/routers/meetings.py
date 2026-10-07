from fastapi import APIRouter, status

from app.deps import CurrentUser, DbSession, HostKey, MeetingByCode
from app.schemas.join import JoinIn, JoinOut, JoinWithKeyOut
from app.schemas.meeting import (
    InstantIn,
    MeetingOut,
    MeetingWithKeyOut,
    RecentMeetingOut,
    ScheduleIn,
)
from app.services import dashboard, lifecycle, meetings

router = APIRouter(prefix="/meetings", tags=["meetings"])

# The fixed paths come before "/{code}", so "/{code}" can't capture them.


@router.get("/upcoming")
def list_upcoming(user: CurrentUser, db: DbSession) -> list[MeetingOut]:
    return [meetings.to_meeting_out(meeting) for meeting in dashboard.upcoming_meetings(db, user)]


@router.get("/recent")
def list_recent(user: CurrentUser, db: DbSession) -> list[RecentMeetingOut]:
    return dashboard.recent_meetings(db, user)


@router.post("/instant")
def create_instant(
    user: CurrentUser, db: DbSession, body: InstantIn | None = None
) -> JoinWithKeyOut:
    title = body.title if body is not None else None
    participant, host_key = lifecycle.create_instant_meeting(db, user, title)
    return meetings.to_join_with_key_out(participant, host_key)


@router.post("", status_code=status.HTTP_201_CREATED)
def schedule(body: ScheduleIn, user: CurrentUser, db: DbSession) -> MeetingWithKeyOut:
    meeting, host_key = meetings.create_scheduled_meeting(db, user, body)
    return meetings.to_meeting_with_key_out(meeting, host_key)


@router.get("/{code}")
def get_meeting(meeting: MeetingByCode) -> MeetingOut:
    return meetings.to_meeting_out(meeting)


@router.put("/{code}")
def edit_meeting(
    meeting: MeetingByCode,
    body: ScheduleIn,
    user: CurrentUser,
    db: DbSession,
    host_key: HostKey = None,
) -> MeetingOut:
    meetings.update_scheduled_meeting(db, user, meeting, body, host_key)
    return meetings.to_meeting_out(meeting)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting: MeetingByCode, user: CurrentUser, db: DbSession, host_key: HostKey = None
) -> None:
    meetings.cancel_meeting(db, user, meeting, host_key)


@router.post("/{code}/start")
def start_meeting(
    meeting: MeetingByCode, user: CurrentUser, db: DbSession, host_key: HostKey = None
) -> JoinOut:
    participant = lifecycle.start_meeting(db, user, meeting, host_key)
    return meetings.to_join_out(participant)


@router.post("/{code}/join")
def join_meeting(meeting: MeetingByCode, body: JoinIn, db: DbSession) -> JoinOut:
    participant = lifecycle.join_meeting(db, meeting, body.display_name)
    return meetings.to_join_out(participant)
