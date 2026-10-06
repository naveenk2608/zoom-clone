"use client";

// A placeholder room until Phase 5 builds the real one (WebSocket, video grid,
// toolbar). It proves the host lands here with a saved join session.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { Button } from "@/components/ui/Button";
import { errorMessage, getMeeting } from "@/lib/api";
import { loadJoinSession, type JoinSession } from "@/lib/joinSession";
import { formatMeetingCode } from "@/lib/meetingCode";
import type { MeetingOut } from "@/types/api";

type Room = {
  meeting: MeetingOut;
  session: JoinSession;
};

export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No saved session means this tab never joined: go to the pre-join page.
    const session = loadJoinSession(code);
    if (session === null) {
      router.replace(`/j/${code}`);
      return;
    }

    let ignore = false;
    getMeeting(code)
      .then((meeting) => {
        if (!ignore) setRoom({ meeting, session });
      })
      .catch((caught: unknown) => {
        if (!ignore) setError(errorMessage(caught));
      });
    return () => {
      ignore = true;
    };
  }, [code, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-room-bg px-4 text-center text-white">
      {room === null && error === null && <p className="text-white/70">Joining…</p>}
      {error !== null && <p>{error}</p>}
      {room !== null && (
        <>
          <Avatar
            name={room.session.display_name}
            color="var(--color-avatar-orange)"
            className="size-24 text-5xl"
          />
          <h1 className="mt-2 text-2xl font-bold">{room.meeting.title}</h1>
          <p className="text-white/70">Meeting ID: {formatMeetingCode(room.meeting.meeting_code)}</p>
          <p>
            You are in this meeting as {room.session.display_name} (
            {room.session.role === "host" ? "Host" : "Guest"}).
          </p>
        </>
      )}
      <Button className="mt-4" onClick={() => router.push("/")}>
        Back to home
      </Button>
    </main>
  );
}
