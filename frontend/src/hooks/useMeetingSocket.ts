import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { WS_URL } from "@/lib/config";
import { applyMessage, parseServerMessage } from "@/lib/roomState";
import {
  CLOSE_ENDED,
  CLOSE_INVALID_TOKEN,
  CLOSE_REMOVED,
  type ClientMessage,
  type RoomParticipant,
  type ServerMessage,
} from "@/types/ws";

export type SocketStatus =
  | "connecting"
  | "live"
  | "ended" // the host ended the meeting
  | "removed" // the host removed us
  | "invalid" // the join token isn't accepted: back to the pre-join page
  | "lost"; // the connection dropped

const NORMAL_CLOSE = 1000;

type SocketOptions = {
  code: string;
  token: string;
  audio: boolean; // the mic and camera state to enter with, so others never see it flicker
  video: boolean;
  onMessage: (message: ServerMessage) => void; // every message, after the room state is updated
};

/** The meeting's WebSocket: who else is here, whether we are connected, and a way to send. */
export function useMeetingSocket({ code, token, audio, video, onMessage }: SocketOptions) {
  const showToast = useToast();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [others, setOthers] = useState<RoomParticipant[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  // Always calls the latest onMessage, without reconnecting when it changes.
  const deliver = useEffectEvent(onMessage);

  useEffect(() => {
    const flags = `audio=${audio ? 1 : 0}&video=${video ? 1 : 0}`;
    const socket = new WebSocket(
      `${WS_URL}/ws/meetings/${code}?token=${encodeURIComponent(token)}&${flags}`,
    );
    socketRef.current = socket;
    // Set on cleanup. React StrictMode runs this effect twice in dev, and the
    // first socket's events must not change the state of the second.
    let closedByUs = false;

    socket.onmessage = (event: MessageEvent<string>) => {
      const message = parseServerMessage(event.data);
      if (message === null) return;
      if (message.type === "welcome") setStatus("live");
      if (message.type === "error") showToast(message.message);
      setOthers((current) => applyMessage(current, message));
      deliver(message);
    };

    socket.onclose = (event) => {
      if (closedByUs) return;
      const next = statusForClose(event.code);
      if (next !== null) setStatus(next);
    };

    return () => {
      closedByUs = true;
      socket.close();
      socketRef.current = null;
    };
  }, [code, token, audio, video, showToast]);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket !== null && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  return { status, others, send };
}

/** What a close code means for the room, or null when the room needs no change. */
function statusForClose(code: number): SocketStatus | null {
  switch (code) {
    case CLOSE_INVALID_TOKEN:
      return "invalid";
    case CLOSE_REMOVED:
      return "removed";
    case CLOSE_ENDED:
      return "ended";
    case NORMAL_CLOSE:
      return null; // we left on purpose
    default:
      return "lost";
  }
}
