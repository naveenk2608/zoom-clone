// Next.js inlines NEXT_PUBLIC_ variables into the browser bundle at build time,
// and only for literal `process.env.NEXT_PUBLIC_...` reads. So each variable is
// read by its full name below and then checked.

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. See frontend/.env.example.`);
  }
  return value;
}

export const API_URL = requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
export const WS_URL = requireEnv("NEXT_PUBLIC_WS_URL", process.env.NEXT_PUBLIC_WS_URL);

// Optional: a TURN server for networks where a direct connection fails.
export const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL ?? "";
export const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME ?? "";
export const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "";
