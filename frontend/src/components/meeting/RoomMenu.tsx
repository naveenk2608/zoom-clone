"use client";

// Dark dropdown menus for the meeting room. Like the portal's Menu, they are
// Radix menus: Escape, outside clicks and arrow keys work without extra code.

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export const RoomMenu = DropdownMenu.Root;
export const RoomMenuTrigger = DropdownMenu.Trigger;

type RoomMenuContentProps = {
  side?: "top" | "bottom"; // "top" for menus opened from the toolbar
  children: ReactNode;
};

export function RoomMenuContent({ side = "bottom", children }: RoomMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        side={side}
        align="end"
        sideOffset={6}
        className="z-50 min-w-44 rounded-lg border border-white/10 bg-room-panel-raised py-1 text-white shadow-xl"
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

export function RoomMenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-white/10" />;
}
