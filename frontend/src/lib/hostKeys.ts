// Host keys: how this browser proves it created a meeting. Everyone is the
// same demo user, so the server returns a random key once, when the meeting is
// created, and keeps only its hash. The key is kept in localStorage, which every
// tab shares and which survives closing the browser. lib/api.ts saves it and
// sends it back in the X-Host-Key header on Start, Edit and Delete.

import type { MeetingOut } from "@/types/api";

function storageKey(code: string): string {
  return `zc:hostkey:${code}`;
}

export function saveHostKey(code: string, key: string): void {
  localStorage.setItem(storageKey(code), key);
}

export function loadHostKey(code: string): string | null {
  return localStorage.getItem(storageKey(code));
}

export function forgetHostKey(code: string): void {
  localStorage.removeItem(storageKey(code));
}

/**
 * Whether this browser may start, edit and delete the meeting: it holds the
 * meeting's key, or the meeting has none (the demo data, which anyone may manage).
 */
export function ownsMeeting(meeting: MeetingOut): boolean {
  return !meeting.has_host_key || loadHostKey(meeting.meeting_code) !== null;
}
