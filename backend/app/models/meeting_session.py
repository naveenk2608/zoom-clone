from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils.time import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class MeetingSession(Base):
    """One actual run of a meeting (Zoom calls it a "meeting instance").

    ended_at is NULL while the session is live.
    """

    __tablename__ = "meeting_sessions"
    __table_args__ = (
        CheckConstraint(
            "ended_at IS NULL OR ended_at >= started_at", name="ck_sessions_end_after_start"
        ),
        # At most one live session per meeting.
        Index(
            "ux_sessions_one_live_per_meeting",
            "meeting_id",
            unique=True,
            sqlite_where=text("ended_at IS NULL"),
        ),
        Index("ix_sessions_meeting_start", "meeting_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    meeting: Mapped["Meeting"] = relationship(back_populates="sessions")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="session", order_by="Participant.joined_at"
    )
