// The Schedule form's state, and conversions between it and the API.
// The form shows 12-hour times with an AM/PM select; the API takes 24-hour "HH:MM".

import { browserTimeZone, currentZoneName } from "@/lib/timezones";
import type { MeetingOut, ScheduleIn } from "@/types/api";

export type Meridiem = "AM" | "PM";

export interface ScheduleFormValues {
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD", the value format of <input type="date">
  time: string; // 12-hour "h:mm", e.g. "10:30"
  meridiem: Meridiem;
  durationHours: number;
  durationMinutes: number;
  timezone: string;
  hostVideoOn: boolean;
  participantVideoOn: boolean;
  muteOnEntry: boolean;
}

export const MIN_DURATION = 15;
export const MAX_DURATION = 24 * 60;

/** "12:00", "12:30", "1:00", … "11:30": Zoom's half-hour steps. */
export const TIME_OPTIONS: string[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((hour) => [
  `${hour}:00`,
  `${hour}:30`,
]);
export const HOUR_OPTIONS: number[] = Array.from({ length: 25 }, (_, hour) => hour); // 0–24
export const MINUTE_OPTIONS: number[] = [0, 15, 30, 45];

/** A new meeting: today (or tomorrow), at the next half hour, for one hour. */
export function defaultFormValues(now: Date): ScheduleFormValues {
  const start = new Date(now);
  start.setSeconds(0, 0);
  if (start.getMinutes() < 30) {
    start.setMinutes(30);
  } else {
    start.setHours(start.getHours() + 1, 0); // also rolls over to the next day
  }

  return {
    title: "My Meeting",
    description: "",
    date: toDateInputValue(start),
    ...to12Hour(`${start.getHours()}:${start.getMinutes()}`),
    durationHours: 1,
    durationMinutes: 0,
    timezone: browserTimeZone(),
    hostVideoOn: true,
    participantVideoOn: true,
    muteOnEntry: false,
  };
}

/** Prefills the edit form with the wall-clock date and time in the meeting's own zone. */
export function formValuesFromMeeting(meeting: MeetingOut): ScheduleFormValues {
  const duration = meeting.duration_minutes ?? 60;
  return {
    title: meeting.title,
    description: meeting.description ?? "",
    date: meeting.start_date ?? "",
    ...to12Hour(meeting.start_time ?? "09:00"),
    durationHours: Math.floor(duration / 60),
    durationMinutes: duration % 60,
    timezone: meeting.timezone ? currentZoneName(meeting.timezone) : browserTimeZone(),
    hostVideoOn: meeting.host_video_on,
    participantVideoOn: meeting.participant_video_on,
    muteOnEntry: meeting.mute_on_entry,
  };
}

export function totalDuration(values: ScheduleFormValues): number {
  return values.durationHours * 60 + values.durationMinutes;
}

export interface ScheduleFormErrors {
  title: string | null;
  date: string | null;
  duration: string | null;
}

/** The checks the browser can make. The server repeats them and also rejects past start times. */
export function validateForm(values: ScheduleFormValues): ScheduleFormErrors {
  const duration = totalDuration(values);
  return {
    title: values.title.trim() === "" ? "Enter a topic for the meeting." : null,
    date: values.date === "" ? "Choose a date." : null,
    duration:
      duration < MIN_DURATION || duration > MAX_DURATION
        ? "The duration must be between 15 minutes and 24 hours."
        : null,
  };
}

export function hasErrors(errors: ScheduleFormErrors): boolean {
  return errors.title !== null || errors.date !== null || errors.duration !== null;
}

export function toScheduleIn(values: ScheduleFormValues): ScheduleIn {
  const description = values.description.trim();
  return {
    title: values.title,
    description: description === "" ? null : description,
    start_date: values.date,
    start_time: to24Hour(values.time, values.meridiem),
    timezone: values.timezone,
    duration_minutes: totalDuration(values),
    mute_on_entry: values.muteOnEntry,
    host_video_on: values.hostVideoOn,
    participant_video_on: values.participantVideoOn,
  };
}

/** "14:30" (or "14:5") → { time: "2:30", meridiem: "PM" }. 00:xx is 12:xx AM. */
export function to12Hour(time24: string): { time: string; meridiem: Meridiem } {
  const [hours, minutes] = time24.split(":").map(Number);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return {
    time: `${hour12}:${String(minutes).padStart(2, "0")}`,
    meridiem: hours < 12 ? "AM" : "PM",
  };
}

/** ("2:30", "PM") → "14:30"; ("12:00", "AM") → "00:00". */
export function to24Hour(time12: string, meridiem: Meridiem): string {
  const [hour12, minutes] = time12.split(":").map(Number);
  const hours = (hour12 % 12) + (meridiem === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Adds `value` to the end of `options` if it's missing. A meeting made through
 * the API could have, say, a 40-minute duration; without this the select would
 * show the wrong value and Save would quietly change it.
 */
export function withValue<T extends string | number>(options: T[], value: T): T[] {
  return options.includes(value) ? options : [...options, value];
}

/** The local date as "YYYY-MM-DD" (toISOString would give the UTC date). */
function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
