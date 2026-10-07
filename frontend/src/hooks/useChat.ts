import { useState } from "react";

import type { ChatMessage, ClientMessage, ServerMessage } from "@/types/ws";

type Send = (message: ClientMessage) => void;

/**
 * Meeting chat: the messages received since we joined, and a way to send one.
 *
 * Our own message is shown when the server sends it back, so every message
 * on screen has the id and time the server saved it with.
 */
export function useChat(send: Send) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /** Called with every socket message; keeps the chat ones. */
  function handleMessage(message: ServerMessage) {
    if (message.type === "chat") {
      setMessages((current) => [...current, message]);
    }
  }

  function sendMessage(body: string) {
    send({ type: "chat", body });
  }

  return { messages, handleMessage, sendMessage };
}
