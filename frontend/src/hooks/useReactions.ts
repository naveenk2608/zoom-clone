import { useEffect, useRef, useState } from "react";

import type { ClientMessage, Reaction, ServerMessage } from "@/types/ws";

type Send = (message: ClientMessage) => void;

const REACTION_MS = 10_000; // how long a reaction stays on the sender's tile

/** A reaction on someone's tile. A new object for each one, so its timer can tell if it was replaced. */
type ShownReaction = { emoji: Reaction };

/**
 * Reactions, and our own raised hand.
 *
 * The server sends every reaction and hand change to everyone, the sender
 * included, so what we show is always what the others see. Other people's
 * hands are kept with their media state (lib/roomState.ts); ours is kept
 * here, because the host can lower it for us.
 */
export function useReactions(send: Send, myId: number) {
  // participant id -> the reaction on their tile right now
  const [reactions, setReactions] = useState(new Map<number, ShownReaction>());
  const [handRaised, setHandRaised] = useState(false);
  const timersRef = useRef(new Set<number>());

  // Leaving the room stops the timers that would remove reactions later.
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function show(participantId: number, emoji: Reaction) {
    const shown: ShownReaction = { emoji };
    setReactions((current) => new Map(current).set(participantId, shown));
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      setReactions((current) => {
        if (current.get(participantId) !== shown) return current; // a newer one replaced it
        const next = new Map(current);
        next.delete(participantId);
        return next;
      });
    }, REACTION_MS);
    timersRef.current.add(timer);
  }

  /** Called with every socket message; acts on reactions and on our own hand. */
  function handleMessage(message: ServerMessage) {
    if (message.type === "reaction") show(message.participant_id, message.emoji);
    if (message.type === "hand" && message.participant_id === myId) setHandRaised(message.raised);
  }

  return {
    reactions,
    handRaised,
    handleMessage,
    react: (emoji: Reaction) => send({ type: "reaction", emoji }),
    toggleHand: () => send(handRaised ? { type: "lower_hand" } : { type: "raise_hand" }),
  };
}
