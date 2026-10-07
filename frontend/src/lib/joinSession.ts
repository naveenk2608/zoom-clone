// Who this browser tab is in a meeting. It's kept in sessionStorage, which
// belongs to one tab, so two tabs of the same browser act as two people.
// Also the name remembered for future meetings, kept in localStorage, which
// every tab shares and which survives closing the browser.

import type { JoinOut, ParticipantRole } from "@/types/api";

const REMEMBERED_NAME_KEY = "zc:remembered_name";

export interface JoinSession {
  participant_id: number;
  join_token: string; // proves who we are when the room's WebSocket connects
  display_name: string;
  role: ParticipantRole;
  audio_on: boolean; // the mic and camera state to enter the room with
  video_on: boolean;
}

export type MediaChoice = Pick<JoinSession, "audio_on" | "video_on">;

function storageKey(code: string): string {
  return `zc:session:${code}`;
}

export function sessionFromJoin(join: JoinOut, media: MediaChoice): JoinSession {
  return {
    participant_id: join.participant.id,
    join_token: join.join_token,
    display_name: join.participant.display_name,
    role: join.participant.role,
    ...media,
  };
}

export function saveJoinSession(code: string, session: JoinSession): void {
  sessionStorage.setItem(storageKey(code), JSON.stringify(session));
}

/** This tab's session for the meeting, or null if it hasn't joined (or the stored data is damaged). */
export function loadJoinSession(code: string): JoinSession | null {
  const stored = sessionStorage.getItem(storageKey(code));
  if (stored === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(stored);
    return isJoinSession(value) ? value : null;
  } catch {
    return null; // not valid JSON
  }
}

/** Checks the shape at runtime, because storage can hold anything. */
function isJoinSession(value: unknown): value is JoinSession {
  return (
    typeof value === "object" &&
    value !== null &&
    "participant_id" in value &&
    typeof value.participant_id === "number" &&
    "join_token" in value &&
    typeof value.join_token === "string" &&
    "display_name" in value &&
    typeof value.display_name === "string" &&
    "role" in value &&
    (value.role === "host" || value.role === "attendee") &&
    "audio_on" in value &&
    typeof value.audio_on === "boolean" &&
    "video_on" in value &&
    typeof value.video_on === "boolean"
  );
}

/** The name saved by "Remember my name for future meetings", or null. */
export function loadRememberedName(): string | null {
  return localStorage.getItem(REMEMBERED_NAME_KEY);
}

export function rememberName(name: string): void {
  localStorage.setItem(REMEMBERED_NAME_KEY, name);
}

export function forgetRememberedName(): void {
  localStorage.removeItem(REMEMBERED_NAME_KEY);
}
