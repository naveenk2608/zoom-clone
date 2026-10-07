"use client";

import { useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/layout/CurrentUserProvider";
import { DevicePreview } from "@/components/prejoin/DevicePreview";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useCameraPreview } from "@/hooks/useCameraPreview";
import { useJoinMeeting } from "@/hooks/useJoinMeeting";
import { forgetRememberedName, loadRememberedName, rememberName } from "@/lib/joinSession";
import type { MeetingOut } from "@/types/api";

const MAX_NAME_LENGTH = 100; // the backend's limit for a display name

/** The pre-join screen: camera preview on the left, "Enter Meeting Info" on the right. */
export function PreJoinCard({ meeting }: { meeting: MeetingOut }) {
  const user = useCurrentUser();
  const camera = useCameraPreview(meeting.participant_video_on);
  const { pending, error, join } = useJoinMeeting();
  // The host's "Mute participants upon entry" option starts the mic muted.
  const [audioOn, setAudioOn] = useState(!meeting.mute_on_entry);
  // Read once. This card only renders in the browser, after the meeting has loaded.
  const [rememberedName] = useState(loadRememberedName);
  const [remember, setRemember] = useState(rememberedName !== null);
  // null until the user types, so the name can still fill in when /me loads late.
  const [typedName, setTypedName] = useState<string | null>(null);

  const nameField = typedName ?? rememberedName ?? user?.name ?? "";
  const name = nameField.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remember) {
      rememberName(name);
    } else {
      forgetRememberedName();
    }
    join(meeting.meeting_code, name, { audio_on: audioOn, video_on: camera.videoOn });
  }

  return (
    <div className="flex flex-col items-center gap-9 md:flex-row md:items-start">
      <div className="w-full max-w-175 md:flex-1">
        <DevicePreview
          stream={camera.stream}
          videoOn={camera.videoOn}
          cameraError={camera.error}
          audioOn={audioOn}
          onToggleAudio={() => setAudioOn((on) => !on)}
          onToggleVideo={camera.toggleVideo}
        />
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-100 flex-col md:mt-5">
        <h1 className="text-center text-2xl font-bold text-text-primary">Enter Meeting Info</h1>
        <label htmlFor="display-name" className="mt-1 text-[15px] font-semibold">
          Your Name
        </label>
        <Input
          id="display-name"
          // 40px tall like Zoom's pre-join field; Tailwind emits h-10 after Input's h-9, so it wins.
          className="mt-1.5 h-10"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          value={nameField}
          onChange={(event) => setTypedName(event.target.value)}
        />
        <div className="mt-3">
          <Checkbox
            label="Remember my name for future meetings"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
        </div>
        {/* Gray and disabled until there is a name, like Zoom's. */}
        <Button type="submit" className="mt-2.5 w-full" disabled={name === "" || pending}>
          Join
        </Button>
        {error !== null && (
          <p role="alert" className="mt-3 text-sm text-zoom-red">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
