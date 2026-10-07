import { LayoutGrid, ShieldCheck } from "lucide-react";

import { MeetingInfoPopover } from "@/components/meeting/MeetingInfoPopover";
import { NotAvailable } from "@/components/ui/Tooltip";
import type { MeetingOut } from "@/types/api";

type RoomHeaderProps = {
  meeting: MeetingOut;
  isHost: boolean;
};

/** The bar above the tiles: the info popover on the left, two placeholder icons on the right. */
export function RoomHeader({ meeting, isHost }: RoomHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 bg-room-bar px-3 text-white">
      <MeetingInfoPopover meeting={meeting} isHost={isHost} />
      <div className="flex items-center gap-1">
        <NotAvailable>
          <button type="button" aria-label="Meeting is encrypted" className="rounded p-1.5 hover:bg-white/10">
            <ShieldCheck size={18} className="text-zoom-green" aria-hidden="true" />
          </button>
        </NotAvailable>
        <NotAvailable>
          <button type="button" aria-label="Change view" className="rounded p-1.5 hover:bg-white/10">
            <LayoutGrid size={18} aria-hidden="true" />
          </button>
        </NotAvailable>
      </div>
    </header>
  );
}
