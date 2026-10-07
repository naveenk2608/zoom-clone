// Mirrors backend/app/realtime/messages.py. Every message has a `type` field,
// so each side is a union that TypeScript tells apart by it.

import type { ParticipantRole } from "@/types/api";

export interface SelfInfo {
  id: number;
  display_name: string;
  role: ParticipantRole;
}

/** Someone else in the meeting, with their mic and camera state. */
export interface RoomParticipant extends SelfInfo {
  audio: boolean;
  video: boolean;
}

/** A WebRTC offer or answer, or one ICE candidate. The server passes it on unread. */
export type SignalData =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

export type ServerMessage =
  | { type: "welcome"; self: SelfInfo; participants: RoomParticipant[] }
  | { type: "participant_joined"; participant: RoomParticipant }
  | { type: "participant_left"; participant_id: number }
  | { type: "media_state"; participant_id: number; audio: boolean; video: boolean }
  | { type: "signal"; from: number; data: SignalData }
  | { type: "meeting_ended" }
  | { type: "error"; message: string };

export type ClientMessage =
  | { type: "media_state"; audio: boolean; video: boolean }
  | { type: "signal"; to: number; data: SignalData }
  | { type: "leave" }
  | { type: "host_end" };

// The codes the server closes the socket with when it refuses or ends a connection.
export const CLOSE_INVALID_TOKEN = 4001;
export const CLOSE_REMOVED = 4003;
export const CLOSE_ENDED = 4010;
