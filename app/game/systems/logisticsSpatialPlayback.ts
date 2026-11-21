import type { LogisticsAcousticsV108 } from "./clanLogisticsV108";

interface Channel {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  panner: StereoPannerNode | null;
}

/** One graph for the two existing recordings. Create it only from playback gestures. */
export function createLogisticsSpatialPlayback() {
  let context: AudioContext | null = null;
  const channels = new Map<HTMLAudioElement, Channel>();

  function mix(media: HTMLAudioElement, acoustics: LogisticsAcousticsV108 | null) {
    const channel = channels.get(media);
    if (!context || !channel) return;
    const at = context.currentTime;
    channel.gain.gain.cancelScheduledValues(at);
    if (!acoustics || acoustics.status !== "audible") {
      channel.gain.gain.setValueAtTime(0, at);
      return;
    }
    channel.gain.gain.setTargetAtTime(acoustics.gain, at, .025);
    if (channel.panner) {
      channel.panner.pan.cancelScheduledValues(at);
      channel.panner.pan.setTargetAtTime(acoustics.pan, at, .025);
    }
  }

  async function wake(media: HTMLAudioElement, acoustics: LogisticsAcousticsV108) {
    if (typeof AudioContext !== "function") return;
    const current = context ??= new AudioContext();
    if (!channels.has(media)) {
      const gain = current.createGain();
      gain.gain.value = 0;
      const panner = typeof current.createStereoPanner === "function" ? current.createStereoPanner() : null;
      const source = current.createMediaElementSource(media);
      source.connect(gain);
      if (panner) gain.connect(panner).connect(current.destination);
      else gain.connect(current.destination);
      channels.set(media, { source, gain, panner });
    }
    mix(media, acoustics);
    if (current.state === "suspended") await current.resume();
  }

  function playingOutput(media: HTMLAudioElement) {
    return !channels.has(media) || context?.state === "running";
  }

  function close() {
    for (const { source, gain, panner } of channels.values()) {
      source.disconnect();
      gain.disconnect();
      panner?.disconnect();
    }
    channels.clear();
    const current = context;
    context = null;
    if (current && current.state !== "closed") void current.close().catch(() => {});
  }

  return { mix, wake, playingOutput, close };
}
