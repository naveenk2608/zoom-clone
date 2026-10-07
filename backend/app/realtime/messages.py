"""The JSON messages sent over the meeting WebSocket. frontend/src/types/ws.ts mirrors them.

Every message has a `type` field. Client messages are parsed as a union that
Pydantic tells apart by `type`.
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, JsonValue, StringConstraints, TypeAdapter

from app.models.participant import ParticipantRole
from app.services.errors import Gone, NotAllowed, ServiceError

# Close codes the server uses when it refuses or ends a connection.
CLOSE_INVALID_TOKEN = 4001
CLOSE_REMOVED = 4003
CLOSE_ENDED = 4010


def close_code_for(error: ServiceError) -> int:
    """The close code for the reason admission was refused."""
    if isinstance(error, NotAllowed):
        return CLOSE_REMOVED
    if isinstance(error, Gone):
        return CLOSE_ENDED
    return CLOSE_INVALID_TOKEN


# ---- client to server ----


class MediaStateIn(BaseModel):
    type: Literal["media_state"]
    audio: bool
    video: bool  # the camera
    screen: bool = False  # sharing the screen, which then goes out in place of the camera


class LeaveIn(BaseModel):
    type: Literal["leave"]


class HostEndIn(BaseModel):
    type: Literal["host_end"]


class HostMuteAllIn(BaseModel):
    type: Literal["host_mute_all"]


class HostMuteIn(BaseModel):
    type: Literal["host_mute"]
    participant_id: int


class HostRemoveIn(BaseModel):
    type: Literal["host_remove"]
    participant_id: int


# Matches the CHECK on chat_messages.body. Surrounding spaces are trimmed first.
ChatBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class ChatIn(BaseModel):
    type: Literal["chat"]
    body: ChatBody


# A WebRTC offer, answer or ICE candidate. The server only passes it on, so it
# is kept as plain JSON rather than modelled field by field.
SignalData = dict[str, JsonValue]


class SignalIn(BaseModel):
    type: Literal["signal"]
    to: int  # the participant id it is for
    data: SignalData


ClientMessage = Annotated[
    MediaStateIn
    | LeaveIn
    | SignalIn
    | ChatIn
    | HostEndIn
    | HostMuteAllIn
    | HostMuteIn
    | HostRemoveIn,
    Field(discriminator="type"),
]
client_message_adapter: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)

# Message types only the host may send.
HOST_ONLY = {"host_end", "host_mute_all", "host_mute", "host_remove"}


# ---- server to client ----


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
    | ForceMute
    | Removed
    | MeetingEnded
    | ErrorOut
)
