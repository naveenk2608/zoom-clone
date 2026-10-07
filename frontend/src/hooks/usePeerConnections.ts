import { useCallback, useEffect, useRef, useState } from "react";

import {
  addAnswerTracks,
  addCandidate,
  addOfferTransceivers,
  newPeer,
  sendLocalTracks,
  setRemoteDescription,
  type LocalTracks,
  type Peer,
} from "@/lib/webrtc";
import type { ClientMessage, ServerMessage, SignalData } from "@/types/ws";

type Send = (message: ClientMessage) => void;

/**
 * One peer connection per other participant, and the media we receive from each.
 *
 * Who offers: the newcomer offers to everyone listed in `welcome`, and the
 * people already in the room only answer, so two offers never cross.
 */
export function usePeerConnections(
  send: Send,
  audioTrack: MediaStreamTrack | null,
  videoTrack: MediaStreamTrack | null,
) {
  const peersRef = useRef(new Map<number, Peer>());
  const tracksRef = useRef<LocalTracks>({ audio: null, video: null });
  // participant id -> what we receive from them
  const [streams, setStreams] = useState(new Map<number, MediaStream>());

  // Our tracks changed (camera on or off, or the devices finished opening):
  // remember them for new connections and swap them into the existing ones.
  useEffect(() => {
    tracksRef.current = { audio: audioTrack, video: videoTrack };
    peersRef.current.forEach((peer) => sendLocalTracks(peer.pc, tracksRef.current));
  }, [audioTrack, videoTrack]);

  // Close every connection when the room goes away.
  useEffect(() => {
    const peers = peersRef.current;
    return () => {
      peers.forEach((peer) => peer.pc.close());
      peers.clear();
    };
  }, []);

  function closePeer(id: number) {
    const peer = peersRef.current.get(id);
    if (peer === undefined) return;
    peer.pc.close();
    peersRef.current.delete(id);
    setStreams((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  /** A fresh connection to one participant, replacing any older one (they refreshed). */
  function createPeer(id: number): Peer {
    closePeer(id);
    const peer = newPeer();
    let received = new MediaStream();

    peer.pc.onicecandidate = (event) => {
      if (event.candidate === null) return; // gathering finished
      send({ type: "signal", to: id, data: { kind: "candidate", candidate: event.candidate.toJSON() } });
    };
    peer.pc.ontrack = (event) => {
      // Our own stream, not event.streams: that is empty with replaceTrack.
      // A new object each time, so the tile's effect sees the change.
      received = new MediaStream([...received.getTracks(), event.track]);
      setStreams((current) => new Map(current).set(id, received));
    };

    peersRef.current.set(id, peer);
    return peer;
  }

  function sendDescription(to: number, description: RTCSessionDescriptionInit) {
    send({ type: "signal", to, data: { kind: "description", description } });
  }

  async function offerTo(id: number) {
    const peer = createPeer(id);
    addOfferTransceivers(peer.pc, tracksRef.current);
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    sendDescription(id, offer);
  }

  async function answer(from: number, offer: RTCSessionDescriptionInit) {
    const peer = createPeer(from);
    await setRemoteDescription(peer, offer);
    addAnswerTracks(peer.pc, tracksRef.current);
    const reply = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(reply);
    sendDescription(from, reply);
  }

  async function handleSignal(from: number, data: SignalData) {
    if (data.kind === "description" && data.description.type === "offer") {
      await answer(from, data.description);
      return;
    }
    const peer = peersRef.current.get(from);
    if (peer === undefined) return; // from a connection we already closed
    if (data.kind === "description") {
      await setRemoteDescription(peer, data.description); // their answer to our offer
    } else {
      await addCandidate(peer, data.candidate);
    }
  }

  /** Called with every socket message; acts on the ones that matter for WebRTC. */
  function handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "welcome":
        message.participants.forEach((other) => report(offerTo(other.id)));
        break;
      case "signal":
        report(handleSignal(message.from, message.data));
        break;
      case "participant_left":
        closePeer(message.participant_id);
        break;
    }
  }

  /** Closes every connection, when we are sent out of the meeting. */
  const closeAll = useCallback(() => {
    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();
  }, []);

  return { streams, handleMessage, closeAll };
}

/**
 * Logs a failed WebRTC step instead of leaving an unhandled rejection. These
 * fail when a connection is closed mid-step, for example when the other person
 * refreshes; their new offer then starts over.
 */
function report(step: Promise<void>) {
  step.catch((error: unknown) => console.warn("WebRTC step failed:", error));
}
