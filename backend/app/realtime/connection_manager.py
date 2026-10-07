"""Who is connected right now, and what the host lets them do.

This lives only in memory, so the backend runs as one instance.
"""

import asyncio
from dataclasses import dataclass, field

from fastapi import WebSocket, WebSocketDisconnect

from app.models.participant import ParticipantRole
from app.realtime.server_messages import PermissionsOut, PersonOut, ServerMessage


@dataclass
class Connection:
    """One participant's open WebSocket: their mic, camera, screen share and raised hand."""

    websocket: WebSocket
    meeting_code: str
    session_id: int
    participant_id: int
    display_name: str
    role: ParticipantRole
    audio: bool
    video: bool
    screen: bool = False  # a new connection is never sharing yet
    hand_raised: bool = False  # nor has its hand up

    def to_person(self) -> PersonOut:
        return PersonOut(
            id=self.participant_id,
            display_name=self.display_name,
            role=self.role,
            audio=self.audio,
            video=self.video,
            screen=self.screen,
            hand_raised=self.hand_raised,
        )


@dataclass
class SessionPermissions:
    """What attendees may turn on themselves in one live session (Zoom's "Allow participants to").

    The host is never restricted. When the host asks one person to unmute (or
    to start their video), that person may do it even while the setting is
    off, until the host mutes them (or stops their video) again.
    """

    allow_self_unmute: bool = True
    allow_self_video: bool = True
    mute_on_entry: bool = False  # set by Mute All: "all current and new participants"
    unmute_granted: set[int] = field(default_factory=set)  # participant ids
    video_granted: set[int] = field(default_factory=set)

    def can_unmute(self, connection: Connection) -> bool:
        return (
            connection.role == "host"
            or self.allow_self_unmute
            or connection.participant_id in self.unmute_granted
        )

    def can_start_video(self, connection: Connection) -> bool:
        return (
            connection.role == "host"
            or self.allow_self_video
            or connection.participant_id in self.video_granted
        )

    def admit(self, connection: Connection) -> None:
        """Turns off the mic or camera that a newcomer may not have on."""
        muted_on_entry = self.mute_on_entry and connection.role != "host"
        if muted_on_entry or not self.can_unmute(connection):
            connection.audio = False
        if not self.can_start_video(connection):
            connection.video = False

    def view_for(self, connection: Connection) -> PermissionsOut:
        return PermissionsOut(
            allow_self_unmute=self.allow_self_unmute,
            allow_self_video=self.allow_self_video,
            can_unmute=self.can_unmute(connection),
            can_start_video=self.can_start_video(connection),
        )


class ConnectionManager:
    def __init__(self) -> None:
        # session id -> participant id -> connection. Insertion order is join order.
        self._rooms: dict[int, dict[int, Connection]] = {}
        # One lock per meeting code, so joins, leaves and endings of a meeting run one at a time.
        self._locks: dict[str, asyncio.Lock] = {}
        # session id -> the task that ends the session if nobody comes back.
        self._grace_tasks: dict[int, asyncio.Task[None]] = {}
        # session id -> what the host allows. Kept while the session is live,
        # even when everyone has dropped for a moment.
        self._permissions: dict[int, SessionPermissions] = {}

    def lock(self, meeting_code: str) -> asyncio.Lock:
        if meeting_code not in self._locks:
            self._locks[meeting_code] = asyncio.Lock()
        return self._locks[meeting_code]

    def add(self, connection: Connection) -> Connection | None:
        """Registers a connection. Returns the older one it replaced, if any (a refresh)."""
        room = self._rooms.setdefault(connection.session_id, {})
        replaced = room.get(connection.participant_id)
        room[connection.participant_id] = connection
        return replaced

    def remove(self, connection: Connection) -> bool:
        """Unregisters a connection, but only if it is still the registered one.

        False means a newer connection replaced it, or the room was ended, so
        there is nothing to clean up.
        """
        room = self._rooms.get(connection.session_id, {})
        if room.get(connection.participant_id) is not connection:
            return False
        del room[connection.participant_id]
        if not room:
            del self._rooms[connection.session_id]
        return True

    def others(self, connection: Connection) -> list[Connection]:
        room = self._rooms.get(connection.session_id, {})
        return [other for id, other in room.items() if id != connection.participant_id]

    def everyone(self, session_id: int) -> list[Connection]:
        return list(self._rooms.get(session_id, {}).values())

    def find(self, session_id: int, participant_id: int) -> Connection | None:
        """The connection of one participant in a session, if they are connected."""
        return self._rooms.get(session_id, {}).get(participant_id)

    def is_empty(self, session_id: int) -> bool:
        return session_id not in self._rooms

    def take_all(self, session_id: int) -> list[Connection]:
        """Removes and returns every connection in a session (used when it ends)."""
        return list(self._rooms.pop(session_id, {}).values())

    def permissions(self, session_id: int) -> SessionPermissions:
        """The session's permissions, starting with everything allowed, as in Zoom."""
        return self._permissions.setdefault(session_id, SessionPermissions())

    def forget_permissions(self, session_id: int) -> None:
        self._permissions.pop(session_id, None)  # the session ended

    async def send(self, connection: Connection, message: ServerMessage) -> None:
        try:
            # by_alias, so fields like SignalOut.from_ go out under their wire name.
            await connection.websocket.send_text(message.model_dump_json(by_alias=True))
        except (RuntimeError, WebSocketDisconnect):
            pass  # that socket already closed; its own cleanup will run

    async def broadcast(self, connections: list[Connection], message: ServerMessage) -> None:
        for connection in connections:
            await self.send(connection, message)

    async def close(self, connection: Connection, code: int) -> None:
        try:
            await connection.websocket.close(code=code)
        except (RuntimeError, WebSocketDisconnect):
            # Already closed, or the browser is gone (Starlette raises
            # WebSocketDisconnect then). Either way there is nothing to close.
            pass

    async def close_all(self, connections: list[Connection], code: int) -> None:
        """Closes several sockets at the same time.

        A close waits for the browser to answer, which can be slow behind a
        hosting proxy. Done together, one slow browser doesn't hold up the rest.
        """
        await asyncio.gather(*(self.close(connection, code) for connection in connections))

    def start_grace(self, session_id: int, task: asyncio.Task[None]) -> None:
        self._grace_tasks[session_id] = task  # keeps a reference so the task isn't collected

    def forget_grace(self, session_id: int) -> None:
        self._grace_tasks.pop(session_id, None)

    def cancel_grace(self, session_id: int) -> None:
        task = self._grace_tasks.pop(session_id, None)
        if task is not None:
            task.cancel()
