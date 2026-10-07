import { useEffect, useState } from "react";

import { mediaErrorMessage, openCamera, stopStream } from "@/lib/media";

/**
 * The camera behind the pre-join preview. Only the camera is opened: the mic
 * is just a choice on this page, and the room opens it.
 */
export function useCameraPreview(initiallyOn: boolean) {
  const [videoOn, setVideoOn] = useState(initiallyOn);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null); // why the camera couldn't start

  useEffect(() => {
    if (!videoOn) return;

    // Set on cleanup. A camera that opens after that is closed again at once,
    // which also covers React StrictMode running this effect twice in dev.
    let ignore = false;
    let opened: MediaStream | null = null;

    openCamera()
      .then((media) => {
        if (ignore) {
          stopStream(media);
          return;
        }
        opened = media;
        setStream(media);
      })
      .catch((caught: unknown) => {
        if (ignore) return;
        // This never blocks joining: the camera stays off and the preview says why.
        setError(mediaErrorMessage(caught, "camera"));
        setVideoOn(false);
      });

    return () => {
      ignore = true;
      if (opened !== null) stopStream(opened); // Stop Video, or leaving the page
    };
  }, [videoOn]);

  function toggleVideo() {
    setStream(null); // the effect's cleanup stops it; never show a stopped stream
    setError(null); // turning the camera on again is a fresh try
    setVideoOn((on) => !on);
  }

  return { stream, videoOn, error, toggleVideo };
}
