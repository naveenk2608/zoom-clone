import { MicOff } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

/**
 * One person's tile. There is no camera picture yet, so every tile shows its
 * camera-off look: the host as an orange initial, an attendee as a large name,
 * as in Zoom.
 */
export function VideoTile({ person }: { person: RoomPerson }) {
  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-room-tile">
      {person.role === "host" ? (
        <Avatar
          name={person.name}
          color="var(--color-avatar-orange)"
          className="size-24 rounded-md text-5xl md:size-30 md:text-6xl"
        />
      ) : (
        <p className="max-w-full truncate px-4 text-3xl font-medium text-white md:text-5xl">
          {person.name}
        </p>
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-[15px] text-white">
        {!person.audio && <MicOff size={16} className="shrink-0 text-zoom-red" aria-label="Muted" />}
        <span className="truncate">{person.name}</span>
      </div>
    </div>
  );
}
