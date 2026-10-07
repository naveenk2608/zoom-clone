// Building blocks for the mesh: one RTCPeerConnection per other participant.
// Media goes straight between browsers; the server only relays the signaling.

import { TURN_CREDENTIAL, TURN_URL, TURN_USERNAME } from "@/lib/config";

/** Our own mic and camera tracks. Null when that device is off or unavailable. */
export interface LocalTracks {
  audio: MediaStreamTrack | null;
  video: MediaStreamTrack | null;
}

/** A connection to one other participant, plus ICE candidates that arrived too early. */
export interface Peer {
  pc: RTCPeerConnection;
  pending: RTCIceCandidateInit[];
}

/** Google's public STUN server, plus a TURN server when one is configured. */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  if (TURN_URL) {
    servers.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL });
  }
  return servers;
}

export function newPeer(): Peer {
  return { pc: new RTCPeerConnection({ iceServers: iceServers() }), pending: [] };
}

/**
 * The newcomer's side. One audio and one video transceiver always exist, even
 * with the device off, so we still receive the other person's media and can
 * add our own later with replaceTrack, without a new offer.
 */
export function addOfferTransceivers(pc: RTCPeerConnection, tracks: LocalTracks): void {
  pc.addTransceiver("audio", { direction: "sendrecv" });
  pc.addTransceiver("video", { direction: "sendrecv" });
  sendLocalTracks(pc, tracks);
}

/** The answering side, after the offer is set: send on the transceivers the offer created. */
export function addAnswerTracks(pc: RTCPeerConnection, tracks: LocalTracks): void {
  pc.getTransceivers().forEach((transceiver) => {
    transceiver.direction = "sendrecv";
  });
  sendLocalTracks(pc, tracks);
}

/**
 * Puts our current tracks on the connection's senders, matched by kind. A null
 * track sends nothing. Used on mute and camera changes too: no renegotiation.
 */
export function sendLocalTracks(pc: RTCPeerConnection, tracks: LocalTracks): void {
  if (pc.signalingState === "closed") return;
  pc.getTransceivers().forEach((transceiver) => {
    const kind = transceiver.receiver.track.kind;
    const track = kind === "audio" ? tracks.audio : tracks.video;
    transceiver.sender.replaceTrack(track).catch(() => {
      // only fails if the connection closed meanwhile, and then there is nothing to send to
    });
  });
}

/** Sets the other side's offer or answer, then adds the candidates that were waiting for it. */
export async function setRemoteDescription(
  peer: Peer,
  description: RTCSessionDescriptionInit,
): Promise<void> {
  await peer.pc.setRemoteDescription(description);
  for (const candidate of peer.pending.splice(0)) {
    await peer.pc.addIceCandidate(candidate);
  }
}

/** Adds an ICE candidate, or keeps it until the remote description is set. */
export async function addCandidate(peer: Peer, candidate: RTCIceCandidateInit): Promise<void> {
  if (peer.pc.remoteDescription === null) {
    peer.pending.push(candidate);
    return;
  }
  await peer.pc.addIceCandidate(candidate);
}
