import clsx from "clsx";
import { Calendar, SquarePlus, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { NotAvailable } from "@/components/ui/Tooltip";

const ACTION_CLASSES = "flex flex-col items-center gap-2 rounded-xl p-1 hover:brightness-95";
const TILE_CLASSES = "flex size-13 items-center justify-center rounded-xl text-white";
const LABEL_CLASSES = "text-[13px] font-semibold text-text-secondary";

/** The three big buttons at the top right of Home. */
export function QuickActions() {
  return (
    <Card className="grid grid-cols-3 px-4 py-6">
      <QuickActionLink href="/schedule" label="Schedule" icon={<ScheduleIcon />} />
      <QuickActionLink href="/join" label="Join" icon={<SquarePlus size={26} />} />
      <NotAvailable>
        <button type="button" aria-disabled="true" className={ACTION_CLASSES}>
          <span className={clsx(TILE_CLASSES, "bg-zoom-orange")}>
            <Video size={28} fill="currentColor" />
          </span>
          <span className={LABEL_CLASSES}>New meeting</span>
        </button>
      </NotAvailable>
    </Card>
  );
}

type QuickActionLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
};

function QuickActionLink({ href, label, icon }: QuickActionLinkProps) {
  return (
    <Link href={href} className={ACTION_CLASSES}>
      <span className={clsx(TILE_CLASSES, "bg-zoom-blue-bright")}>{icon}</span>
      <span className={LABEL_CLASSES}>{label}</span>
    </Link>
  );
}

/** A calendar with a day number on it, like Zoom's Schedule icon. */
function ScheduleIcon() {
  return (
    <span className="relative flex">
      <Calendar size={26} />
      <span className="absolute inset-x-0 bottom-[4px] text-center text-[9px] leading-none font-bold">
        19
      </span>
    </span>
  );
}
