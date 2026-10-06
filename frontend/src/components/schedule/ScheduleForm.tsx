"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FieldError, FORM_LINK_CLASSES, FormRow } from "@/components/schedule/FormRow";
import { DurationFields, VideoFields, WhenFields } from "@/components/schedule/ScheduleFields";
import {
  defaultFormValues,
  formValuesFromMeeting,
  hasErrors,
  toScheduleIn,
  validateForm,
  type ScheduleFormValues,
} from "@/components/schedule/scheduleFormValues";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, scheduleMeeting, updateMeeting } from "@/lib/api";
import { browserTimeZone, timeZoneOptions } from "@/lib/timezones";
import type { MeetingOut } from "@/types/api";

type ScheduleFormProps = {
  meeting?: MeetingOut; // given when editing; a new meeting otherwise
};

/**
 * The Schedule Meeting form, for both creating and editing. Its defaults come
 * from the browser's clock and time zone, so it must only render in the browser.
 */
export function ScheduleForm({ meeting }: ScheduleFormProps) {
  const router = useRouter();
  const showToast = useToast();

  const [values, setValues] = useState<ScheduleFormValues>(() =>
    meeting ? formValuesFromMeeting(meeting) : defaultFormValues(new Date()),
  );
  // Worked out once: about 400 zones, each needing its own offset lookup.
  const [zoneOptions] = useState(() =>
    timeZoneOptions([browserTimeZone(), values.timezone], new Date()),
  );
  const [showDescription, setShowDescription] = useState(values.description !== "");
  const [showOptions, setShowOptions] = useState(values.muteOnEntry);
  const [submitted, setSubmitted] = useState(false); // show field errors only after a Save
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = validateForm(values);
  const visibleErrors = submitted ? errors : { title: null, date: null, duration: null };

  function update(changes: Partial<ScheduleFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors)) {
      return;
    }

    setSaving(true);
    setServerError(null);
    try {
      const body = toScheduleIn(values);
      if (meeting) {
        await updateMeeting(meeting.meeting_code, body);
      } else {
        await scheduleMeeting(body);
      }
      showToast(meeting ? "Meeting updated" : "Meeting scheduled");
      router.push("/"); // saving stays true, so Save can't be clicked twice
    } catch (error) {
      setServerError(errorMessage(error)); // e.g. "The start time can't be in the past."
      setSaving(false);
    }
  }

  return (
    // noValidate: our own messages instead of the browser's bubbles.
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormRow label={<><span className="text-zoom-red">*</span> Topic</>} htmlFor="topic">
        <div className="max-w-122">
          <Input
            id="topic"
            maxLength={200}
            value={values.title}
            aria-invalid={visibleErrors.title !== null}
            onChange={(event) => update({ title: event.target.value })}
          />
        </div>
        <FieldError message={visibleErrors.title} />
        {showDescription ? (
          <div className="mt-3 max-w-122">
            <Textarea
              aria-label="Description"
              placeholder="Enter a description"
              maxLength={2000}
              value={values.description}
              onChange={(event) => update({ description: event.target.value })}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className={`${FORM_LINK_CLASSES} mt-4 inline-flex items-center gap-1`}
          >
            <Plus size={16} aria-hidden="true" />
            Add Description
          </button>
        )}
      </FormRow>

      <FormRow label="When">
        <WhenFields values={values} onChange={update} />
        <FieldError message={visibleErrors.date} />
      </FormRow>

      <FormRow label="Duration">
        <DurationFields values={values} onChange={update} />
        <FieldError message={visibleErrors.duration} />
      </FormRow>

      <FormRow label="Time Zone" htmlFor="timezone">
        <Select
          id="timezone"
          wrapperClassName="max-w-122"
          value={values.timezone}
          onChange={(event) => update({ timezone: event.target.value })}
        >
          {zoneOptions.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
        </Select>
      </FormRow>

      <FormRow label="Video">
        <VideoFields values={values} onChange={update} />
      </FormRow>

      <FormRow label="Options">
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            aria-expanded={showOptions}
            onClick={() => setShowOptions((shown) => !shown)}
            className={`${FORM_LINK_CLASSES} md:leading-9`}
          >
            {showOptions ? "Hide" : "Show"}
          </button>
          {showOptions && (
            <Checkbox
              label="Mute participants upon entry"
              checked={values.muteOnEntry}
              onChange={(event) => update({ muteOnEntry: event.target.checked })}
            />
          )}
        </div>
      </FormRow>

      <div className="mt-4">
        {serverError !== null && <p className="mb-4 text-sm text-zoom-red">{serverError}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="px-4" disabled={saving}>
            Save
          </Button>
          <Button variant="neutral" size="sm" className="px-4" onClick={() => router.push("/")}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
