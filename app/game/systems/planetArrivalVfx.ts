import type { BiomeId } from '../types';
import {
  ARRIVAL_CONTACT_MS, ARRIVAL_HUNTER_CYCLE_MS, ARRIVAL_HUNTER_GROUND_CONTACT_MS,
  ARRIVAL_HUNTER_LEVEL_THRESHOLD_STEP_MS, ARRIVAL_HUNTER_MOVE_END_MS,
  arrivalHunterEgress, arrivalImpactDebris, type ArrivalHunterEgressGeometry,
} from './planetArrivalPresentation';
import { arrivalVfxArtForBiome, type ArrivalVfxArt } from './planetArrivalVfxArt';

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
export const ARRIVAL_BATCH_FOOT_LIFETIME_MS = 360;

/** All six ground families use the saved cinematic clock. Reading the same time
 * reproduces the same frame after pause/reload, without a second animation clock. */
export function arrivalBatchGroundFrame(elapsedMs: number, reducedMotion = false) {
  const age = elapsedMs - ARRIVAL_CONTACT_MS;
  const active = Number.isFinite(elapsedMs) && !reducedMotion;
  const frontActive = active && age >= 0 && age < 1_250;
  const settleAge = age - 350;
  const settleActive = active && settleAge >= 0 && settleAge < 2_450;
  const washActive = active && age >= -1_500 && age < 2_800;
  const settleProgress = clamp(settleAge / 2_450);
  return {
    impactAge: Number.isFinite(age) ? age : -1,
    frontOpacity: frontActive ? clamp(age / 80) * (1 - smooth(age / 1_250)) * .78 : 0,
    frontScale: reducedMotion ? 1 : .7 + smooth(age / 950) * .55,
    settleOpacity: settleActive ? Math.sin(Math.PI * settleProgress) * .4 : 0,
    settleScale: reducedMotion ? 1 : .9 + settleProgress * .28,
    // Approach thrust disturbs the floor before hull contact; the flow decays
    // after setdown and has ended before the first hunter reaches the surface.
    washOpacity: washActive ? smooth((age + 1_500) / 1_500) *
      (1 - smooth(Math.max(0, age) / 2_800)) * .42 : 0,
    washScale: reducedMotion ? 1 : .72 + smooth((age + 1_500) / 3_500) * .42,
  };
}

/** Rotated significant-alpha support in rendered pixels. The hull contains the
 * pixel-cell corners, not just their centres, so support remains conservative at
 * fractional angles and non-square source sizes. It does not modify the PNG. */
export function arrivalFragmentSupport(art: ArrivalVfxArt, width: number, angle: number): number {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(angle)) return 0;
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians), cos = Math.cos(radians);
  const height = width * art.height / art.width;
  const bounds = art.visibleBounds;
  const hull = art.supportHull ?? [
    [bounds[0] / art.width, bounds[1] / art.height],
    [bounds[2] / art.width, bounds[1] / art.height],
    [bounds[2] / art.width, bounds[3] / art.height],
    [bounds[0] / art.width, bounds[3] / art.height],
  ];
  return Math.max(0, ...hull.map(([x, y]) =>
    (x - art.anchor.x) * width * sin + (y - art.anchor.y) * height * cos));
}

/** Reuse the audited ballistic times and seed. Only the material and its actual
 * rotated support change; settled debris retains the original sound cue time. */
export function arrivalBiomeFragments(impactAgeMs: number, seed: number, biome: BiomeId, reducedMotion = false) {
  const materials = arrivalVfxArtForBiome(biome);
  return arrivalImpactDebris(impactAgeMs, seed, reducedMotion).map(piece => {
    const variant = piece.id % 2 ? 'b' as const : 'a' as const;
    const art = variant === 'a' ? materials.fragmentA : materials.fragmentB;
    // These sources fill more of their canvas than the former generic chip.
    const width = piece.size * .7;
    const height = width * art.height / art.width;
    const supportOffset = arrivalFragmentSupport(art, width, piece.angle);
    return { ...piece, art, variant, width, height, supportOffset,
      supportY: piece.y, y: piece.y - supportOffset };
  });
}

export interface ArrivalFootContact {
  id: string;
  atMs: number;
  ageMs: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  width: number;
}

/** Foot cues share the audio cadence and each member's local egress clock.
 * Compute the origin at the contact instant, then leave it on the floor while
 * the hunter walks away. Re-evaluating a paused time cannot drag an old plume. */
export function arrivalFootContacts(elapsedMs: number, geometry: ArrivalHunterEgressGeometry,
  reducedMotion = false): readonly ArrivalFootContact[] {
  if (reducedMotion || !Number.isFinite(elapsedMs)) return [];
  const levelThreshold = geometry.floorY - geometry.threshold.y <= 1e-7;
  const events: { id: string; atMs: number; weight: number }[] = [];
  if (levelThreshold) events.push({ id: 'threshold', atMs: ARRIVAL_HUNTER_LEVEL_THRESHOLD_STEP_MS, weight: .6 });
  for (let atMs = ARRIVAL_HUNTER_GROUND_CONTACT_MS, index = 0;
    atMs < ARRIVAL_HUNTER_MOVE_END_MS; atMs += ARRIVAL_HUNTER_CYCLE_MS / 2, index++) {
    events.push({ id: `step-${index}`, atMs, weight: index ? .7 : levelThreshold ? .8 : 1 });
  }
  events.push({ id: 'settle', atMs: ARRIVAL_HUNTER_MOVE_END_MS, weight: .45 });
  return events.filter(event => elapsedMs >= event.atMs &&
    elapsedMs < event.atMs + ARRIVAL_BATCH_FOOT_LIFETIME_MS).map(event => {
    const ageMs = elapsedMs - event.atMs;
    const progress = ageMs / ARRIVAL_BATCH_FOOT_LIFETIME_MS;
    const pose = arrivalHunterEgress(event.atMs, geometry);
    return { id: event.id, atMs: event.atMs, ageMs, x: pose.x, y: geometry.floorY,
      opacity: clamp(ageMs / 35) * (1 - progress) ** 1.4 * event.weight * .58,
      scale: .8 + smooth(progress) * .45, width: event.id === 'step-0' ? 42 : 34 };
  });
}
