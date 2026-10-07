import clsx from "clsx";
import { useEffect, useEffectEvent, useRef } from "react";

type TileVideoProps = {
  stream: MediaStream;
  isMe: boolean; // our own tile: muted, so we never hear ourselves, and mirrored like a mirror
  visible: boolean; // false while the camera is off; it keeps playing so their audio is heard
  playToken: number; // changes when the user clicks "Click to enable audio", to try again
  onAutoplayBlocked: () => void;
};

/** The <video> of a tile. Plays the stream, and reports when the browser blocks autoplay. */
export function TileVideo({ stream, isMe, visible, playToken, onAutoplayBlocked }: TileVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reportBlocked = useEffectEvent(onAutoplayBlocked);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.srcObject = stream;
    video.play().catch((error: unknown) => {
      // NotAllowedError: sound needs a click on the page first. Other errors
      // (a newer stream replaced this one mid-start) need nothing.
      if (error instanceof DOMException && error.name === "NotAllowedError") reportBlocked();
    });
  }, [stream, playToken]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMe}
      className={clsx(
        "absolute inset-0 size-full object-cover",
        isMe && "-scale-x-100",
        !visible && "opacity-0",
      )}
    />
  );
}
