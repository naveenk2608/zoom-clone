"""The meeting WebSocket: /ws/meetings/{code}?token=...&audio=0|1&video=0|1"""

from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_session_factory
from app.realtime import actions
from app.realtime.connection_manager import Connection
from app.realtime.messages import HOST_ONLY, client_message_adapter, close_code_for
from app.services.errors import ServiceError

router = APIRouter()

SessionFactory = Annotated[sessionmaker[Session], Depends(get_session_factory)]

NORMAL_CLOSE = 1000


@router.websocket("/ws/meetings/{code}")
async def meeting_socket(
    websocket: WebSocket,
    code: str,
    factory: SessionFactory,
    token: str = "",
    audio: bool = True,
    video: bool = True,
) -> None:
    # Accept first and check afterwards: a browser cannot read the close code
    # of a refused handshake, but it can read one sent on an open socket.
    await websocket.accept()
    try:
        connection = await actions.enter(factory, websocket, code, token, audio, video)
    except ServiceError as error:
        await websocket.close(code=close_code_for(error))
        return

    try:
        await receive_messages(factory, connection)
    finally:
        # Runs on a dropped connection too. It does nothing if the participant
        # already left or the meeting ended.
        await actions.leave(factory, connection, dropped=True)


async def receive_messages(factory: actions.SessionFactory, connection: Connection) -> None:
    while True:
        try:
            text = await connection.websocket.receive_text()
        except WebSocketDisconnect:
            return

        try:
            message = client_message_adapter.validate_json(text)
        except ValidationError:
            await actions.reject(connection, "That message was not understood.")
            continue

        if message.type in HOST_ONLY and connection.role != "host":
            await actions.reject(connection, "Only the host can do that.")
        elif message.type == "media_state":
            await actions.relay_media_state(connection, message.audio, message.video)
        elif message.type == "leave":
            await actions.leave(factory, connection, dropped=False)
            await actions.manager.close(connection, NORMAL_CLOSE)
            return
        elif message.type == "host_end":
            await actions.end_for_all(factory, connection)
            return
