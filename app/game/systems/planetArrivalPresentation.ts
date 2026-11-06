import type { BiomeId } from '../types';
import { PLANET_ARRIVAL_CONTACT_PROGRESS, PLANET_ARRIVAL_SHOTS, type PlanetArrivalShotId } from './planetArrival';
import { TRIO_INSERTION_OFFSETS, TRIO_MEMBERS, type PlanetInsertionPlan } from './planetInsertion';

/** Presentation values are driven by the saved cinematic clock, never wall time. */
export const ARRIVAL_CONTACT_MS = PLANET_ARRIVAL_SHOTS[6].startMs +
  (PLANET_ARRIVAL_SHOTS[6].endMs - PLANET_ARRIVAL_SHOTS[6].startMs) * PLANET_ARRIVAL_CONTACT_PROGRESS;
export const ARRIVAL_VENT_START_MS = PLANET_ARRIVAL_SHOTS[7].startMs + 100;
export const ARRIVAL_VENT_DURATION_MS = 1_700;
export const ARRIVAL_HUNTER_CYCLE_MS = 800;
export const ARRIVAL_HUNTER_MOVE_START_MS = PLANET_ARRIVAL_SHOTS[7].startMs + 1_500;
export const ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS = ARRIVAL_HUNTER_MOVE_START_MS + 300;
export const ARRIVAL_HUNTER_GROUND_CONTACT_MS = ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS + 500;
export const ARRIVAL_HUNTER_LEVEL_THRESHOLD_STEP_MS = ARRIVAL_HUNTER_MOVE_START_MS + ARRIVAL_HUNTER_CYCLE_MS / 2;
export const ARRIVAL_HUNTER_MOVE_END_MS = PLANET_ARRIVAL_SHOTS[7].startMs + 4_250;
export const ARRIVAL_TRIAD_SPACING = 160;
export const ARRIVAL_TRIAD_DELAY_MS = 250;
export const ARRIVAL_SHIP_CLOAK_ACTIVATION_MS = 100;
export const ARRIVAL_SHIP_CLOAK_RELEASE_START_MS = 52_300;
export const ARRIVAL_SHIP_CLOAK_RELEASE_END_MS = 53_300;

export const ARRIVAL_FORMATION_SLOTS = Object.freeze([
  { id: 'player', name: 'Chasseur', index: 0, offsetX: 0, delayMs: 0, color: null },
  ...TRIO_MEMBERS.map((member, index) => ({ id: member.id, name: member.name, index: index + 1,
    offsetX: TRIO_INSERTION_OFFSETS[member.id], delayMs: ARRIVAL_TRIAD_DELAY_MS * (index + 1), color: member.color })),
]);

/** The same formation survives a skipped montage and is handed to HuntCanvas. */
export function arrivalFormationSlots(team: PlanetInsertionPlan['team']) {
  return team === 'triad' ? ARRIVAL_FORMATION_SLOTS : ARRIVAL_FORMATION_SLOTS.slice(0, 1);
}

export function arrivalShotLabel(shot: PlanetArrivalShotId, fallback: string, method: PlanetInsertionPlan['method']) {
  if (method !== 'ship') return fallback;
  return ({ release: 'Désorbitation du vaisseau', descent: 'Approche de la zone de pose',
    atmosphere: 'Descente atmosphérique contrôlée', landing: 'Posé du vaisseau', egress: 'Débarquement de la chasse' } as Partial<Record<PlanetArrivalShotId, string>>)[shot] ?? fallback;
}

const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : low));
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const mix = (from: number, to: number, p: number) => from + (to - from) * clamp(p);
type LightColor = readonly [number, number, number];

/** Optical concealment changes only the surface treatment, never the hull or its sockets.
 * It is already engaged before the visible approach, then releases before setdown.
 * Distortion follows the saved clock, so a pause also freezes the optical field. */
export function arrivalShipCloakFrame(elapsedMs: number,
  plan?: Pick<PlanetInsertionPlan, 'method' | 'shipCloak'>, reducedMotion = false) {
  const time = clamp(elapsedMs, 0, 62_000);
  const requested = plan?.method === 'ship' && plan.shipCloak === true;
  const strength = requested ? 1 - smooth((time - ARRIVAL_SHIP_CLOAK_RELEASE_START_MS) /
    (ARRIVAL_SHIP_CLOAK_RELEASE_END_MS - ARRIVAL_SHIP_CLOAK_RELEASE_START_MS)) : 0;
  const moving = !reducedMotion && strength > 0;
  return {
    requested,
    phase: strength === 0 ? 'off' : time < ARRIVAL_SHIP_CLOAK_RELEASE_START_MS ? 'active' : 'releasing',
    strength,
    // A residual hull and a thin source-alpha rim preserve a readable silhouette.
    hullOpacity: 1 - .76 * strength,
    refractionOpacity: .86 * strength,
    rimOpacity: .42 * strength,
    distortionScale: moving ? strength * (2.8 + .45 * Math.sin(time / 660) + .2 * Math.sin(time / 980)) : 0,
    noiseOffsetX: moving ? strength * 9 * Math.sin(time / 1_300) : 0,
    noiseOffsetY: moving ? strength * 6 * Math.sin(time / 1_700) : 0,
  };
}

/**
 * The hunter first stands on the raised cabin threshold, then steps down and
 * walks away. Animation phase, displacement and SFX all use this saved clock.
 * The final partial stride closes on a planted-foot half-cycle, without a pose
 * snap or an independently running CSS/rig clock after the hunter stops.
 */
export function arrivalHunterMotion(elapsedMs: number, reducedMotion = false) {
  const time = clamp(elapsedMs, 0, 62_000);
  const visible = time >= (reducedMotion ? PLANET_ARRIVAL_SHOTS[7].startMs : ARRIVAL_HUNTER_MOVE_START_MS);
  const walking = !reducedMotion && time >= ARRIVAL_HUNTER_GROUND_CONTACT_MS && time < ARRIVAL_HUNTER_MOVE_END_MS;
  const crossing = clamp((time - ARRIVAL_HUNTER_MOVE_START_MS) /
    (ARRIVAL_HUNTER_GROUND_CONTACT_MS - ARRIVAL_HUNTER_MOVE_START_MS));
  const dropping = clamp((time - ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS) /
    (ARRIVAL_HUNTER_GROUND_CONTACT_MS - ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS));
  const walkMs = clamp(time - ARRIVAL_HUNTER_GROUND_CONTACT_MS, 0,
    ARRIVAL_HUNTER_MOVE_END_MS - ARRIVAL_HUNTER_GROUND_CONTACT_MS);
  // Four full half-strides end at 60.9 s. The remaining 350 ms close the last
  // half-stride, preserving the incoming speed and stopping on the final foot.
  const regularMs = 2 * ARRIVAL_HUNTER_CYCLE_MS;
  const finalMs = ARRIVAL_HUNTER_MOVE_END_MS - ARRIVAL_HUNTER_GROUND_CONTACT_MS - regularMs;
  const closing = clamp((walkMs - regularMs) / finalMs);
  const incoming = finalMs / ARRIVAL_HUNTER_CYCLE_MS;
  const closingPhase = .5 * (3 * closing ** 2 - 2 * closing ** 3) +
    incoming * (closing ** 3 - 2 * closing ** 2 + closing);
  const phase = walkMs <= regularMs ? walkMs / ARRIVAL_HUNTER_CYCLE_MS : 2 + closingPhase;
  const closingRate = (3 * closing - 3 * closing ** 2 +
    incoming * (3 * closing ** 2 - 4 * closing + 1)) * ARRIVAL_HUNTER_CYCLE_MS / finalMs;
  const stage = !visible ? 'hidden' : reducedMotion || time >= ARRIVAL_HUNTER_MOVE_END_MS ? 'standing'
    : time < ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS ? 'cabin'
    : time < ARRIVAL_HUNTER_GROUND_CONTACT_MS ? 'step-down' : 'walking';
  return {
    stage,
    contact: reducedMotion || time >= ARRIVAL_HUNTER_GROUND_CONTACT_MS ? 'ground'
      : time >= ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS ? 'airborne' : 'threshold',
    opacity: visible ? reducedMotion ? 1 : clamp((time - ARRIVAL_HUNTER_MOVE_START_MS) / 150) : 0,
    scale: reducedMotion ? 1 : mix(.78, 1, smooth(crossing)),
    crossing,
    dropProgress: dropping * dropping,
    portalReveal: reducedMotion ? 1 : smooth((time - ARRIVAL_HUNTER_MOVE_START_MS - 180) / 320),
    walking,
    phase: reducedMotion ? 0 : phase,
    speedFactor: walking ? walkMs <= regularMs ? 1 : Math.max(0, closingRate) : 0,
    walkProgress: reducedMotion ? 1 : phase / 2.5,
    pose: stage === 'walking' ? 'run' as const : stage === 'step-down' ? 'fall' as const : 'idle' as const,
    verticalProgress: stage === 'step-down' ? dropping : 0,
  };
}

export interface ArrivalHunterEgressGeometry {
  threshold: { x: number; y: number };
  floorY: number;
  /** The first planted foot is beyond the egress threshold, toward the destination. */
  clearanceX: number;
  destinationX: number;
}

/** World-space support of the feet; the shared ground camera projects it once. */
export function arrivalHunterEgress(elapsedMs: number, geometry: ArrivalHunterEgressGeometry, reducedMotion = false) {
  const motion = arrivalHunterMotion(elapsedMs, reducedMotion);
  const facing: 1 | -1 = geometry.destinationX >= geometry.threshold.x ? 1 : -1;
  const clearanceX = geometry.threshold.x + facing * Math.min(
    Math.abs(geometry.destinationX - geometry.threshold.x),
    Math.max(0, (geometry.clearanceX - geometry.threshold.x) * facing),
  );
  const walkDistance = geometry.destinationX - clearanceX;
  const walkSeconds = ARRIVAL_HUNTER_CYCLE_MS * 2.5 / 1_000;
  const walkSpeed = walkDistance / walkSeconds;
  const crossingSeconds = (ARRIVAL_HUNTER_GROUND_CONTACT_MS - ARRIVAL_HUNTER_MOVE_START_MS) / 1_000;
  const p = motion.crossing;
  // Cubic Hermite, initially at rest and matching the subsequent walk velocity.
  const crossingX = geometry.threshold.x + (clearanceX - geometry.threshold.x) * (3 * p * p - 2 * p * p * p) +
    walkSpeed * crossingSeconds * (p * p * p - p * p);
  // Some inspected under-hull exits are already on the floor. Walk across that
  // level threshold instead of inventing a jump with no vertical displacement.
  const levelCrossing = !reducedMotion && geometry.floorY - geometry.threshold.y <= 1e-7 &&
    motion.opacity > 0 && motion.contact !== 'ground';
  const crossingSpeed = ((clearanceX - geometry.threshold.x) * (6 * p - 6 * p * p) +
    walkSpeed * crossingSeconds * (3 * p * p - 2 * p)) / crossingSeconds;
  return {
    ...motion,
    ...(levelCrossing ? { contact: 'threshold', stage: 'cabin', pose: 'run' as const, walking: true,
      phase: clamp((elapsedMs - ARRIVAL_HUNTER_MOVE_START_MS) / ARRIVAL_HUNTER_CYCLE_MS) } : {}),
    facing,
    x: reducedMotion ? geometry.destinationX : motion.contact === 'ground'
      ? mix(clearanceX, geometry.destinationX, motion.walkProgress) : crossingX,
    y: reducedMotion ? geometry.floorY : mix(geometry.threshold.y, geometry.floorY, motion.dropProgress),
    speed: levelCrossing ? Math.abs(crossingSpeed) : Math.abs(walkSpeed) * motion.speedFactor,
    verticalVelocity: motion.pose === 'fall'
      ? 2 * Math.max(0, geometry.floorY - geometry.threshold.y) * motion.verticalProgress /
        ((ARRIVAL_HUNTER_GROUND_CONTACT_MS - ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS) / 1_000) : 0,
  };
}

interface BiomeLighting {
  key: LightColor;
  fill: LightColor;
  haze: LightColor;
  dust: LightColor;
  brightness: number;
  keyAngle: number;
}

/** Authored grades for the eight existing ground plates; no scene is recoloured at random. */
export const ARRIVAL_BIOME_LIGHTING: Readonly<Record<BiomeId, BiomeLighting>> = Object.freeze({
  jungle: { key: [192, 216, 173], fill: [63, 113, 88], haze: [133, 184, 165], dust: [145, 131, 100], brightness: .78, keyAngle: -132 },
  ice: { key: [217, 237, 255], fill: [109, 159, 212], haze: [164, 207, 245], dust: [214, 232, 244], brightness: .92, keyAngle: -125 },
  volcano: { key: [255, 202, 153], fill: [216, 81, 38], haze: [203, 124, 91], dust: [111, 90, 79], brightness: .73, keyAngle: -128 },
  swamp: { key: [172, 195, 151], fill: [77, 112, 86], haze: [132, 164, 123], dust: [113, 120, 83], brightness: .69, keyAngle: -135 },
  desert: { key: [255, 229, 183], fill: [173, 132, 80], haze: [223, 185, 131], dust: [184, 150, 105], brightness: .94, keyAngle: -125 },
  ocean: { key: [198, 226, 238], fill: [61, 130, 153], haze: [121, 195, 219], dust: [171, 191, 187], brightness: .83, keyAngle: -130 },
  fungal: { key: [205, 199, 228], fill: [111, 91, 151], haze: [159, 143, 194], dust: [139, 120, 149], brightness: .73, keyAngle: -135 },
  ruins: { key: [203, 219, 224], fill: [91, 126, 130], haze: [147, 181, 186], dust: [142, 145, 137], brightness: .76, keyAngle: -130 },
});

export const arrivalRgba = (color: LightColor, alpha: number) => `rgba(${color.join(',')},${clamp(alpha)})`;

/** Convert a world light direction through inverse rotation and source mirroring. */
export function arrivalLocalLightAngle(worldAngle: number, spriteRotation = 0, mirrored = false): number {
  const radians = ((Number.isFinite(worldAngle) ? worldAngle : 0) -
    (Number.isFinite(spriteRotation) ? spriteRotation : 0)) * Math.PI / 180;
  return Math.atan2(Math.sin(radians), Math.cos(radians) * (mirrored ? -1 : 1)) * 180 / Math.PI;
}

export function arrivalLighting(biome: BiomeId, shot: PlanetArrivalShotId, elapsedMs: number, reducedMotion = false) {
  const ground = ARRIVAL_BIOME_LIGHTING[biome];
  const surface = shot === 'landing' || shot === 'egress';
  const atmosphere = shot === 'atmosphere';
  const time = clamp(elapsedMs, 0, 62_000);
  return {
    environment: surface ? 'surface' : atmosphere ? 'atmosphere' : 'space',
    key: surface ? ground.key : [197, 217, 241] as LightColor,
    fill: ground.fill,
    haze: ground.haze,
    dust: ground.dust,
    keyAngle: surface ? ground.keyAngle : -133,
    keyStrength: surface ? .18 : .24,
    fillStrength: surface ? .13 : .17,
    brightness: surface ? ground.brightness : atmosphere ? .72 : .75,
    heat: atmosphere ? reducedMotion ? .25 : .29 + .06 * Math.sin(time / 420) : 0,
  };
}

/** CSS gradients are aligned in source space, so the key does not rotate with the hull. */
export function arrivalLightGradient(
  lighting: ReturnType<typeof arrivalLighting>, spriteRotation = 0, mirrored = false,
  fillWorldAngle = 32, heatNose?: { x: number; y: number },
) {
  const keyAngle = arrivalLocalLightAngle(lighting.keyAngle, spriteRotation, mirrored);
  const fillAngle = arrivalLocalLightAngle(fillWorldAngle, spriteRotation, mirrored);
  const gradients = [
    `linear-gradient(${keyAngle + 270}deg,${arrivalRgba(lighting.key, lighting.keyStrength)} 0%,transparent 66%)`,
    `linear-gradient(${fillAngle + 270}deg,${arrivalRgba(lighting.fill, lighting.fillStrength)} 0%,transparent 64%)`,
  ];
  if (heatNose && lighting.heat > 0) gradients.unshift(
    `radial-gradient(ellipse at ${heatNose.x * 100}% ${heatNose.y * 100}%,rgba(255,143,48,${lighting.heat}) 0%,rgba(255,96,24,${lighting.heat * .45}) 22%,transparent 64%)`,
  );
  return { background: gradients.join(','), localKeyAngle: keyAngle, localFillAngle: fillAngle };
}

export function arrivalEffectsFrame(elapsedMs: number, reducedMotion = false) {
  const time = clamp(elapsedMs, 0, 62_000);
  const impactAge = time - ARRIVAL_CONTACT_MS;
  const ventAge = time - ARRIVAL_VENT_START_MS;
  const ventProgress = clamp(ventAge / ARRIVAL_VENT_DURATION_MS);
  const ventActive = ventAge >= 0 && ventAge <= ARRIVAL_VENT_DURATION_MS;
  return {
    impactAge,
    // One small local flash, not a repeated full-screen flicker.
    impactLight: !reducedMotion && impactAge >= 0 && impactAge <= 260 ? Math.sin(impactAge / 260 * Math.PI) * .28 : 0,
    shockProgress: clamp(impactAge / 850),
    shockOpacity: !reducedMotion && impactAge >= 0 && impactAge <= 850 ? (1 - impactAge / 850) * .3 : 0,
    ventAge,
    ventProgress,
    ventScale: reducedMotion ? .8 : .4 + ventProgress * .7,
    ventOpacity: ventActive ? reducedMotion ? .12 : Math.sin(Math.PI * ventProgress) * .42 : 0,
    // The thin phase is a separate source image, cross-faded on the same emitter.
    ventThinMix: clamp((ventProgress - .3) / .45),
    interiorLight: time < 57_000 ? 0 : clamp((time - 57_300) / 800) * .24,
  };
}

export interface ArrivalDebrisPose { id: number; x: number; y: number; angle: number; size: number; opacity: number; settleAgeMs: number }

/** A bounded burst of independent pieces with acceleration and a settled ground contact. */
export function arrivalImpactDebris(impactAgeMs: number, seed: number, reducedMotion = false): readonly ArrivalDebrisPose[] {
  if (reducedMotion || !Number.isFinite(impactAgeMs) || impactAgeMs < 0 || impactAgeMs > 1_800) return [];
  const age = impactAgeMs / 1_000;
  const fixedSeed = Number.isFinite(seed) ? Math.floor(seed) : 0;
  return Array.from({ length: 9 }, (_, id) => {
    const n = Math.sin((id + 1) * 12.9898 + fixedSeed * .31) * 43758.5453;
    const variation = n - Math.floor(n);
    const side = id % 2 ? 1 : -1;
    const speedY = 85 + variation * 90;
    const gravity = 330;
    const flightTime = Math.min(age, 2 * speedY / gravity);
    return {
      id,
      settleAgeMs: 1_000 * 2 * speedY / gravity,
      x: side * (8 + flightTime * (42 + id * 7)),
      y: Math.min(0, -speedY * flightTime + .5 * gravity * flightTime * flightTime),
      // Rotation stops at contact instead of snapping the piece upright.
      angle: side * (id * 27 + flightTime * 280),
      size: 15 + variation * 14,
      opacity: clamp((1.8 - age) / .65) * .85,
    };
  });
}
