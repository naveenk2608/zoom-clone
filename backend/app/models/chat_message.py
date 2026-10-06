from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.utils.time import UTCDateTime, utc_now


class ChatMessage(Base):
    """A chat message sent during a session."""

    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint("length(body) BETWEEN 1 AND 2000", name="ck_chat_messages_body_length"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE")
    )
    body: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
