import pytest
from sqlalchemy.orm import Session

from app.models import Meeting, User
from app.services import meeting_codes
from app.services.meeting_codes import add_with_unique_code, generate_meeting_code, is_valid_meeting_code


def test_codes_have_11_digits_and_never_start_with_0() -> None:
    for _ in range(1000):
        code = generate_meeting_code()
        assert len(code) == 11
        assert code.isdigit()
        assert code[0] != "0"


@pytest.mark.parametrize(
    ("code", "valid"),
    [
        ("12345678901", True),
        ("1234567890", False),  # 10 digits
        ("123456789012", False),  # 12 digits
        ("123 4567 890", False),
        ("1234567890a", False),
        ("１２３４５６７８９０１", False),  # full-width digits are not ASCII digits
    ],
)
def test_code_validation(code: str, valid: bool) -> None:
    assert is_valid_meeting_code(code) is valid


def add_taken_meeting(db: Session, host: User) -> None:
    db.add(Meeting(meeting_code="12345678901", host=host, meeting_type="instant", title="Taken"))
    db.commit()


def test_a_taken_code_is_skipped(db: Session, alex: User, monkeypatch: pytest.MonkeyPatch) -> None:
    add_taken_meeting(db, alex)
    codes = iter(["12345678901", "22222222222"])
    monkeypatch.setattr(meeting_codes, "generate_meeting_code", lambda: next(codes))

    meeting = Meeting(host=alex, meeting_type="instant", title="New")
    add_with_unique_code(db, meeting)
    db.commit()

    assert meeting.meeting_code == "22222222222"


def test_unique_constraint_collision_is_retried(
    db: Session, alex: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Another request takes the code between our check and our INSERT."""
    add_taken_meeting(db, alex)
    codes = iter(["12345678901", "22222222222"])
    monkeypatch.setattr(meeting_codes, "generate_meeting_code", lambda: next(codes))
    monkeypatch.setattr(meeting_codes, "is_code_taken", lambda db, code: False)

    meeting = Meeting(host=alex, meeting_type="instant", title="New")
    add_with_unique_code(db, meeting)
    db.commit()

    assert meeting.meeting_code == "22222222222"
