import { VideoTile, type TilePlayback } from "@/components/meeting/VideoTile";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

/**
 * An equal-size gallery: one person fills the area, two sit side by side,
 * three or four make 2x2, five to nine make 3x3. On narrow screens it is one column.
 */
function columnClasses(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-3";
}

export function VideoGrid({ people, playback }: { people: RoomPerson[]; playback: TilePlayback }) {
  return (
    <div className={`grid min-h-0 flex-1 auto-rows-fr gap-2 overflow-y-auto p-2 ${columnClasses(people.length)}`}>
      {people.map((person) => (
        <VideoTile key={person.id} person={person} playback={playback} />
      ))}
    </div>
  );
}
