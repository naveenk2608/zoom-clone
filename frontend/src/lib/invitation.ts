import { formatMeetingCode } from "@/lib/meetingCode";
import type { MeetingOut } from "@/types/api";

/**
 * The text "Copy Invitation" puts on the clipboard, laid out like Zoom's:
 *
 *   Alex Morgan is inviting you to a scheduled Zoom meeting.
 *
 *   Topic: Design review
 *   Description: Walk through the new mockups.   (only if it has one)
 *   Time: Oct 8, 2026, 10:00 AM Asia/Kolkata
 *
 *   Join Zoom Meeting
 *   https://.../j/12345678901
 *
 *   Meeting ID: 123 4567 8901
 */
export function buildInvitation(meeting: MeetingOut): string {
  const kind = meeting.meeting_type === "scheduled" ? "a scheduled Zoom meeting" : "a Zoom meeting";
  const lines = [`${meeting.host.name} is inviting you to ${kind}.`, "", `Topic: ${meeting.title}`];

  if (meeting.description !== null) {
    lines.push(`Description: ${meeting.description}`);
  }
  if (meeting.scheduled_start !== null && meeting.timezone !== null) {
    lines.push(`Time: ${formatInZone(meeting.scheduled_start, meeting.timezone)}`);
  }

  lines.push(
    "",
    "Join Zoom Meeting",
    meeting.invite_link,
    "",
    `Meeting ID: ${formatMeetingCode(meeting.meeting_code)}`,
  );
  return lines.join("\n");
}

/** The start time in the zone the host scheduled it in, followed by that zone's name. */
function formatInZone(isoStart: string, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoStart));
  return `${formatted} ${timeZone}`;
}
