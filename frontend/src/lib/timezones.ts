// The Time Zone dropdown on the Schedule form, labelled like Zoom's:
// "(GMT+5:30) Asia/Kolkata", sorted by offset.

export interface TimeZoneOption {
  value: string; // IANA name, sent to the API
  label: string;
}

// Chrome still reports these zones by their old names (it says "Asia/Calcutta"
// for India). Both Chrome and the server accept the current names, so we use those.
const RENAMED_ZONES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "America/Godthab": "America/Nuuk",
};

export function currentZoneName(zone: string): string {
  return RENAMED_ZONES[zone] ?? zone;
}

export function browserTimeZone(): string {
  return currentZoneName(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * Every zone the browser knows, plus `mustInclude` (the browser's own zone and
 * the meeting's zone, in case the list lacks them). Offsets are taken at `at`,
 * so a label can be an hour off for a date on the other side of a
 * daylight-saving change. The server converts with the real date, so the saved
 * time is always right.
 */
export function timeZoneOptions(mustInclude: string[], at: Date): TimeZoneOption[] {
  const zones = new Set<string>();
  for (const zone of [...Intl.supportedValuesOf("timeZone"), ...mustInclude]) {
    zones.add(currentZoneName(zone)); // a Set, so a renamed zone appears once
  }

  return [...zones]
    .map((zone) => ({ zone, offset: utcOffsetMinutes(zone, at) }))
    .sort((a, b) => a.offset - b.offset || a.zone.localeCompare(b.zone))
    .map(({ zone, offset }) => ({ value: zone, label: `(${formatOffset(offset)}) ${zone}` }));
}

/** Minutes ahead of UTC, e.g. 330 for India. Intl reports it as "GMT+05:30" (or "GMT" for 0). */
function utcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
  if (match === null) {
    return 0; // plain "GMT"
  }
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** 330 → "GMT+5:30", -420 → "GMT-7:00", 0 → "GMT+0:00" */
function formatOffset(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "+";
  const minutes = Math.abs(totalMinutes);
  const hours = Math.floor(minutes / 60);
  return `GMT${sign}${hours}:${String(minutes % 60).padStart(2, "0")}`;
}
