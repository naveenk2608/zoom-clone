"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, LayoutGrid } from "lucide-react";

import { RoomMenu, RoomMenuContent, RoomMenuTrigger } from "@/components/meeting/RoomMenu";

export type RoomView = "speaker" | "gallery";

const VIEWS: { value: RoomView; label: string }[] = [
  { value: "speaker", label: "Speaker" },
  { value: "gallery", label: "Gallery" },
];

type ViewMenuProps = {
  view: RoomView;
  onChange: (view: RoomView) => void;
};

/** The grid icon at the top right of the room: picks Speaker or Gallery view, with a tick on the current one. */
export function ViewMenu({ view, onChange }: ViewMenuProps) {
  function choose(value: string) {
    const chosen = VIEWS.find((option) => option.value === value);
    if (chosen !== undefined) onChange(chosen.value);
  }

  return (
    <RoomMenu>
      <RoomMenuTrigger asChild>
        <button type="button" aria-label="Change view" className="rounded p-1.5 hover:bg-white/10">
          <LayoutGrid size={18} aria-hidden="true" />
        </button>
      </RoomMenuTrigger>
      <RoomMenuContent>
        <DropdownMenu.RadioGroup value={view} onValueChange={choose}>
          {VIEWS.map((option) => (
            <DropdownMenu.RadioItem
              key={option.value}
              value={option.value}
              // Same look as RoomMenuItem; the highlighted background is the focus indicator.
              className="flex cursor-pointer items-center gap-2 py-2 pr-4 pl-3 text-sm outline-none data-highlighted:bg-white/10"
            >
              <span className="flex w-4 justify-center">
                <DropdownMenu.ItemIndicator>
                  <Check size={16} aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </span>
              {option.label}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </RoomMenuContent>
    </RoomMenu>
  );
}
