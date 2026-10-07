"""The ICE servers endpoint: Google's STUN, and the TURN relay with short-lived credentials."""

import base64
import hashlib
import hmac
import re
import time
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.config import settings
from app.services.ice_servers import turn_credentials


def test_turn_credentials_use_the_turn_rest_api_format() -> None:
    now = datetime.fromtimestamp(1_700_000_000, tz=UTC)

    username, credential = turn_credentials("openrelayprojectsecret", now)

    # Expires 24 hours later. The credential is base64(HMAC-SHA1(secret, username)),
    # worked out separately for this username and secret.
    assert username == "1700086400:zoomclone"
    assert credential == "4HewqKoQhvcc8eIJnGXm/NNlmA4="


def test_the_endpoint_returns_stun_and_turn_with_credentials(client: TestClient) -> None:
    response = client.get("/api/ice-servers")

    assert response.status_code == 200
    stun, turn = response.json()
    assert stun == {"urls": ["stun:stun.l.google.com:19302"]}  # no null username or credential

    host = settings.turn_host
    assert turn["urls"] == [
        f"turn:{host}:80",
        f"turn:{host}:80?transport=tcp",
        f"turn:{host}:443",
        f"turns:{host}:443?transport=tcp",
    ]
    match = re.fullmatch(r"(\d+):zoomclone", turn["username"])
    assert match is not None
    assert abs(int(match.group(1)) - (time.time() + 24 * 3600)) < 60  # about a day from now
    expected = hmac.new(settings.turn_secret.encode(), turn["username"].encode(), hashlib.sha1)
    assert turn["credential"] == base64.b64encode(expected.digest()).decode()
