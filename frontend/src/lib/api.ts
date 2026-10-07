import { API_URL } from "@/lib/config";
import type {
  InstantIn,
  JoinIn,
  JoinOut,
  MeetingOut,
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

/** Sends a request and throws ApiError unless the response is 2xx. */
async function send(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  const hasBody = body !== undefined;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  return response;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body);
  // The backend's response model guarantees this shape; types/api.ts mirrors it.
  return (await response.json()) as T;
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

export function createInstantMeeting(body: InstantIn = {}): Promise<JoinOut> {
  return request("POST", "/api/meetings/instant", body);
}

export function scheduleMeeting(body: ScheduleIn): Promise<MeetingOut> {
  return request("POST", "/api/meetings", body);
}

export function updateMeeting(code: string, body: ScheduleIn): Promise<MeetingOut> {
  return request("PUT", `/api/meetings/${code}`, body);
}

export async function cancelMeeting(code: string): Promise<void> {
  await send("DELETE", `/api/meetings/${code}`); // 204: no body to read
}

export function startMeeting(code: string): Promise<JoinOut> {
  return request("POST", `/api/meetings/${code}/start`);
}

export function joinMeeting(code: string, body: JoinIn): Promise<JoinOut> {
  return request("POST", `/api/meetings/${code}/join`, body);
}
