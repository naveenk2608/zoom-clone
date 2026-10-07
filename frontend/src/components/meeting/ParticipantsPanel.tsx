import { useState, type ComponentProps } from "react";

import { ParticipantRow } from "@/components/meeting/ParticipantRow";
import { RoomPanel } from "@/components/meeting/RoomPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NotAvailable } from "@/components/ui/Tooltip";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

type ParticipantsPanelProps = {
  people: RoomPerson[];
  isHost: boolean; // shows Mute All and each row's Mute / Remove menu
  onInvite: () => void; // copies the invite link
  onMuteAll: () => void;
  onMute: (participantId: number) => void;
  onAskToUnmute: (participantId: number) => void;
  onLowerHand: (participantId: number) => void;
  onRemove: (participantId: number) => void;
  onClose: () => void;
};

/** "Participants (N)": one row per person, with Invite, Mute All and More at the bottom. */
export function ParticipantsPanel(props: ParticipantsPanelProps) {
  const { people, isHost, onRemove } = props;
  // The person the "Remove?" dialog is asking about.
  const [removing, setRemoving] = useState<RoomPerson | null>(null);
  // Raised hands first, as in Zoom. The sort is stable, so otherwise the order stays.
  const listed = [...people].sort((a, b) => Number(b.handRaised) - Number(a.handRaised));

  function confirmRemove() {
    if (removing !== null) onRemove(removing.id);
    setRemoving(null);
  }

  return (
    <RoomPanel title={`Participants (${people.length})`} onClose={props.onClose}>
      <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {listed.map((person) => (
          <ParticipantRow
            key={person.id}
            person={person}
            canManage={isHost && !person.isMe}
            onMute={() => props.onMute(person.id)}
            onAskToUnmute={() => props.onAskToUnmute(person.id)}
            onLowerHand={() => props.onLowerHand(person.id)}
            onRemove={() => setRemoving(person)}
          />
        ))}
      </ul>
      <div className="flex shrink-0 justify-center gap-3 px-4 py-3">
        <FooterPill label="Invite" onClick={props.onInvite} />
        {isHost && <FooterPill label="Mute All" onClick={props.onMuteAll} />}
        <NotAvailable>
          <FooterPill label="More" />
        </NotAvailable>
      </div>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`Remove ${removing?.name ?? ""}?`}
        description="They will be sent out of the meeting."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
      />
    </RoomPanel>
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
