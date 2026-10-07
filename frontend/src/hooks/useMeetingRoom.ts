import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { clearJoinSession, saveJoinSession, type JoinSession } from "@/lib/joinSession";
import type { ParticipantRole } from "@/types/api";

/** One person in the meeting, as the grid and the Participants panel show them. */
export interface RoomPerson {
  id: number;
  name: string;
  role: ParticipantRole;
  audio: boolean;
  video: boolean;
  isMe: boolean;
}

/** Everything the room screen needs: who is here, our own mic and camera, and Leave / End. */
export function useMeetingRoom(code: string, session: JoinSession) {
  const router = useRouter();
  const [audioOn, setAudioOn] = useState(session.audio_on);
  const [videoOn, setVideoOn] = useState(session.video_on);
  // The state we entered with. The socket connects once with these; later
  // changes are sent as messages instead of reconnecting.
  const [entry] = useState({ audio: session.audio_on, video: session.video_on });
  const { status, others, send } = useMeetingSocket({
    code,
    token: session.join_token,
    audio: entry.audio,
    video: entry.video,
  });

  // The server refused our token: this tab isn't really in the meeting, so go and join properly.
  // Being ended or removed also makes the saved session useless.
  useEffect(() => {
    if (status === "invalid" || status === "ended" || status === "removed") {
      clearJoinSession(code);
    }
    if (status === "invalid") router.replace(`/j/${code}`);
  }, [status, code, router]);

  const me: RoomPerson = {
    id: session.participant_id,
    name: session.display_name,
    role: session.role,
    audio: audioOn,
    video: videoOn,
    isMe: true,
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
    })),
  ];

  function changeMedia(audio: boolean, video: boolean) {
    setAudioOn(audio);
    setVideoOn(video);
    send({ type: "media_state", audio, video });
    // Saved, so a refresh comes back with the same mic and camera state.
    saveJoinSession(code, { ...session, audio_on: audio, video_on: video });
  }

  function leave() {
    send({ type: "leave" });
    clearJoinSession(code);
    router.push("/");
  }

  return {
    status,
    people,
    me,
    toggleAudio: () => changeMedia(!audioOn, videoOn),
    toggleVideo: () => changeMedia(audioOn, !videoOn),
    leave,
    endForAll: () => send({ type: "host_end" }), // the server answers with meeting_ended
  };
}
