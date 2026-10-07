"""What the server passes on from one participant: signals, mic and camera state, and chat.

Mic and camera state is checked against the host's permissions first.

Like host_actions.py, this reads the connection manager as `actions.manager`
at call time, so a test that swaps in a fresh manager is seen here too.
"""

from starlette.concurrency import run_in_threadpool

from app.realtime import actions
from app.realtime.connection_manager import Connection
from app.realtime.messages import SignalData
from app.realtime.server_messages import ChatOut, ChatSender, ForceMute, ForceVideoOff, SignalOut
from app.services import chat


def save_chat(
    factory: actions.SessionFactory, participant_id: int, body: str
) -> chat.SavedChatMessage:
    with factory() as db:
        return chat.save_message(db, participant_id, body)


async def relay_media_state(
    connection: Connection, audio: bool, video: bool, screen: bool
) -> None:
    """Records someone's mic, camera and screen-share state and tells the others.

    Turning the mic or camera on needs the host's permission. A refused one
    stays off: the sender gets the same force_mute or force_video_off as from
    the host's controls, so their app turns it back off, and then the reason.
    """
    permissions = actions.manager.permissions(connection.session_id)
    refused_audio = audio and not connection.audio and not permissions.can_unmute(connection)
    refused_video = video and not connection.video and not permissions.can_start_video(connection)
    connection.audio = audio and not refused_audio
    connection.video = video and not refused_video
    connection.screen = screen
    others = actions.manager.others(connection)
    await actions.manager.broadcast(others, actions.media_state_message(connection))

    if refused_audio:
        await actions.manager.send(connection, ForceMute())
        await actions.reject(connection, "The host has disabled unmuting for participants")
    if refused_video:
        await actions.manager.send(connection, ForceVideoOff())
        await actions.reject(connection, "The host has disabled participant video")


async def relay_signal(connection: Connection, to: int, data: SignalData) -> None:
    """Passes a WebRTC message to one participant of the same session.

    It is dropped if they are not connected: they left, and their peer
    connection is closed anyway.
    """
    target = actions.manager.find(connection.session_id, to)
    if target is not None:
        await actions.manager.send(target, SignalOut(from_=connection.participant_id, data=data))


async def send_chat(factory: actions.SessionFactory, connection: Connection, body: str) -> None:
    """Saves a chat message and sends it to everyone in the session, the sender included.

    The sender's own copy carries the saved id and time, like everyone else's.
    """
    saved = await run_in_threadpool(save_chat, factory, connection.participant_id, body)
    sender = ChatSender(id=connection.participant_id, display_name=connection.display_name)
    message = ChatOut(id=saved.id, from_=sender, body=body, sent_at=saved.sent_at)
    await actions.manager.broadcast(actions.manager.everyone(connection.session_id), message)
