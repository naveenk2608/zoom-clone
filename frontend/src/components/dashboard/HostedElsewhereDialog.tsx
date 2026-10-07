"use client";

import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type HostedElsewhereDialogProps = {
  code: string;
  message: string | null; // the server's reason; null keeps the dialog closed
  onClose: () => void;
};

/** Start found the meeting already hosted on another device: offer to join it as a participant. */
export function HostedElsewhereDialog({ code, message, onClose }: HostedElsewhereDialogProps) {
  const router = useRouter();

  return (
    <ConfirmDialog
      open={message !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Meeting in progress"
      description={`${message ?? ""} Do you want to join as a participant?`}
      confirmLabel="Join as Participant"
      confirmVariant="primary"
      onConfirm={() => router.push(`/j/${code}`)} // the pre-join page, as any attendee
    />
  );
}
