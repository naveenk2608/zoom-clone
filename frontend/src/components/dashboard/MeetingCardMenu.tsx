"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import type { MeetingOut } from "@/types/api";

type MeetingCardMenuProps = {
  meeting: MeetingOut;
  onDelete: (meeting: MeetingOut) => void;
};

/** The "…" menu on a scheduled meeting's card: Edit and Delete. */
export function MeetingCardMenu({ meeting, onDelete }: MeetingCardMenuProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isLive = meeting.status === "live"; // the server refuses to delete a running meeting

  function confirmDelete() {
    setConfirmOpen(false);
    onDelete(meeting); // the card disappears now; the list brings it back if the request fails
  }

  return (
    <>
      {/* modal={false}: a modal menu closing while the dialog opens can leave the page unclickable. */}
      <Menu modal={false}>
        <MenuTrigger asChild>
          <IconButton label={`More options for ${meeting.title}`}>
            <Ellipsis size={18} />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            icon={Pencil}
            label="Edit"
            onSelect={() => router.push(`/schedule/${meeting.meeting_code}`)}
          />
          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            disabled={isLive}
            onSelect={() => setConfirmOpen(true)}
          />
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this meeting?"
        description={`"${meeting.title}" will be removed from your upcoming meetings.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </>
  );
}
