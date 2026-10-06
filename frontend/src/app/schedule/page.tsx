"use client";

import dynamic from "next/dynamic";

import { ScheduleLayout } from "@/components/schedule/ScheduleLayout";

// The form's defaults (today's date, the next half hour, the browser's time
// zone) only exist in the browser. Rendering it on the server too would give
// the server's values, and React would report a hydration mismatch.
const ScheduleForm = dynamic(
  () => import("@/components/schedule/ScheduleForm").then((module) => module.ScheduleForm),
  { ssr: false },
);

/** Schedule Meeting: a new scheduled meeting. */
export default function ScheduleMeetingPage() {
  return (
    <ScheduleLayout title="Schedule Meeting">
      <ScheduleForm />
    </ScheduleLayout>
  );
}
