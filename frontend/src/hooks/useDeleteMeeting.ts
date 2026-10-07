import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { cancelMeeting, errorMessage } from "@/lib/api";
import type { MeetingOut } from "@/types/api";

/**
 * Deletes meetings from a list without waiting for the server. A deleted
 * meeting's code goes into `removedCodes` at once, and the list hides those
 * codes. If the request fails the code comes out again, so the card reappears
 * exactly where it was.
 */
export function useDeleteMeeting() {
  const showToast = useToast();
  const [removedCodes, setRemovedCodes] = useState<ReadonlySet<string>>(new Set());

  async function deleteMeeting(meeting: MeetingOut) {
    const code = meeting.meeting_code;
    setRemovedCodes((codes) => new Set(codes).add(code));
    try {
      await cancelMeeting(code);
      showToast("Meeting deleted");
    } catch (error) {
      setRemovedCodes((codes) => withoutCode(codes, code));
      showToast(`Couldn't delete the meeting. ${errorMessage(error)}`);
    }
  }

  return { removedCodes, deleteMeeting };
}

function withoutCode(codes: ReadonlySet<string>, code: string): ReadonlySet<string> {
  const next = new Set(codes);
  next.delete(code);
  return next;
}
