"""Request dependencies shared by the routers."""

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Meeting, User
from app.services.meetings import get_meeting_by_code

DbSession = Annotated[Session, Depends(get_db)]

# This demo has no sign-in: the seeded default user is always "logged in".
# Only get_current_user knows that, so adding real auth means replacing just it.
DEFAULT_USER_EMAIL = "alex.morgan@example.com"


def get_current_user(db: DbSession) -> User:
    user = db.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
    if user is None:
        raise RuntimeError("The default user is missing; the seed creates it at startup.")
    return user


def get_meeting_from_path(code: str, db: DbSession) -> Meeting:
    """Turns the {code} in the URL into a Meeting, or a 404."""
    return get_meeting_by_code(db, code)


CurrentUser = Annotated[User, Depends(get_current_user)]
MeetingByCode = Annotated[Meeting, Depends(get_meeting_from_path)]
# The key the browser got when it created the meeting (services/host_keys.py). Optional:
# meetings without a key don't need it, and a missing one is refused with the same 403.
HostKey = Annotated[str | None, Header(alias="X-Host-Key")]
