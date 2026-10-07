"use client";

import * as Popover from "@radix-ui/react-popover";
import { Copy, Info } from "lucide-react";

import { useCopyText } from "@/hooks/useCopyText";
import { formatMeetingCode } from "@/lib/meetingCode";
import type { MeetingOut } from "@/types/api";

type MeetingInfoPopoverProps = {
  meeting: MeetingOut;
  isHost: boolean; // we are the host, so the Host row reads "(You)"
};

/** The ⓘ icon and title in the header; clicking opens the meeting's invite link, ID and host. */
export function MeetingInfoPopover({ meeting, isHost }: MeetingInfoPopoverProps) {
  const copyText = useCopyText();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Meeting information"
          className="flex min-w-0 items-center gap-2 rounded px-1 py-1 text-sm font-semibold hover:bg-white/10"
        >
          <Info size={16} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{meeting.title}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-40 w-[calc(100vw-1rem)] max-w-100 rounded-xl border border-white/10 bg-room-panel p-3 text-white shadow-xl"
        >
          <h2 className="rounded-lg bg-room-panel-raised px-3 py-3 text-lg font-bold wrap-break-word">
            {meeting.title}
          </h2>
          <dl className="mt-3 grid grid-cols-[6.5rem_1fr] items-center gap-x-2 gap-y-3 px-1 text-sm">
            <dt className="text-white/70">Invite Link</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[#4a8bff]">{meeting.invite_link}</span>
              <button
                type="button"
                aria-label="Copy invite link"
                onClick={() => copyText(meeting.invite_link, "Invite link copied")}
                className="shrink-0 rounded-md border border-white/30 p-1.5 hover:bg-white/10"
              >
                <Copy size={16} aria-hidden="true" />
              </button>
            </dd>
            <dt className="text-white/70">Meeting ID</dt>
            <dd>{formatMeetingCode(meeting.meeting_code)}</dd>
            <dt className="text-white/70">Host</dt>
            <dd>{isHost ? `${meeting.host.name} (You)` : meeting.host.name}</dd>
          </dl>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
