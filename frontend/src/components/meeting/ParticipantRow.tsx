import { Ellipsis, Mic, MicOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import {
  RoomMenu,
  RoomMenuContent,
  RoomMenuItem,
  RoomMenuTrigger,
} from "@/components/meeting/RoomMenu";
import type { RoomPerson } from "@/hooks/useMeetingRoom";
import type { HostCommands } from "@/lib/hostCommands";

type ParticipantRowProps = {
  person: RoomPerson;
  canManage: boolean; // we are the host and this is someone else: show the "…" menu
  host: HostCommands;
  onRemove: () => void; // asks "Remove?" first
};

/** One person in the Participants panel: avatar, name, raised hand, mic and camera state, host menu. */
export function ParticipantRow({ person, canManage, host, onRemove }: ParticipantRowProps) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar
        name={person.name}
        color="var(--color-avatar-orange)"
        className="size-10 rounded-lg text-base"
      />
      <span className="min-w-0 flex-1 truncate text-[15px]">
        {person.name} <span className="text-white/60">{roleLabel(person)}</span>
      </span>
      {person.handRaised && (
        <span role="img" aria-label="Hand raised" className="text-lg leading-none">
          ✋
        </span>
      )}
      {person.audio ? (
        <Mic size={18} className="text-white/60" aria-label="Mic on" />
      ) : (
        <MicOff size={18} className="text-zoom-red" aria-label="Muted" />
      )}
      {person.video ? (
        <Video size={18} className="text-white/60" aria-label="Camera on" />
      ) : (
        <VideoOff size={18} className="text-zoom-red" aria-label="Camera off" />
      )}
      {canManage ? (
        // Not modal: a modal menu closing as the Remove dialog opens can leave the page unclickable.
        <RoomMenu modal={false}>
          <RoomMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More options for ${person.name}`}
              className="rounded p-1 hover:bg-white/10"
            >
              <Ellipsis size={18} aria-hidden="true" />
            </button>
          </RoomMenuTrigger>
          <RoomMenuContent>
            {/* As in Zoom, the host can turn a mic or camera off, but only ask to turn it on. */}
            {person.audio ? (
              <RoomMenuItem label="Mute" onSelect={() => host.mute(person.id)} />
            ) : (
              <RoomMenuItem label="Ask to Unmute" onSelect={() => host.askToUnmute(person.id)} />
            )}
            {person.video ? (
              <RoomMenuItem label="Stop Video" onSelect={() => host.stopVideo(person.id)} />
            ) : (
              <RoomMenuItem
                label="Ask to Start Video"
                onSelect={() => host.askToStartVideo(person.id)}
              />
            )}
            {person.handRaised && (
              <RoomMenuItem label="Lower Hand" onSelect={() => host.lowerHand(person.id)} />
            )}
            <RoomMenuItem label="Remove" onSelect={onRemove} />
          </RoomMenuContent>
        </RoomMenu>
      ) : (
        <span className="w-6.5" aria-hidden="true" /> // keeps the icons lined up
      )}
    </li>
  );
}

/** "(Host, me)", "(Guest)" and so on, after the name. */
function roleLabel(person: RoomPerson): string {
  const role = person.role === "host" ? "Host" : "Guest";
  return person.isMe ? `(${role}, me)` : `(${role})`;
}
