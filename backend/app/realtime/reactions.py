"""Reactions and raised hands. Everyone in the session hears about them, the sender included.

Nothing here is saved: a reaction fades after a few seconds, and a hand is
part of the live connection, like the mic and camera flags.

Like host_actions.py, this reads the connection manager as `actions.manager`
at call time, so a test that swaps in a fresh manager is seen here too.
"""

from app.realtime import actions
from app.realtime.connection_manager import Connection
from app.realtime.messages import Reaction
from app.realtime.server_messages import HandOut, ReactionOut


async def send_reaction(connection: Connection, emoji: Reaction) -> None:
    message = ReactionOut(participant_id=connection.participant_id, emoji=emoji)
    await actions.manager.broadcast(actions.manager.everyone(connection.session_id), message)


async def raise_hand(connection: Connection) -> None:
    if not connection.hand_raised:  # raising it again changes nothing
        await set_hand(connection, raised=True)


async def lower_hand(sender: Connection, participant_id: int | None) -> None:
    """Lowers the sender's own hand, or, when the host asks, anyone's."""
    if participant_id is None or participant_id == sender.participant_id:
        target: Connection | None = sender
    elif sender.role != "host":
        await actions.reject(sender, "Only the host can do that.")
        return
    else:
        # Looked up in the host's own session, so a host can't reach another meeting.
        target = actions.manager.find(sender.session_id, participant_id)

    if target is None:
        await actions.reject(sender, "That participant is no longer in the meeting.")
    elif target.hand_raised:
        await set_hand(target, raised=False)


async def set_hand(connection: Connection, raised: bool) -> None:
    connection.hand_raised = raised
    message = HandOut(participant_id=connection.participant_id, raised=raised)
    await actions.manager.broadcast(actions.manager.everyone(connection.session_id), message)
