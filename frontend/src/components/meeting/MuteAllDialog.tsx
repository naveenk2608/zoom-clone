"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type MuteAllDialogProps = {
  allowSelfUnmute: boolean; // the current setting: the checkbox starts from it (on, by default)
  onConfirm: (allowSelfUnmute: boolean) => void;
  onClose: () => void;
};

/**
 * Zoom's Mute All confirmation. The room renders it only while it is open,
 * so the checkbox starts from the current setting every time.
 */
export function MuteAllDialog({ allowSelfUnmute, onConfirm, onClose }: MuteAllDialogProps) {
  const [allow, setAllow] = useState(allowSelfUnmute);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Mute All"
      description="All current and new participants will be muted."
      confirmLabel="Mute All"
      confirmVariant="primary"
      onConfirm={() => {
        onConfirm(allow);
        onClose();
      }}
    >
      <Checkbox
        label="Allow participants to unmute themselves"
        checked={allow}
        onChange={(event) => setAllow(event.target.checked)}
      />
    </ConfirmDialog>
  );
}
