// Mirrors backend/app/realtime/messages.py (client to server) and
// server_messages.py (server to client). Every message has a `type` field,
// so each side is a union that TypeScript tells apart by it.

import type { ParticipantRole } from "@/types/api";

export interface SelfInfo {
  id: number;
  display_name: string;
  role: ParticipantRole;
}

/** Someone else in the meeting, with their mic, camera and screen-share state, and their hand. */
export interface RoomParticipant extends SelfInfo {
  audio: boolean;
  video: boolean; // the camera
  screen: boolean; // sharing the screen, which they then send in place of the camera
  hand_raised: boolean;
}

/** Host tools → "Allow participants to", and what we ourselves may turn on. */
export interface Permissions {
  allow_self_unmute: boolean; // the host's settings for the whole meeting
  allow_self_video: boolean;
  can_unmute: boolean; // always for the host; otherwise the setting, or the host asked us to
  can_start_video: boolean;
}

/** Zoom's defaults, until the server's welcome says otherwise. */
export const ALL_ALLOWED: Permissions = {
  allow_self_unmute: true,
  allow_self_video: true,
  can_unmute: true,
  can_start_video: true,
};

/** A change to the host's settings. A setting left out stays as it is. */
export type PermissionChange = Partial<Pick<Permissions, "allow_self_unmute" | "allow_self_video">>;

/** The React palette, in Zoom's order. The server refuses anything else. */
export const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"] as const;
export type Reaction = (typeof REACTIONS)[number];

/** A chat message as the server delivers it: saved, with its id and time. */
export interface ChatMessage {
  id: number;
  from: { id: number; display_name: string };
  body: string;
  sent_at: string; // ISO 8601, UTC
}

/** A WebRTC offer or answer, or one ICE candidate. The server passes it on unread. */
export type SignalData =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

export type ServerMessage =
  | {
      type: "welcome";
      // audio and video: the state the server let us in with. Off when the
      // host doesn't allow them (or used Mute All); we follow it.
      self: SelfInfo & { audio: boolean; video: boolean };
      participants: RoomParticipant[];
      permissions: Permissions;
    }
  | { type: "permissions"; permissions: Permissions } // only to those whose permissions changed
  | { type: "participant_joined"; participant: RoomParticipant }
  | { type: "participant_left"; participant_id: number }
  | { type: "media_state"; participant_id: number; audio: boolean; video: boolean; screen: boolean }
  | { type: "signal"; from: number; data: SignalData }
  | ({ type: "chat" } & ChatMessage) // to everyone, the sender included
  | { type: "reaction"; participant_id: number; emoji: Reaction } // to everyone, the sender included
  | { type: "hand"; participant_id: number; raised: boolean } // to everyone, the sender included
  | { type: "force_mute" } // the host muted us: mute the mic and send media_state
  | { type: "force_video_off" } // the host stopped our video: turn the camera off, likewise
  | { type: "ask_unmute" } // the host asks us to unmute; only we can, so we are asked
  | { type: "ask_start_video" } // the same for the camera
  | { type: "removed" } // the host removed us; the socket then closes with CLOSE_REMOVED
  | { type: "meeting_ended" }
  | { type: "error"; message: string };

export type ClientMessage =
  | { type: "media_state"; audio: boolean; video: boolean; screen: boolean }
  | { type: "signal"; to: number; data: SignalData }
  | { type: "chat"; body: string }
  | { type: "reaction"; emoji: Reaction }
  | { type: "raise_hand" }
  | { type: "lower_hand"; participant_id?: number } // someone else's hand: host only
  | { type: "leave" }
  // Host only; the server refuses them from anyone else.
  | { type: "host_mute_all"; allow_self_unmute?: boolean }
  | ({ type: "host_set_permissions" } & PermissionChange)
  | { type: "host_mute"; participant_id: number }
  | { type: "host_ask_unmute"; participant_id: number }
  | { type: "host_stop_video"; participant_id: number }
  | { type: "host_ask_start_video"; participant_id: number }
  | { type: "host_remove"; participant_id: number }
  | { type: "host_end" };

// The codes the server closes the socket with when it refuses or ends a connection.
export const CLOSE_INVALID_TOKEN = 4001;
export const CLOSE_REMOVED = 4003;
export const CLOSE_ENDED = 4010;
