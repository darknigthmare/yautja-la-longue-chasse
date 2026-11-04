/**
 * A disposable procedural voice on the owning GameAudio effects bus.
 * It never creates an AudioContext or fetches files. Short cues are immediate:
 * a blocked autoplay unlock cannot replay an old impact later.
 */
export interface SceneAudioTone {
  frequency: number;
  endFrequency?: number;
  duration?: number;
  delay?: number;
  gain?: number;
  type?: OscillatorType;
  filterFrequency?: number;
}

export interface SceneAudioNoise {
  duration?: number;
  delay?: number;
  gain?: number;
  filterFrequency?: number;
  endFilterFrequency?: number;
  filterType?: BiquadFilterType;
}

export interface SceneAudioSound {
  tones?: readonly SceneAudioTone[];
  noises?: readonly SceneAudioNoise[];
}

export interface SceneAudioPort {
  play(sound: SceneAudioSound): boolean;
  loop(key: string, sound: SceneAudioSound): void;
  unlock(): void;
  stop(): void;
  dispose(): void;
}

export interface SceneAudioGraph { context: AudioContext; effects: AudioNode }
export interface SceneAudioOwner {
  /** Null until the shared engine is ready, or while it is paused/disposed. */
  graph: () => SceneAudioGraph | null;
  unlock: () => Promise<void>;
  released?: () => void;
}

interface Voice {
  source: AudioScheduledSourceNode;
  envelope: GainNode;
  nodes: AudioNode[];
  loop: boolean;
  context: AudioContext;
}

const SILENCE = .0001;
const finite = (value: number | undefined, fallback: number, minimum: number, maximum: number) =>
  Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value!)) : fallback;

export class GameSceneAudio implements SceneAudioPort {
  private readonly owner: SceneAudioOwner;
  private readonly voices = new Set<Voice>();
  private desiredLoop: { key: string; sound: SceneAudioSound } | null = null;
  private activeLoop: string | null = null;
  private generation = 0;
  private unlockAttempt = -1;
  private disposed = false;

  constructor(owner: SceneAudioOwner) { this.owner = owner; }

  /** Triggered by an input gesture; no one-shot is retained behind this promise. */
  unlock(): void {
    if (this.disposed) return;
    const generation = this.generation;
    this.unlockAttempt = generation;
    void this.owner.unlock().then(() => {
      if (!this.disposed && this.generation === generation) this.startRequestedLoop();
    }).catch(() => undefined);
  }

  play(sound: SceneAudioSound): boolean {
    if (this.disposed) return false;
    const graph = this.owner.graph();
    if (!graph) return false;
    this.addSound(graph, sound, false);
    return true;
  }

  loop(key: string, sound: SceneAudioSound): void {
    if (this.disposed) return;
    if (this.desiredLoop?.key !== key) {
      this.generation += 1;
      this.desiredLoop = { key, sound };
      this.activeLoop = null;
      for (const voice of this.voices) if (voice.loop) this.stopVoice(voice, .16);
    }
    this.startRequestedLoop();
    if (this.activeLoop === null && this.unlockAttempt !== this.generation) this.unlock();
  }

  /** Stop both persistent and short sounds, including voices already fading out. */
  stop(): void {
    this.generation += 1;
    this.desiredLoop = null;
    this.activeLoop = null;
    for (const voice of [...this.voices]) this.stopVoice(voice, 0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.owner.released?.();
  }

  private startRequestedLoop(): void {
    if (this.disposed || !this.desiredLoop || this.activeLoop === this.desiredLoop.key) return;
    const graph = this.owner.graph();
    if (!graph) return;
    this.addSound(graph, this.desiredLoop.sound, true);
    this.activeLoop = this.desiredLoop.key;
  }

  private addSound(graph: SceneAudioGraph, sound: SceneAudioSound, loop: boolean): void {
    // Authored presets stay small; malformed callers cannot allocate unbounded layers.
    for (const tone of (sound.tones ?? []).slice(0, 6)) this.addTone(graph, tone, loop);
    for (const noise of (sound.noises ?? []).slice(0, 4)) this.addNoise(graph, noise, loop);
  }

  private addTone({ context, effects }: SceneAudioGraph, tone: SceneAudioTone, loop: boolean): void {
    const gain = finite(tone.gain, .08, 0, .5);
    if (gain === 0) return;
    const source = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const start = context.currentTime + (loop ? 0 : finite(tone.delay, 0, 0, 2));
    const duration = finite(tone.duration, .18, .025, 4);
    const frequency = finite(tone.frequency, 120, 20, 12_000);
    source.type = tone.type ?? 'sine';
    source.frequency.setValueAtTime(frequency, start);
    if (!loop) source.frequency.exponentialRampToValueAtTime(finite(tone.endFrequency, frequency, 20, 12_000), start + duration);
    filter.type = 'lowpass';
    filter.frequency.value = finite(tone.filterFrequency, 2_800, 40, 14_000);
    filter.Q.value = .55;
    source.connect(filter); filter.connect(envelope); envelope.connect(effects);
    this.beginVoice({ source, envelope, nodes: [source, filter, envelope], loop, context }, start, duration, gain);
  }

  private addNoise({ context, effects }: SceneAudioGraph, noise: SceneAudioNoise, loop: boolean): void {
    const gain = finite(noise.gain, .08, 0, .5);
    if (gain === 0) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const start = context.currentTime + (loop ? 0 : finite(noise.delay, 0, 0, 2));
    const duration = finite(noise.duration, .25, .035, 4);
    const frames = Math.max(1, Math.ceil(context.sampleRate * (loop ? 2.1 : duration + .03)));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    // Repeatable original noise, independent from the game's random/ecology state.
    let seed = 0x36fa947;
    for (let i = 0; i < frames; i += 1) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; samples[i] = seed / 0x80000000 - 1; }
    source.buffer = buffer;
    source.loop = loop;
    filter.type = noise.filterType ?? 'bandpass';
    const frequency = finite(noise.filterFrequency, 650, 20, 14_000);
    filter.frequency.setValueAtTime(frequency, start);
    if (!loop) filter.frequency.exponentialRampToValueAtTime(finite(noise.endFilterFrequency, frequency, 20, 14_000), start + duration);
    filter.Q.value = .65;
    source.connect(filter); filter.connect(envelope); envelope.connect(effects);
    this.beginVoice({ source, envelope, nodes: [source, filter, envelope], loop, context }, start, duration, gain);
  }

  private beginVoice(voice: Voice, start: number, duration: number, gain: number): void {
    const parameter = voice.envelope.gain;
    parameter.setValueAtTime(SILENCE, start);
    parameter.linearRampToValueAtTime(gain, start + (voice.loop ? .35 : Math.min(.018, duration * .15)));
    if (!voice.loop) parameter.exponentialRampToValueAtTime(SILENCE, start + duration);
    this.voices.add(voice);
    voice.source.onended = () => this.releaseVoice(voice);
    voice.source.start(start);
    if (!voice.loop) voice.source.stop(start + duration + .025);
  }

  private stopVoice(voice: Voice, fade: number): void {
    const at = voice.context.currentTime;
    const parameter = voice.envelope.gain;
    parameter.cancelScheduledValues(at);
    parameter.setValueAtTime(fade ? parameter.value : 0, at);
    if (fade) parameter.linearRampToValueAtTime(0, at + fade);
    try { voice.source.stop(at + fade); } catch { /* An already ended voice is safe to release. */ }
    if (!fade) this.releaseVoice(voice);
    // A retiring loop must not be rescheduled by another rapid phase change.
    voice.loop = false;
  }

  private releaseVoice(voice: Voice): void {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null;
    for (const node of voice.nodes) node.disconnect();
  }
}
