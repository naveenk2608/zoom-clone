// The field groups of the Schedule form that hold more than one input.

import type { ReactNode } from "react";

import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  TIME_OPTIONS,
  withValue,
  type ScheduleFormValues,
} from "@/components/schedule/scheduleFormValues";
import { Input } from "@/components/ui/Input";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Select } from "@/components/ui/Select";

type FieldsProps = {
  values: ScheduleFormValues;
  onChange: (changes: Partial<ScheduleFormValues>) => void;
};

/** When: a date, a half-hour time and AM/PM. */
export function WhenFields({ values, onChange }: FieldsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-60">
        <Input
          type="date"
          aria-label="Start date"
          value={values.date}
          onChange={(event) => onChange({ date: event.target.value })}
        />
      </div>
      <Select
        aria-label="Start time"
        wrapperClassName="w-48"
        value={values.time}
        onChange={(event) => onChange({ time: event.target.value })}
      >
        {withValue(TIME_OPTIONS, values.time).map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </Select>
      <Select
        aria-label="AM or PM"
        wrapperClassName="w-26"
        value={values.meridiem}
        onChange={(event) => onChange({ meridiem: event.target.value === "PM" ? "PM" : "AM" })}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </Select>
    </div>
  );
}

/** Duration: hours (0–24) and minutes (quarter hours). */
export function DurationFields({ values, onChange }: FieldsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[15px]">
      <Select
        aria-label="Duration hours"
        wrapperClassName="w-28 md:w-36"
        value={values.durationHours}
        onChange={(event) => onChange({ durationHours: Number(event.target.value) })}
      >
        {HOUR_OPTIONS.map((hours) => (
          <option key={hours} value={hours}>
            {hours}
          </option>
        ))}
      </Select>
      <span className="mr-2">hr</span>
      <Select
        aria-label="Duration minutes"
        wrapperClassName="w-28 md:w-36"
        value={values.durationMinutes}
        onChange={(event) => onChange({ durationMinutes: Number(event.target.value) })}
      >
        {withValue(MINUTE_OPTIONS, values.durationMinutes).map((minutes) => (
          <option key={minutes} value={minutes}>
            {minutes}
          </option>
        ))}
      </Select>
      <span>min</span>
    </div>
  );
}

type OnOff = "on" | "off";

const ON_OFF_OPTIONS: { value: OnOff; label: string }[] = [
  { value: "on", label: "on" },
  { value: "off", label: "off" },
];

/** Video: whether the host's and the participants' cameras start on. */
export function VideoFields({ values, onChange }: FieldsProps) {
  return (
    <div className="flex flex-col">
      <VideoRow label="Host">
        <RadioGroup
          name="host-video"
          label="Host video"
          value={values.hostVideoOn ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ hostVideoOn: value === "on" })}
        />
      </VideoRow>
      <VideoRow label="Participant">
        <RadioGroup
          name="participant-video"
          label="Participant video"
          value={values.participantVideoOn ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ participantVideoOn: value === "on" })}
        />
      </VideoRow>
    </div>
  );
}

function VideoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-9 items-center">
      <span className="w-34 shrink-0 text-[15px]">{label}</span>
      {children}
    </div>
  );
}
