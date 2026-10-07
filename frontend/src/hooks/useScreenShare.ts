import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { openScreen, screenShareErrorMessage, stopStream } from "@/lib/media";

/**
 * Sharing our screen.
 *
 * The room sends the screen track to everyone in place of the camera, with
 * replaceTrack, so nothing is renegotiated. When sharing stops, the camera
 * track (or nothing, if the camera is off) goes back in its place.
 */
export function useScreenShare() {
  const showToast = useToast();
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null);
  // False once the room is gone, so a picker answered after that doesn't start sharing.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // While sharing: notice the browser's own "Stop sharing" button, and stop
  // the capture when we stop sharing or leave the room.
  useEffect(() => {
    if (screenTrack === null) return;
    const track = screenTrack;
    const stoppedByBrowser = () => setScreenTrack(null);
    track.addEventListener("ended", stoppedByBrowser);
    return () => {
      track.removeEventListener("ended", stoppedByBrowser);
      track.stop();
    };
  }, [screenTrack]);

  // Runs straight from the click: browsers only open the picker during a user gesture.
  async function startSharing() {
    try {
      const media = await openScreen();
      if (!mountedRef.current) {
        stopStream(media);
        return;
      }
      setScreenTrack(media.getVideoTracks()[0] ?? null);
    } catch (caught: unknown) {
      const message = screenShareErrorMessage(caught);
      if (message !== null) showToast(message);
    }
  }

  function toggleShare() {
    if (screenTrack === null) {
      void startSharing();
    } else {
      setScreenTrack(null); // the effect's cleanup stops the capture
    }
  }

  /** Ends the capture when we are sent out of the meeting. */
  const stop = useCallback(() => screenTrack?.stop(), [screenTrack]);

  // Our own tile shows what we are sharing.
  const preview = useMemo(
    () => (screenTrack === null ? null : new MediaStream([screenTrack])),
    [screenTrack],
  );

  return { screenTrack, sharing: screenTrack !== null, preview, toggleShare, stop };
}
