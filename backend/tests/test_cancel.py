from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting, add_user


def test_the_host_cancels_a_meeting(client: TestClient, db: Session, alex: User) -> None:
    code = add_scheduled_meeting(db, alex, utc_now() + timedelta(days=1)).meeting_code

    response = client.delete(f"/api/meetings/{code}")

    assert response.status_code == 204
    assert response.content == b""
    # It's a soft delete: the meeting is still there, marked cancelled.
    assert client.get(f"/api/meetings/{code}").json()["status"] == "cancelled"
    assert client.get("/api/meetings/upcoming").json() == []


def test_cancelling_twice_is_harmless(client: TestClient, db: Session, alex: User) -> None:
    code = add_scheduled_meeting(db, alex, utc_now() + timedelta(days=1)).meeting_code

    first = client.delete(f"/api/meetings/{code}")
    second = client.delete(f"/api/meetings/{code}")

    assert (first.status_code, second.status_code) == (204, 204)


def test_only_the_host_can_cancel(client: TestClient, db: Session) -> None:
    priya = add_user(db, "Priya Sharma")
    code = add_scheduled_meeting(db, priya, utc_now() + timedelta(days=1)).meeting_code

    response = client.delete(f"/api/meetings/{code}")

    assert response.status_code == 403


def test_a_live_meeting_cannot_be_cancelled(client: TestClient) -> None:
    created = client.post("/api/meetings/instant").json()
    code = created["meeting"]["meeting_code"]

    response = client.delete(f"/api/meetings/{code}", headers={"X-Host-Key": created["host_key"]})

    assert response.status_code == 409
