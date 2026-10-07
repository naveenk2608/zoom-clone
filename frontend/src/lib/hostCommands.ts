// The host's controls, as messages to the server. The server checks that we
// are the host and answers with the effects: media_state from each muted
// person, permissions, hand, participant_left, meeting_ended. The two "ask"
// commands change nothing unless the person says yes.

import type { ClientMessage, PermissionChange } from "@/types/ws";

type Send = (message: ClientMessage) => void;

export function hostCommands(send: Send) {
  return {
    /** Mute All, with the dialog's "Allow participants to unmute themselves". */
    muteAll: (allowSelfUnmute: boolean) =>
      send({ type: "host_mute_all", allow_self_unmute: allowSelfUnmute }),
    setPermissions: (change: PermissionChange) => send({ type: "host_set_permissions", ...change }),
    mute: (participantId: number) => send({ type: "host_mute", participant_id: participantId }),
    askToUnmute: (participantId: number) =>
      send({ type: "host_ask_unmute", participant_id: participantId }),
    stopVideo: (participantId: number) =>
      send({ type: "host_stop_video", participant_id: participantId }),
    askToStartVideo: (participantId: number) =>
      send({ type: "host_ask_start_video", participant_id: participantId }),
    lowerHand: (participantId: number) =>
      send({ type: "lower_hand", participant_id: participantId }),
    remove: (participantId: number) => send({ type: "host_remove", participant_id: participantId }),
    endForAll: () => send({ type: "host_end" }),
  };
}

export type HostCommands = ReturnType<typeof hostCommands>;
