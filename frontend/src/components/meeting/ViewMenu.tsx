"use client";

import { LayoutGrid } from "lucide-react";

import {
  RoomMenu,
  RoomMenuContent,
  RoomMenuRadioGroup,
  RoomMenuRadioItem,
  RoomMenuTrigger,
} from "@/components/meeting/RoomMenu";

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
        <RoomMenuRadioGroup value={view} onValueChange={choose}>
          {VIEWS.map((option) => (
            <RoomMenuRadioItem key={option.value} value={option.value} label={option.label} />
          ))}
        </RoomMenuRadioGroup>
      </RoomMenuContent>
    </RoomMenu>
  );
}
