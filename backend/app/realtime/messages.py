"""The JSON messages sent over the meeting WebSocket. frontend/src/types/ws.ts mirrors them.

Every message has a `type` field. Client messages are parsed as a union that
Pydantic tells apart by `type`.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter

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
    video: bool


class LeaveIn(BaseModel):
    type: Literal["leave"]


class HostEndIn(BaseModel):
    type: Literal["host_end"]


ClientMessage = Annotated[MediaStateIn | LeaveIn | HostEndIn, Field(discriminator="type")]
client_message_adapter: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)

# Message types only the host may send.
HOST_ONLY = {"host_end"}


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


class MeetingEnded(BaseModel):
    type: Literal["meeting_ended"] = "meeting_ended"


class ErrorOut(BaseModel):
    type: Literal["error"] = "error"
    message: str


ServerMessage = (
    Welcome | ParticipantJoined | ParticipantLeft | MediaStateOut | MeetingEnded | ErrorOut
)
