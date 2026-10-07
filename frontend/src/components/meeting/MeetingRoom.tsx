"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/meeting/ChatPanel";
import { HostRequestDialogs } from "@/components/meeting/HostRequestDialogs";
import { MeetingStatusScreen } from "@/components/meeting/MeetingStatusScreen";
import { MuteAllDialog } from "@/components/meeting/MuteAllDialog";
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
  const [muteAllOpen, setMuteAllOpen] = useState(false);
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
    // h-dvh: the height a phone shows right now, browser bars included (h-screen is
    // the height with them hidden, which pushed the toolbar below the screen).
    // The page itself never scrolls; the panels scroll inside. The padding keeps
    // the room clear of a notch; the toolbar pads itself for the home bar.
    <div className="flex h-dvh overflow-hidden bg-room-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-white">
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
          permissions={room.permissions}
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
          onReact={room.react}
          onToggleHand={room.toggleHand}
          onToggleShare={room.toggleShare}
          onMuteAll={() => setMuteAllOpen(true)}
          onSetPermissions={room.host.setPermissions}
          onToggleEndMenu={() => setEndMenuOpen((open) => !open)}
          onLeave={room.leave}
          onEndForAll={room.host.endForAll}
        />
      </div>
      {(chatOpen || participantsOpen) && (
        // Full screen on a phone; a column beside the tiles from `md` up.
        // With both open, Chat sits above Participants and they share the height.
        <aside className="fixed inset-0 z-30 flex flex-col gap-2 bg-room-bg p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:inset-auto md:w-100">
          {chatOpen && (
            <ChatPanel messages={room.chatMessages} onSend={room.sendChat} onClose={toggleChat} />
          )}
          {participantsOpen && (
            <ParticipantsPanel
              people={room.people}
              isHost={isHost}
              host={room.host}
              onInvite={() => copyText(meeting.invite_link, "Invite link copied")}
              onMuteAll={() => setMuteAllOpen(true)}
              onClose={() => setParticipantsOpen(false)}
            />
          )}
        </aside>
      )}
      {muteAllOpen && (
        <MuteAllDialog
          allowSelfUnmute={room.permissions.allow_self_unmute}
          onConfirm={room.host.muteAll}
          onClose={() => setMuteAllOpen(false)}
        />
      )}
      <HostRequestDialogs
        unmuteAsked={room.unmuteAsked}
        videoAsked={room.videoAsked}
        onAnswerUnmute={room.answerUnmuteRequest}
        onAnswerVideo={room.answerVideoRequest}
      />
    </div>
  );
}
