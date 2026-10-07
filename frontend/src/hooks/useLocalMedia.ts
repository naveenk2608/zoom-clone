import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import {
  mediaErrorMessage,
  openCamera,
  openMicrophone,
  setTrackEnabled,
  stopStream,
} from "@/lib/media";

type MediaEntry = { audio: boolean; video: boolean };

/**
 * Our own mic and camera in the room.
 *
 * The mic opens once and mute only disables its track, so unmuting is instant.
 * The camera is really stopped when turned off, so its light goes out.
 * A device that fails never blocks the meeting: it stays off, with a notice.
 */
export function useLocalMedia(entry: MediaEntry) {
  const showToast = useToast();
  const [audioOn, setAudioOn] = useState(entry.audio);
  const [videoOn, setVideoOn] = useState(entry.video);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // The mic, opened once for the whole meeting.
  useEffect(() => {
    // Set on cleanup: a device that opens after that is closed again at once,
    // which also covers React StrictMode running this effect twice in dev.
    let ignore = false;
    let opened: MediaStream | null = null;

    openMicrophone()
      .then((media) => {
        if (ignore) {
          stopStream(media);
          return;
        }
        opened = media;
        setAudioTrack(media.getAudioTracks()[0] ?? null);
      })
      .catch((caught: unknown) => {
        if (ignore) return;
        const message = mediaErrorMessage(caught, "microphone");
        setMicError(message);
        setAudioOn(false);
        showToast(message);
      });

    return () => {
      ignore = true;
      if (opened !== null) stopStream(opened);
    };
  }, [showToast]);

  // Mute and unmute: the track keeps running, it just sends silence.
  useEffect(() => {
    if (audioTrack !== null) setTrackEnabled(audioTrack, audioOn);
  }, [audioTrack, audioOn]);

  // The camera, opened each time it is turned on.
  useEffect(() => {
    if (!videoOn) return;
    let ignore = false;
    let opened: MediaStream | null = null;

    openCamera()
      .then((media) => {
        if (ignore) {
          stopStream(media);
          return;
        }
        opened = media;
        setVideoTrack(media.getVideoTracks()[0] ?? null);
      })
      .catch((caught: unknown) => {
        if (ignore) return;
        setVideoOn(false);
        showToast(mediaErrorMessage(caught, "camera"));
      });

    return () => {
      ignore = true;
      if (opened !== null) stopStream(opened); // Stop Video, or leaving the room
    };
  }, [videoOn, showToast]);

  function toggleAudio() {
    if (audioTrack === null) {
      showToast(micError ?? "Your microphone is still starting.");
      return;
    }
    setAudioOn((on) => !on);
  }

  /** The host muted us. Unmuting stays up to us. */
  function mute() {
    setAudioOn(false);
  }

  function toggleVideo() {
    setVideoTrack(null); // the camera effect's cleanup stops it; never show a stopped track
    setVideoOn((on) => !on);
  }

  /** Releases both devices, when we are sent out of the meeting. */
  const stop = useCallback(() => {
    audioTrack?.stop();
    videoTrack?.stop();
  }, [audioTrack, videoTrack]);

  // Our own tile shows only the camera; it never plays our own mic back.
  const preview = useMemo(
    () => (videoTrack === null ? null : new MediaStream([videoTrack])),
    [videoTrack],
  );

  return { audioOn, videoOn, audioTrack, videoTrack, preview, toggleAudio, toggleVideo, mute, stop };
}
