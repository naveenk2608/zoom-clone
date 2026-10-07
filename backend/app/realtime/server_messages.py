"""The JSON messages the server sends over the meeting WebSocket.

messages.py has the ones clients send. frontend/src/types/ws.ts mirrors both.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.participant import ParticipantRole
from app.realtime.messages import Reaction, SignalData


class SelfOut(BaseModel):
    id: int
    display_name: str
    role: ParticipantRole


class PersonOut(BaseModel):
    id: int
    display_name: str
    role: ParticipantRole
    audio: bool
    video: bool
    screen: bool
    hand_raised: bool


class Welcome(BaseModel):
    type: Literal["welcome"] = "welcome"
    self: SelfOut
    participants: list[PersonOut]  # everyone else already in the meeting


class ParticipantJoined(BaseModel):
    type: Literal["participant_joined"] = "participant_joined"
    participant: PersonOut


class ParticipantLeft(BaseModel):
    type: Literal["participant_left"] = "participant_left"
    participant_id: int


class MediaStateOut(BaseModel):
    type: Literal["media_state"] = "media_state"
    participant_id: int
    audio: bool
    video: bool
    screen: bool


class SignalOut(BaseModel):
    type: Literal["signal"] = "signal"
    # `from` is a Python keyword, so the field is from_ and is sent as "from".
    from_: int = Field(serialization_alias="from")
    data: SignalData


class ChatSender(BaseModel):
    id: int
    display_name: str


class ChatOut(BaseModel):
    type: Literal["chat"] = "chat"
    id: int
    from_: ChatSender = Field(serialization_alias="from")  # sent as "from", like SignalOut
    body: str
    sent_at: datetime  # UTC


class ReactionOut(BaseModel):
    """Someone reacted. Clients show it on that person's tile for a few seconds."""

    type: Literal["reaction"] = "reaction"
    participant_id: int
    emoji: Reaction


class HandOut(BaseModel):
    """Someone raised or lowered their hand (or the host lowered it for them)."""

    type: Literal["hand"] = "hand"
    participant_id: int
    raised: bool


class ForceMute(BaseModel):
    """The host muted us: the client mutes its mic and reports its new media_state."""

    type: Literal["force_mute"] = "force_mute"


class Removed(BaseModel):
    """The host removed us. The server closes the socket with CLOSE_REMOVED right after."""

    type: Literal["removed"] = "removed"


class MeetingEnded(BaseModel):
    type: Literal["meeting_ended"] = "meeting_ended"


class ErrorOut(BaseModel):
    type: Literal["error"] = "error"
    message: str


ServerMessage = (
    Welcome
    | ParticipantJoined
    | ParticipantLeft
    | MediaStateOut
    | SignalOut
    | ChatOut
    | ReactionOut
    | HandOut
    | ForceMute
    | Removed
    | MeetingEnded
    | ErrorOut
)
