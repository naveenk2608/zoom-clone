import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { ComponentProps } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { RoomPanel } from "@/components/meeting/RoomPanel";
import { NotAvailable } from "@/components/ui/Tooltip";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

type ParticipantsPanelProps = {
  people: RoomPerson[];
  onInvite: () => void; // copies the invite link
  onClose: () => void;
};

/** "Participants (N)": one row per person, with Invite and More at the bottom. */
export function ParticipantsPanel({ people, onInvite, onClose }: ParticipantsPanelProps) {
  return (
    <RoomPanel title={`Participants (${people.length})`} onClose={onClose}>
      <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {people.map((person) => (
          <ParticipantRow key={person.id} person={person} />
        ))}
      </ul>
      <div className="flex shrink-0 justify-center gap-3 px-4 py-3">
        <FooterPill label="Invite" onClick={onInvite} />
        <NotAvailable>
          <FooterPill label="More" />
        </NotAvailable>
      </div>
    </RoomPanel>
  );
}

/** "(Host, me)", "(Guest)" and so on, after the name. */
function roleLabel(person: RoomPerson): string {
  const role = person.role === "host" ? "Host" : "Guest";
  return person.isMe ? `(${role}, me)` : `(${role})`;
}

function ParticipantRow({ person }: { person: RoomPerson }) {
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
    </li>
  );
}

// The other props are passed on, so a tooltip can attach to the button.
function FooterPill({ label, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      {...props}
      className="h-9 min-w-24 rounded-full bg-room-panel-raised px-5 text-sm text-white hover:brightness-125"
    >
      {label}
    </button>
  );
}
