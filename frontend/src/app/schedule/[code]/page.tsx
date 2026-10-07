"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";

import { ScheduleForm } from "@/components/schedule/ScheduleForm";
import { ScheduleLayout } from "@/components/schedule/ScheduleLayout";
import { useResource } from "@/hooks/useResource";
import { getMeeting } from "@/lib/api";
import { ownsMeeting } from "@/lib/hostKeys";
import { isMeetingCode } from "@/lib/meetingCode";
import { INVALID_MEETING_ID } from "@/lib/meetingStatus";
import type { MeetingOut } from "@/types/api";

/** Edit Meeting: the Schedule form, prefilled. */
export default function EditMeetingPage() {
  const { code } = useParams<{ code: string }>();

  return (
    <ScheduleLayout title="Edit Meeting">
      {/* Checked before any request: "/api/meetings/upcoming" is a real path, so "/schedule/upcoming" must not reach it. */}
      {isMeetingCode(code) ? (
        <MeetingLoader code={code} />
      ) : (
        <p className="text-zoom-red">{INVALID_MEETING_ID}</p>
      )}
    </ScheduleLayout>
  );
}

function MeetingLoader({ code }: { code: string }) {
  const loadMeeting = useCallback(() => getMeeting(code), [code]);
  const { resource } = useResource(loadMeeting);

  if (resource.status === "loading") {
    return <p className="text-text-secondary">Loading…</p>;
  }
  if (resource.status === "error") {
    return <p className="text-zoom-red">{resource.message}</p>;
  }
  // The form only renders after the fetch, in the browser, so it needs no ssr: false.
  return <EditableMeeting meeting={resource.data} />;
}

function EditableMeeting({ meeting }: { meeting: MeetingOut }) {
  if (meeting.status === "cancelled") {
    return <p className="text-zoom-red">This meeting has been cancelled.</p>;
  }
  if (meeting.meeting_type === "instant") {
    return <p className="text-zoom-red">An instant meeting can&apos;t be edited.</p>;
  }
  // Without the meeting's host key the server would refuse the save.
  if (!ownsMeeting(meeting)) {
    return <p className="text-zoom-red">Only the host can edit this meeting.</p>;
  }
  return <ScheduleForm meeting={meeting} />;
}
