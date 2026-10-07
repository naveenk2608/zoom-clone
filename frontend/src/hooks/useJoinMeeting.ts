import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorMessage, joinMeeting } from "@/lib/api";
import { saveJoinSession, sessionFromJoin, type MediaChoice } from "@/lib/joinSession";

/**
 * Joins a meeting as a guest attendee from the pre-join page: calls the API,
 * saves this tab's join session and opens the room. Errors are returned, not
 * toasted, because the pre-join page shows them under the Join button.
 */
export function useJoinMeeting() {
  const router = useRouter();
  const [pending, setPending] = useState(false); // disables Join while the request runs
  const [error, setError] = useState<string | null>(null);

  async function join(code: string, displayName: string, media: MediaChoice) {
    setPending(true);
    setError(null);
    try {
      const joined = await joinMeeting(code, { display_name: displayName });
      saveJoinSession(code, sessionFromJoin(joined, media));
      // Client-side navigation, so the Join click still counts as the user
      // gesture the room needs before it may play other people's audio.
      router.push(`/meeting/${code}`); // pending stays true while the room loads
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return { pending, error, join };
}
