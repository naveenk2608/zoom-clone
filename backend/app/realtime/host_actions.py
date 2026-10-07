"""The host's commands: mute everyone, mute one person, remove one person, end the meeting.

ws.py lets a message reach these only when the sender's role is host.

The connection manager is read as `actions.manager` at call time, not imported
by name, so a test that swaps in a fresh manager is seen here too.
"""

from starlette.concurrency import run_in_threadpool

from app.realtime import actions
from app.realtime.connection_manager import Connection
from app.realtime.messages import CLOSE_ENDED, CLOSE_REMOVED
from app.realtime.server_messages import ForceMute, MeetingEnded, ParticipantLeft, Removed
from app.services import presence


def mark_removed(factory: actions.SessionFactory, participant_id: int) -> None:
    with factory() as db:
        presence.mark_removed(db, participant_id)


async def find_target(host: Connection, participant_id: int) -> Connection | None:
    """The other participant a command is for. If there is none, tells the host why."""
    if participant_id == host.participant_id:
        await actions.reject(host, "Use your own controls for that.")
        return None
    # Looked up in the host's own session, so a host can't reach another meeting.
    target = actions.manager.find(host.session_id, participant_id)
    if target is None:
        await actions.reject(host, "That participant is no longer in the meeting.")
    return target


async def mute_all(host: Connection) -> None:
    """Asks everyone except the hosts to mute. Each one mutes itself and sends its media_state."""
    for other in actions.manager.others(host):
        if other.role != "host" and other.audio:
            await actions.manager.send(other, ForceMute())


async def mute_one(host: Connection, participant_id: int) -> None:
    target = await find_target(host, participant_id)
    if target is not None and target.audio:
        await actions.manager.send(target, ForceMute())


async def remove(factory: actions.SessionFactory, host: Connection, participant_id: int) -> None:
    """Sends one participant out for good: their join token is refused from now on."""
    async with actions.manager.lock(host.meeting_code):
        target = await find_target(host, participant_id)
        if target is None:
            return
        await run_in_threadpool(mark_removed, factory, target.participant_id)
        actions.manager.remove(target)
        left = ParticipantLeft(participant_id=target.participant_id)
        await actions.manager.broadcast(actions.manager.others(target), left)

    # Out of the room now, so nothing else reaches this socket. Its close can be
    # slow, so it happens after the lock is released. The `removed` message is
    # what the browser acts on; the close is a fallback.
    await actions.manager.send(target, Removed())
    await actions.manager.close(target, CLOSE_REMOVED)


async def end_for_all(factory: actions.SessionFactory, host: Connection) -> None:
    """The host ends the meeting: everyone is told, then disconnected."""
    async with actions.manager.lock(host.meeting_code):
        await run_in_threadpool(actions.end_session, factory, host.session_id)
        actions.manager.cancel_grace(host.session_id)
        everyone = actions.manager.take_all(host.session_id)

    # Taken out of the room, so the lock isn't needed to reach them. Everyone
    # hears first, then all the sockets close at once: a slow close can't hold
    # up the others or keep the meeting locked.
    await actions.manager.broadcast(everyone, MeetingEnded())
    await actions.manager.close_all(everyone, CLOSE_ENDED)
