from fastapi import APIRouter

from app.config import settings
from app.schemas.ice import IceServerOut
from app.services.ice_servers import ice_servers
from app.utils.time import utc_now

router = APIRouter(tags=["webrtc"])


# STUN entries have no username or credential, so those fields are left out
# rather than sent as null.
@router.get("/ice-servers", response_model_exclude_none=True)
def get_ice_servers() -> list[IceServerOut]:
    """The ICE servers for RTCPeerConnection, with TURN credentials valid for 24 hours."""
    return ice_servers(settings.turn_host, settings.turn_secret, utc_now())
