"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/meeting/ChatPanel";
import { MeetingStatusScreen } from "@/components/meeting/MeetingStatusScreen";
import { ParticipantsPanel } from "@/components/meeting/ParticipantsPanel";
import { RoomHeader } from "@/components/meeting/RoomHeader";
import { SpeakerView } from "@/components/meeting/SpeakerView";
import { Toolbar } from "@/components/meeting/Toolbar";
import { VideoGrid } from "@/components/meeting/VideoGrid";
import type { RoomView } from "@/components/meeting/ViewMenu";
import { useActiveSpeaker } from "@/hooks/useActiveSpeaker";
import { useCopyText } from "@/hooks/useCopyText";
import { useMeetingRoom, type RoomPerson } from "@/hooks/useMeetingRoom";
import type { JoinSession } from "@/lib/joinSession";
import type { MeetingOut } from "@/types/api";

type MeetingRoomProps = {
  code: string;
  meeting: MeetingOut;
  session: JoinSession;
  rtcConfig: RTCConfiguration; // STUN and TURN servers for the peer connections
};

/** The live room: header, tiles, toolbar, and the Chat and Participants panels on the right. */
export function MeetingRoom({ code, meeting, session, rtcConfig }: MeetingRoomProps) {
  const room = useMeetingRoom(code, session, rtcConfig);
  const copyText = useCopyText();
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // How many messages had arrived when the chat was last closed. The ones
  // after that are unread, and counted on the Chat button.
  const [seenCount, setSeenCount] = useState(0);
  const unreadCount = chatOpen ? 0 : room.chatMessages.length - seenCount;
  const [endMenuOpen, setEndMenuOpen] = useState(false);
  // The browser refused to play sound before any click on the page (after a refresh, say).
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [view, setView] = useState<RoomView>("speaker"); // Zoom's default
  const { speakerId, speaking } = useActiveSpeaker(room.people);
  const speakingId = speaking ? speakerId : null;

  function enableAudio() {
    // This click counts as the user gesture the browser wanted; the tiles try again.
    setAudioBlocked(false);
    setPlayToken((token) => token + 1);
  }

  function toggleChat() {
    if (chatOpen) setSeenCount(room.chatMessages.length);
    setChatOpen(!chatOpen);
  }

  // Pinning puts the person in Speaker view's main tile, so from Gallery view
  // it switches to Speaker view, as in Zoom.
  function togglePin(person: RoomPerson) {
    if (person.pinned) {
      room.pin(null);
      return;
    }
    room.pin(person.id);
    setView("speaker");
  }

  const isHost = room.me.role === "host";
  const playback = {
    playToken,
    onAutoplayBlocked: () => setAudioBlocked(true),
    sinkId: room.speakerId,
  };

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
        <RoomHeader meeting={meeting} isHost={isHost} view={view} onViewChange={setView} />
        {audioBlocked && (
          <button
            type="button"
            onClick={enableAudio}
            className="absolute top-14 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-room-panel-raised px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-room-btn-active"
          >
            Click to enable audio
          </button>
        )}
        {view === "speaker" ? (
          <SpeakerView
            people={room.people}
            playback={playback}
            speakerId={speakerId}
            speakingId={speakingId}
            onTogglePin={togglePin}
          />
        ) : (
          <VideoGrid
            people={room.people}
            playback={playback}
            speakingId={speakingId}
            onTogglePin={togglePin}
          />
        )}
        <Toolbar
          me={room.me}
          devices={room.devices}
          participantCount={room.people.length}
          participantsOpen={participantsOpen}
          chatOpen={chatOpen}
          unreadCount={unreadCount}
          sharing={room.sharing}
          endMenuOpen={endMenuOpen}
          onToggleAudio={room.toggleAudio}
          onToggleVideo={room.toggleVideo}
          onToggleParticipants={() => setParticipantsOpen((open) => !open)}
          onOpenParticipants={() => setParticipantsOpen(true)}
          onToggleChat={toggleChat}
          onToggleShare={room.toggleShare}
          onMuteAll={room.muteAll}
          onToggleEndMenu={() => setEndMenuOpen((open) => !open)}
          onLeave={room.leave}
          onEndForAll={room.endForAll}
        />
      </div>
      {(chatOpen || participantsOpen) && (
        // Full screen on a phone; a column beside the tiles from `md` up.
        // With both open, Chat sits above Participants and they share the height.
        <aside className="fixed inset-0 z-30 flex flex-col gap-2 bg-room-bg p-2 md:static md:inset-auto md:w-100">
          {chatOpen && (
            <ChatPanel messages={room.chatMessages} onSend={room.sendChat} onClose={toggleChat} />
          )}
          {participantsOpen && (
            <ParticipantsPanel
              people={room.people}
              isHost={isHost}
              onInvite={() => copyText(meeting.invite_link, "Invite link copied")}
              onMuteAll={room.muteAll}
              onMute={room.mute}
              onRemove={room.remove}
              onClose={() => setParticipantsOpen(false)}
            />
          )}
        </aside>
      )}
    </div>
  );
}
