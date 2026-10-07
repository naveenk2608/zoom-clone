"""Helpers for WebSocket tests: people created through the REST API, and their sockets."""

import asyncio
from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.testclient import WebSocketTestSession

from app.models import MeetingSession


class Person:
    """A participant created through the REST API, with what is needed to connect."""

    def __init__(self, code: str, participant_id: int, token: str) -> None:
        self.code = code
        self.participant_id = participant_id
        self.token = token

    def url(self, audio: int, video: int) -> str:
        return f"/ws/meetings/{self.code}?token={self.token}&audio={audio}&video={video}"


def start_meeting(client: TestClient) -> Person:
    joined = client.post("/api/meetings/instant").json()
    return Person(
        joined["meeting"]["meeting_code"], joined["participant"]["id"], joined["join_token"]
    )


def add_guest(client: TestClient, code: str, name: str = "Sam") -> Person:
    joined = client.post(f"/api/meetings/{code}/join", json={"display_name": name}).json()
    return Person(code, joined["participant"]["id"], joined["join_token"])


@contextmanager
def connect(
    client: TestClient, person: Person, audio: int = 1, video: int = 1
) -> Iterator[WebSocketTestSession]:
    with client.websocket_connect(person.url(audio, video)) as socket:
        yield socket


def close_code(socket: WebSocketTestSession) -> int:
    with pytest.raises(WebSocketDisconnect) as info:
        socket.receive_json()
    return info.value.code


def wait(client: TestClient, seconds: float) -> None:
    """Lets the server run for a while, on the same event loop as the sockets."""
    assert client.portal is not None
    client.portal.call(asyncio.sleep, seconds)


def only_session(db: Session) -> MeetingSession:
    db.expire_all()
    return db.query(MeetingSession).one()
