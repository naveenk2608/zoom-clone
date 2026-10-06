import type { MeetingOut } from "@/types/api";

// The same wording as the backend's errors, so the UI reads the same either way.
export const INVALID_MEETING_ID = "This meeting ID is not valid. Please check and try again.";

/** Why nobody can join this meeting, or null if they can. */
export function cannotJoinReason(meeting: MeetingOut): string | null {
  if (meeting.status === "cancelled") {
    return "This meeting has been cancelled.";
  }
  if (meeting.status === "ended") {
    return "This meeting has ended."; // an instant meeting whose session is over
  }
  return null;
}
