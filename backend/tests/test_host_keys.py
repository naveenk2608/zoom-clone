"""Host keys: the browser that created a meeting is the only one that can start, edit or delete it."""

import hashlib
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Meeting, User
from app.seed import seed_if_empty
from app.services.host_keys import ONLY_THE_HOST
from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting
from tests.test_schedule import schedule_body

# What each action answers when it is allowed.
ALLOWED = {"start": 200, "edit": 200, "delete": 204}


def act(client: TestClient, action: str, code: str, key: str | None) -> Response:
    headers = {} if key is None else {"X-Host-Key": key}
    url = f"/api/meetings/{code}"
    if action == "start":
        return client.post(f"{url}/start", headers=headers)
    if action == "edit":
        return client.put(url, json=schedule_body(), headers=headers)
    return client.delete(url, headers=headers)


def schedule(client: TestClient) -> tuple[str, str]:
    """A meeting scheduled through the API: its code and its host key."""
    created = client.post("/api/meetings", json=schedule_body()).json()
    return created["meeting_code"], created["host_key"]


def test_the_key_is_returned_once_and_only_its_hash_is_stored(
    client: TestClient, db: Session
) -> None:
    code, key = schedule(client)
    instant = client.post("/api/meetings/instant").json()

    meeting = db.scalar(select(Meeting).where(Meeting.meeting_code == code))
    assert meeting is not None
    assert meeting.host_key_hash == hashlib.sha256(key.encode()).hexdigest()
    assert len(key) >= 32
    assert len(instant["host_key"]) >= 32
    shown = client.get(f"/api/meetings/{code}").json()
    assert "host_key" not in shown
    assert shown["has_host_key"] is True


@pytest.mark.parametrize("action", ALLOWED)
def test_the_right_key_is_accepted(client: TestClient, action: str) -> None:
    code, key = schedule(client)

    response = act(client, action, code, key)

    assert response.status_code == ALLOWED[action]


@pytest.mark.parametrize("action", ALLOWED)
def test_a_wrong_key_is_refused(client: TestClient, action: str) -> None:
    code, _ = schedule(client)
    _, other_key = schedule(client)  # a real key, but for another meeting

    response = act(client, action, code, other_key)

    assert response.status_code == 403
    assert response.json() == {"detail": ONLY_THE_HOST}


@pytest.mark.parametrize("action", ALLOWED)
def test_a_missing_key_is_refused(client: TestClient, action: str) -> None:
    code, _ = schedule(client)

    response = act(client, action, code, None)

    assert response.status_code == 403
    assert response.json() == {"detail": ONLY_THE_HOST}


@pytest.mark.parametrize("action", ALLOWED)
def test_a_meeting_without_a_key_is_open_to_anyone(
    client: TestClient, db: Session, alex: User, action: str
) -> None:
    """Like the seeded meetings, which were made before host keys."""
    code = add_scheduled_meeting(db, alex, utc_now() + timedelta(days=1)).meeting_code
    assert client.get(f"/api/meetings/{code}").json()["has_host_key"] is False

    response = act(client, action, code, None)

    assert response.status_code == ALLOWED[action]


def test_seeded_meetings_have_no_key(db: Session) -> None:
    seed_if_empty(db)

    hashes = db.scalars(select(Meeting.host_key_hash)).all()

    assert len(hashes) > 0
    assert all(value is None for value in hashes)


def test_the_key_is_checked_before_the_one_host_rule(client: TestClient) -> None:
    created = client.post("/api/meetings/instant").json()
    url = f"/api/meetings/{created['meeting']['meeting_code']}/start"

    without_key = client.post(url)
    with_key = client.post(url, headers={"X-Host-Key": created["host_key"]})

    assert without_key.status_code == 403
    assert with_key.status_code == 409  # the host who created it is still in the meeting
