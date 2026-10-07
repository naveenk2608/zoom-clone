import clsx from "clsx";
import { ChevronUp, type LucideIcon } from "lucide-react";

import { NotAvailable } from "@/components/ui/Tooltip";

/**
 * Where a toolbar button shows. The toolbar is a CSS container, so "wide" and
 * "narrow" mean the toolbar's own width, not the screen's: an open side panel
 * makes it narrow on a laptop too. The full toolbar needs about 48rem (@3xl).
 */
export type ToolbarShow = "always" | "wide" | "narrow";

export const SHOW_CLASSES: Record<ToolbarShow, string> = {
  always: "flex",
  wide: "hidden @3xl:flex", // when the toolbar is narrow, the More menu offers it instead
  narrow: "flex @3xl:hidden",
};

/**
 * The look of every toolbar button. `active` marks the button of an open panel.
 * A narrow toolbar uses slightly smaller buttons, so five fit on a 360px phone.
 */
export function toolbarButtonClasses(active?: boolean): string {
  return clsx(
    "flex w-16 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] text-white hover:bg-white/10",
    "@3xl:w-18 @3xl:px-1 @3xl:text-xs",
    active && "bg-room-btn-active",
  );
}

export type ToolbarButtonFaceProps = {
  icon: LucideIcon;
  label: string;
  iconClassName?: string; // for example a red icon for a muted mic
  badge?: number; // a small count above the icon, such as the participant count
  alertBadge?: boolean; // show the count as a red dot with a number, as for unread chat
};

/** What a toolbar button shows: the icon, an optional count, and the label under it. */
export function ToolbarButtonFace({
  icon: Icon,
  label,
  iconClassName,
  badge,
  alertBadge,
}: ToolbarButtonFaceProps) {
  return (
    <>
      <span className="relative">
        <Icon size={24} strokeWidth={1.5} aria-hidden="true" className={iconClassName} />
        {badge !== undefined && (
          <span
            className={clsx(
              "absolute -top-1 -right-3 text-[11px] leading-none",
              alertBadge ? "min-w-4 rounded-full bg-zoom-red px-1 py-0.5 text-center text-white" : "text-white/80",
            )}
          >
            {badge}
          </span>
        )}
      </span>
      {label}
    </>
  );
}

type ToolbarButtonProps = ToolbarButtonFaceProps & {
  onClick?: () => void; // without it the button is a placeholder
  ariaLabel?: string; // when the icon's meaning differs from the visible label
  active?: boolean; // its panel is open
  caret?: boolean; // Zoom's ^ menu next to the icon; a placeholder here
  show?: ToolbarShow;
};

/** One button of the room toolbar: an icon with a label under it. */
export function ToolbarButton({
  onClick,
  ariaLabel,
  active,
  caret,
  show = "always",
  ...face
}: ToolbarButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={toolbarButtonClasses(active)}
    >
      <ToolbarButtonFace {...face} />
    </button>
  );

  return (
    <div className={clsx("items-center", SHOW_CLASSES[show])}>
      {onClick === undefined ? <NotAvailable>{button}</NotAvailable> : button}
      {caret && (
        <NotAvailable>
          <button
            type="button"
            aria-label={`${face.label} options`}
            className="-ml-1 hidden rounded p-1 text-white/80 hover:bg-white/10 @3xl:block"
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
        </NotAvailable>
      )}
    </div>
  );
}
