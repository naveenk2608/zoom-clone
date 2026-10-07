import {
  RoomMenuLabel,
  RoomMenuRadioGroup,
  RoomMenuRadioItem,
  RoomMenuSeparator,
} from "@/components/meeting/RoomMenu";
import type { DeviceChoice, RoomDevices } from "@/hooks/useMediaDevices";

/** The ^ menu next to Mute: the microphones, then the speakers where the browser can switch them. */
export function AudioMenuItems({ devices }: { devices: RoomDevices }) {
  return (
    <>
      <DeviceSection title="Select a Microphone" kind="Microphone" choice={devices.microphone} />
      {devices.speaker.devices.length > 0 && (
        <>
          <RoomMenuSeparator />
          <DeviceSection title="Select a Speaker" kind="Speaker" choice={devices.speaker} />
        </>
      )}
    </>
  );
}

/** The ^ menu next to Video: the cameras. */
export function VideoMenuItems({ devices }: { devices: RoomDevices }) {
  return <DeviceSection title="Select a Camera" kind="Camera" choice={devices.camera} />;
}

type DeviceSectionProps = {
  title: string;
  kind: string; // names a device whose label the browser keeps hidden: "Camera 2"
  choice: DeviceChoice;
};

/** One "Select a ..." heading and its devices, with a tick on the one in use. */
function DeviceSection({ title, kind, choice }: DeviceSectionProps) {
  const { devices, selectedId, choose } = choice;
  // Nothing picked, or a device that isn't listed: the browser's default, which it lists first.
  const inUse = devices.find((device) => device.deviceId === selectedId) ?? devices[0];

  return (
    <>
      <RoomMenuLabel>{title}</RoomMenuLabel>
      {devices.length === 0 && <p className="px-4 py-2 text-sm text-white/50">None found</p>}
      <RoomMenuRadioGroup value={inUse?.deviceId ?? ""} onValueChange={choose}>
        {devices.map((device, index) => (
          <RoomMenuRadioItem
            key={device.deviceId}
            value={device.deviceId}
            label={device.label || `${kind} ${index + 1}`}
          />
        ))}
      </RoomMenuRadioGroup>
    </>
  );
}
