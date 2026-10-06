"use client";

// Styled wrappers around Radix's dropdown menu, which handles opening, closing
// on Escape or an outside click, and arrow-key navigation.

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={6}
        className="z-50 min-w-44 rounded-lg border border-black/10 bg-white py-1 text-text-primary shadow-lg"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

type MenuItemProps = {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export function MenuItem({ icon: Icon, label, onSelect, disabled, danger }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={clsx(
        // The highlighted background is the focus indicator, so no outline.
        "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none",
        "data-highlighted:bg-surface-active data-disabled:cursor-not-allowed data-disabled:opacity-50",
        danger && "text-zoom-red",
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-black/10" />;
}
