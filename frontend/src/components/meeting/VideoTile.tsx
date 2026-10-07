import { MicOff } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import { TileVideo } from "@/components/meeting/TileVideo";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

export type TilePlayback = {
  playToken: number;
  onAutoplayBlocked: () => void;
};

/**
 * One person's tile: their camera when it's on. With the camera off it shows
 * Zoom's look instead: the host as an orange initial, an attendee as a large name.
 */
export function VideoTile({ person, playback }: { person: RoomPerson; playback: TilePlayback }) {
  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-room-tile">
      {person.stream !== null && (
        <TileVideo
          stream={person.stream}
          isMe={person.isMe}
          visible={person.video}
          playToken={playback.playToken}
          onAutoplayBlocked={playback.onAutoplayBlocked}
        />
      )}
      {!person.video && <CameraOffLook person={person} />}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-[15px] text-white">
        {!person.audio && <MicOff size={16} className="shrink-0 text-zoom-red" aria-label="Muted" />}
        <span className="truncate">{person.name}</span>
      </div>
    </div>
  );
}

function CameraOffLook({ person }: { person: RoomPerson }) {
  if (person.role === "host") {
    return (
      <Avatar
        name={person.name}
        color="var(--color-avatar-orange)"
        className="relative size-24 rounded-md text-5xl md:size-30 md:text-6xl"
      />
    );
  }
  return (
    <p className="relative max-w-full truncate px-4 text-3xl font-medium text-white md:text-5xl">
      {person.name}
    </p>
  );
}
