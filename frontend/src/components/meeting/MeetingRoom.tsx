"use client";

import { useState } from "react";

import { MeetingStatusScreen } from "@/components/meeting/MeetingStatusScreen";
import { ParticipantsPanel } from "@/components/meeting/ParticipantsPanel";
import { RoomHeader } from "@/components/meeting/RoomHeader";
import { Toolbar } from "@/components/meeting/Toolbar";
import { VideoGrid } from "@/components/meeting/VideoGrid";
import { useCopyText } from "@/hooks/useCopyText";
import { useMeetingRoom } from "@/hooks/useMeetingRoom";
import type { JoinSession } from "@/lib/joinSession";
import type { MeetingOut } from "@/types/api";

type MeetingRoomProps = {
  code: string;
  meeting: MeetingOut;
  session: JoinSession;
};

/** The live room: header, tiles, toolbar, and the Participants panel on the right. */
export function MeetingRoom({ code, meeting, session }: MeetingRoomProps) {
  const room = useMeetingRoom(code, session);
  const copyText = useCopyText();
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [endMenuOpen, setEndMenuOpen] = useState(false);
  // The browser refused to play sound before any click on the page (after a refresh, say).
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [playToken, setPlayToken] = useState(0);

  function enableAudio() {
    // This click counts as the user gesture the browser wanted; the tiles try again.
    setAudioBlocked(false);
    setPlayToken((token) => token + 1);
  }

  switch (room.status) {
    case "ended":
      return <MeetingStatusScreen message="This meeting has been ended by host." />;
    case "removed":
      return <MeetingStatusScreen message="You have been removed from this meeting by the host." />;
    case "lost":
      // Reloading rejoins: the page reads the saved session again and reconnects.
      return (
        <MeetingStatusScreen
          message="The connection to the meeting was lost."
          onRejoin={() => window.location.reload()}
        />
      );
    case "invalid":
      return null; // the room hook is sending this tab to the pre-join page
  }

  return (
    <div className="flex h-screen bg-room-bg text-white">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <RoomHeader meeting={meeting} isHost={room.me.role === "host"} />
        {audioBlocked && (
          <button
            type="button"
            onClick={enableAudio}
            className="absolute top-14 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-room-panel-raised px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-room-btn-active"
          >
            Click to enable audio
          </button>
        )}
        <VideoGrid
          people={room.people}
          playback={{ playToken, onAutoplayBlocked: () => setAudioBlocked(true) }}
        />
        <Toolbar
          me={room.me}
          participantCount={room.people.length}
          participantsOpen={participantsOpen}
          endMenuOpen={endMenuOpen}
          onToggleAudio={room.toggleAudio}
          onToggleVideo={room.toggleVideo}
          onToggleParticipants={() => setParticipantsOpen((open) => !open)}
          onToggleEndMenu={() => setEndMenuOpen((open) => !open)}
          onLeave={room.leave}
          onEndForAll={room.endForAll}
        />
      </div>
      {participantsOpen && (
        // Full screen on a phone; a column beside the tiles from `md` up.
        <aside className="fixed inset-0 z-30 flex flex-col bg-room-bg p-2 md:static md:inset-auto md:w-100">
          <ParticipantsPanel
            people={room.people}
            onInvite={() => copyText(meeting.invite_link, "Invite link copied")}
            onClose={() => setParticipantsOpen(false)}
          />
        </aside>
      )}
    </div>
  );
}
