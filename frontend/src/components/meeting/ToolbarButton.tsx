import clsx from "clsx";
import { ChevronUp, type LucideIcon } from "lucide-react";

import { NotAvailable } from "@/components/ui/Tooltip";

type ToolbarButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void; // without it the button is a placeholder
  ariaLabel?: string; // when the icon's meaning differs from the visible label
  active?: boolean; // its panel is open
  iconClassName?: string; // for example a red icon for a muted mic
  badge?: number; // a small count above the icon, such as the participant count
  caret?: boolean; // Zoom's ^ menu next to the icon; a placeholder here
  hideOnSmall?: boolean; // hidden below `md`, where the toolbar keeps only the essentials
};

/** One button of the room toolbar: an icon with a label under it. */
export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  ariaLabel,
  active,
  iconClassName,
  badge,
  caret,
  hideOnSmall,
}: ToolbarButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "flex w-18 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-xs text-white hover:bg-white/10",
        active && "bg-room-btn-active",
      )}
    >
      <span className="relative">
        <Icon size={24} strokeWidth={1.5} aria-hidden="true" className={iconClassName} />
        {badge !== undefined && (
          <span className="absolute -top-1 -right-3 text-[11px] leading-none text-white/80">{badge}</span>
        )}
      </span>
      {label}
    </button>
  );

  return (
    <div className={clsx("items-center", hideOnSmall ? "hidden md:flex" : "flex")}>
      {onClick === undefined ? <NotAvailable>{button}</NotAvailable> : button}
      {caret && (
        <NotAvailable>
          <button
            type="button"
            aria-label={`${label} options`}
            className="-ml-1 hidden rounded p-1 text-white/80 hover:bg-white/10 md:block"
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
        </NotAvailable>
      )}
    </div>
  );
}
