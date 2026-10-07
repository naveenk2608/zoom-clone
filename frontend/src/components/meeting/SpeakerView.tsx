import { VideoTile, type TilePlayback } from "@/components/meeting/VideoTile";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

type SpeakerViewProps = {
  people: RoomPerson[]; // always starts with us
  playback: TilePlayback;
  speakerId: number | null; // the last person heard, from useActiveSpeaker
  speakingId: number | null; // who gets the green border: the speaker, while still talking
};

/**
 * Zoom's default view: one person large, everyone else in a strip of small
 * 16:9 tiles above. The strip stays one row and scrolls sideways when full.
 */
export function SpeakerView({ people, playback, speakerId, speakingId }: SpeakerViewProps) {
  const main = mainPerson(people, speakerId);
  const strip = people.filter((person) => person.id !== main.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      {strip.length > 0 && (
        // `justify-center-safe` centres the strip, but starts it at the left
        // edge once it overflows, so the first tiles can still be scrolled to.
        <div className="flex shrink-0 justify-center-safe gap-2 overflow-x-auto">
          {strip.map((person) => (
            <div key={person.id} className="grid aspect-video h-20 shrink-0 md:h-32">
              <VideoTile
                person={person}
                playback={playback}
                compact
                speaking={person.id === speakingId}
              />
            </div>
          ))}
        </div>
      )}
      <div className="grid min-h-0 flex-1">
        <VideoTile person={main} playback={playback} speaking={main.id === speakingId} />
      </div>
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
