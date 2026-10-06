from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models.participant import ParticipantRole
from app.schemas.meeting import MeetingOut

DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class JoinIn(BaseModel):
    display_name: DisplayName


class ParticipantOut(BaseModel):
    id: int
    display_name: str
    role: ParticipantRole


class JoinOut(BaseModel):
    meeting: MeetingOut
    participant: ParticipantOut
    join_token: str  # sent with the WebSocket connection to prove who this is
