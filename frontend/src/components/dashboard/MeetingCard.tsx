"use client";

import { Copy } from "lucide-react";

import { MeetingCardMenu } from "@/components/dashboard/MeetingCardMenu";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useStartMeeting } from "@/hooks/useStartMeeting";
import { meetingTimeText } from "@/lib/datetime";
import { buildInvitation } from "@/lib/invitation";
import { formatMeetingCode } from "@/lib/meetingCode";
import type { MeetingOut } from "@/types/api";

type MeetingCardProps = {
  meeting: MeetingOut;
  onDeleted: () => void;
};

/** One meeting in the Upcoming list. */
export function MeetingCard({ meeting, onDeleted }: MeetingCardProps) {
  const showToast = useToast();
  const { pending, startScheduledMeeting } = useStartMeeting();
  const isLive = meeting.status === "live";

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(buildInvitation(meeting));
      showToast("Invitation copied");
    } catch {
      // The clipboard needs a secure context (https or localhost) and the page in focus.
      showToast("Couldn't copy the invitation");
    }
  }

  return (
    <article className="rounded-2xl border border-black/10 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold wrap-break-word text-zoom-blue-title">{meeting.title}</h4>
          <p className="mt-1 font-bold">{meetingTimeText(meeting)}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Meeting ID: {formatMeetingCode(meeting.meeting_code)}
          </p>
        </div>
        {/* Starts the meeting, or rejoins it as host if it's already running. */}
        <Button
          size="sm"
          onClick={() => startScheduledMeeting(meeting.meeting_code)}
          disabled={pending}
          aria-label={`${isLive ? "Join" : "Start"} ${meeting.title}`}
        >
          {isLive ? "Join" : "Start"}
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="neutral" size="sm" onClick={copyInvitation}>
          <Copy size={14} aria-hidden="true" />
          Copy Invitation
        </Button>
        {/* Instant meetings can't be edited, and a live one can't be deleted. */}
        {meeting.meeting_type === "scheduled" && (
          <div className="ml-auto">
            <MeetingCardMenu meeting={meeting} onDeleted={onDeleted} />
          </div>
        )}
      </div>
    </article>
  );
}
