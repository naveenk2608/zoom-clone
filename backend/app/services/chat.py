"""Meeting chat, as far as the database is concerned: every message is saved.

The socket delivers messages live and never replays them, so people who join
later don't see earlier ones (Zoom's default). The saved rows are the record.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import ChatMessage
from app.utils.time import utc_now


@dataclass(frozen=True)
class SavedChatMessage:
    """Plain data about a saved message, safe to use after the DB session closes."""

    id: int
    sent_at: datetime


def save_message(db: Session, participant_id: int, body: str) -> SavedChatMessage:
    message = ChatMessage(participant_id=participant_id, body=body, sent_at=utc_now())
    db.add(message)
    db.commit()
    return SavedChatMessage(id=message.id, sent_at=message.sent_at)
