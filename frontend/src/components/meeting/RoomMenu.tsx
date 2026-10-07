"use client";

// Dark dropdown menus for the meeting room. Like the portal's Menu, they are
// Radix menus: Escape, outside clicks and arrow keys work without extra code.

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

export const RoomMenu = DropdownMenu.Root;
export const RoomMenuTrigger = DropdownMenu.Trigger;
export const RoomMenuRadioGroup = DropdownMenu.RadioGroup;

type RoomMenuContentProps = {
  side?: "top" | "bottom"; // "top" for menus opened from the toolbar
  align?: "start" | "end"; // which edge lines up with the trigger
  children: ReactNode;
};

export function RoomMenuContent({ side = "bottom", align = "end", children }: RoomMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        side={side}
        align={align}
        sideOffset={6}
        className="z-50 max-w-[min(24rem,calc(100vw-1rem))] min-w-44 rounded-lg border border-white/10 bg-room-panel-raised py-1 text-white shadow-xl"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

type RoomMenuItemProps = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export function RoomMenuItem({ label, onSelect, disabled }: RoomMenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      // The highlighted background is the focus indicator, so no outline.
      className="cursor-pointer px-4 py-2 text-sm outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-white/10"
    >
      {label}
    </DropdownMenu.Item>
  );
}

type RoomMenuEmojiItemProps = {
  emoji: string;
  label: string; // what a screen reader says instead of the emoji
  onSelect: () => void;
};

/** A square item showing one large emoji, for a row of reactions. */
export function RoomMenuEmojiItem({ emoji, label, onSelect }: RoomMenuEmojiItemProps) {
  return (
    <DropdownMenu.Item
      aria-label={label}
      onSelect={onSelect}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-2xl outline-none data-highlighted:bg-white/10"
    >
      {emoji}
    </DropdownMenu.Item>
  );
}

/** One choice in a RoomMenuRadioGroup, with a tick when it is the group's value. */
export function RoomMenuRadioItem({ value, label }: { value: string; label: string }) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      // Same look as RoomMenuItem, with room for the tick on the left.
      className="flex cursor-pointer items-center gap-2 py-2 pr-4 pl-3 text-sm outline-none data-highlighted:bg-white/10"
    >
      <span className="flex w-4 shrink-0 justify-center">
        <DropdownMenu.ItemIndicator>
          <Check size={16} aria-hidden="true" />
        </DropdownMenu.ItemIndicator>
      </span>
      <span className="truncate">{label}</span>
    </DropdownMenu.RadioItem>
  );
}

/** A small gray heading over a group of items, such as "Select a Microphone". */
export function RoomMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-4 pt-2 pb-1 text-xs font-semibold text-white/60">
      {children}
    </DropdownMenu.Label>
  );
}

export function RoomMenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-white/10" />;
}
