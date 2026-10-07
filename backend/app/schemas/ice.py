from pydantic import BaseModel


class IceServerOut(BaseModel):
    """One entry of RTCPeerConnection's `iceServers`. STUN servers have no username or credential."""

    urls: list[str]
    username: str | None = None
    credential: str | None = None
