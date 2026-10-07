import { ShieldCheck } from "lucide-react";

import { MeetingInfoPopover } from "@/components/meeting/MeetingInfoPopover";
import { ViewMenu, type RoomView } from "@/components/meeting/ViewMenu";
import { NotAvailable } from "@/components/ui/Tooltip";
import type { MeetingOut } from "@/types/api";

type RoomHeaderProps = {
  meeting: MeetingOut;
  isHost: boolean;
  view: RoomView;
  onViewChange: (view: RoomView) => void;
};

/** The bar above the tiles: the info popover on the left; the encryption placeholder and the view menu on the right. */
export function RoomHeader({ meeting, isHost, view, onViewChange }: RoomHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 bg-room-bar px-3 text-white">
      <MeetingInfoPopover meeting={meeting} isHost={isHost} />
      <div className="flex items-center gap-1">
        <NotAvailable>
          <button type="button" aria-label="Meeting is encrypted" className="rounded p-1.5 hover:bg-white/10">
            <ShieldCheck size={18} className="text-zoom-green" aria-hidden="true" />
          </button>
        </NotAvailable>
        <ViewMenu view={view} onChange={onViewChange} />
      </div>
    </header>
  );
}
