import { API_URL } from "@/lib/config";
import type { HealthOut } from "@/types/api";

/** Thrown for any non-2xx response. The message is the server's `detail` when it sent one. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  // The backend's response model guarantees this shape; types/api.ts mirrors it.
  return (await response.json()) as T;
}

/** FastAPI errors look like {"detail": "..."}. Anything else gets a generic message. */
async function readErrorDetail(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail;
    }
    return fallback;
  } catch {
    return fallback; // The body wasn't JSON.
  }
}

export function getHealth(): Promise<HealthOut> {
  return request<HealthOut>("/api/health");
}
