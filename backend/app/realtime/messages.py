"""The JSON messages clients send over the meeting WebSocket, and its close codes.

server_messages.py has the ones the server sends. frontend/src/types/ws.ts
mirrors both.

Every message has a `type` field. Client messages are parsed as a union that
Pydantic tells apart by `type`.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, JsonValue, StringConstraints, TypeAdapter

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
    # The dialog's "Allow participants to unmute themselves". Left out: unchanged.
    allow_self_unmute: bool | None = None


class HostSetPermissionsIn(BaseModel):
    """Host tools → "Allow participants to". A setting left out stays as it is."""

    type: Literal["host_set_permissions"]
    allow_self_unmute: bool | None = None
    allow_self_video: bool | None = None


class HostMuteIn(BaseModel):
    type: Literal["host_mute"]
    participant_id: int


class HostRemoveIn(BaseModel):
    type: Literal["host_remove"]
    participant_id: int


class HostAskUnmuteIn(BaseModel):
    type: Literal["host_ask_unmute"]
    participant_id: int


class HostStopVideoIn(BaseModel):
    type: Literal["host_stop_video"]
    participant_id: int


class HostAskStartVideoIn(BaseModel):
    type: Literal["host_ask_start_video"]
    participant_id: int


# Matches the CHECK on chat_messages.body. Surrounding spaces are trimmed first.
ChatBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class ChatIn(BaseModel):
    type: Literal["chat"]
    body: ChatBody


# The React palette, as in Zoom. Anything else is refused. The heart is two
# code points (U+2764 U+FE0F); frontend/src/types/ws.ts has the same list.
Reaction = Literal["👏", "👍", "❤️", "😂", "😮", "🎉"]


class ReactionIn(BaseModel):
    type: Literal["reaction"]
    emoji: Reaction


class RaiseHandIn(BaseModel):
    type: Literal["raise_hand"]


class LowerHandIn(BaseModel):
    type: Literal["lower_hand"]
    # Someone else's hand, which only the host may lower. Left out: your own.
    participant_id: int | None = None


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
    | ReactionIn
    | RaiseHandIn
    | LowerHandIn
    | HostEndIn
    | HostMuteAllIn
    | HostMuteIn
    | HostRemoveIn
    | HostAskUnmuteIn
    | HostSetPermissionsIn
    | HostStopVideoIn
    | HostAskStartVideoIn,
    Field(discriminator="type"),
]
client_message_adapter: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)

# Message types only the host may send.
HOST_ONLY = {
    "host_end",
    "host_mute_all",
    "host_mute",
    "host_remove",
    "host_ask_unmute",
    "host_set_permissions",
    "host_stop_video",
    "host_ask_start_video",
}
