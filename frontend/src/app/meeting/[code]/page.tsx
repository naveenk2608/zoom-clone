"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { MeetingStatusScreen } from "@/components/meeting/MeetingStatusScreen";
import { errorMessage, getMeeting } from "@/lib/api";
import { loadJoinSession, type JoinSession } from "@/lib/joinSession";
import { isMeetingCode } from "@/lib/meetingCode";
import { loadRtcConfig } from "@/lib/webrtc";
import type { MeetingOut } from "@/types/api";

type Entry = {
  meeting: MeetingOut;
  session: JoinSession;
  rtcConfig: RTCConfiguration;
};

/** The meeting room: loads the meeting and the ICE servers, then hands over to the live room. */
export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // "/api/meetings/upcoming" is a real path, so only 11-digit codes may reach the API.
    if (!isMeetingCode(code)) {
      router.replace(`/j/${code}`);
      return;
    }
    // No saved session means this tab never joined: go to the pre-join page.
    const session = loadJoinSession(code);
    if (session === null) {
      router.replace(`/j/${code}`);
      return;
    }

    let ignore = false;
    // The ICE servers load alongside the meeting, so they are ready before the
    // room connects and any peer connection is made. loadRtcConfig never fails:
    // it falls back to STUN only.
    Promise.all([getMeeting(code), loadRtcConfig()])
      .then(([meeting, rtcConfig]) => {
        if (!ignore) setEntry({ meeting, session, rtcConfig });
      })
      .catch((caught: unknown) => {
        if (!ignore) setError(errorMessage(caught));
      });
    return () => {
      ignore = true;
    };
  }, [code, router]);

  if (error !== null) {
    return <MeetingStatusScreen message={error} />;
  }
  if (entry === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-room-bg text-white/70">
        Joining…
      </main>
    );
  }
  return (
    <MeetingRoom
      code={code}
      meeting={entry.meeting}
      session={entry.session}
      rtcConfig={entry.rtcConfig}
    />
  );
}
