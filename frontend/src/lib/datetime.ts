// Date and time display for the dashboard. Everything is shown in the
// browser's own time zone, which Intl.DateTimeFormat uses by default.

import type { MeetingOut } from "@/types/api";

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** "10:00 AM" */
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

/** "10:00 AM - 10:40 AM" */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/** "Mon, Oct 5" */
export function formatShortDate(date: Date): string {
  return shortDateFormat.format(date);
}

/** 40 → "40 min", 60 → "1 hr", 95 → "1 hr 35 min" */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

/** The time line on a meeting card: the scheduled range, or a note for instant meetings. */
export function meetingTimeText(meeting: MeetingOut): string {
  if (meeting.scheduled_start === null || meeting.duration_minutes === null) {
    return "Instant meeting";
  }
  const start = new Date(meeting.scheduled_start);
  return formatTimeRange(start, addMinutes(start, meeting.duration_minutes));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today", "Tomorrow", or "Thursday, Oct 9". */
export function dayLabel(day: Date, now: Date): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameDay(day, now)) return "Today";
  if (isSameDay(day, tomorrow)) return "Tomorrow";
  return weekdayDateFormat.format(day);
}

export interface MeetingGroup {
  label: string;
  meetings: MeetingOut[];
}

/**
 * Groups the Upcoming list under day headers. The API already sorts it: live
 * meetings first, then by start time. Live meetings go under "In progress",
 * because an instant meeting has no scheduled start to group by.
 */
export function groupUpcoming(meetings: MeetingOut[], now: Date): MeetingGroup[] {
  const groups: MeetingGroup[] = [];
  for (const meeting of meetings) {
    const label =
      meeting.status === "live" || meeting.scheduled_start === null
        ? "In progress"
        : dayLabel(new Date(meeting.scheduled_start), now);

    const lastGroup = groups.at(-1);
    if (lastGroup !== undefined && lastGroup.label === label) {
      lastGroup.meetings.push(meeting);
    } else {
      groups.push({ label, meetings: [meeting] });
    }
  }
  return groups;
}
