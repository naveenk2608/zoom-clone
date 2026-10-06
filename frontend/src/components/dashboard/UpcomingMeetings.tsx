import { ListError, ListLoading } from "@/components/dashboard/ListStatus";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import { Card } from "@/components/ui/Card";
import type { Resource } from "@/hooks/useResource";
import { groupUpcoming } from "@/lib/datetime";
import type { MeetingOut } from "@/types/api";

type UpcomingMeetingsProps = {
  resource: Resource<MeetingOut[]>;
  onRetry: () => void;
  onChanged: () => void; // a meeting was deleted, so the list must reload
};

/** The right-hand card on Home: the user's live and scheduled meetings, by day. */
export function UpcomingMeetings(props: UpcomingMeetingsProps) {
  return (
    <Card className="p-6">
      <h2 className="text-[22px] font-bold text-zoom-navy">Upcoming meetings</h2>
      <div className="mt-5">
        <UpcomingList {...props} />
      </div>
    </Card>
  );
}

function UpcomingList({ resource, onRetry, onChanged }: UpcomingMeetingsProps) {
  if (resource.status === "loading") {
    return <ListLoading />;
  }
  if (resource.status === "error") {
    return <ListError message={resource.message} onRetry={onRetry} />;
  }
  if (resource.data.length === 0) {
    return <p className="py-8 text-center text-text-secondary">No upcoming meetings</p>;
  }

  const groups = groupUpcoming(resource.data, new Date());
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xl">{group.label}</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {group.meetings.map((meeting) => (
              <li key={meeting.meeting_code}>
                <MeetingCard meeting={meeting} onDeleted={onChanged} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
