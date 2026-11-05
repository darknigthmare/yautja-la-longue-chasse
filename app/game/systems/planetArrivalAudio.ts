import {
  PLANET_ARRIVAL_DURATION_MS, PLANET_ARRIVAL_SHOTS,
  planetArrivalShotAt, type PlanetArrivalState, type PlanetArrivalShotId,
} from './planetArrival';
import { arrivalImpactArtForBiome } from './planetArrivalArt';
import {
  ARRIVAL_CONTACT_MS, ARRIVAL_HUNTER_CYCLE_MS, ARRIVAL_HUNTER_GROUND_CONTACT_MS, ARRIVAL_HUNTER_MOVE_END_MS,
  ARRIVAL_VENT_START_MS, ARRIVAL_VENT_DURATION_MS, arrivalImpactDebris,
} from './planetArrivalPresentation';
import type { BiomeId } from '../types';
import type { SceneAudioPort, SceneAudioSound } from './sceneAudio';

const at = (id: PlanetArrivalShotId, progress = 0) => {
  const shot = PLANET_ARRIVAL_SHOTS.find(item => item.id === id)!;
  return shot.startMs + (shot.endMs - shot.startMs) * progress;
};

export interface PlanetArrivalSoundCue {
  id: string;
  atMs: number;
  sound: SceneAudioSound;
  /** Suppressed when the associated movement is absent in reduced-motion mode. */
  motionOnly?: boolean;
}

/** Original synth cues, authored for this montage rather than sampled from a film. */
export const PLANET_ARRIVAL_SOUND_CUES: readonly PlanetArrivalSoundCue[] = [
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
  { id: 'impact', atMs: ARRIVAL_CONTACT_MS, sound: {
    tones: [{ frequency: 88, endFrequency: 31, duration: .5, gain: .2 },
      { frequency: 170, endFrequency: 62, duration: .13, gain: .07, type: 'triangle', filterFrequency: 600 }],
    noises: [{ duration: .7, gain: .18, filterType: 'lowpass', filterFrequency: 700, endFilterFrequency: 100 }],
  } },
  { id: 'hatch', atMs: at('egress'), sound: {
    tones: [{ frequency: 350, endFrequency: 190, duration: .11, gain: .055, type: 'triangle' },
      { frequency: 180, endFrequency: 90, duration: .32, delay: .12, gain: .04 }],
    // The locking mechanism is brief; the pressure hiss belongs to the visible vents.
    noises: [{ duration: .18, gain: .035, filterFrequency: 700, endFilterFrequency: 220 }],
  } },
  { id: 'vent', atMs: ARRIVAL_VENT_START_MS, sound: {
    noises: [
      { duration: .55, gain: .028, filterFrequency: 2_200, endFilterFrequency: 1_400 },
      { duration: ARRIVAL_VENT_DURATION_MS / 1_000, gain: .055, filterFrequency: 1_450, endFilterFrequency: 390 },
    ],
  } },
];

type ArrivalSurfaceMaterial = 'dry' | 'ice' | 'wet';

/** Keep the capsule's low hull impact; change only the contacted surface layer. */
function surfaceImpact(sound: SceneAudioSound, material: ArrivalSurfaceMaterial): SceneAudioSound {
  if (material === 'dry') return sound;
  return {
    tones: sound.tones,
    noises: [
      { duration: .7, gain: .12, filterType: 'lowpass', filterFrequency: 700, endFilterFrequency: 100 },
      ...(material === 'ice' ? [
        { duration: .42, gain: .065, filterType: 'highpass' as const, filterFrequency: 2_200, endFilterFrequency: 500 },
      ] : [
        { duration: .65, gain: .055, filterType: 'lowpass' as const, filterFrequency: 1_600, endFilterFrequency: 340 },
        { duration: .35, gain: .025, filterFrequency: 2_500, endFilterFrequency: 1_000 },
      ]),
    ],
  };
}

function surfaceFootstep(material: ArrivalSurfaceMaterial, index: number, settling = false): SceneAudioSound {
  // The initial drop from the doorway is heavier than the subsequent walking steps.
  const weight = settling ? .65 : index === 0 ? 1.25 : index % 2 ? 1 : .9;
  return {
    tones: [{ frequency: material === 'wet' ? 70 : 85, endFrequency: 44, duration: .09, gain: .035 * weight }],
    noises: material === 'ice'
      ? [{ duration: .15, gain: .045 * weight, filterType: 'highpass', filterFrequency: 1_600, endFilterFrequency: 500 }]
      : material === 'wet'
        ? [{ duration: .19, gain: .05 * weight, filterType: 'lowpass', filterFrequency: 1_100, endFilterFrequency: 260 },
          { duration: .12, gain: .015 * weight, filterFrequency: 1_700, endFilterFrequency: 700 }]
        : [{ duration: .12, gain: .045 * weight, filterType: 'lowpass', filterFrequency: 430, endFilterFrequency: 170 }],
  };
}

function surfaceDebris(material: ArrivalSurfaceMaterial, size: number): SceneAudioSound {
  const weight = Math.max(.5, Math.min(1, size / 29));
  if (material === 'wet') return {
    tones: [{ frequency: 130 + weight * 50, endFrequency: 65, duration: .05, gain: .005 * weight }],
    noises: [{ duration: .09, gain: .016 * weight, filterFrequency: 1_400, endFilterFrequency: 400 }],
  };
  if (material === 'ice') return {
    tones: [{ frequency: 840 + weight * 400, endFrequency: 420, duration: .045, gain: .005 * weight }],
    noises: [{ duration: .08, gain: .017 * weight, filterType: 'highpass', filterFrequency: 1_900, endFilterFrequency: 700 }],
  };
  return {
    tones: [{ frequency: 180 + weight * 220, endFrequency: 120, duration: .035, gain: .006 * weight }],
    noises: [{ duration: .07, gain: .014 * weight, filterFrequency: 900, endFilterFrequency: 320 }],
  };
}

/**
 * Material, contacts and cadence follow the same sources as the visible scene.
 * Every contact is an immediate cue on the saved timeline, never a wall-clock
 * timeout or a whole delayed cluster scheduled at the capsule impact.
 */
export function planetArrivalSoundCues(state: Pick<PlanetArrivalState, 'biomeId' | 'seed'>): readonly PlanetArrivalSoundCue[] {
  const renderedMaterial = arrivalImpactArtForBiome(state.biomeId).material;
  const material: ArrivalSurfaceMaterial = renderedMaterial === 'ice' || renderedMaterial === 'wet' ? renderedMaterial : 'dry';
  const cues: PlanetArrivalSoundCue[] = PLANET_ARRIVAL_SOUND_CUES.map(cue => cue.id === 'impact'
    ? { ...cue, sound: surfaceImpact(cue.sound, material) } : cue);
  for (const piece of arrivalImpactDebris(0, state.seed)) cues.push({
    id: `debris-${piece.id}`, atMs: ARRIVAL_CONTACT_MS + piece.settleAgeMs,
    sound: surfaceDebris(material, piece.size), motionOnly: true,
  });
  const halfCycleMs = ARRIVAL_HUNTER_CYCLE_MS / 2;
  for (let index = 0, atMs = ARRIVAL_HUNTER_GROUND_CONTACT_MS; atMs < ARRIVAL_HUNTER_MOVE_END_MS; index += 1, atMs += halfCycleMs) {
    cues.push({
      id: index === 0 ? 'hunter-touchdown' : `footstep-${index}`, atMs,
      sound: surfaceFootstep(material, index), motionOnly: true,
    });
  }
  // The shortened final half-stride closes on a planted foot as the rig stops.
  cues.push({
    id: 'hunter-settle', atMs: ARRIVAL_HUNTER_MOVE_END_MS,
    sound: surfaceFootstep(material, 0, true), motionOnly: true,
  });
  return cues.sort((left, right) => left.atMs - right.atMs);
}

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
  private cueIdentity = '';
  private cues: readonly PlanetArrivalSoundCue[] = [];
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

  sync(state: PlanetArrivalState, enabled = true, reducedMotion = false): void {
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
    const cueIdentity = `${state.biomeId}:${state.seed}`;
    if (this.cueIdentity !== cueIdentity) {
      this.cueIdentity = cueIdentity;
      this.cues = planetArrivalSoundCues(state);
    }
    const ambience = planetArrivalAmbience(planetArrivalShotAt(elapsedMs).id, state.biomeId);
    this.voice.loop(ambience.key, ambience.sound);
    for (const cue of this.cues) {
      // A seek must not squeeze several missed footsteps/debris contacts into one frame.
      if (cue.motionOnly && (reducedMotion || elapsedMs - this.consumedMs > PLANET_ARRIVAL_CUE_LATENESS_MS)) continue;
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
