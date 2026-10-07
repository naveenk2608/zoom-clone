"""The host's commands: mute, stop video, ask to unmute or start video, permissions, remove, end.

ws.py lets a message reach these only when the sender's role is host.

The connection manager is read as `actions.manager` at call time, not imported
by name, so a test that swaps in a fresh manager is seen here too.
"""

from starlette.concurrency import run_in_threadpool

from app.realtime import actions
from app.realtime.connection_manager import Connection
from app.realtime.messages import CLOSE_ENDED, CLOSE_REMOVED
from app.realtime.server_messages import (
    AskStartVideo,
    AskUnmute,
    ForceMute,
    ForceVideoOff,
    MeetingEnded,
    ParticipantLeft,
    PermissionsOut,
    PermissionsUpdate,
    Removed,
)
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


def permission_views(session_id: int) -> dict[int, PermissionsOut]:
    """What each connected person may do now, to compare with after a change."""
    permissions = actions.manager.permissions(session_id)
    everyone = actions.manager.everyone(session_id)
    return {person.participant_id: permissions.view_for(person) for person in everyone}


async def send_changed_permissions(session_id: int, before: dict[int, PermissionsOut]) -> None:
    """Tells each person whose permissions changed what they are now, and nobody else."""
    permissions = actions.manager.permissions(session_id)
    for person in actions.manager.everyone(session_id):
        now = permissions.view_for(person)
        if before.get(person.participant_id) != now:
            await actions.manager.send(person, PermissionsUpdate(permissions=now))


async def set_permissions(
    host: Connection, allow_self_unmute: bool | None, allow_self_video: bool | None
) -> None:
    """Host tools → "Allow participants to": Unmute themselves, Start video."""
    before = permission_views(host.session_id)
    permissions = actions.manager.permissions(host.session_id)
    if allow_self_unmute is not None:
        permissions.allow_self_unmute = allow_self_unmute
    if allow_self_video is not None:
        permissions.allow_self_video = allow_self_video
    await send_changed_permissions(host.session_id, before)


async def mute_all(host: Connection, allow_self_unmute: bool | None) -> None:
    """Mute All: everyone except the hosts mutes, and so does everyone who joins later.

    Being muted by the host takes back any "Ask to Unmute". The dialog's
    checkbox says whether people may unmute themselves. Each muted person's
    app mutes itself and sends its media_state.
    """
    before = permission_views(host.session_id)
    permissions = actions.manager.permissions(host.session_id)
    permissions.mute_on_entry = True
    permissions.unmute_granted.clear()
    if allow_self_unmute is not None:
        permissions.allow_self_unmute = allow_self_unmute
    # Permissions first, so a muted person's Unmute button is already right.
    await send_changed_permissions(host.session_id, before)
    for other in actions.manager.others(host):
        if other.role != "host" and other.audio:
            await actions.manager.send(other, ForceMute())


async def mute_one(host: Connection, participant_id: int) -> None:
    target = await find_target(host, participant_id)
    if target is None:
        return
    before = permission_views(host.session_id)
    actions.manager.permissions(host.session_id).unmute_granted.discard(target.participant_id)
    await send_changed_permissions(host.session_id, before)
    if target.audio:
        await actions.manager.send(target, ForceMute())


async def stop_video(host: Connection, participant_id: int) -> None:
    """Stop Video: turns one person's camera off, as Mute does for the mic."""
    target = await find_target(host, participant_id)
    if target is None:
        return
    before = permission_views(host.session_id)
    actions.manager.permissions(host.session_id).video_granted.discard(target.participant_id)
    await send_changed_permissions(host.session_id, before)
    if target.video:
        await actions.manager.send(target, ForceVideoOff())


async def ask_to_unmute(host: Connection, participant_id: int) -> None:
    """Asks one muted person to unmute. Only a request: the host can never turn a mic on.

    It also lets them unmute while unmuting is off, until the host mutes them again.
    """
    target = await find_target(host, participant_id)
    if target is None or target.audio:
        return
    before = permission_views(host.session_id)
    actions.manager.permissions(host.session_id).unmute_granted.add(target.participant_id)
    await send_changed_permissions(host.session_id, before)
    await actions.manager.send(target, AskUnmute())


async def ask_to_start_video(host: Connection, participant_id: int) -> None:
    """Like ask_to_unmute, for someone whose camera is off."""
    target = await find_target(host, participant_id)
    if target is None or target.video:
        return
    before = permission_views(host.session_id)
    actions.manager.permissions(host.session_id).video_granted.add(target.participant_id)
    await send_changed_permissions(host.session_id, before)
    await actions.manager.send(target, AskStartVideo())


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
        await actions.finish_session(factory, host.session_id)
        actions.manager.cancel_grace(host.session_id)
        everyone = actions.manager.take_all(host.session_id)

    # Taken out of the room, so the lock isn't needed to reach them. Everyone
    # hears first, then all the sockets close at once: a slow close can't hold
    # up the others or keep the meeting locked.
    await actions.manager.broadcast(everyone, MeetingEnded())
    await actions.manager.close_all(everyone, CLOSE_ENDED)
