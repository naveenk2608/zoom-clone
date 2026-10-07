// Reading socket messages, and keeping the list of other participants up to date.

import type { RoomParticipant, ServerMessage } from "@/types/ws";

const SERVER_MESSAGE_TYPES = [
  "welcome",
  "participant_joined",
  "participant_left",
  "media_state",
  "signal",
  "meeting_ended",
  "error",
];

/** Turns the text of a socket message into a typed message, or null if it isn't one. */
export function parseServerMessage(text: string): ServerMessage | null {
  try {
    const value: unknown = JSON.parse(text);
    if (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      typeof value.type === "string" &&
      SERVER_MESSAGE_TYPES.includes(value.type)
    ) {
      // The backend sends exactly these shapes; types/ws.ts mirrors them.
      return value as ServerMessage;
    }
    return null;
  } catch {
    return null; // not valid JSON
  }
}

/** The list of other participants after one message. Messages that don't change it return it as is. */
export function applyMessage(others: RoomParticipant[], message: ServerMessage): RoomParticipant[] {
  switch (message.type) {
    case "welcome":
      return message.participants;
    case "participant_joined":
      // Replace rather than add, in case the same person is already listed.
      return [...others.filter((p) => p.id !== message.participant.id), message.participant];
    case "participant_left":
      return others.filter((p) => p.id !== message.participant_id);
    case "media_state":
      return others.map((p) =>
        p.id === message.participant_id ? { ...p, audio: message.audio, video: message.video } : p,
      );
    default:
      return others;
  }
}
