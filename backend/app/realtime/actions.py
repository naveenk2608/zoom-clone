"""What happens when someone joins or leaves a meeting over the WebSocket.

What a participant sends on to others (signals, mic and camera state, chat)
is in relays.py, and the host's commands, such as ending the meeting, are in
host_actions.py.

Each step takes the meeting's lock, so a reconnect cannot race a leave, the
grace timer or "End meeting for all". Database calls are synchronous, so they
run in a worker thread to keep the event loop free.
"""

import asyncio

from fastapi import WebSocket
from sqlalchemy.orm import Session, sessionmaker
from starlette.concurrency import run_in_threadpool

from app.realtime.connection_manager import Connection, ConnectionManager
from app.realtime.messages import CLOSE_INVALID_TOKEN
from app.realtime.server_messages import (
    ErrorOut,
    HandOut,
    MediaStateOut,
    ParticipantJoined,
    ParticipantLeft,
    SelfOut,
    Welcome,
)
from app.services import presence

# When the last connection drops (a refresh, or lost network), wait this long
# for someone to come back before ending the session.
GRACE_SECONDS = 30

SessionFactory = sessionmaker[Session]

manager = ConnectionManager()


def admit_member(factory: SessionFactory, code: str, token: str) -> presence.RoomMember:
    with factory() as db:
        return presence.admit(db, code, token)


def mark_left(factory: SessionFactory, participant_id: int) -> None:
    with factory() as db:
        presence.mark_left(db, participant_id)


def end_session(factory: SessionFactory, session_id: int) -> None:
    with factory() as db:
        presence.end_live_session(db, session_id)


async def finish_session(factory: SessionFactory, session_id: int) -> None:
    """Ends the session in the database and forgets what the host allowed in it."""
    await run_in_threadpool(end_session, factory, session_id)
    manager.forget_permissions(session_id)


async def enter(
    factory: SessionFactory, websocket: WebSocket, code: str, token: str, audio: bool, video: bool
) -> Connection:
    """Admits the participant, tells them who is here and tells the others they arrived.

    Raises a ServiceError when the token is refused; the caller closes the socket.
    """
    async with manager.lock(code):
        member = await run_in_threadpool(admit_member, factory, code, token)
        connection = Connection(
            websocket=websocket,
            meeting_code=code,
            session_id=member.session_id,
            participant_id=member.participant_id,
            display_name=member.display_name,
            role=member.role,
            audio=audio,
            video=video,
        )
        permissions = manager.permissions(member.session_id)
        permissions.admit(connection)  # muted or camera off if the host doesn't allow them
        replaced = manager.add(connection)
        manager.cancel_grace(member.session_id)  # someone is here, so do not end the session

        others = manager.others(connection)
        me = SelfOut(
            id=member.participant_id,
            display_name=member.display_name,
            role=member.role,
            audio=connection.audio,
            video=connection.video,
        )
        welcome = Welcome(
            self=me,
            participants=[other.to_person() for other in others],
            permissions=permissions.view_for(connection),
        )
        await manager.send(connection, welcome)
        if replaced is None:
            await manager.broadcast(others, ParticipantJoined(participant=connection.to_person()))
        else:
            # A refresh: the others already list this person, so only the flags may have changed.
            await manager.broadcast(others, media_state_message(connection))
            if replaced.hand_raised:
                # A new connection starts with its hand down, as rejoining does in Zoom.
                lowered = HandOut(participant_id=connection.participant_id, raised=False)
                await manager.broadcast(others, lowered)
            await manager.close(replaced, CLOSE_INVALID_TOKEN)
        return connection


def media_state_message(connection: Connection) -> MediaStateOut:
    return MediaStateOut(
        participant_id=connection.participant_id,
        audio=connection.audio,
        video=connection.video,
        screen=connection.screen,
    )


async def reject(connection: Connection, message: str) -> None:
    await manager.send(connection, ErrorOut(message=message))


async def leave(factory: SessionFactory, connection: Connection, *, dropped: bool) -> None:
    """Takes a participant out of the meeting.

    `dropped` is False when they clicked Leave: if they were the last person,
    the session ends at once. It is True when the connection was lost: the
    session then ends only after a grace period with nobody back.
    """
    async with manager.lock(connection.meeting_code):
        if not manager.remove(connection):
            return  # replaced by a newer connection, or the meeting already ended
        await run_in_threadpool(mark_left, factory, connection.participant_id)
        left = ParticipantLeft(participant_id=connection.participant_id)
        await manager.broadcast(manager.others(connection), left)

        if not manager.is_empty(connection.session_id):
            return
        if dropped:
            task = asyncio.create_task(
                end_after_grace(factory, connection.meeting_code, connection.session_id)
            )
            manager.start_grace(connection.session_id, task)
        else:
            await finish_session(factory, connection.session_id)


async def end_after_grace(factory: SessionFactory, code: str, session_id: int) -> None:
    await asyncio.sleep(GRACE_SECONDS)
    async with manager.lock(code):
        manager.forget_grace(session_id)
        if manager.is_empty(session_id):  # nobody came back
            await finish_session(factory, session_id)
