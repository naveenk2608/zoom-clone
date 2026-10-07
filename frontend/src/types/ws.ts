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
  | { type: "welcome"; self: SelfInfo; participants: RoomParticipant[] }
  | { type: "participant_joined"; participant: RoomParticipant }
  | { type: "participant_left"; participant_id: number }
  | { type: "media_state"; participant_id: number; audio: boolean; video: boolean; screen: boolean }
  | { type: "signal"; from: number; data: SignalData }
  | ({ type: "chat" } & ChatMessage) // to everyone, the sender included
  | { type: "reaction"; participant_id: number; emoji: Reaction } // to everyone, the sender included
  | { type: "hand"; participant_id: number; raised: boolean } // to everyone, the sender included
  | { type: "force_mute" } // the host muted us: mute the mic and send media_state
  | { type: "ask_unmute" } // the host asks us to unmute; only we can, so we are asked
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
  | { type: "host_mute_all" }
  | { type: "host_mute"; participant_id: number }
  | { type: "host_remove"; participant_id: number }
  | { type: "host_ask_unmute"; participant_id: number }
  | { type: "host_end" };

// The codes the server closes the socket with when it refuses or ends a connection.
export const CLOSE_INVALID_TOKEN = 4001;
export const CLOSE_REMOVED = 4003;
export const CLOSE_ENDED = 4010;
