import clsx from "clsx";
import { useEffect, useEffectEvent, useRef } from "react";

type TileVideoProps = {
  stream: MediaStream;
  isMe: boolean; // our own tile: muted, so we never hear ourselves, and mirrored like a mirror
  isScreen: boolean; // a shared screen: never mirrored, so its text reads right
  // "contain" shows the whole picture with black bars; "cover" fills the tile and crops.
  fit: "contain" | "cover";
  visible: boolean; // false while the camera is off; it keeps playing so their audio is heard
  playToken: number; // changes when the user clicks "Click to enable audio", to try again
  onAutoplayBlocked: () => void;
  sinkId: string | null; // the speaker to play on; null leaves the browser's default
};

/**
 * The <video> of a tile. Plays the stream on the chosen speaker, and reports
 * when the browser blocks autoplay.
 */
export function TileVideo({
  stream,
  isMe,
  isScreen,
  fit,
  visible,
  playToken,
  onAutoplayBlocked,
  sinkId,
}: TileVideoProps) {
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

  // Each remote tile plays that person's sound, so each one is pointed at the
  // chosen speaker. Our own tile is muted, so it is left alone. The menu only
  // offers speakers where setSinkId exists.
  useEffect(() => {
    const video = videoRef.current;
    if (video === null || isMe || sinkId === null) return;
    video.setSinkId(sinkId).catch(() => {
      // The speaker was unplugged meanwhile; the sound stays where it was.
    });
  }, [sinkId, isMe]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMe}
      className={clsx(
        "absolute inset-0 size-full",
        fit === "contain" ? "object-contain" : "object-cover",
        isMe && !isScreen && "-scale-x-100",
        !visible && "opacity-0",
      )}
    />
  );
}
