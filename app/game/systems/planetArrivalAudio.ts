import {
  PLANET_ARRIVAL_CONTACT_PROGRESS, PLANET_ARRIVAL_DURATION_MS, PLANET_ARRIVAL_SHOTS,
  planetArrivalShotAt, type PlanetArrivalState, type PlanetArrivalShotId,
} from './planetArrival';
import type { BiomeId } from '../types';
import type { SceneAudioPort, SceneAudioSound } from './sceneAudio';

const at = (id: PlanetArrivalShotId, progress = 0) => {
  const shot = PLANET_ARRIVAL_SHOTS.find(item => item.id === id)!;
  return shot.startMs + (shot.endMs - shot.startMs) * progress;
};

/** Original synth cues, authored for this montage rather than sampled from a film. */
export const PLANET_ARRIVAL_SOUND_CUES = [
  { id: 'destination', atMs: at('title'), sound: { tones: [
    { frequency: 132, endFrequency: 130, duration: .7, gain: .075 },
    { frequency: 198, duration: .58, delay: .12, gain: .045 },
    { frequency: 264, endFrequency: 247, duration: .65, delay: .24, gain: .035 },
  ] } },
  { id: 'carrier', atMs: at('carrier'), sound: {
    tones: [{ frequency: 104, endFrequency: 42, duration: 1.5, gain: .08, type: 'triangle', filterFrequency: 450 }],
    noises: [{ duration: 1.3, gain: .055, filterType: 'lowpass', filterFrequency: 620, endFilterFrequency: 190 }],
  } },
  { id: 'release', atMs: at('release'), sound: {
    tones: [{ frequency: 220, endFrequency: 58, duration: .25, gain: .095, type: 'triangle', filterFrequency: 850 }],
    noises: [{ duration: .12, gain: .1, filterFrequency: 1_400, endFilterFrequency: 400 },
      { duration: .7, delay: .09, gain: .1, filterFrequency: 1_800, endFilterFrequency: 350 }],
  } },
  { id: 'descent', atMs: at('descent'), sound: {
    tones: [{ frequency: 87, endFrequency: 51, duration: .8, gain: .045 }],
  } },
  { id: 'reentry', atMs: at('atmosphere'), sound: {
    tones: [{ frequency: 140, endFrequency: 68, duration: .9, gain: .045, type: 'triangle', filterFrequency: 500 }],
    noises: [{ duration: 1.2, gain: .095, filterFrequency: 2_800, endFilterFrequency: 650 }],
  } },
  { id: 'impact', atMs: at('landing', PLANET_ARRIVAL_CONTACT_PROGRESS), sound: {
    tones: [{ frequency: 88, endFrequency: 31, duration: .5, gain: .2 },
      { frequency: 170, endFrequency: 62, duration: .13, gain: .07, type: 'triangle', filterFrequency: 600 }],
    noises: [{ duration: .7, gain: .18, filterType: 'lowpass', filterFrequency: 700, endFilterFrequency: 100 }],
  } },
  { id: 'hatch', atMs: at('egress'), sound: {
    tones: [{ frequency: 350, endFrequency: 190, duration: .11, gain: .055, type: 'triangle' },
      { frequency: 180, endFrequency: 90, duration: .32, delay: .12, gain: .04 }],
    noises: [{ duration: .85, gain: .095, filterFrequency: 950, endFilterFrequency: 160 }],
  } },
  { id: 'first-step', atMs: at('egress', .38), sound: {
    tones: [{ frequency: 85, endFrequency: 46, duration: .09, gain: .045 }],
    noises: [{ duration: .12, gain: .055, filterType: 'lowpass', filterFrequency: 430, endFilterFrequency: 170 }],
  } },
  { id: 'second-step', atMs: at('egress', .62), sound: {
    tones: [{ frequency: 78, endFrequency: 42, duration: .09, gain: .045 }],
    noises: [{ duration: .13, gain: .055, filterType: 'lowpass', filterFrequency: 390, endFilterFrequency: 150 }],
  } },
] as const satisfies readonly { id: string; atMs: number; sound: SceneAudioSound }[];

const ORBIT: SceneAudioSound = { tones: [{ frequency: 38, gain: .045 }, { frequency: 57, gain: .018 }],
  noises: [{ filterType: 'lowpass', filterFrequency: 160, gain: .016 }] };
const CARRIER: SceneAudioSound = { tones: [{ frequency: 45, type: 'triangle', filterFrequency: 340, gain: .065 }, { frequency: 69, gain: .021 }],
  noises: [{ filterFrequency: 300, gain: .028 }] };
const DESCENT: SceneAudioSound = { tones: [{ frequency: 65, type: 'triangle', filterFrequency: 400, gain: .045 }],
  noises: [{ filterFrequency: 460, gain: .045 }] };
const ATMOSPHERE: SceneAudioSound = { tones: [{ frequency: 90, type: 'triangle', filterFrequency: 400, gain: .025 }],
  noises: [{ filterFrequency: 1_300, gain: .09 }, { filterType: 'lowpass', filterFrequency: 300, gain: .05 }] };

const SURFACE_FREQUENCIES: Readonly<Record<BiomeId, number>> = {
  jungle: 820, ice: 1_400, volcano: 180, swamp: 500, desert: 1_650,
  ocean: 460, fungal: 730, ruins: 960,
};

export function planetArrivalAmbience(shot: PlanetArrivalShotId, biome: BiomeId): { key: string; sound: SceneAudioSound } {
  if (shot === 'orbit' || shot === 'title') return { key: 'orbit', sound: ORBIT };
  if (shot === 'carrier' || shot === 'release') return { key: 'carrier', sound: CARRIER };
  if (shot === 'descent') return { key: 'descent', sound: DESCENT };
  if (shot === 'atmosphere') return { key: 'atmosphere', sound: ATMOSPHERE };
  return { key: `surface:${biome}`, sound: { noises: [{ filterFrequency: SURFACE_FREQUENCIES[biome], gain: .032 }] } };
}

/** Capped RAF steps are <=100 ms. Do not burst stale cues after an external jump. */
export const PLANET_ARRIVAL_CUE_LATENESS_MS = 250;

export class PlanetArrivalAudio {
  private readonly voice: SceneAudioPort;
  private runId: string;
  private consumedMs: number;
  private active = false;
  private disposed = false;

  constructor(voice: SceneAudioPort, saved: Pick<PlanetArrivalState, 'runId' | 'elapsedMs'>) {
    this.voice = voice;
    this.runId = saved.runId;
    // The visual may replay the beginning of its current shot on reload.
    // Already reached cues remain consumed until the timeline catches up.
    this.consumedMs = saved.elapsedMs;
  }

  unlock(): void { if (!this.disposed) this.voice.unlock(); }

  sync(state: PlanetArrivalState, enabled = true): void {
    if (this.disposed) return;
    const elapsedMs = Math.max(0, Math.min(PLANET_ARRIVAL_DURATION_MS, Number.isFinite(state.elapsedMs) ? state.elapsedMs : 0));
    if (this.runId !== state.runId) {
      this.suspend();
      this.runId = state.runId;
      this.consumedMs = elapsedMs;
    }
    if (!enabled || state.status !== 'playing') {
      this.consumedMs = Math.max(this.consumedMs, elapsedMs);
      this.suspend();
      return;
    }
    this.active = true;
    const ambience = planetArrivalAmbience(planetArrivalShotAt(elapsedMs).id, state.biomeId);
    this.voice.loop(ambience.key, ambience.sound);
    for (const cue of PLANET_ARRIVAL_SOUND_CUES) {
      if (cue.atMs > this.consumedMs && cue.atMs <= elapsedMs && elapsedMs - cue.atMs <= PLANET_ARRIVAL_CUE_LATENESS_MS) {
        this.voice.play(cue.sound);
      }
    }
    this.consumedMs = Math.max(this.consumedMs, elapsedMs);
  }

  suspend(): void {
    if (!this.active) return;
    this.active = false;
    this.voice.stop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.voice.dispose();
  }
}
