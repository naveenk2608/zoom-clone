const CODE_PATTERN = /^\d{11}$/; // the same rule as the backend
// "/j/" followed by 11 digits, then the end or the rest of a URL.
const INVITE_LINK_PATTERN = /\/j\/(\d{11})(?:[/?#]|$)/;

/** True for exactly 11 digits, the form a meeting code takes in a URL. */
export function isMeetingCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/** "12345678901" → "123 4567 8901", the way Zoom groups an 11-digit meeting ID. */
export function formatMeetingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3, 7)} ${code.slice(7)}`;
}

/**
 * Reads what someone typed in the Join box: "123 4567 8901", "123-4567-8901",
 * "12345678901" or a full invite link ".../j/12345678901".
 * Returns the 11 digits, or null if it isn't a meeting ID.
 */
export function parseMeetingInput(input: string): string | null {
  const trimmed = input.trim();
  const link = INVITE_LINK_PATTERN.exec(trimmed);
  const candidate = link !== null ? link[1] : trimmed.replace(/[\s-]/g, "");
  return isMeetingCode(candidate) ? candidate : null;
}
