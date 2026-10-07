import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type HostRequestDialogsProps = {
  unmuteAsked: boolean;
  videoAsked: boolean;
  onAnswerUnmute: (yes: boolean) => void;
  onAnswerVideo: (yes: boolean) => void;
};

/**
 * What an attendee sees after the host's "Ask to Unmute" or "Ask to Start
 * Video". The host can't turn our mic or camera on; only our yes does.
 * Closing a dialog any other way (Escape, the backdrop) is a no.
 */
export function HostRequestDialogs(props: HostRequestDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={props.unmuteAsked}
        onOpenChange={(open) => {
          if (!open) props.onAnswerUnmute(false);
        }}
        title="The host would like you to unmute"
        description="Others will hear you once you unmute."
        cancelLabel="Stay Muted"
        confirmLabel="Unmute"
        confirmVariant="primary"
        onConfirm={() => props.onAnswerUnmute(true)}
      />
      <ConfirmDialog
        open={props.videoAsked}
        onOpenChange={(open) => {
          if (!open) props.onAnswerVideo(false);
        }}
        title="The host would like you to start your video"
        description="Others will see you once your video starts."
        cancelLabel="Keep Video Off"
        confirmLabel="Start Video"
        confirmVariant="primary"
        onConfirm={() => props.onAnswerVideo(true)}
      />
    </>
  );
}
