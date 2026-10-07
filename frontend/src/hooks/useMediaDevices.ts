import { useEffect, useState } from "react";

import { canChooseSpeaker } from "@/lib/media";

/** One "Select a ..." list in the ^ menus: the devices, the one in use, and how to switch. */
export interface DeviceChoice {
  devices: MediaDeviceInfo[];
  selectedId: string | null; // null: nothing picked yet, so the browser's default
  choose: (deviceId: string) => void;
}

/** Everything the Mute and Video ^ menus offer. */
export interface RoomDevices {
  microphone: DeviceChoice;
  speaker: DeviceChoice; // no devices where the browser can't switch speakers
  camera: DeviceChoice;
}

/**
 * The microphones, speakers and cameras on this computer.
 *
 * The list is read again when a device is plugged in or out, and when our own
 * mic or camera opens: until the page is allowed to use a device, browsers
 * hide the devices' names and ids.
 */
export function useMediaDevices(
  audioTrack: MediaStreamTrack | null,
  videoTrack: MediaStreamTrack | null,
) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return; // not a secure page, so no devices at all
    let ignore = false; // a newer read replaced this one

    function load() {
      mediaDevices
        .enumerateDevices()
        .then((found) => {
          // A device without an id is a stand-in for one we may not use yet.
          if (!ignore) setDevices(found.filter((device) => device.deviceId !== ""));
        })
        .catch(() => {
          // The old list stays; the next change reads it again.
        });
    }

    load();
    mediaDevices.addEventListener("devicechange", load);
    return () => {
      ignore = true;
      mediaDevices.removeEventListener("devicechange", load);
    };
  }, [audioTrack, videoTrack]);

  return {
    microphones: devices.filter((device) => device.kind === "audioinput"),
    speakers: canChooseSpeaker() ? devices.filter((device) => device.kind === "audiooutput") : [],
    cameras: devices.filter((device) => device.kind === "videoinput"),
  };
}
