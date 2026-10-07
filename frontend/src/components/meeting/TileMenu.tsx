import clsx from "clsx";
import { Ellipsis } from "lucide-react";

import {
  RoomMenu,
  RoomMenuContent,
  RoomMenuItem,
  RoomMenuTrigger,
} from "@/components/meeting/RoomMenu";

type TileMenuProps = {
  name: string;
  pinned: boolean;
  compact: boolean; // a small strip tile: a smaller button
  onTogglePin: () => void;
};

/**
 * The "…" at the top right of another person's tile. Like Zoom, it shows
 * while the pointer is over the tile (the tile is a `group`), while it has
 * keyboard focus, and while its menu is open.
 */
export function TileMenu({ name, pinned, compact, onTogglePin }: TileMenuProps) {
  return (
    <RoomMenu>
      <RoomMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More options for ${name}'s video`}
          className={clsx(
            "absolute rounded-md bg-black/60 text-white opacity-0 hover:bg-black/80",
            "group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
            compact ? "top-1 right-1 p-0.5" : "top-2 right-2 p-1",
          )}
        >
          <Ellipsis size={compact ? 16 : 20} aria-hidden="true" />
        </button>
      </RoomMenuTrigger>
      <RoomMenuContent>
        <RoomMenuItem label={pinned ? "Unpin" : "Pin"} onSelect={onTogglePin} />
      </RoomMenuContent>
    </RoomMenu>
  );
}
