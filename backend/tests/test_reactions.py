"""Reactions and raised hands over the meeting WebSocket."""

import pytest
from fastapi.testclient import TestClient

from tests.ws_helpers import add_guest, connect, start_meeting

ONLY_HOST = {"type": "error", "message": "Only the host can do that."}


def hand(participant_id: int, raised: bool) -> dict[str, object]:
    return {"type": "hand", "participant_id": participant_id, "raised": raised}


@pytest.mark.parametrize("emoji", ["👏", "👍", "❤️", "😂", "😮", "🎉"])
def test_a_reaction_reaches_everyone_the_sender_included(
    live_client: TestClient, emoji: str
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "reaction", "emoji": emoji})

        sent = {"type": "reaction", "participant_id": guest.participant_id, "emoji": emoji}
        assert host_socket.receive_json() == sent
        assert guest_socket.receive_json() == sent


@pytest.mark.parametrize("emoji", ["🚀", "❤", "clap", ""])
def test_only_the_six_reactions_are_accepted(live_client: TestClient, emoji: str) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "reaction", "emoji": emoji})
        assert guest_socket.receive_json()["type"] == "error"

        # Nothing reached the host: the next thing it hears is this valid one.
        guest_socket.send_json({"type": "reaction", "emoji": "👍"})
        assert host_socket.receive_json()["emoji"] == "👍"


def test_a_raised_hand_reaches_everyone_and_newcomers(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code, "Sam")
    newcomer = add_guest(live_client, host.code, "Kim")

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "raise_hand"})
        assert host_socket.receive_json() == hand(guest.participant_id, True)
        assert guest_socket.receive_json() == hand(guest.participant_id, True)

        with connect(live_client, newcomer) as newcomer_socket:
            listed = {p["display_name"]: p for p in newcomer_socket.receive_json()["participants"]}
            assert listed["Sam"]["hand_raised"] is True
            assert listed["Alex Morgan"]["hand_raised"] is False
            joined = host_socket.receive_json()
            assert joined["type"] == "participant_joined"
            assert joined["participant"]["hand_raised"] is False


def test_raising_twice_sends_once_and_lowering_reaches_everyone(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        guest_socket.send_json({"type": "raise_hand"})
        guest_socket.send_json({"type": "raise_hand"})  # already up: nothing new
        guest_socket.send_json({"type": "lower_hand"})

        assert host_socket.receive_json() == hand(guest.participant_id, True)
        assert host_socket.receive_json() == hand(guest.participant_id, False)
        assert guest_socket.receive_json() == hand(guest.participant_id, True)
        assert guest_socket.receive_json() == hand(guest.participant_id, False)


def test_the_host_can_lower_anyones_hand(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome
        guest_socket.send_json({"type": "raise_hand"})
        host_socket.receive_json()  # raised
        guest_socket.receive_json()  # raised

        host_socket.send_json({"type": "lower_hand", "participant_id": guest.participant_id})

        assert guest_socket.receive_json() == hand(guest.participant_id, False)
        assert host_socket.receive_json() == hand(guest.participant_id, False)


def test_only_the_host_can_lower_someone_elses_hand(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    raiser = add_guest(live_client, host.code, "Sam")
    other = add_guest(live_client, host.code, "Kim")

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, raiser) as raiser_socket,
        connect(live_client, other) as other_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # Sam joined
        host_socket.receive_json()  # Kim joined
        raiser_socket.receive_json()  # welcome
        raiser_socket.receive_json()  # Kim joined
        other_socket.receive_json()  # welcome
        raiser_socket.send_json({"type": "raise_hand"})
        for socket in (host_socket, raiser_socket, other_socket):
            assert socket.receive_json() == hand(raiser.participant_id, True)

        other_socket.send_json({"type": "lower_hand", "participant_id": raiser.participant_id})
        assert other_socket.receive_json() == ONLY_HOST

        # The hand is still up: lowering it now is news to the host.
        raiser_socket.send_json({"type": "lower_hand"})
        assert host_socket.receive_json() == hand(raiser.participant_id, False)


def test_a_reconnect_lowers_the_hand(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as old_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        old_socket.receive_json()  # welcome
        old_socket.send_json({"type": "raise_hand"})
        host_socket.receive_json()  # raised

        with connect(live_client, guest) as new_socket:  # the same person, after a refresh
            assert new_socket.receive_json()["type"] == "welcome"
            assert host_socket.receive_json()["type"] == "media_state"
            assert host_socket.receive_json() == hand(guest.participant_id, False)
