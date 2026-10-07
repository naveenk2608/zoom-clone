import { useRef } from "react";

import { VideoTile, type TilePlayback } from "@/components/meeting/VideoTile";
import { useElementSize } from "@/hooks/useElementSize";
import type { RoomPerson } from "@/hooks/useMeetingRoom";
import { TILE_GAP, fitAspect, stripTileSize } from "@/lib/tileLayout";

type SpeakerViewProps = {
  people: RoomPerson[]; // always starts with us
  playback: TilePlayback;
  speakerId: number | null; // the last person heard, from useActiveSpeaker
  speakingId: number | null; // who gets the green border: the speaker, while still talking
};

/**
 * Zoom's default view: one person in the largest 16:9 box that fits, centred
 * with black around it, and everyone else in a row of small 16:9 tiles just
 * above. The row scrolls sideways when it doesn't fit.
 */
export function SpeakerView({ people, playback, speakerId, speakingId }: SpeakerViewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useElementSize(stageRef);
  const main = mainPerson(people, speakerId);
  const strip = people.filter((person) => person.id !== main.id);

  const stripTile = stripTileSize(stage.width);
  const stripHeight = strip.length > 0 ? stripTile.height + TILE_GAP : 0;
  const mainBox = fitAspect(stage.width, stage.height - stripHeight);

  return (
    <div
      ref={stageRef}
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden"
      style={{ gap: TILE_GAP }}
    >
      {stage.width > 0 && strip.length > 0 && (
        // `justify-center-safe` centres the row, but starts it at the left
        // edge once it overflows, so the first tiles can still be scrolled to.
        <div
          className="flex max-w-full shrink-0 justify-center-safe overflow-x-auto"
          style={{ gap: TILE_GAP }}
        >
          {strip.map((person) => (
            <div key={person.id} className="grid shrink-0" style={stripTile}>
              <VideoTile
                person={person}
                playback={playback}
                variant="strip"
                speaking={person.id === speakingId}
              />
            </div>
          ))}
        </div>
      )}
      {stage.width > 0 && (
        <div className="grid shrink-0" style={mainBox}>
          <VideoTile
            person={main}
            playback={playback}
            variant="main"
            speaking={main.id === speakingId}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Who fills the main area, in order: someone else sharing their screen, the
 * active speaker, the first other participant, or us when we are alone.
 * Our own shared screen isn't put there: it would show the room inside itself.
 */
function mainPerson(people: RoomPerson[], speakerId: number | null): RoomPerson {
  const others = people.filter((person) => !person.isMe);
  return (
    others.find((person) => person.screen) ??
    others.find((person) => person.id === speakerId) ??
    others[0] ??
    people[0]
  );
}
