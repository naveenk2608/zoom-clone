import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { RoomPerson } from "@/hooks/useMeetingRoom";

const POLL_MS = 100; // how often the levels are read
const HOLD_MS = 1500; // a speaker keeps the floor this long after they were last heard
const THRESHOLD = 0.02; // RMS of the waveform (0 to 1); anything quieter counts as silence

/** Listens to one remote mic. Not connected to the speakers: the tile's <video> plays the sound. */
type Meter = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  samples: Float32Array<ArrayBuffer>;
};

/**
 * Who is talking, from the other participants' audio, with the Web Audio API.
 *
 * `speakerId` is the last person heard. It changes only when someone else is
 * loudest and the current speaker has been quiet for HOLD_MS, so the main
 * tile doesn't flicker. `speaking` says whether they are still talking now.
 *
 * Browsers start an AudioContext suspended until the page is clicked. Until
 * then every level reads as silence, so nobody is picked.
 */
export function useActiveSpeaker(people: RoomPerson[]) {
  const contextRef = useRef<AudioContext | null>(null);
  const metersRef = useRef(new Map<number, Meter>());
  const [speakerId, setSpeakerId] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // One AudioContext for the room, resumed on the next click if the browser
  // suspended it, and a timer that reads the levels.
  useEffect(() => {
    const context = new AudioContext();
    contextRef.current = context;
    const resume = () => {
      if (context.state === "suspended") void context.resume();
    };
    document.addEventListener("click", resume);

    let current: number | null = null;
    let heardAt = -Infinity; // when `current` was last the loudest
    const timer = window.setInterval(() => {
      const loudest = loudestMeter(metersRef.current);
      const now = performance.now();
      if (loudest !== null && (loudest === current || now - heardAt >= HOLD_MS)) {
        current = loudest;
        heardAt = now;
      }
      setSpeakerId(current);
      setSpeaking(current !== null && now - heardAt < HOLD_MS);
    }, POLL_MS);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("click", resume);
      contextRef.current = null;
      void context.close();
    };
  }, []);

  // The remote mic tracks. When this list changes (someone joins, leaves or
  // reconnects), every meter is rebuilt: simpler than patching, and cheap.
  const remoteAudio = people.flatMap((person) => {
    const track = person.isMe ? undefined : person.stream?.getAudioTracks()[0];
    return track === undefined ? [] : [{ id: person.id, track }];
  });
  const audioKey = remoteAudio.map(({ id, track }) => `${id}:${track.id}`).join(",");

  const buildMeters = useEffectEvent((context: AudioContext) => {
    const meters = new Map<number, Meter>();
    remoteAudio.forEach(({ id, track }) => {
      const source = context.createMediaStreamSource(new MediaStream([track]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      meters.set(id, { source, analyser, samples: new Float32Array(analyser.fftSize) });
    });
    return meters;
  });

  useEffect(() => {
    const context = contextRef.current;
    if (context === null) return;
    const meters = buildMeters(context);
    metersRef.current = meters;
    return () => {
      meters.forEach((meter) => meter.source.disconnect());
      metersRef.current = new Map();
    };
  }, [audioKey]);

  // Someone who left can't be the speaker, even before the meters catch up.
  const present = people.some((person) => person.id === speakerId);
  return { speakerId: present ? speakerId : null, speaking: present && speaking };
}

/** The participant whose mic is loudest right now, or null if everyone is below THRESHOLD. */
function loudestMeter(meters: Map<number, Meter>): number | null {
  let loudest: number | null = null;
  let loudestLevel = THRESHOLD;
  for (const [id, meter] of meters) {
    const level = rmsLevel(meter);
    if (level > loudestLevel) {
      loudest = id;
      loudestLevel = level;
    }
  }
  return loudest;
}

/** How loud the last few milliseconds were: the root mean square of the samples. */
function rmsLevel(meter: Meter): number {
  meter.analyser.getFloatTimeDomainData(meter.samples);
  let sumOfSquares = 0;
  for (const sample of meter.samples) sumOfSquares += sample * sample;
  return Math.sqrt(sumOfSquares / meter.samples.length);
}
