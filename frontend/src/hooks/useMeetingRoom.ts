import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { clearJoinSession, saveJoinSession, type JoinSession } from "@/lib/joinSession";
import type { ParticipantRole } from "@/types/api";
import type { ServerMessage } from "@/types/ws";

/** One person in the meeting, as the grid and the Participants panel show them. */
export interface RoomPerson {
  id: number;
  name: string;
  role: ParticipantRole;
  audio: boolean;
  video: boolean;
  isMe: boolean;
  stream: MediaStream | null; // their camera and mic; for us, only our camera
}

/** Everything the room screen needs: who is here, the media, our own mic and camera, and Leave / End. */
export function useMeetingRoom(code: string, session: JoinSession) {
  const router = useRouter();
  // The state we entered with. The socket connects once with these; later
  // changes are sent as messages instead of reconnecting.
  const [entry] = useState({ audio: session.audio_on, video: session.video_on });
  const media = useLocalMedia(entry);

  // Socket messages also go to the peer connections, which are set up just
  // below because they need the socket's `send`. This runs only when a
  // message arrives, by which time `peers` exists.
  function handleSocketMessage(message: ServerMessage) {
    peers.handleMessage(message);
  }
  const { status, others, send } = useMeetingSocket({
    code,
    token: session.join_token,
    audio: entry.audio,
    video: entry.video,
    onMessage: handleSocketMessage,
  });
  const peers = usePeerConnections(send, media.audioTrack, media.videoTrack);

  // Tell the others our mic and camera state, and save it so a refresh comes
  // back the same. Also sent once connected, in case a device failed to open
  // before the socket did.
  useEffect(() => {
    if (status !== "live") return;
    send({ type: "media_state", audio: media.audioOn, video: media.videoOn });
    saveJoinSession(code, { ...session, audio_on: media.audioOn, video_on: media.videoOn });
  }, [status, media.audioOn, media.videoOn, send, code, session]);

  // Sent out of the meeting: let go of the camera, mic and connections.
  // The server refused our token: this tab isn't really in the meeting, so go and join properly.
  // Being ended or removed also makes the saved session useless.
  const { stop: stopMedia } = media;
  const { closeAll } = peers;
  useEffect(() => {
    if (status === "connecting" || status === "live") return;
    stopMedia();
    closeAll();
    if (status !== "lost") clearJoinSession(code);
    if (status === "invalid") router.replace(`/j/${code}`);
  }, [status, code, router, stopMedia, closeAll]);

  const me: RoomPerson = {
    id: session.participant_id,
    name: session.display_name,
    role: session.role,
    audio: media.audioOn,
    video: media.videoOn,
    isMe: true,
    stream: media.preview,
  };
  const people = [
    me,
    ...others.map((other) => ({
      id: other.id,
      name: other.display_name,
      role: other.role,
      audio: other.audio,
      video: other.video,
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
    leave,
    endForAll: () => send({ type: "host_end" }), // the server answers with meeting_ended
  };
}
