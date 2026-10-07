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
 * The mic opens once (again only when another mic is picked) and mute only
 * disables its track, so unmuting is instant. The camera is really stopped
 * when turned off, so its light goes out.
 * A device that fails never blocks the meeting: it stays off, with a notice.
 */
export function useLocalMedia(entry: MediaEntry) {
  const showToast = useToast();
  const [audioOn, setAudioOn] = useState(entry.audio);
  const [videoOn, setVideoOn] = useState(entry.video);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  // The devices picked in the ^ menus. Null means the browser's default.
  const [pickedMicrophoneId, setPickedMicrophoneId] = useState<string | null>(null);
  const [pickedCameraId, setPickedCameraId] = useState<string | null>(null);

  // The mic, opened for the whole meeting, or until another one is picked.
  useEffect(() => {
    // Set on cleanup: a device that opens after that is closed again at once,
    // which also covers React StrictMode running this effect twice in dev.
    let ignore = false;
    let opened: MediaStream | null = null;

    openMicrophone(pickedMicrophoneId)
      .then((media) => {
        if (ignore) {
          stopStream(media);
          return;
        }
        opened = media;
        setMicError(null);
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
      if (opened !== null) stopStream(opened); // another mic was picked, or we left
    };
  }, [pickedMicrophoneId, showToast]);

  // Mute and unmute: the track keeps running, it just sends silence. Also
  // runs for a newly picked mic, so it starts as muted as the old one was.
  useEffect(() => {
    if (audioTrack !== null) setTrackEnabled(audioTrack, audioOn);
  }, [audioTrack, audioOn]);

  // The camera, opened each time it is turned on or another one is picked.
  useEffect(() => {
    if (!videoOn) return;
    let ignore = false;
    let opened: MediaStream | null = null;

    openCamera(pickedCameraId)
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
      if (opened !== null) stopStream(opened); // Stop Video, another camera, or leaving the room
    };
  }, [videoOn, pickedCameraId, showToast]);

  // mute, unmute, stopVideo and startVideo each set one state, so calling one
  // twice (say, after a welcome and then a force_mute) can't flip it back.
  // The host's messages use them; the toolbar uses the toggles.

  function mute() {
    setAudioOn(false);
  }

  function unmute() {
    if (audioTrack === null) {
      showToast(micError ?? "Your microphone is still starting.");
      return;
    }
    setAudioOn(true);
  }

  function stopVideo() {
    setVideoTrack(null); // the camera effect's cleanup stops it; never show a stopped track
    setVideoOn(false);
  }

  function startVideo() {
    setVideoOn(true); // the camera effect opens it
  }

  function toggleAudio() {
    if (audioOn) mute();
    else unmute();
  }

  function toggleVideo() {
    if (videoOn) stopVideo();
    else startVideo();
  }

  /** Switches to another mic. Muted stays muted: see the mute effect above. */
  function chooseMicrophone(deviceId: string) {
    if (deviceId === pickedMicrophoneId) return;
    setAudioTrack(null); // the mic effect's cleanup stops the old one
    setPickedMicrophoneId(deviceId);
  }

  /** Switches to another camera. With the camera off, it is used the next time it starts. */
  function chooseCamera(deviceId: string) {
    if (deviceId === pickedCameraId) return;
    setVideoTrack(null);
    setPickedCameraId(deviceId);
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

  return {
    audioOn,
    videoOn,
    audioTrack,
    videoTrack,
    preview,
    // The devices to tick in the menus: the one picked, else the one the open track uses.
    microphoneId: pickedMicrophoneId ?? audioTrack?.getSettings().deviceId ?? null,
    cameraId: pickedCameraId ?? videoTrack?.getSettings().deviceId ?? null,
    toggleAudio,
    toggleVideo,
    mute,
    unmute,
    stopVideo,
    startVideo,
    chooseMicrophone,
    chooseCamera,
    stop,
  };
}

export type LocalMedia = ReturnType<typeof useLocalMedia>;
