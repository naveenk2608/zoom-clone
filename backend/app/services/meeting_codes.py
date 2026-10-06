"""Meeting codes: 11 random digits, the first of which is never 0."""

import re
import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Meeting

MAX_ATTEMPTS = 5
CODE_PATTERN = re.compile(r"[0-9]{11}")


def generate_meeting_code() -> str:
    first_digit = 1 + secrets.randbelow(9)  # 1 to 9
    other_digits = secrets.randbelow(10**10)  # 0 to 9,999,999,999
    return f"{first_digit}{other_digits:010d}"  # pad the rest to 10 digits


def is_valid_meeting_code(code: str) -> bool:
    return CODE_PATTERN.fullmatch(code) is not None


def is_code_taken(db: Session, code: str) -> bool:
    return db.scalar(select(Meeting.id).where(Meeting.meeting_code == code)) is not None


def add_with_unique_code(db: Session, meeting: Meeting) -> None:
    """Gives the meeting an unused code and INSERTs it (a flush; the caller commits).

    The check catches almost every collision. The UNIQUE constraint is the final
    guard, for the rare case where another request takes the same code between
    our check and our INSERT. A collision rolls the transaction back, so call this
    before any other write in the transaction.
    """
    for _ in range(MAX_ATTEMPTS):
        code = generate_meeting_code()
        if is_code_taken(db, code):
            continue
        meeting.meeting_code = code
        db.add(meeting)
        try:
            db.flush()
            return
        except IntegrityError as error:
            db.rollback()
            if "meeting_code" not in str(error.orig):
                raise
    raise RuntimeError(f"No unused meeting code after {MAX_ATTEMPTS} attempts")
