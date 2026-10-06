from datetime import datetime
from typing import TYPE_CHECKING, Literal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils.time import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting_session import MeetingSession

ParticipantRole = Literal["host", "attendee"]
ParticipantStatus = Literal["in_meeting", "left", "removed"]


class Participant(Base):
    """One join of a session. Guests have no user_id."""

    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint("role IN ('host', 'attendee')", name="ck_participants_role"),
        CheckConstraint(
            "status IN ('in_meeting', 'left', 'removed')", name="ck_participants_status"
        ),
        CheckConstraint(
            "length(display_name) BETWEEN 1 AND 100", name="ck_participants_name_length"
        ),
        CheckConstraint(
            "left_at IS NULL OR left_at >= joined_at", name="ck_participants_left_after_join"
        ),
        Index("ix_participants_session_status", "session_id", "status"),
        Index("ix_participants_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("meeting_sessions.id", ondelete="CASCADE")
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    display_name: Mapped[str] = mapped_column(Text)
    role: Mapped[ParticipantRole] = mapped_column(Text)
    status: Mapped[ParticipantStatus] = mapped_column(Text)
    join_token: Mapped[str] = mapped_column(Text, unique=True)  # authenticates the WebSocket
    joined_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    left_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    session: Mapped["MeetingSession"] = relationship(back_populates="participants")
