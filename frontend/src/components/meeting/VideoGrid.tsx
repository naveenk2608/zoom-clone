import { useRef } from "react";

import { VideoTile, type TilePlayback } from "@/components/meeting/VideoTile";
import { useElementSize } from "@/hooks/useElementSize";
import type { RoomPerson } from "@/hooks/useMeetingRoom";
import { TILE_GAP, bestGrid, rowWidth } from "@/lib/tileLayout";

type VideoGridProps = {
  people: RoomPerson[];
  playback: TilePlayback;
  speakingId: number | null; // who gets the green border
  onTogglePin: (person: RoomPerson) => void;
};

/**
 * Gallery view: equal 16:9 tiles, as large as the area allows. The column
 * count is picked from the measured area, and the grid is centred, with a
 * short last row centred too, as in Zoom.
 */
export function VideoGrid({ people, playback, speakingId, onTogglePin }: VideoGridProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const area = useElementSize(areaRef);
  const layout = bestGrid(people.length, area.width, area.height);
  const tile = { width: layout.width, height: layout.height };

  return (
    <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      {area.width > 0 && (
        <div
          className="flex flex-wrap justify-center"
          style={{ width: rowWidth(layout), gap: TILE_GAP }}
        >
          {people.map((person) => (
            <div key={person.id} className="grid shrink-0" style={tile}>
              <VideoTile
                person={person}
                playback={playback}
                variant="gallery"
                speaking={person.id === speakingId}
                onTogglePin={onTogglePin}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
