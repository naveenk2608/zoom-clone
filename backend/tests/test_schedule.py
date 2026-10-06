from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.utils.time import utc_now
from tests.factories import add_scheduled_meeting, add_user


def schedule_body(**changes: object) -> dict[str, object]:
    """A valid Schedule form for tomorrow, with any fields replaced."""
    tomorrow = (utc_now() + timedelta(days=1)).date()
    body: dict[str, object] = {
        "title": "Design Review",
        "description": "Mockups for the new dashboard",
        "start_date": tomorrow.isoformat(),
        "start_time": "10:30",
        "timezone": "UTC",
        "duration_minutes": 60,
        "mute_on_entry": False,
        "host_video_on": True,
        "participant_video_on": True,
    }
    body.update(changes)
    return body


def test_scheduled_meeting_is_saved_and_listed_in_upcoming(client: TestClient) -> None:
    response = client.post("/api/meetings", json=schedule_body())

    assert response.status_code == 201
    meeting = response.json()
    assert meeting["status"] == "scheduled"
    assert meeting["title"] == "Design Review"
    assert meeting["invite_link"].endswith(f"/j/{meeting['meeting_code']}")
    upcoming = client.get("/api/meetings/upcoming").json()
    assert [item["meeting_code"] for item in upcoming] == [meeting["meeting_code"]]


def test_a_start_in_the_past_is_rejected(client: TestClient) -> None:
    yesterday = (utc_now() - timedelta(days=1)).date()

    response = client.post("/api/meetings", json=schedule_body(start_date=yesterday.isoformat()))

    assert response.status_code == 422
    assert response.json() == {"detail": "The start time can't be in the past."}


def test_an_unknown_time_zone_is_rejected(client: TestClient) -> None:
    response = client.post("/api/meetings", json=schedule_body(timezone="Mars/Olympus"))

    assert response.status_code == 422


@pytest.mark.parametrize(("minutes", "status"), [(14, 422), (15, 201), (1440, 201), (1441, 422)])
def test_duration_is_15_minutes_to_24_hours(client: TestClient, minutes: int, status: int) -> None:
    response = client.post("/api/meetings", json=schedule_body(duration_minutes=minutes))

    assert response.status_code == status


@pytest.mark.parametrize(("month", "utc_hour"), [(1, 14), (7, 13)])
def test_local_time_is_converted_with_daylight_saving(
    client: TestClient, month: int, utc_hour: int
) -> None:
    """9:00 in New York is 14:00 UTC in winter (EST) but 13:00 UTC in summer (EDT)."""
    day = f"{utc_now().year + 1}-{month:02d}-15"
    body = schedule_body(start_date=day, start_time="09:00", timezone="America/New_York")

    meeting = client.post("/api/meetings", json=body).json()

    assert meeting["scheduled_start"] == f"{day}T{utc_hour}:00:00Z"
    # The edit form gets the wall-clock time back, in the meeting's own zone.
    assert meeting["start_date"] == day
    assert meeting["start_time"] == "09:00"


def test_the_title_is_trimmed_and_cannot_be_blank(client: TestClient) -> None:
    trimmed = client.post("/api/meetings", json=schedule_body(title="  Standup  "))
    blank = client.post("/api/meetings", json=schedule_body(title="   "))

    assert trimmed.json()["title"] == "Standup"
    assert blank.status_code == 422


def test_the_host_can_edit_a_meeting(client: TestClient) -> None:
    code = client.post("/api/meetings", json=schedule_body()).json()["meeting_code"]

    response = client.put(
        f"/api/meetings/{code}", json=schedule_body(title="Renamed", start_time="15:00")
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Renamed"
    assert response.json()["start_time"] == "15:00"


def test_only_the_host_can_edit(client: TestClient, db: Session) -> None:
    priya = add_user(db, "Priya Sharma")
    meeting = add_scheduled_meeting(db, priya, utc_now() + timedelta(days=1))

    response = client.put(f"/api/meetings/{meeting.meeting_code}", json=schedule_body())

    assert response.status_code == 403


def test_cancelled_and_instant_meetings_cannot_be_edited(client: TestClient) -> None:
    scheduled = client.post("/api/meetings", json=schedule_body()).json()["meeting_code"]
    client.delete(f"/api/meetings/{scheduled}")
    instant = client.post("/api/meetings/instant").json()["meeting"]["meeting_code"]

    assert client.put(f"/api/meetings/{scheduled}", json=schedule_body()).status_code == 409
    assert client.put(f"/api/meetings/{instant}", json=schedule_body()).status_code == 409
