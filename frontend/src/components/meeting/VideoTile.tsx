import clsx from "clsx";
import { MicOff } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import { TileVideo } from "@/components/meeting/TileVideo";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

export type TilePlayback = {
  playToken: number;
  onAutoplayBlocked: () => void;
};

type VideoTileProps = {
  person: RoomPerson;
  playback: TilePlayback;
  compact?: boolean; // a small tile in Speaker view's strip
  speaking?: boolean; // the active speaker: a green border, as in Zoom
};

/**
 * One person's tile: their camera when it's on, or the screen they share.
 * With neither, it shows Zoom's look instead: the host as an orange initial,
 * an attendee as a large name.
 */
export function VideoTile({ person, playback, compact = false, speaking = false }: VideoTileProps) {
  const showsVideo = person.video || person.screen;

  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-room-tile">
      {person.stream !== null && (
        <TileVideo
          stream={person.stream}
          isMe={person.isMe}
          isScreen={person.screen}
          visible={showsVideo}
          playToken={playback.playToken}
          onAutoplayBlocked={playback.onAutoplayBlocked}
        />
      )}
      {!showsVideo && <CameraOffLook person={person} compact={compact} />}
      <div
        className={clsx(
          "absolute flex items-center gap-1.5 rounded bg-black/60 text-white",
          compact
            ? "bottom-1 left-1 max-w-[calc(100%-0.5rem)] px-1.5 py-0.5 text-xs"
            : "bottom-2 left-2 max-w-[calc(100%-1rem)] px-2 py-1 text-[15px]",
        )}
      >
        {!person.audio && (
          <MicOff size={compact ? 12 : 16} className="shrink-0 text-zoom-red" aria-label="Muted" />
        )}
        <span className="truncate">{person.name}</span>
      </div>
      {speaking && (
        // Drawn over the video, and inside the tile, so the layout never moves.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-zoom-green"
        />
      )}
    </div>
  );
}

function CameraOffLook({ person, compact }: { person: RoomPerson; compact: boolean }) {
  if (person.role === "host") {
    return (
      <Avatar
        name={person.name}
        color="var(--color-avatar-orange)"
        className={clsx(
          "relative",
          compact ? "size-10 rounded text-xl md:size-14 md:text-3xl" : "size-24 rounded-md text-5xl md:size-30 md:text-6xl",
        )}
      />
    );
  }
  return (
    <p
      className={clsx(
        "relative max-w-full truncate font-medium text-white",
        compact ? "px-2 text-sm md:text-lg" : "px-4 text-3xl md:text-5xl",
      )}
    >
      {person.name}
    </p>
  );
}
