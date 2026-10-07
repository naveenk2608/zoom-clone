"use client";

import clsx from "clsx";
import { Mic, MicOff, Video, VideoOff, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type DevicePreviewProps = {
  stream: MediaStream | null;
  videoOn: boolean;
  cameraError: string | null;
  audioOn: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
};

/** The pre-join camera preview, with Zoom's dark Mute / Stop Video pill at the bottom. */
export function DevicePreview({
  stream,
  videoOn,
  cameraError,
  audioOn,
  onToggleAudio,
  onToggleVideo,
}: DevicePreviewProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-room-tile">
      {stream !== null ? (
        <SelfVideo stream={stream} />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center px-8 pb-16 text-center text-white/80">
          {previewMessage(videoOn, cameraError)}
        </p>
      )}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-lg bg-black px-1 py-0.5">
        <PillButton
          icon={audioOn ? Mic : MicOff}
          label={audioOn ? "Mute" : "Unmute"}
          off={!audioOn}
          onClick={onToggleAudio}
        />
        <PillButton
          icon={videoOn ? Video : VideoOff}
          label={videoOn ? "Stop Video" : "Start Video"}
          off={!videoOn}
          onClick={onToggleVideo}
        />
      </div>
    </div>
  );
}

/** What the preview shows while there is no video to show. */
function previewMessage(videoOn: boolean, cameraError: string | null): string {
  if (videoOn) {
    return "Starting your camera…"; // waiting for the browser, or for the permission prompt
  }
  return cameraError ?? "Your camera is off";
}

function SelfVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // A stream can't be set as an attribute; it goes on the element's srcObject.
    if (videoRef.current !== null) videoRef.current.srcObject = stream;
  }, [stream]);

  // Muted, since it's your own camera. Mirrored, as Zoom shows your own video.
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      // block: an inline video sits on the text baseline and leaves a strip below it.
      className="block size-full -scale-x-100 object-cover"
    />
  );
}

type PillButtonProps = {
  icon: LucideIcon;
  label: string;
  off: boolean; // shows the icon in red, as Zoom does for a muted mic or stopped video
  onClick: () => void;
};

function PillButton({ icon: Icon, label, off, onClick }: PillButtonProps) {
  return (
    // A fixed width, so "Mute" becoming "Unmute" doesn't move the other button.
    <button
      type="button"
      onClick={onClick}
      className="flex w-22 flex-col items-center rounded-md py-1 text-[13px] leading-tight text-white hover:bg-white/10"
    >
      <Icon size={20} strokeWidth={1.5} aria-hidden="true" className={clsx(off && "text-zoom-red")} />
      {label}
    </button>
  );
}
