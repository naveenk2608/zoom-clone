import { API_URL } from "@/lib/config";
import { forgetHostKey, loadHostKey, saveHostKey } from "@/lib/hostKeys";
import type {
  IceServerOut,
  InstantIn,
  JoinIn,
  JoinOut,
  JoinWithKeyOut,
  MeetingOut,
  MeetingWithKeyOut,
  RecentMeetingOut,
  ScheduleIn,
  UserOut,
} from "@/types/api";

/** Thrown for any non-2xx response. The message is the server's `detail` when it sent one. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type ExtraHeaders = Record<string, string>;

/** Sends a request and throws ApiError unless the response is 2xx. */
async function send(
  method: HttpMethod,
  path: string,
  body?: unknown,
  headers: ExtraHeaders = {},
): Promise<Response> {
  const hasBody = body !== undefined;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: hasBody ? { ...headers, "Content-Type": "application/json" } : headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  return response;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  headers?: ExtraHeaders,
): Promise<T> {
  const response = await send(method, path, body, headers);
  // The backend's response model guarantees this shape; types/api.ts mirrors it.
  return (await response.json()) as T;
}

/** The X-Host-Key header for a meeting this browser created; no header otherwise. */
function hostKeyHeader(code: string): ExtraHeaders {
  const key = loadHostKey(code);
  return key === null ? {} : { "X-Host-Key": key };
}

/**
 * FastAPI errors look like {"detail": "..."}. Request validation errors (422)
 * instead carry a list, {"detail": [{"msg": "..."}, ...]}; the first message is shown.
 */
async function readErrorDetail(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("detail" in body)) {
      return fallback;
    }
    const detail = body.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const first: unknown = detail[0];
      if (typeof first === "object" && first !== null && "msg" in first) {
        return String(first.msg);
      }
    }
    return fallback;
  } catch {
    return fallback; // The body wasn't JSON.
  }
}

/** A message the UI can show for anything a request might throw. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  // fetch() itself rejects when the server can't be reached at all.
  return "Could not reach the server. Please try again.";
}

export function getMe(): Promise<UserOut> {
  return request("GET", "/api/me");
}

export function getUpcomingMeetings(): Promise<MeetingOut[]> {
  return request("GET", "/api/meetings/upcoming");
}

export function getRecentMeetings(): Promise<RecentMeetingOut[]> {
  return request("GET", "/api/meetings/recent");
}

export function getMeeting(code: string): Promise<MeetingOut> {
  return request("GET", `/api/meetings/${code}`);
}

// Creating a meeting returns its host key once, so it is saved here, and Start,
// Edit and Delete send it back. Callers never handle the key themselves.

export async function createInstantMeeting(body: InstantIn = {}): Promise<JoinWithKeyOut> {
  const created = await request<JoinWithKeyOut>("POST", "/api/meetings/instant", body);
  saveHostKey(created.meeting.meeting_code, created.host_key);
  return created;
}

export async function scheduleMeeting(body: ScheduleIn): Promise<MeetingWithKeyOut> {
  const created = await request<MeetingWithKeyOut>("POST", "/api/meetings", body);
  saveHostKey(created.meeting_code, created.host_key);
  return created;
}

export function updateMeeting(code: string, body: ScheduleIn): Promise<MeetingOut> {
  return request("PUT", `/api/meetings/${code}`, body, hostKeyHeader(code));
}

export async function cancelMeeting(code: string): Promise<void> {
  await send("DELETE", `/api/meetings/${code}`, undefined, hostKeyHeader(code)); // 204: no body
  forgetHostKey(code); // a cancelled meeting can't be started or edited again
}

export function startMeeting(code: string): Promise<JoinOut> {
  return request("POST", `/api/meetings/${code}/start`, undefined, hostKeyHeader(code));
}

export function joinMeeting(code: string, body: JoinIn): Promise<JoinOut> {
  return request("POST", `/api/meetings/${code}/join`, body);
}

export function getIceServers(): Promise<IceServerOut[]> {
  return request("GET", "/api/ice-servers");
}
