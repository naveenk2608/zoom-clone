"""Host keys: how the browser that created a meeting proves it owns it.

There are no accounts, so every visitor is the same default user. When a
meeting is created, the server makes a random key and returns it once; the
browser keeps it and sends it back in the X-Host-Key header on Start, Edit and
Delete. Only a SHA-256 hash of the key is stored, so the database alone can't
be used to act as a host.
"""

import hashlib
import secrets

from app.models import Meeting
from app.services.errors import NotAllowed

ONLY_THE_HOST = "Only the host can do this."


def issue_host_key(meeting: Meeting) -> str:
    """Gives the meeting a new key and returns it. Only its hash is kept."""
    key = secrets.token_urlsafe(32)
    meeting.host_key_hash = hash_host_key(key)
    return key


def hash_host_key(key: str) -> str:
    # A plain hash is enough: the key is 32 random bytes, so it can't be guessed
    # from the hash the way a password could.
    return hashlib.sha256(key.encode()).hexdigest()


def require_host_key(meeting: Meeting, key: str | None) -> None:
    """Refuses a missing or wrong key. Meetings without one (the demo data) are open to anyone."""
    if meeting.host_key_hash is None:
        return
    # compare_digest takes the same time wherever the strings differ, so timing
    # reveals nothing about the stored hash.
    if key is None or not secrets.compare_digest(hash_host_key(key), meeting.host_key_hash):
        raise NotAllowed(ONLY_THE_HOST)
