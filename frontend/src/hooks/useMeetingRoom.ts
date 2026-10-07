import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { useChat } from "@/hooks/useChat";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { useScreenShare } from "@/hooks/useScreenShare";
import { clearJoinSession, saveJoinSession, type JoinSession } from "@/lib/joinSession";
import type { ParticipantRole } from "@/types/api";
import type { ServerMessage } from "@/types/ws";

/** One person in the meeting, as the grid and the Participants panel show them. */
export interface RoomPerson {
  id: number;
  name: string;
  role: ParticipantRole;
  audio: boolean;
  video: boolean; // the camera
  screen: boolean; // sharing the screen: their video is the screen, not the camera
  isMe: boolean;
  stream: MediaStream | null; // their video and mic; for us, only our video
}

/**
 * Everything the room screen needs: who is here, the media, our own mic,
 * camera and screen share, the chat, host controls, and Leave / End.
 */
export function useMeetingRoom(code: string, session: JoinSession, rtcConfig: RTCConfiguration) {
  const router = useRouter();
  const showToast = useToast();
  // The state we entered with. The socket connects once with these; later
  // changes are sent as messages instead of reconnecting.
  const [entry] = useState({ audio: session.audio_on, video: session.video_on });
  const media = useLocalMedia(entry);
  const share = useScreenShare();

  // Socket messages also go to the peer connections and the chat, which are
  // set up just below because they need the socket's `send`. This runs only
  // when a message arrives, by which time both exist.
  function handleSocketMessage(message: ServerMessage) {
    peers.handleMessage(message);
    chat.handleMessage(message);
    if (message.type === "force_mute") {
      media.mute(); // the media_state effect below tells everyone
      showToast("The host has muted you.");
    }
  }
  const { status, others, send } = useMeetingSocket({
    code,
    token: session.join_token,
    audio: entry.audio,
    video: entry.video,
    onMessage: handleSocketMessage,
  });
  // While we share our screen, it goes out in place of the camera.
  const outgoingVideo = share.screenTrack ?? media.videoTrack;
  const peers = usePeerConnections(send, media.audioTrack, outgoingVideo, rtcConfig);
  const chat = useChat(send);

  // Tell the others our mic, camera and screen-share state, and save the mic
  // and camera so a refresh comes back the same. Also sent once connected, in
  // case a device failed to open before the socket did.
  useEffect(() => {
    if (status !== "live") return;
    send({ type: "media_state", audio: media.audioOn, video: media.videoOn, screen: share.sharing });
    saveJoinSession(code, { ...session, audio_on: media.audioOn, video_on: media.videoOn });
  }, [status, media.audioOn, media.videoOn, share.sharing, send, code, session]);

  // Sent out of the meeting: let go of the camera, mic and connections.
  // The server refused our token: this tab isn't really in the meeting, so go and join properly.
  // Being ended or removed also makes the saved session useless.
  const { stop: stopMedia } = media;
  const { stop: stopSharing } = share;
  const { closeAll } = peers;
  useEffect(() => {
    if (status === "connecting" || status === "live") return;
    stopMedia();
    stopSharing();
    closeAll();
    if (status !== "lost") clearJoinSession(code);
    if (status === "invalid") router.replace(`/j/${code}`);
  }, [status, code, router, stopMedia, stopSharing, closeAll]);

  const me: RoomPerson = {
    id: session.participant_id,
    name: session.display_name,
    role: session.role,
    audio: media.audioOn,
    video: media.videoOn,
    screen: share.sharing,
    isMe: true,
    stream: share.preview ?? media.preview,
  };
  const people = [
    me,
    ...others.map((other) => ({
      id: other.id,
      name: other.display_name,
      role: other.role,
      audio: other.audio,
      video: other.video,
      screen: other.screen,
      isMe: false,
      stream: peers.streams.get(other.id) ?? null,
    })),
  ];

  function leave() {
    send({ type: "leave" });
    clearJoinSession(code);
    router.push("/");
  }

  return {
    status,
    people,
    me,
    toggleAudio: media.toggleAudio,
    toggleVideo: media.toggleVideo,
    sharing: share.sharing,
    toggleShare: share.toggleShare,
    chatMessages: chat.messages,
    sendChat: chat.sendMessage,
    leave,
    // Host controls. The server checks the role and answers with the effects:
    // media_state from each muted person, participant_left, meeting_ended.
    muteAll: () => send({ type: "host_mute_all" }),
    mute: (participantId: number) => send({ type: "host_mute", participant_id: participantId }),
    remove: (participantId: number) => send({ type: "host_remove", participant_id: participantId }),
    endForAll: () => send({ type: "host_end" }),
  };
}
