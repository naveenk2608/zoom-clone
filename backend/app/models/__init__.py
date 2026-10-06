"""All tables. Importing this package registers every model on Base.metadata."""

from sqlalchemy import Engine

from app.db import Base
from app.models.chat_message import ChatMessage
from app.models.meeting import Meeting
from app.models.meeting_session import MeetingSession
from app.models.participant import Participant
from app.models.user import User

__all__ = ["ChatMessage", "Meeting", "MeetingSession", "Participant", "User", "create_tables"]


def create_tables(engine: Engine) -> None:
    """Creates any missing tables. There are no migrations in this project."""
    Base.metadata.create_all(engine)
