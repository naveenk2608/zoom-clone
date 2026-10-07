// Opening the camera, mic and screen, and turning their errors into messages people can act on.

export type MediaDevice = "camera" | "microphone";

// 720p, 16:9, when the camera supports it. "ideal" means the browser picks the
// closest size it can do instead of failing.
export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/** Asks for the camera. Rejects if it's blocked, missing or busy. */
export function openCamera(): Promise<MediaStream> {
  // Browsers only offer mediaDevices on a secure page: https, or http://localhost.
  if (!navigator.mediaDevices) {
    return Promise.reject(new DOMException("Not a secure page", "SecurityError"));
  }
  return navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS, audio: false });
}

/** Asks for the microphone. Rejects if it's blocked, missing or busy. */
export function openMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices) {
    return Promise.reject(new DOMException("Not a secure page", "SecurityError"));
  }
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

/** Asks which screen, window or tab to share. Rejects if the user cancels or it isn't supported. */
export function openScreen(): Promise<MediaStream> {
  // Phones' browsers have no getDisplayMedia.
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return Promise.reject(new DOMException("Screen sharing is not supported", "NotSupportedError"));
  }
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
}

/** Mutes or unmutes a track. A disabled track keeps running but sends silence (or black). */
export function setTrackEnabled(track: MediaStreamTrack, enabled: boolean): void {
  track.enabled = enabled;
}

/** Stops every track, which releases the device and turns its light off. */
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

/** A short notice for a getUserMedia failure, chosen by the error's name. */
export function mediaErrorMessage(error: unknown, device: MediaDevice): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError": // the user or the browser said no
      return `Access to your ${device} is blocked. Allow it in your browser's site settings.`;
    case "NotFoundError":
      return `No ${device} was found.`;
    case "NotReadableError": // another app holds the device
    case "AbortError":
      return `Your ${device} is being used by another app.`;
    case "SecurityError":
      return `The ${device} only works on a secure (https) page.`;
    default:
      return `Couldn't start your ${device}.`;
  }
}

/** A short notice for a failed screen share, or null when the user simply closed the picker. */
export function screenShareErrorMessage(error: unknown): string | null {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError": // "Cancel" in the picker, or the browser said no
      return null;
    case "NotSupportedError":
      return "Screen sharing isn't supported in this browser.";
    default:
      return "Couldn't start screen sharing.";
  }
}
