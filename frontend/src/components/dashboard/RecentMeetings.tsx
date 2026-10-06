import { Video } from "lucide-react";

import { EmptyBoxIllustration } from "@/components/dashboard/EmptyBoxIllustration";
import { ListError, ListLoading } from "@/components/dashboard/ListStatus";
import { Card } from "@/components/ui/Card";
import type { Resource } from "@/hooks/useResource";
import { formatDuration, formatShortDate, formatTimeRange } from "@/lib/datetime";
import { formatMeetingCode } from "@/lib/meetingCode";
import type { RecentMeetingOut } from "@/types/api";

type RecentMeetingsProps = {
  resource: Resource<RecentMeetingOut[]>;
  onRetry: () => void;
};

/** Meetings that actually happened, styled like Zoom's "Recent activity" card. */
export function RecentMeetings({ resource, onRetry }: RecentMeetingsProps) {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-zoom-navy">Recent meetings</h2>
      <div className="mt-5 border-t border-black/10">
        <RecentList resource={resource} onRetry={onRetry} />
      </div>
    </Card>
  );
}

function RecentList({ resource, onRetry }: RecentMeetingsProps) {
  if (resource.status === "loading") {
    return <ListLoading />;
  }
  if (resource.status === "error") {
    return <ListError message={resource.message} onRetry={onRetry} />;
  }
  if (resource.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <EmptyBoxIllustration />
        <p className="text-lg font-semibold">No recent meetings</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-black/10">
      {resource.data.map((meeting) => (
        <li key={meeting.session_id}>
          <RecentMeetingRow meeting={meeting} />
        </li>
      ))}
    </ul>
  );
}

function RecentMeetingRow({ meeting }: { meeting: RecentMeetingOut }) {
  const start = new Date(meeting.started_at);
  const end = new Date(meeting.ended_at);
  const people = meeting.participant_count === 1 ? "participant" : "participants";

  return (
    <div className="flex items-start gap-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-active text-zoom-blue-bright">
        <Video size={20} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <p className="font-semibold wrap-break-word">{meeting.title}</p>
          <p className="text-sm text-text-secondary">
            {formatShortDate(start)} · {formatTimeRange(start, end)}
          </p>
        </div>
        <div className="text-sm text-text-secondary sm:text-right">
          <p>
            {formatDuration(meeting.duration_minutes)} · {meeting.participant_count} {people}
          </p>
          <p>Meeting ID: {formatMeetingCode(meeting.meeting_code)}</p>
        </div>
      </div>
    </div>
  );
}
