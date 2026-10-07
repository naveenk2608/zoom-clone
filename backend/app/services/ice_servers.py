"""The STUN and TURN servers the browsers use to connect to each other.

STUN lets a browser find its public address, which is enough on most home
networks. Behind carrier NAT or a strict firewall a direct connection fails,
and the media goes through a TURN relay instead.

TURN credentials use the standard "TURN REST API" scheme, so the secret never
reaches the browser: the username is "<expiry unix time>:<label>", and the
password is base64(HMAC-SHA1(secret, username)). The TURN server knows the
secret, recomputes the password, and refuses the username once it expires.
"""

import base64
import hashlib
import hmac
from datetime import datetime, timedelta

from app.schemas.ice import IceServerOut

STUN_URL = "stun:stun.l.google.com:19302"
CREDENTIAL_LIFETIME = timedelta(hours=24)
USERNAME_LABEL = "zoomclone"


def turn_credentials(secret: str, now: datetime) -> tuple[str, str]:
    """A username and password for the TURN server, valid for CREDENTIAL_LIFETIME from `now`."""
    expires_at = int((now + CREDENTIAL_LIFETIME).timestamp())
    username = f"{expires_at}:{USERNAME_LABEL}"
    digest = hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()
    return username, base64.b64encode(digest).decode()


def ice_servers(turn_host: str, turn_secret: str, now: datetime) -> list[IceServerOut]:
    """Google's STUN, and the TURN relay over UDP and TCP on port 80, and TLS on 443.

    The extra ports get through firewalls that only allow web traffic.
    """
    username, credential = turn_credentials(turn_secret, now)
    turn = IceServerOut(
        urls=[
            f"turn:{turn_host}:80",
            f"turn:{turn_host}:80?transport=tcp",
            f"turn:{turn_host}:443",
            f"turns:{turn_host}:443?transport=tcp",
        ],
        username=username,
        credential=credential,
    )
    return [IceServerOut(urls=[STUN_URL]), turn]
