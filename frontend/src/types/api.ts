// Mirrors the backend's Pydantic models in backend/app/schemas.
// Datetimes arrive as ISO 8601 strings with an offset; dates as "YYYY-MM-DD".

export interface UserOut {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
}

export type MeetingType = "instant" | "scheduled";

export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface HostOut {
  name: string;
  avatar_color: string;
}

export interface MeetingOut {
  meeting_code: string;
  title: string;
  description: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  scheduled_start: string | null; // UTC
  start_date: string | null; // wall-clock date in the meeting's own time zone
  start_time: string | null; // wall-clock "HH:MM" in the meeting's own time zone
  duration_minutes: number | null;
  timezone: string | null;
  mute_on_entry: boolean;
  host_video_on: boolean;
  participant_video_on: boolean;
  invite_link: string;
  host: HostOut;
  has_host_key: boolean; // Start, Edit and Delete then need the key from the browser that created it
  created_at: string;
}

/** The answer to scheduling a meeting: the only time its host key is sent. */
export interface MeetingWithKeyOut extends MeetingOut {
  host_key: string;
}

export interface RecentMeetingOut {
  session_id: number;
  meeting_code: string;
  title: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number; // how long it actually ran, rounded
  participant_count: number;
}

export interface InstantIn {
  title?: string;
}

export interface ScheduleIn {
  title: string;
  description: string | null;
  start_date: string; // "YYYY-MM-DD"
  start_time: string; // 24-hour "HH:MM"
  timezone: string; // IANA name, e.g. "Asia/Kolkata"
  duration_minutes: number;
  mute_on_entry: boolean;
  host_video_on: boolean;
  participant_video_on: boolean;
}

export interface JoinIn {
  display_name: string; // 1–100 characters after trimming
}

export type ParticipantRole = "host" | "attendee";

export interface ParticipantOut {
  id: number;
  display_name: string;
  role: ParticipantRole;
}

export interface JoinOut {
  meeting: MeetingOut;
  participant: ParticipantOut;
  join_token: string; // sent with the WebSocket connection to prove who this is
}

/** The answer to New meeting: the only time its host key is sent. */
export interface JoinWithKeyOut extends JoinOut {
  host_key: string;
}

/** One STUN or TURN server, from GET /api/ice-servers. Fits RTCPeerConnection's `iceServers`. */
export interface IceServerOut {
  urls: string[];
  username?: string; // TURN only: "<expiry unix time>:zoomclone", valid for 24 hours
  credential?: string; // TURN only
}
