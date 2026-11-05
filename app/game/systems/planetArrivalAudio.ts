import {
  PLANET_ARRIVAL_DURATION_MS, PLANET_ARRIVAL_SHOTS,
  planetArrivalShotAt, type PlanetArrivalState, type PlanetArrivalShotId,
} from './planetArrival';
import { arrivalImpactArtForBiome, carrierArtForShip } from './planetArrivalArt';
import {
  ARRIVAL_CONTACT_MS, ARRIVAL_HUNTER_CYCLE_MS, ARRIVAL_HUNTER_GROUND_CONTACT_MS, ARRIVAL_HUNTER_MOVE_END_MS,
  ARRIVAL_HUNTER_LEVEL_THRESHOLD_STEP_MS, ARRIVAL_VENT_START_MS, ARRIVAL_VENT_DURATION_MS,
  ARRIVAL_SHIP_CLOAK_ACTIVATION_MS, ARRIVAL_SHIP_CLOAK_RELEASE_START_MS, ARRIVAL_SHIP_CLOAK_RELEASE_END_MS,
  arrivalFormationSlots, arrivalImpactDebris,
} from './planetArrivalPresentation';
import { DEFAULT_PLAN, normalizePlanetInsertionPlan, type PlanetInsertionPlan } from './planetInsertion';
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

/** Controlled ship operations have no capsule ejection, impact burst or hatch hiss. */
export const PLANET_ARRIVAL_SHIP_SOUND_CUES: readonly PlanetArrivalSoundCue[] = [
  ...PLANET_ARRIVAL_SOUND_CUES.filter(cue => cue.id === 'destination' || cue.id === 'carrier'),
  { id: 'ship-deorbit', atMs: at('release'), sound: {
    tones: [{ frequency: 64, endFrequency: 98, duration: 1.4, gain: .055, type: 'triangle', filterFrequency: 360 }],
    noises: [{ duration: 1.1, gain: .032, filterType: 'lowpass', filterFrequency: 420, endFilterFrequency: 610 }],
  } },
  { id: 'ship-descent', atMs: at('descent'), sound: {
    tones: [{ frequency: 86, endFrequency: 62, duration: 1.2, gain: .04, type: 'triangle', filterFrequency: 280 }],
  } },
  { id: 'ship-atmosphere', atMs: at('atmosphere'), sound: {
    tones: [{ frequency: 72, endFrequency: 54, duration: 1.1, gain: .035, type: 'triangle', filterFrequency: 250 }],
    noises: [{ duration: 1.4, gain: .045, filterType: 'lowpass', filterFrequency: 1_200, endFilterFrequency: 680 }],
  } },
  { id: 'ship-braking', atMs: at('landing'), sound: {
    tones: [{ frequency: 98, endFrequency: 36, duration: 3.8, gain: .035, type: 'triangle', filterFrequency: 260 }],
    noises: [{ duration: 2.4, gain: .025, filterType: 'lowpass', filterFrequency: 550, endFilterFrequency: 170 }],
  } },
  { id: 'ship-setdown', atMs: ARRIVAL_CONTACT_MS, sound: {
    tones: [{ frequency: 49, endFrequency: 31, duration: .2, gain: .065 }],
    noises: [{ duration: .24, gain: .035, filterType: 'lowpass', filterFrequency: 280, endFilterFrequency: 90 }],
  } },
  { id: 'ship-disembark', atMs: at('egress'), sound: {
    // A quiet readiness signal, not an invented animated hatch or pressure mechanism.
    tones: [{ frequency: 440, endFrequency: 390, duration: .12, gain: .018 },
      { frequency: 330, duration: .12, delay: .15, gain: .014 }],
  } },
];

/** The field is audible when engaged/released; it never suppresses the reactor. */
export const PLANET_ARRIVAL_SHIP_CLOAK_SOUND_CUES: readonly PlanetArrivalSoundCue[] = [
  { id: 'ship-cloak-on', atMs: ARRIVAL_SHIP_CLOAK_ACTIVATION_MS, sound: {
    tones: [{ frequency: 240, endFrequency: 980, duration: .32, gain: .025 },
      { frequency: 96, endFrequency: 192, duration: .5, delay: .1, gain: .018, type: 'triangle', filterFrequency: 450 }],
    noises: [{ duration: .35, gain: .012, filterFrequency: 1_800, endFilterFrequency: 3_800 }],
  } },
  { id: 'ship-cloak-off', atMs: ARRIVAL_SHIP_CLOAK_RELEASE_START_MS, sound: {
    tones: [{ frequency: 980, endFrequency: 160,
      duration: (ARRIVAL_SHIP_CLOAK_RELEASE_END_MS - ARRIVAL_SHIP_CLOAK_RELEASE_START_MS) / 1_000, gain: .028 },
    { frequency: 220, endFrequency: 70, duration: .65, delay: .2, gain: .017, type: 'triangle', filterFrequency: 400 }],
    noises: [{ duration: .85, delay: .05, gain: .018, filterFrequency: 2_400, endFilterFrequency: 300 }],
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
export function planetArrivalSoundCues(state: Pick<PlanetArrivalState, 'biomeId' | 'seed' | 'insertion'> &
  Partial<Pick<PlanetArrivalState, 'personalShipId'>>): readonly PlanetArrivalSoundCue[] {
  const renderedMaterial = arrivalImpactArtForBiome(state.biomeId).material;
  const material: ArrivalSurfaceMaterial = renderedMaterial === 'ice' || renderedMaterial === 'wet' ? renderedMaterial : 'dry';
  const plan = normalizePlanetInsertionPlan(state.insertion) ?? DEFAULT_PLAN;
  const ship = plan.method === 'ship';
  const hull = ship && state.personalShipId ? carrierArtForShip(state.personalShipId) : null;
  const levelThreshold = !!hull && Math.abs(hull.groundContact.y - hull.groundExit.y) <= 1e-7;
  const cues: PlanetArrivalSoundCue[] = ship && plan.shipCloak ? [...PLANET_ARRIVAL_SHIP_CLOAK_SOUND_CUES] : [];
  const halfCycleMs = ARRIVAL_HUNTER_CYCLE_MS / 2;
  for (const slot of arrivalFormationSlots(plan.team)) {
    const add = (cue: PlanetArrivalSoundCue) => cues.push({
      ...cue, id: slot.index ? `${slot.id}:${cue.id}` : cue.id, atMs: cue.atMs + slot.delayMs,
      // Separate restrained levels keep the three simultaneous bodies audible
      // without tripling the player's mix or merging their contact identities.
      sound: slot.index ? {
        tones: cue.sound.tones?.map(tone => ({ ...tone, gain: (tone.gain ?? .08) * (slot.index === 1 ? .66 : .58) })),
        noises: cue.sound.noises?.map(noise => ({ ...noise, gain: (noise.gain ?? .08) * (slot.index === 1 ? .66 : .58) })),
      } : cue.sound,
    });
    if (!slot.index) cues.push(...(ship ? PLANET_ARRIVAL_SHIP_SOUND_CUES : PLANET_ARRIVAL_SOUND_CUES)
      .map(cue => cue.id === 'impact' ? { ...cue, sound: surfaceImpact(cue.sound, material) } : cue));
    else if (!ship) for (const cue of PLANET_ARRIVAL_SOUND_CUES.filter(cue => ['release', 'impact', 'hatch', 'vent'].includes(cue.id))) {
      add(cue.id === 'impact' ? { ...cue, sound: surfaceImpact(cue.sound, material) } : cue);
    }
    if (!ship) for (const piece of arrivalImpactDebris(0, state.seed + slot.index)) add({
      id: `debris-${piece.id}`, atMs: ARRIVAL_CONTACT_MS + piece.settleAgeMs,
      sound: surfaceDebris(material, piece.size), motionOnly: true,
    });
    if (levelThreshold) add({ id: 'hunter-threshold-step', atMs: ARRIVAL_HUNTER_LEVEL_THRESHOLD_STEP_MS,
      sound: surfaceFootstep(material, 1), motionOnly: true });
    for (let index = 0, atMs = ARRIVAL_HUNTER_GROUND_CONTACT_MS; atMs < ARRIVAL_HUNTER_MOVE_END_MS; index += 1, atMs += halfCycleMs) add({
      id: index === 0 ? levelThreshold ? 'hunter-step-out' : 'hunter-touchdown' : `footstep-${index}`, atMs,
      sound: surfaceFootstep(material, levelThreshold && index === 0 ? 2 : index), motionOnly: true,
    });
    // The shortened final half-stride closes on a planted foot as the rig stops.
    add({ id: 'hunter-settle', atMs: ARRIVAL_HUNTER_MOVE_END_MS,
      sound: surfaceFootstep(material, 0, true), motionOnly: true });
  }
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

export function planetArrivalAmbience(shot: PlanetArrivalShotId, biome: BiomeId,
  method: PlanetInsertionPlan['method'] = 'pod', elapsedMs = 0): { key: string; sound: SceneAudioSound } {
  if (method === 'ship') {
    if (shot === 'release' || shot === 'descent' || shot === 'atmosphere') return {
      key: `ship:${shot}`, sound: {
        tones: [{ frequency: shot === 'atmosphere' ? 62 : 50, type: 'triangle', filterFrequency: 280, gain: .048 }],
        noises: [{ filterType: 'lowpass', filterFrequency: shot === 'atmosphere' ? 950 : 320, gain: shot === 'atmosphere' ? .055 : .025 }],
      },
    };
    if (shot === 'landing' && elapsedMs < ARRIVAL_CONTACT_MS) {
      const progress = Math.max(0, Math.min(1, (elapsedMs - at('landing')) / (ARRIVAL_CONTACT_MS - at('landing'))));
      const braking = Math.min(3, Math.floor(progress * 4));
      return { key: `ship:braking:${braking}`, sound: {
        tones: [{ frequency: [72, 56, 42, 31][braking], type: 'triangle', filterFrequency: 250, gain: [.055, .04, .026, .012][braking] }],
        noises: [{ filterType: 'lowpass', filterFrequency: 360, gain: [.033, .025, .017, .008][braking] }],
      } };
    }
  }
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
    const plan = normalizePlanetInsertionPlan(state.insertion) ?? DEFAULT_PLAN;
    const cueIdentity = `${state.biomeId}:${state.seed}:${plan.method}:${plan.team}:${plan.shipCloak === true}:${state.personalShipId}`;
    if (this.cueIdentity !== cueIdentity) {
      this.cueIdentity = cueIdentity;
      this.cues = planetArrivalSoundCues(state);
    }
    const ambience = planetArrivalAmbience(planetArrivalShotAt(elapsedMs).id, state.biomeId, plan.method, elapsedMs);
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
