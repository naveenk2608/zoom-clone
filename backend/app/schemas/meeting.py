from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, field_validator

from app.models.meeting import MeetingType
from app.utils.time import is_valid_timezone

MeetingStatus = Literal["scheduled", "live", "ended", "cancelled"]

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]
HHMM_PATTERN = r"^([01][0-9]|2[0-3]):[0-5][0-9]$"  # 24-hour "HH:MM"


class HostOut(BaseModel):
    name: str
    avatar_color: str


class MeetingOut(BaseModel):
    meeting_code: str
    title: str
    description: str | None
    meeting_type: MeetingType
    status: MeetingStatus  # derived, never stored
    scheduled_start: datetime | None  # UTC
    start_date: date | None  # wall-clock date in the meeting's own time zone
    start_time: str | None  # wall-clock "HH:MM" in the meeting's own time zone
    duration_minutes: int | None
    timezone: str | None
    mute_on_entry: bool
    host_video_on: bool
    participant_video_on: bool
    invite_link: str
    host: HostOut
    has_host_key: bool  # Start, Edit and Delete then need the key from the browser that created it
    created_at: datetime


class MeetingWithKeyOut(MeetingOut):
    """The answer to scheduling a meeting: the only time its host key is sent."""

    host_key: str


class RecentMeetingOut(BaseModel):
    session_id: int
    meeting_code: str
    title: str
    started_at: datetime
    ended_at: datetime
    duration_minutes: int  # how long it actually ran, rounded
    participant_count: int  # distinct display names


class InstantIn(BaseModel):
    title: Title | None = None


class ScheduleIn(BaseModel):
    title: Title
    description: Description | None = None
    start_date: date  # "YYYY-MM-DD"
    start_time: str = Field(pattern=HHMM_PATTERN)
    timezone: str  # IANA name, e.g. "Asia/Kolkata"
    duration_minutes: int = Field(ge=15, le=1440)
    mute_on_entry: bool = False
    host_video_on: bool = True
    participant_video_on: bool = True

    @field_validator("description")
    @classmethod
    def empty_description_is_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value

    @field_validator("timezone")
    @classmethod
    def timezone_must_exist(cls, value: str) -> str:
        if not is_valid_timezone(value):
            raise ValueError("Unknown time zone")
        return value
