/** "12345678901" → "123 4567 8901", the way Zoom groups an 11-digit meeting ID. */
export function formatMeetingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3, 7)} ${code.slice(7)}`;
}
