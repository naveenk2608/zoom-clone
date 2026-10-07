import clsx from "clsx";
import { ChevronUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RoomMenu, RoomMenuContent, RoomMenuTrigger } from "@/components/meeting/RoomMenu";
import { NotAvailable, Tooltip } from "@/components/ui/Tooltip";

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
 * The look of every toolbar button. `active` marks the button of an open panel;
 * a disabled one is dimmed and doesn't light up under the pointer.
 * A narrow toolbar uses slightly smaller buttons, so five fit on a 360px phone.
 */
export function toolbarButtonClasses(active?: boolean, disabled?: boolean): string {
  return clsx(
    "flex w-16 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] text-white",
    "@3xl:w-18 @3xl:px-1 @3xl:text-xs",
    disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/10",
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

/** What the ^ next to a toolbar button opens. */
export type CaretMenu = {
  label: string; // the ^ button's name for screen readers, such as "Audio settings"
  items: ReactNode;
};

type ToolbarButtonProps = ToolbarButtonFaceProps & {
  onClick?: () => void; // without it the button is a placeholder
  ariaLabel?: string; // when the icon's meaning differs from the visible label
  active?: boolean; // its panel is open
  disabledReason?: string; // given: the button is disabled, and its tooltip says why
  caret?: boolean; // Zoom's ^ next to the icon; a placeholder unless `menu` is given
  menu?: CaretMenu;
  show?: ToolbarShow;
};

// The ^ is only shown on a wide toolbar; a narrow one has no room for it.
const CARET_CLASSES = "-ml-1 hidden rounded p-1 text-white/80 hover:bg-white/10 @3xl:block";

/** One button of the room toolbar: an icon with a label under it, and maybe a ^ menu beside it. */
export function ToolbarButton({
  onClick,
  ariaLabel,
  active,
  disabledReason,
  caret,
  menu,
  show = "always",
  ...face
}: ToolbarButtonProps) {
  const disabled = disabledReason !== undefined;
  const button = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      // aria-disabled rather than disabled: a disabled button gets no hover or
      // focus, so its tooltip couldn't explain why.
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={toolbarButtonClasses(active, disabled)}
    >
      <ToolbarButtonFace {...face} />
    </button>
  );

  let shown = button;
  if (disabledReason !== undefined) {
    shown = <Tooltip content={disabledReason}>{button}</Tooltip>;
  } else if (onClick === undefined) {
    shown = <NotAvailable>{button}</NotAvailable>;
  }

  return (
    <div className={clsx("items-center", SHOW_CLASSES[show])}>
      {shown}
      {menu !== undefined ? (
        <RoomMenu>
          <RoomMenuTrigger asChild>
            <button
              type="button"
              aria-label={menu.label}
              className={clsx(CARET_CLASSES, "data-[state=open]:bg-white/10")}
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
          </RoomMenuTrigger>
          <RoomMenuContent side="top" align="start">
            {menu.items}
          </RoomMenuContent>
        </RoomMenu>
      ) : (
        caret && (
          <NotAvailable>
            <button type="button" aria-label={`${face.label} options`} className={CARET_CLASSES}>
              <ChevronUp size={14} aria-hidden="true" />
            </button>
          </NotAvailable>
        )
      )}
    </div>
  );
}
