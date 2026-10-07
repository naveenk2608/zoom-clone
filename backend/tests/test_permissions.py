"""The host's "Allow participants to" settings, how the server enforces them, and Mute All."""

import pytest
from fastapi.testclient import TestClient

from tests.ws_helpers import add_guest, connect, start_meeting

NO_UNMUTE = "The host has disabled unmuting for participants"
NO_VIDEO = "The host has disabled participant video"


def update(unmute: bool, video: bool, can_unmute: bool, can_start_video: bool) -> dict[str, object]:
    """A permissions message: the two settings, then what that person may do."""
    return {
        "type": "permissions",
        "permissions": {
            "allow_self_unmute": unmute,
            "allow_self_video": video,
            "can_unmute": can_unmute,
            "can_start_video": can_start_video,
        },
    }


def test_welcome_has_the_permissions_and_the_state_we_were_let_in_with(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)

    with connect(live_client, host, audio=0, video=1) as socket:
        welcome = socket.receive_json()
        assert welcome["permissions"] == update(True, True, True, True)["permissions"]
        assert welcome["self"]["audio"] is False
        assert welcome["self"]["video"] is True


def test_the_host_turns_the_settings_off_for_everyone(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_set_permissions", "allow_self_unmute": False})
        assert guest_socket.receive_json() == update(False, True, False, True)
        assert host_socket.receive_json() == update(False, True, True, True)  # never restricted

        host_socket.send_json({"type": "host_set_permissions", "allow_self_video": False})
        assert guest_socket.receive_json() == update(False, False, False, False)
        assert host_socket.receive_json() == update(False, False, True, True)

        # Nothing changed, so nobody is told: the next message is this chat.
        host_socket.send_json({"type": "host_set_permissions", "allow_self_video": False})
        host_socket.send_json({"type": "chat", "body": "next"})
        assert guest_socket.receive_json()["type"] == "chat"


@pytest.mark.parametrize(
    ("setting", "field", "forced", "reason"),
    [
        ("allow_self_unmute", "audio", "force_mute", NO_UNMUTE),
        ("allow_self_video", "video", "force_video_off", NO_VIDEO),
    ],
)
def test_turning_on_without_permission_is_refused(
    live_client: TestClient, setting: str, field: str, forced: str, reason: str
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, audio=0, video=0) as guest_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome
        host_socket.send_json({"type": "host_set_permissions", setting: False})
        host_socket.receive_json()  # permissions
        guest_socket.receive_json()  # permissions

        guest_socket.send_json({"type": "media_state", "audio": True, "video": True})

        # The refused one stays off for everyone else; the other goes through.
        state = host_socket.receive_json()
        assert state["type"] == "media_state"
        assert state[field] is False
        assert state["video" if field == "audio" else "audio"] is True
        assert guest_socket.receive_json() == {"type": forced}
        assert guest_socket.receive_json() == {"type": "error", "message": reason}


def test_someone_unmuted_stays_unmuted_and_can_mute_but_not_unmute_again(
    live_client: TestClient,
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host) as host_socket,
        connect(live_client, guest, audio=1) as guest_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome
        host_socket.send_json({"type": "host_set_permissions", "allow_self_unmute": False})
        host_socket.receive_json()  # permissions
        guest_socket.receive_json()  # permissions

        guest_socket.send_json({"type": "media_state", "audio": True, "video": True})  # no change
        assert host_socket.receive_json()["audio"] is True
        guest_socket.send_json({"type": "media_state", "audio": False, "video": True})
        assert host_socket.receive_json()["audio"] is False
        guest_socket.send_json({"type": "media_state", "audio": True, "video": True})
        assert host_socket.receive_json()["audio"] is False
        assert guest_socket.receive_json() == {"type": "force_mute"}


def test_the_host_is_never_restricted(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with (
        connect(live_client, host, audio=0, video=0) as host_socket,
        connect(live_client, guest) as guest_socket,
    ):
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome
        host_socket.send_json(
            {"type": "host_set_permissions", "allow_self_unmute": False, "allow_self_video": False}
        )
        host_socket.receive_json()  # permissions
        guest_socket.receive_json()  # permissions

        host_socket.send_json({"type": "media_state", "audio": True, "video": True})
        state = guest_socket.receive_json()
        assert (state["audio"], state["video"]) == (True, True)
        guest_socket.send_json({"type": "chat", "body": "next"})
        assert host_socket.receive_json()["type"] == "chat"  # no error came first


def test_newcomers_join_muted_and_camera_off_when_not_allowed(live_client: TestClient) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code)

    with connect(live_client, host) as host_socket:
        host_socket.receive_json()  # welcome
        host_socket.send_json(
            {"type": "host_set_permissions", "allow_self_unmute": False, "allow_self_video": False}
        )
        host_socket.receive_json()  # permissions

        with connect(live_client, guest, audio=1, video=1) as guest_socket:
            welcome = guest_socket.receive_json()
            assert (welcome["self"]["audio"], welcome["self"]["video"]) == (False, False)
            assert welcome["permissions"] == update(False, False, False, False)["permissions"]
            joined = host_socket.receive_json()["participant"]
            assert (joined["audio"], joined["video"]) == (False, False)


@pytest.mark.parametrize("allow", [True, False])
def test_mute_all_mutes_everyone_now_and_later_and_applies_the_checkbox(
    live_client: TestClient, allow: bool
) -> None:
    host = start_meeting(live_client)
    guest = add_guest(live_client, host.code, "Sam")
    newcomer = add_guest(live_client, host.code, "Kim")

    with connect(live_client, host) as host_socket, connect(live_client, guest) as guest_socket:
        host_socket.receive_json()  # welcome
        host_socket.receive_json()  # participant_joined
        guest_socket.receive_json()  # welcome

        host_socket.send_json({"type": "host_mute_all", "allow_self_unmute": allow})
        if not allow:  # a setting changed, so everyone hears; then the mute
            assert host_socket.receive_json() == update(False, True, True, True)
            assert guest_socket.receive_json() == update(False, True, False, True)
        assert guest_socket.receive_json() == {"type": "force_mute"}

        with connect(live_client, newcomer, audio=1) as newcomer_socket:
            welcome = newcomer_socket.receive_json()
            assert welcome["self"]["audio"] is False  # "new participants will be muted" too
            assert welcome["permissions"]["can_unmute"] is allow
