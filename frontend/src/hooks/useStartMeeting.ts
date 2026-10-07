import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { ApiError, createInstantMeeting, errorMessage, startMeeting } from "@/lib/api";
import { saveJoinSession, sessionFromJoin } from "@/lib/joinSession";
import type { JoinOut } from "@/types/api";

/**
 * Enters a meeting as its host: New meeting (an instant meeting) or Start (a
 * scheduled one). Used by the top nav's Host, the New meeting quick action and
 * the Start button on a meeting card.
 */
export function useStartMeeting() {
  const router = useRouter();
  const showToast = useToast();
  const [pending, setPending] = useState(false); // disables the button while the request runs
  // Start's 409: the meeting already has a host on another device. The card shows it in a dialog.
  const [hostedElsewhere, setHostedElsewhere] = useState<string | null>(null);

  async function enterAsHost(request: () => Promise<JoinOut>) {
    setPending(true);
    try {
      const join = await request();
      const code = join.meeting.meeting_code;
      // The host starts with the mic on; the camera follows the meeting's "Host video" setting.
      saveJoinSession(code, sessionFromJoin(join, { audio_on: true, video_on: join.meeting.host_video_on }));
      router.push(`/meeting/${code}`); // pending stays true while the room loads
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setHostedElsewhere(error.message);
      } else {
        showToast(errorMessage(error));
      }
      setPending(false);
    }
  }

  return {
    pending,
    hostedElsewhere,
    closeHostedElsewhere: () => setHostedElsewhere(null),
    startNewMeeting: () => enterAsHost(() => createInstantMeeting()),
    startScheduledMeeting: (code: string) => enterAsHost(() => startMeeting(code)),
  };
}
