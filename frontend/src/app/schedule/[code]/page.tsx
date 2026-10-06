"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";

import { ScheduleForm } from "@/components/schedule/ScheduleForm";
import { ScheduleLayout } from "@/components/schedule/ScheduleLayout";
import { useResource } from "@/hooks/useResource";
import { getMeeting } from "@/lib/api";
import type { MeetingOut } from "@/types/api";

/** Edit Meeting: the Schedule form, prefilled. */
export default function EditMeetingPage() {
  const { code } = useParams<{ code: string }>();
  const loadMeeting = useCallback(() => getMeeting(code), [code]);
  const { resource } = useResource(loadMeeting);

  return (
    <ScheduleLayout title="Edit Meeting">
      {resource.status === "loading" && <p className="text-text-secondary">Loading…</p>}
      {resource.status === "error" && <p className="text-zoom-red">{resource.message}</p>}
      {/* The form only renders after the fetch, in the browser, so it needs no ssr: false. */}
      {resource.status === "ready" && <EditableMeeting meeting={resource.data} />}
    </ScheduleLayout>
  );
}

function EditableMeeting({ meeting }: { meeting: MeetingOut }) {
  if (meeting.status === "cancelled") {
    return <p className="text-zoom-red">This meeting has been cancelled.</p>;
  }
  if (meeting.meeting_type === "instant") {
    return <p className="text-zoom-red">An instant meeting can&apos;t be edited.</p>;
  }
  return <ScheduleForm meeting={meeting} />;
}
