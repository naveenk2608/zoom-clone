import { ExternalLink, Minimize2, X } from "lucide-react";
import type { ReactNode } from "react";

import { NotAvailable } from "@/components/ui/Tooltip";

type RoomPanelProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** The frame of a side panel: a centered title with minimize, pop-out and close, then the content. */
export function RoomPanel({ title, onClose, children }: RoomPanelProps) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-room-panel text-white"
    >
      <div className="flex h-12 shrink-0 items-center border-b border-white/10 px-3">
        <h2 className="flex-1 pl-14 text-center text-[15px] font-bold">{title}</h2>
        <div className="flex w-14 items-center justify-end gap-1">
          <NotAvailable>
            <button type="button" aria-label="Minimize" className="rounded p-1 hover:bg-white/10">
              <Minimize2 size={16} aria-hidden="true" />
            </button>
          </NotAvailable>
          <NotAvailable>
            <button type="button" aria-label="Pop out" className="rounded p-1 hover:bg-white/10">
              <ExternalLink size={16} aria-hidden="true" />
            </button>
          </NotAvailable>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}
