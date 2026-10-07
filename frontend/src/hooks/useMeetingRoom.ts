import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useChat } from "@/hooks/useChat";
import { useHostRequests } from "@/hooks/useHostRequests";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useMediaDevices, type RoomDevices } from "@/hooks/useMediaDevices";
import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { useReactions } from "@/hooks/useReactions";
import { useScreenShare } from "@/hooks/useScreenShare";
import { hostCommands } from "@/lib/hostCommands";
import { clearJoinSession, saveJoinSession, type JoinSession } from "@/lib/joinSession";
import type { ParticipantRole } from "@/types/api";
import type { Reaction, ServerMessage } from "@/types/ws";

/** One person in the meeting, as the grid and the Participants panel show them. */
export interface RoomPerson {
  id: number;
  name: string;
  role: ParticipantRole;
  audio: boolean;
  video: boolean; // the camera
  screen: boolean; // sharing the screen: their video is the screen, not the camera
  isMe: boolean;
  pinned: boolean; // we pinned them to the main tile; only on our screen
  handRaised: boolean;
  reaction: Reaction | null; // shown on their tile for a few seconds after they react
  stream: MediaStream | null; // their video and mic; for us, only our video
}

/**
 * Everything the room screen needs: who is here, the media, our own mic,
 * camera and screen share, the devices to pick from, the chat, what the host
 * allows and asks, host controls, and Leave / End.
 */
export function useMeetingRoom(code: string, session: JoinSession, rtcConfig: RTCConfiguration) {
  const router = useRouter();
  // The state we entered with. The socket connects once with these; later
  // changes are sent as messages instead of reconnecting.
  const [entry] = useState({ audio: session.audio_on, video: session.video_on });
  const media = useLocalMedia(entry);
  const share = useScreenShare();
  const deviceLists = useMediaDevices(media.audioTrack, media.videoTrack);
  // The speaker the others' sound plays on. Null is the browser's default.
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const devices: RoomDevices = {
    microphone: {
      devices: deviceLists.microphones,
      selectedId: media.microphoneId,
      choose: media.chooseMicrophone,
    },
    speaker: { devices: deviceLists.speakers, selectedId: speakerId, choose: setSpeakerId },
    camera: { devices: deviceLists.cameras, selectedId: media.cameraId, choose: media.chooseCamera },
  };
  // Who we pinned to the main tile, or null. Nobody else sees it.
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const hostRequests = useHostRequests(media);

  // Socket messages also go to the peer connections, the chat and the
  // reactions, which are set up just below because they need the socket's
  // `send`. This runs only when a message arrives, by which time they exist.
  function handleSocketMessage(message: ServerMessage) {
    peers.handleMessage(message);
    chat.handleMessage(message);
    reactions.handleMessage(message);
    hostRequests.handleMessage(message); // mic and camera changes reach everyone via media_state
    if (message.type === "participant_left") {
      // The pinned person left: unpin, so they aren't pinned again if they come back.
      setPinnedId((current) => (current === message.participant_id ? null : current));
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
  const reactions = useReactions(send, session.participant_id);

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
    pinned: false, // only other people can be pinned
    handRaised: reactions.handRaised,
    reaction: reactions.reactions.get(session.participant_id)?.emoji ?? null,
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
      pinned: other.id === pinnedId,
      handRaised: other.hand_raised,
      reaction: reactions.reactions.get(other.id)?.emoji ?? null,
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
    devices,
    speakerId,
    pin: setPinnedId, // null unpins
    sharing: share.sharing,
    toggleShare: share.toggleShare,
    chatMessages: chat.messages,
    sendChat: chat.sendMessage,
    react: reactions.react,
    toggleHand: reactions.toggleHand,
    permissions: hostRequests.permissions,
    unmuteAsked: hostRequests.unmuteAsked,
    videoAsked: hostRequests.videoAsked,
    answerUnmuteRequest: hostRequests.answerUnmuteRequest,
    answerVideoRequest: hostRequests.answerVideoRequest,
    leave,
    host: hostCommands(send),
  };
}
