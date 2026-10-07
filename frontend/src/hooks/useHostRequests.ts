import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import type { LocalMedia } from "@/hooks/useLocalMedia";
import { ALL_ALLOWED, type Permissions, type ServerMessage } from "@/types/ws";

type HostRequestMedia = Pick<LocalMedia, "mute" | "unmute" | "stopVideo" | "startVideo">;

/**
 * What the host allows us, and what the host asks of us.
 *
 * - Permissions come in `welcome` and later `permissions` messages. The
 *   toolbar disables Unmute or Video when we may not turn them on.
 * - `welcome` also says how the server let us in: muted, or with the camera
 *   off, when we may not have them on. It never turns anything on.
 * - force_mute and force_video_off: the host turned our mic or camera off.
 * - ask_unmute and ask_start_video: the host would like them on. MeetingRoom
 *   shows a dialog, and only our answer turns them on.
 */
export function useHostRequests(media: HostRequestMedia) {
  const showToast = useToast();
  const [permissions, setPermissions] = useState<Permissions>(ALL_ALLOWED);
  const [unmuteAsked, setUnmuteAsked] = useState(false);
  const [videoAsked, setVideoAsked] = useState(false);

  /** Called with every socket message; acts on the ones about permissions and requests. */
  function handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "welcome":
        setPermissions(message.permissions);
        if (!message.self.audio) media.mute();
        if (!message.self.video) media.stopVideo();
        break;
      case "permissions":
        setPermissions(message.permissions);
        break;
      case "force_mute":
        media.mute(); // the room's media_state effect tells everyone
        showToast("The host has muted you.");
        break;
      case "force_video_off":
        media.stopVideo();
        showToast("The host has stopped your video.");
        break;
      case "ask_unmute":
        setUnmuteAsked(true);
        break;
      case "ask_start_video":
        setVideoAsked(true);
        break;
    }
  }

  /** Our answer to "The host would like you to unmute". */
  function answerUnmuteRequest(yes: boolean) {
    setUnmuteAsked(false);
    if (yes) media.unmute();
  }

  /** Our answer to "The host would like you to start your video". */
  function answerVideoRequest(yes: boolean) {
    setVideoAsked(false);
    if (yes) media.startVideo();
  }

  return {
    permissions,
    unmuteAsked,
    videoAsked,
    answerUnmuteRequest,
    answerVideoRequest,
    handleMessage,
  };
}
