"use client";

import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useResource } from "@/hooks/useResource";
import { getRecentMeetings, getUpcomingMeetings } from "@/lib/api";

/** Home: the dashboard. */
export default function HomePage() {
  const upcoming = useResource(getUpcomingMeetings);
  const recent = useResource(getRecentMeetings);

  return (
    <PortalLayout>
      <h1 className="sr-only">Home</h1>
      {/* Two columns on wide screens; below lg the right column moves under the main one. */}
      <div className="mx-auto grid max-w-285 gap-6 px-4 py-6 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_328px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileCard />
          <RecentMeetings resource={recent.resource} onRetry={recent.reload} />
        </div>
        <div className="flex flex-col gap-6">
          <QuickActions />
          <UpcomingMeetings resource={upcoming.resource} onRetry={upcoming.reload} />
        </div>
      </div>
    </PortalLayout>
  );
}
