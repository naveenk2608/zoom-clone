from datetime import datetime
from typing import TYPE_CHECKING, Literal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, false, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils.time import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting_session import MeetingSession
    from app.models.user import User

MeetingType = Literal["instant", "scheduled"]


class Meeting(Base):
    """A meeting as planned: started instantly or scheduled for later.

    Each time it actually runs is a MeetingSession.
    """

    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("meeting_type IN ('instant', 'scheduled')", name="ck_meetings_type"),
        CheckConstraint("duration_minutes BETWEEN 15 AND 1440", name="ck_meetings_duration"),
        CheckConstraint(
            "meeting_type = 'instant' OR (scheduled_start IS NOT NULL"
            " AND duration_minutes IS NOT NULL AND timezone IS NOT NULL)",
            name="ck_meetings_scheduled_fields",
        ),
        # Exactly 11 characters, none of which is a non-digit.
        CheckConstraint(
            "length(meeting_code) = 11 AND meeting_code NOT GLOB '*[^0-9]*'",
            name="ck_meetings_code_digits",
        ),
        CheckConstraint("length(title) BETWEEN 1 AND 200", name="ck_meetings_title_length"),
        CheckConstraint("length(description) <= 2000", name="ck_meetings_description_length"),
        # A SHA-256 hash in hex. NULL for the seeded meetings, which anyone may manage.
        CheckConstraint("length(host_key_hash) = 64", name="ck_meetings_host_key_hash_length"),
        Index("ix_meetings_host_start", "host_id", "scheduled_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_code: Mapped[str] = mapped_column(Text, unique=True)  # shown as "123 4567 8901"
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    meeting_type: Mapped[MeetingType] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    scheduled_start: Mapped[datetime | None] = mapped_column(UTCDateTime)
    duration_minutes: Mapped[int | None]
    timezone: Mapped[str | None] = mapped_column(Text)  # IANA name, e.g. "Asia/Kolkata"
    mute_on_entry: Mapped[bool] = mapped_column(default=False, server_default=false())
    host_video_on: Mapped[bool] = mapped_column(default=True, server_default=true())
    participant_video_on: Mapped[bool] = mapped_column(default=True, server_default=true())
    # Proves which browser created the meeting; see services/host_keys.py.
    host_key_hash: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[datetime | None] = mapped_column(UTCDateTime)  # soft delete keeps history
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now, onupdate=utc_now)

    host: Mapped["User"] = relationship()
    sessions: Mapped[list["MeetingSession"]] = relationship(
        back_populates="meeting", order_by="MeetingSession.started_at"
    )

    @property
    def live_session(self) -> "MeetingSession | None":
        """The session running right now, if any. A unique index allows at most one."""
        for session in self.sessions:
            if session.ended_at is None:
                return session
        return None
