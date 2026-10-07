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
    # The mic and camera state we were let in with. Turned off when the host
    # doesn't allow turning them on (or after Mute All); the client follows.
    audio: bool
    video: bool


class PermissionsOut(BaseModel):
    """The host's "Allow participants to" settings, and what this one person may do."""

    allow_self_unmute: bool
    allow_self_video: bool
    can_unmute: bool  # always for the host; otherwise the setting, or the host asked them to
    can_start_video: bool


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
    permissions: PermissionsOut


class PermissionsUpdate(BaseModel):
    """What someone may do changed: the host changed a setting, or asked or muted them."""

    type: Literal["permissions"] = "permissions"
    permissions: PermissionsOut


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


class AskUnmute(BaseModel):
    """The host asks us to unmute. The client asks the person; only they can turn the mic on."""

    type: Literal["ask_unmute"] = "ask_unmute"


class ForceVideoOff(BaseModel):
    """The host stopped our video: the client turns its camera off, like force_mute."""

    type: Literal["force_video_off"] = "force_video_off"


class AskStartVideo(BaseModel):
    """The host asks us to start our video. Only we can: the client asks the person."""

    type: Literal["ask_start_video"] = "ask_start_video"


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
    | PermissionsUpdate
    | ParticipantJoined
    | ParticipantLeft
    | MediaStateOut
    | SignalOut
    | ChatOut
    | ReactionOut
    | HandOut
    | ForceMute
    | AskUnmute
    | ForceVideoOff
    | AskStartVideo
    | Removed
    | MeetingEnded
    | ErrorOut
)
