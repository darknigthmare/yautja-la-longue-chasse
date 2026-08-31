import type { MissionId, WeaponId } from "../types";
import type {
  SurfaceMaterial,
  TrackSurface,
  WindProfile,
  WorldPoint,
} from "./worldBlueprints";

/**
 * Pure, deterministic hunt simulation primitives.
 *
 * The Canvas runtime can keep these serializable records inside GameState or
 * in maps keyed by enemy id. Every update returns new values and never calls
 * Math.random(), which makes save/replay, tests and multiplayer lockstep
 * integration possible later.
 */

export interface HuntVector extends WorldPoint {
  magnitude: number;
}

export interface WindSample extends HuntVector {
  gust: number;
}

export interface ScentNode extends WorldPoint {
  id: string;
  sourceId: string;
  strength: number;
  radius: number;
  ageSeconds: number;
  lifetimeSeconds: number;
}

export interface ScentEmission {
  id: string;
  sourceId: string;
  position: WorldPoint;
  strength: number;
  radius: number;
  lifetimeSeconds: number;
}

export type NoiseKind =
  | "footstep"
  | "landing"
  | "melee"
  | "weapon"
  | "vocalization"
  | "trap"
  | "hazard";

export interface NoiseEvent extends WorldPoint {
  id: string;
  sourceId: string;
  kind: NoiseKind;
  loudness: number;
  radius: number;
  createdAtSeconds: number;
  durationSeconds: number;
  highFrequency: number;
}

export interface NoiseProbe {
  position: WorldPoint;
  elapsedSeconds: number;
  hearingMultiplier: number;
  occlusion: number;
  wind: WindSample;
}

export interface NoisePerception {
  eventId: string;
  strength: number;
  direction: -1 | 0 | 1;
  estimatedPosition: WorldPoint;
}

export interface TrackMark extends WorldPoint {
  id: string;
  sourceId: string;
  facing: -1 | 1;
  createdAtSeconds: number;
  lifetimeSeconds: number;
  intensity: number;
  material: SurfaceMaterial;
  directionX: number;
  mudTransfer: number;
}

export interface MudState {
  coating: number;
  wetness: number;
  thermalVisibility: number;
  cloakShimmer: number;
  footprintMultiplier: number;
  scentMultiplier: number;
}

export type TrapKind = "snare" | "audio-decoy" | "netgun";

export interface HuntTrap extends WorldPoint {
  id: string;
  ownerId: string;
  kind: TrapKind;
  facing: -1 | 1;
  armed: boolean;
  triggered: boolean;
  remainingSeconds: number;
  radius: number;
  concealment: number;
  targetId: string | null;
}

export interface TrapTarget extends WorldPoint {
  id: string;
  kind: "human" | "beast" | "yautja";
  alive: boolean;
  speed: number;
  trapResistance: number;
}

export interface TrapStep {
  trap: HuntTrap;
  restrainedTargetId: string | null;
  restraintSeconds: number;
  noise: NoiseEvent | null;
  decoyPulse: WorldPoint | null;
}

export type AiMode =
  | "patrol"
  | "suspicion"
  | "search"
  | "cover"
  | "coordinate"
  | "engage"
  | "flee";

export type AiRole = "human" | "beast" | "yautja";

export interface AiBrain {
  agentId: string;
  role: AiRole;
  mode: AiMode;
  suspicion: number;
  morale: number;
  timeInMode: number;
  lostContactSeconds: number;
  lastKnownTarget: WorldPoint | null;
  searchDirection: -1 | 1;
  coverId: string | null;
  coordinationEpoch: number;
  alertedAllyIds: readonly string[];
}

export type AiCoordinationGroup =
  | "human"
  | "bad-blood"
  | "xeno"
  | "automaton"
  | "fauna"
  | "flora"
  | "other";

export interface AiCoordinationFactionInput {
  group: AiCoordinationGroup;
  archetype: string;
  missionId: MissionId;
}

export interface RegularAttackTelegraphState {
  cooldownSeconds: number;
  telegraphSeconds: number;
  pendingAttackId: string | null;
}

export interface RegularAttackRequest {
  attackId: string;
  telegraphSeconds: number;
  cooldownSeconds: number;
}

export interface RegularAttackTelegraphInput {
  deltaSeconds: number;
  request: RegularAttackRequest | null;
  cancelled?: boolean;
}

export interface RegularAttackTelegraphStep {
  state: RegularAttackTelegraphState;
  startedAttackId: string | null;
  executedAttackId: string | null;
  immobilized: boolean;
}

export type HunterWeaponFamily =
  | "melee"
  | "thrown"
  | "energy"
  | "bow"
  | "guided";

export type HunterProjectileRecovery = "none" | "pickup" | "return";

export interface HunterWeaponBaseStats {
  damage: number;
  heavyDamage: number;
  cooldownSeconds: number;
  rangePx: number;
  projectileSpeedPx: number;
  staminaCost: number;
  energyCost: number;
  ammo: number | null;
}

export interface ResolvedHunterWeaponAttack {
  weaponId: WeaponId;
  family: HunterWeaponFamily;
  chargeRatio: number;
  damage: number;
  cooldownSeconds: number;
  rangePx: number;
  projectileSpeedPx: number;
  staminaCost: number;
  energyCost: number;
  ammoCost: 0 | 1;
  meleeReachPx: number;
  projectileRadius: number;
  splashRadius: number;
  maxTargetHits: number;
  recovery: HunterProjectileRecovery;
  noiseLoudness: number;
  noiseRadius: number;
}

interface HunterWeaponIdentity {
  family: HunterWeaponFamily;
  chargeSeconds: number;
  meleeReachPx: number;
  projectileRadius: number;
  maxTargetHits: number;
  recovery: HunterProjectileRecovery;
  noiseLoudness: number;
  noiseRadius: number;
}

const HUNTER_WEAPON_IDENTITIES: Readonly<
  Record<WeaponId, HunterWeaponIdentity>
> = {
  wristblades: {
    family: "melee",
    chargeSeconds: 0,
    meleeReachPx: 94,
    projectileRadius: 0,
    maxTargetHits: 2,
    recovery: "none",
    noiseLoudness: 0.68,
    noiseRadius: 390,
  },
  combistick: {
    family: "thrown",
    chargeSeconds: 0,
    meleeReachPx: 145,
    projectileRadius: 7,
    maxTargetHits: 1,
    recovery: "pickup",
    noiseLoudness: 0.5,
    noiseRadius: 470,
  },
  "plasma-caster": {
    family: "energy",
    chargeSeconds: 1.1,
    meleeReachPx: 0,
    projectileRadius: 9,
    maxTargetHits: 1,
    recovery: "none",
    noiseLoudness: 0.88,
    noiseRadius: 760,
  },
  "yautja-bow": {
    family: "bow",
    chargeSeconds: 0.9,
    meleeReachPx: 0,
    projectileRadius: 5,
    maxTargetHits: 1,
    recovery: "pickup",
    noiseLoudness: 0.24,
    noiseRadius: 300,
  },
  "smart-disc": {
    family: "guided",
    chargeSeconds: 0,
    meleeReachPx: 0,
    projectileRadius: 12,
    maxTargetHits: 4,
    recovery: "return",
    noiseLoudness: 0.62,
    noiseRadius: 560,
  },
};

export interface SmartDiscFlightState extends WorldPoint {
  velocityX: number;
  velocityY: number;
  outboundSeconds: number;
  returning: boolean;
}

export interface SmartDiscFlightInput {
  deltaSeconds: number;
  hunterPosition: WorldPoint;
  speedPxPerSecond: number;
  catchRadius: number;
}

export interface SmartDiscFlightStep {
  state: SmartDiscFlightState;
  caught: boolean;
  startedReturn: boolean;
}

export interface AiConfig {
  visionWeight: number;
  hearingWeight: number;
  scentWeight: number;
  trackWeight: number;
  suspicionDecayPerSecond: number;
  searchSeconds: number;
  bravery: number;
  fleeHealthRatio: number;
  preferredRange: number;
  coordinationRadius: number;
}

export interface AiCoverChoice {
  id: string;
  position: WorldPoint;
  protection: number;
  distance: number;
  occupied: boolean;
}

export interface AiOccluder {
  x: number;
  y: number;
  width: number;
  height: number;
  protection: number;
}

/** First contact along a projectile step, retaining the runtime square hitbox. */
export function sweptProjectileImpactTime(
  from: WorldPoint,
  to: WorldPoint,
  radius: number,
  target: Pick<AiOccluder, "x" | "y" | "width" | "height">,
): number | null {
  if (![from.x, from.y, to.x, to.y, radius, target.x, target.y, target.width, target.height].every(Number.isFinite) ||
    radius < 0 || target.width <= 0 || target.height <= 0) return null;
  let entry = 0;
  let exit = 1;
  for (const [origin, movement, minimum, maximum] of [
    [from.x, to.x - from.x, target.x - radius, target.x + target.width + radius],
    [from.y, to.y - from.y, target.y - radius, target.y + target.height + radius],
  ]) {
    if (Math.abs(movement) < 1e-9) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / movement;
    const second = (maximum - origin) / movement;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }
  return entry;
}

function segmentIntersectsRect(
  source: WorldPoint,
  target: WorldPoint,
  rect: AiOccluder,
): boolean {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  let minimumTime = 0;
  let maximumTime = 1;

  for (const [origin, delta, minimum, maximum] of [
    [source.x, deltaX, rect.x, rect.x + rect.width],
    [source.y, deltaY, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(delta) < EPSILON) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    const entry = Math.min(first, second);
    const exit = Math.max(first, second);
    minimumTime = Math.max(minimumTime, entry);
    maximumTime = Math.min(maximumTime, exit);
    if (minimumTime > maximumTime) return false;
  }

  return maximumTime >= 0 && minimumTime <= 1;
}

export function calculateLineOfSightOcclusion(
  source: WorldPoint,
  target: WorldPoint,
  occluders: readonly AiOccluder[],
): number {
  return clamp(
    occluders.reduce(
      (strongest, occluder) =>
        segmentIntersectsRect(source, target, occluder)
          ? Math.max(strongest, occluder.protection)
          : strongest,
      0,
    ),
  );
}

export interface AiObservation {
  deltaSeconds: number;
  elapsedSeconds: number;
  self: WorldPoint;
  target: WorldPoint;
  healthRatio: number;
  visualContact: number;
  thermalContact: number;
  heardNoise: NoisePerception | null;
  scentStrength: number;
  scentDirection?: -1 | 0 | 1;
  trackStrength: number;
  trackPosition?: WorldPoint | null;
  underRangedThreat: boolean;
  alliesInRange: readonly string[];
  alliesEngaged: number;
  nearbyCovers: readonly AiCoverChoice[];
}

export type AiAction =
  | "none"
  | "observe"
  | "inspect"
  | "share-contact"
  | "take-cover"
  | "suppress"
  | "flank"
  | "attack"
  | "retreat";

export interface AiIntent {
  moveX: -1 | 0 | 1;
  speedMultiplier: number;
  aimAt: WorldPoint | null;
  action: AiAction;
  targetCoverId: string | null;
}

export interface AiStep {
  brain: AiBrain;
  intent: AiIntent;
  raisedAlert: boolean;
}

export interface BossMechanicInput {
  deltaSeconds: number;
  elapsedSeconds: number;
  healthRatio: number;
  distanceToPlayer: number;
  lineOfSight: boolean;
  playerCloaked: boolean;
  playerOnHighGround: boolean;
  playerUsedRangedWeapon: boolean;
  playerUsedEnergyWeapon: boolean;
  bossHitPillar: boolean;
  disabledConsoleId: string | null;
  activeSupportCount: number;
}

export type BossEffectKind =
  | "spawn-support"
  | "reveal-cloak"
  | "suppression-zone"
  | "mud-camouflage"
  | "armor-plate-broken"
  | "burrow-warning"
  | "falling-ice"
  | "energy-lock"
  | "duel-violation"
  | "purge-started"
  | "purge-console-disabled"
  | "purge-cancelled"
  | "purge-detonated"
  | "hydra-tidal-surge"
  | "sandmaw-burrow"
  | "leviathan-rogue-wave"
  | "hivemind-spore-pulse"
  | "guardian-adaptive-field"
  | "guardian-adaptive-warning"
  | "guardian-adaptive-evaded";

export interface BossEffect {
  kind: BossEffectKind;
  value: number;
  id: string | null;
}

export interface BossDecision {
  phaseId: string;
  attackId: string | null;
  movement: "hold" | "approach" | "retreat" | "flank" | "charge" | "burrow";
  speedMultiplier: number;
  damageMultiplier: number;
  vulnerabilityMultiplier: number;
  thermalVisibility: number;
  energyWeaponsLocked: boolean;
  trophyAtRisk: boolean;
}

interface BossCommonState {
  missionId: MissionId;
  elapsedSeconds: number;
  phaseId: string;
  phaseElapsedSeconds: number;
  attackCooldownSeconds: number;
  sequence: number;
}

export interface VeyBossState extends BossCommonState {
  missionId: "jungle-vey";
  flareCharges: number;
  mudCamouflage: number;
  lostLineOfSightSeconds: number;
  reinforcementsCalled: boolean;
  duelExposureSeconds: number;
}

export interface CryostalkerBossState extends BossCommonState {
  missionId: "ice-cryostalker";
  armorPlates: number;
  burrowed: boolean;
  burrowSeconds: number;
  packCalled: boolean;
  pillarHitLatch: boolean;
}

export interface BadBloodBossState extends BossCommonState {
  missionId: "volcano-bad-blood";
  cloaked: boolean;
  energyWeaponsLocked: boolean;
  purgeSeconds: number | null;
  disabledConsoleIds: readonly string[];
  purgeResolved: boolean;
}

export const GUARDIAN_ADAPTATION = Object.freeze({
  energyUsesBeforeWarning: 3,
  observationMemorySeconds: 8,
  warningSeconds: 1.6,
  fieldSeconds: 4.5,
  rangePx: 720,
});

export interface GuardianAdaptationState {
  energyUses: number;
  observationSeconds: number;
  warningSeconds: number;
  fieldSeconds: number;
}

export function createGuardianAdaptationState(): GuardianAdaptationState {
  return { energyUses: 0, observationSeconds: 0, warningSeconds: 0, fieldSeconds: 0 };
}

export interface ExpansionBossState extends BossCommonState {
  missionId: Exclude<
    MissionId,
    "jungle-vey" | "ice-cryostalker" | "volcano-bad-blood"
  >;
  /** Additive checkpoint field: absent in saves made before the adaptive field. */
  guardianAdaptation?: GuardianAdaptationState;
}

type ExpansionMissionId = ExpansionBossState["missionId"];

const EXPANSION_BOSS_ATTACKS: Readonly<
  Record<
    ExpansionMissionId,
    Readonly<{
      melee: { id: string; rangePx: number; cooldownSeconds: number };
      ranged: readonly { id: string; cooldownSeconds: number }[];
    }>
  >
> = {
  "swamp-hydra": {
    melee: { id: "hydra-tail", rangePx: 145, cooldownSeconds: 1.8 },
    ranged: [
      { id: "hydra-lunge", cooldownSeconds: 4.2 },
      { id: "hydra-spit", cooldownSeconds: 5.4 },
    ],
  },
  "desert-sandmaw": {
    melee: { id: "sandmaw-mandibles", rangePx: 125, cooldownSeconds: 1.65 },
    ranged: [
      { id: "sandmaw-breach", cooldownSeconds: 4.6 },
      { id: "sandmaw-quake", cooldownSeconds: 6 },
    ],
  },
  "ocean-leviathan": {
    melee: { id: "leviathan-fin", rangePx: 155, cooldownSeconds: 1.9 },
    ranged: [
      { id: "leviathan-breach", cooldownSeconds: 5 },
      { id: "leviathan-sonar", cooldownSeconds: 6.4 },
    ],
  },
  "fungal-hivemind": {
    melee: { id: "hivemind-tendril", rangePx: 180, cooldownSeconds: 1.75 },
    ranged: [
      { id: "hivemind-spores", cooldownSeconds: 5.6 },
      { id: "hivemind-dart", cooldownSeconds: 3.8 },
    ],
  },
  "ruins-ancient-guardian": {
    melee: { id: "guardian-blade", rangePx: 138, cooldownSeconds: 1.5 },
    ranged: [
      { id: "guardian-lance", cooldownSeconds: 3.4 },
      { id: "guardian-field", cooldownSeconds: 6.6 },
    ],
  },
};

const EXPANSION_BOSS_EFFECTS: Readonly<
  Record<ExpansionMissionId, Readonly<{ kind: BossEffectKind; value: number }>>
> = {
  "swamp-hydra": { kind: "hydra-tidal-surge", value: 26 },
  "desert-sandmaw": { kind: "sandmaw-burrow", value: 260 },
  "ocean-leviathan": { kind: "leviathan-rogue-wave", value: 16 },
  "fungal-hivemind": { kind: "hivemind-spore-pulse", value: 36 },
  "ruins-ancient-guardian": { kind: "guardian-adaptive-warning", value: GUARDIAN_ADAPTATION.warningSeconds },
};

export type BossMechanicState =
  | VeyBossState
  | CryostalkerBossState
  | BadBloodBossState
  | ExpansionBossState;

export interface BossMechanicStep {
  state: BossMechanicState;
  decision: BossDecision;
  effects: readonly BossEffect[];
}

const EPSILON = 0.000_001;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function stableWeaponValue(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function hunterWeaponChargeRatio(
  weaponId: WeaponId,
  chargeSeconds: number,
): number {
  const requiredSeconds = HUNTER_WEAPON_IDENTITIES[weaponId].chargeSeconds;
  if (requiredSeconds <= 0) return 0;
  const normalizedSeconds = Number.isFinite(chargeSeconds)
    ? Math.max(0, chargeSeconds)
    : 0;
  return stableWeaponValue(clamp(normalizedSeconds / requiredSeconds));
}

/**
 * Resolves the complete resource and projectile identity of a hunter weapon.
 * No runtime clock or random source is read here, so UI previews, simulation
 * and replay tests can all consume the exact same result.
 */
export function resolveHunterWeaponAttack(
  weaponId: WeaponId,
  base: HunterWeaponBaseStats,
  chargeSeconds = 0,
): ResolvedHunterWeaponAttack {
  const identity = HUNTER_WEAPON_IDENTITIES[weaponId];
  const chargeRatio = hunterWeaponChargeRatio(weaponId, chargeSeconds);
  const finite = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, value) : 0;
  const baseDamage = finite(base.damage);
  const heavyDamage = finite(base.heavyDamage);
  let damage = baseDamage;
  let cooldownMultiplier = 1;
  let rangeMultiplier = 1;
  let speedMultiplier = 1;
  let staminaMultiplier = 1;
  let energyMultiplier = 1;
  let radiusMultiplier = 1;
  let splashRadius = 0;
  let maxTargetHits = identity.maxTargetHits;
  let noiseLoudness = identity.noiseLoudness;
  let noiseRadius = identity.noiseRadius;

  if (weaponId === "plasma-caster") {
    damage = baseDamage + (heavyDamage - baseDamage) * chargeRatio;
    cooldownMultiplier = 1 + chargeRatio * 0.55;
    energyMultiplier = 1 + chargeRatio * 0.65;
    radiusMultiplier = 1 + chargeRatio * 0.72;
    splashRadius = 42 + chargeRatio * 66;
    noiseLoudness += chargeRatio * 0.12;
    noiseRadius += chargeRatio * 180;
  } else if (weaponId === "yautja-bow") {
    damage = baseDamage * 0.72 + (heavyDamage - baseDamage * 0.72) * chargeRatio;
    cooldownMultiplier = 0.72 + chargeRatio * 0.28;
    rangeMultiplier = 0.72 + chargeRatio * 0.28;
    speedMultiplier = 0.72 + chargeRatio * 0.28;
    staminaMultiplier = 0.75 + chargeRatio * 0.25;
    radiusMultiplier = 0.8 + chargeRatio * 0.35;
    maxTargetHits = chargeRatio >= 0.9 ? 2 : 1;
    noiseLoudness += (1 - chargeRatio) * 0.08;
    noiseRadius += (1 - chargeRatio) * 50;
  }

  return {
    weaponId,
    family: identity.family,
    chargeRatio,
    damage: stableWeaponValue(damage),
    cooldownSeconds: stableWeaponValue(
      Math.max(0.08, finite(base.cooldownSeconds) * cooldownMultiplier),
    ),
    rangePx: stableWeaponValue(finite(base.rangePx) * rangeMultiplier),
    projectileSpeedPx: stableWeaponValue(
      finite(base.projectileSpeedPx) * speedMultiplier,
    ),
    staminaCost: stableWeaponValue(
      finite(base.staminaCost) * staminaMultiplier,
    ),
    energyCost: stableWeaponValue(finite(base.energyCost) * energyMultiplier),
    ammoCost: base.ammo === null ? 0 : 1,
    meleeReachPx: identity.meleeReachPx,
    projectileRadius: stableWeaponValue(
      identity.projectileRadius * radiusMultiplier,
    ),
    splashRadius: stableWeaponValue(splashRadius),
    maxTargetHits,
    recovery: identity.recovery,
    noiseLoudness: stableWeaponValue(clamp(noiseLoudness)),
    noiseRadius: stableWeaponValue(noiseRadius),
  };
}

/** Cover-aware deterministic damage for radial hunter-weapon impacts. */
export function resolveHunterSplashDamage(
  baseDamage: number,
  coverOcclusion: number,
  radialMultiplier = 0.45,
): number {
  const damage = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
  const multiplier = Number.isFinite(radialMultiplier)
    ? Math.max(0, radialMultiplier)
    : 0;
  const occlusion = clamp(
    Number.isFinite(coverOcclusion) ? coverOcclusion : 0,
  );
  return stableWeaponValue(damage * multiplier * (1 - occlusion * 0.95));
}

/** Deterministic outbound/return guidance for the Smart Disc. */
export function stepSmartDiscFlight(
  previous: SmartDiscFlightState,
  input: SmartDiscFlightInput,
): SmartDiscFlightStep {
  const deltaSeconds = Math.max(
    0,
    Number.isFinite(input.deltaSeconds) ? input.deltaSeconds : 0,
  );
  const speed = Math.max(
    1,
    Number.isFinite(input.speedPxPerSecond) ? input.speedPxPerSecond : 1,
  );
  const catchRadius = Math.max(
    0,
    Number.isFinite(input.catchRadius) ? input.catchRadius : 0,
  );
  const outboundSeconds = Math.max(0, previous.outboundSeconds - deltaSeconds);
  const startedReturn = !previous.returning && outboundSeconds <= EPSILON;
  const returning = previous.returning || startedReturn;
  let velocityX = previous.velocityX;
  let velocityY = previous.velocityY;
  let x = previous.x;
  let y = previous.y;
  let caught = false;

  if (returning) {
    const deltaX = input.hunterPosition.x - x;
    const deltaY = input.hunterPosition.y - y;
    const separation = Math.hypot(deltaX, deltaY);
    const travel = speed * deltaSeconds;
    if (separation <= catchRadius + travel) {
      x = input.hunterPosition.x;
      y = input.hunterPosition.y;
      caught = true;
    } else if (separation > EPSILON) {
      velocityX = (deltaX / separation) * speed;
      velocityY = (deltaY / separation) * speed;
      x += velocityX * deltaSeconds;
      y += velocityY * deltaSeconds;
    }
  } else {
    x += velocityX * deltaSeconds;
    y += velocityY * deltaSeconds;
  }

  return {
    state: {
      x: stableWeaponValue(x),
      y: stableWeaponValue(y),
      velocityX: stableWeaponValue(velocityX),
      velocityY: stableWeaponValue(velocityY),
      outboundSeconds: stableWeaponValue(outboundSeconds),
      returning,
    },
    caught,
    startedReturn,
  };
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function signDirection(value: number): -1 | 0 | 1 {
  return value > EPSILON ? 1 : value < -EPSILON ? -1 : 0;
}

function deterministicUnit(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function stringSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function sampleWind(
  profile: WindProfile,
  elapsedSeconds: number,
  worldX: number,
): WindSample {
  if (
    profile.baseX === 0 &&
    profile.baseY === 0 &&
    profile.gustStrength === 0 &&
    profile.verticalTurbulence === 0
  ) {
    return { x: 0, y: 0, magnitude: 0, gust: 0 };
  }
  const period = Math.max(0.1, profile.gustPeriodSeconds);
  const phase =
    (elapsedSeconds / period) * Math.PI * 2 +
    worldX * 0.0017 +
    deterministicUnit(profile.seed, Math.floor(worldX / 320)) * Math.PI;
  const gust =
    Math.sin(phase) * 0.62 +
    Math.sin(phase * 0.43 + profile.seed * 0.0001) * 0.38;
  const x = profile.baseX + gust * profile.gustStrength;
  const y =
    profile.baseY +
    Math.sin(phase * 1.37 + 0.8) * profile.verticalTurbulence;
  return {
    x,
    y,
    magnitude: Math.hypot(x, y),
    gust: clamp((gust + 1) * 0.5),
  };
}

export function createScentNode(emission: ScentEmission): ScentNode {
  return {
    id: emission.id,
    sourceId: emission.sourceId,
    x: emission.position.x,
    y: emission.position.y,
    strength: clamp(emission.strength),
    radius: Math.max(8, emission.radius),
    ageSeconds: 0,
    lifetimeSeconds: Math.max(0.1, emission.lifetimeSeconds),
  };
}

export function advanceScentField(
  nodes: readonly ScentNode[],
  deltaSeconds: number,
  windAt: (x: number) => WindSample,
  scentRetention: number,
): readonly ScentNode[] {
  const delta = Math.max(0, deltaSeconds);
  const retention = clamp(scentRetention, 0.05, 2);
  return nodes
    .map((node) => {
      const wind = windAt(node.x);
      const ageSeconds = node.ageSeconds + delta;
      const normalizedAge = ageSeconds / (node.lifetimeSeconds * retention);
      return {
        ...node,
        x: node.x + wind.x * delta * 24,
        y: node.y + wind.y * delta * 10,
        ageSeconds,
        radius: node.radius + delta * (6 + wind.magnitude * 3),
        strength: clamp(
          node.strength * Math.exp((-1.9 * delta) / (node.lifetimeSeconds * retention)),
        ),
        lifetimeSeconds: node.lifetimeSeconds,
        expired: normalizedAge >= 1,
      };
    })
    .filter((node) => !node.expired && node.strength > 0.01)
    .map((node) => ({
      id: node.id,
      sourceId: node.sourceId,
      x: node.x,
      y: node.y,
      strength: node.strength,
      radius: node.radius,
      ageSeconds: node.ageSeconds,
      lifetimeSeconds: node.lifetimeSeconds,
    }));
}

export function sampleScentAt(
  position: WorldPoint,
  nodes: readonly ScentNode[],
): { strength: number; sourceId: string | null; direction: -1 | 0 | 1 } {
  let strength = 0;
  let strongest: ScentNode | null = null;
  let strongestContribution = 0;
  for (const node of nodes) {
    const range = distance(position, node);
    if (range > node.radius) continue;
    const contribution =
      node.strength * Math.pow(1 - range / Math.max(1, node.radius), 1.4);
    strength += contribution;
    if (contribution > strongestContribution) {
      strongestContribution = contribution;
      strongest = node;
    }
  }
  return {
    strength: clamp(strength),
    sourceId: strongest?.sourceId ?? null,
    direction: strongest
      ? signDirection(strongest.x - position.x)
      : 0,
  };
}

export function perceivedNoise(
  event: NoiseEvent,
  probe: NoiseProbe,
): NoisePerception | null {
  const age = probe.elapsedSeconds - event.createdAtSeconds;
  if (age < 0 || age > event.durationSeconds) return null;
  const range = distance(event, probe.position);
  const downwindBonus =
    signDirection(event.x - probe.position.x) === signDirection(probe.wind.x)
      ? 1.12
      : 0.94;
  const effectiveRadius =
    event.radius *
    Math.max(0.05, probe.hearingMultiplier) *
    downwindBonus *
    (1 - clamp(probe.occlusion) * (0.48 + event.highFrequency * 0.32));
  if (range > effectiveRadius) return null;
  const ageFade = 1 - age / Math.max(EPSILON, event.durationSeconds);
  const strength =
    event.loudness *
    Math.pow(1 - range / Math.max(1, effectiveRadius), 1.3) *
    ageFade;
  if (strength <= 0.01) return null;
  const error =
    (1 - clamp(strength)) *
    (deterministicUnit(stringSeed(event.id), Math.floor(probe.elapsedSeconds * 4)) -
      0.5) *
    90;
  return {
    eventId: event.id,
    strength: clamp(strength),
    direction: signDirection(event.x - probe.position.x),
    estimatedPosition: {
      x: event.x + error,
      y: event.y,
    },
  };
}

export function createTrackMark(input: {
  id: string;
  sourceId: string;
  position: WorldPoint;
  facing: -1 | 1;
  velocityX: number;
  elapsedSeconds: number;
  surface: TrackSurface;
  mud: MudState;
}): TrackMark {
  const persistence =
    input.surface.footprintPersistenceSeconds *
    (1 + input.mud.coating * 0.8);
  return {
    id: input.id,
    sourceId: input.sourceId,
    x: input.position.x,
    y: input.position.y,
    facing: input.facing,
    createdAtSeconds: input.elapsedSeconds,
    lifetimeSeconds: Math.max(0.5, persistence),
    intensity: clamp(
      0.25 +
        input.surface.mudDepth * 0.6 +
        input.mud.footprintMultiplier * 0.35,
    ),
    material: input.surface.material,
    directionX: clamp(input.velocityX / 300, -1, 1),
    mudTransfer: input.mud.coating,
  };
}

export function ageTracks(
  tracks: readonly TrackMark[],
  elapsedSeconds: number,
): readonly TrackMark[] {
  return tracks.filter(
    (track) =>
      elapsedSeconds - track.createdAtSeconds < track.lifetimeSeconds &&
      elapsedSeconds >= track.createdAtSeconds,
  );
}

export function sampleTracksAt(
  position: WorldPoint,
  tracks: readonly TrackMark[],
  radius: number,
  elapsedSeconds: number,
): { strength: number; newest: TrackMark | null } {
  let strength = 0;
  let newest: TrackMark | null = null;
  for (const track of tracks) {
    const range = distance(position, track);
    if (range > radius) continue;
    const age = elapsedSeconds - track.createdAtSeconds;
    const freshness = clamp(1 - age / Math.max(0.1, track.lifetimeSeconds));
    const contribution =
      track.intensity * freshness * (1 - range / Math.max(1, radius));
    strength += contribution;
    if (!newest || track.createdAtSeconds > newest.createdAtSeconds) {
      newest = track;
    }
  }
  return { strength: clamp(strength), newest };
}

export function stepMudState(
  previous: MudState,
  input: {
    deltaSeconds: number;
    mudDepth: number;
    inWater: boolean;
    heatIntensity: number;
    speedRatio: number;
  },
): MudState {
  const delta = Math.max(0, input.deltaSeconds);
  const pickup =
    clamp(input.mudDepth) * (0.16 + clamp(input.speedRatio) * 0.18) * delta;
  const wash = input.inWater ? 0.5 * delta : 0;
  const drying = (0.018 + clamp(input.heatIntensity) * 0.13) * delta;
  const coating = clamp(previous.coating + pickup - wash - drying);
  const wetness = clamp(
    previous.wetness +
      clamp(input.mudDepth) * 0.25 * delta +
      (input.inWater ? 0.6 * delta : 0) -
      (0.035 + clamp(input.heatIntensity) * 0.2) * delta,
  );
  return {
    coating,
    wetness,
    thermalVisibility: clamp(1 - coating * (0.52 + wetness * 0.28), 0.12, 1),
    cloakShimmer: clamp(0.08 + wetness * 0.3 + coating * 0.12),
    footprintMultiplier: clamp(0.15 + coating * 1.25, 0.15, 1.5),
    scentMultiplier: clamp(1 - coating * 0.36 + wetness * 0.12, 0.5, 1.2),
  };
}

export function createHuntTrap(input: {
  id: string;
  ownerId: string;
  kind: TrapKind;
  position: WorldPoint;
  facing: -1 | 1;
  concealment: number;
  durationSeconds?: number;
}): HuntTrap {
  const radius =
    input.kind === "audio-decoy" ? 460 : input.kind === "netgun" ? 100 : 76;
  return {
    id: input.id,
    ownerId: input.ownerId,
    kind: input.kind,
    x: input.position.x,
    y: input.position.y,
    facing: input.facing,
    armed: true,
    triggered: false,
    remainingSeconds:
      input.durationSeconds ??
      (input.kind === "audio-decoy" ? 8 : input.kind === "netgun" ? 4 : 5),
    radius,
    concealment: clamp(input.concealment),
    targetId: null,
  };
}

export function stepHuntTrap(
  trap: HuntTrap,
  targets: readonly TrapTarget[],
  deltaSeconds: number,
  elapsedSeconds: number,
): TrapStep {
  const delta = Math.max(0, deltaSeconds);
  if (!trap.armed || trap.remainingSeconds <= 0) {
    return {
      trap: { ...trap, armed: false, remainingSeconds: 0 },
      restrainedTargetId: null,
      restraintSeconds: 0,
      noise: null,
      decoyPulse: null,
    };
  }

  if (trap.kind === "audio-decoy") {
    const remainingSeconds = Math.max(0, trap.remainingSeconds - delta);
    const pulseIndex = Math.floor(elapsedSeconds * 2);
    const pulse =
      pulseIndex !== Math.floor((elapsedSeconds - delta) * 2)
        ? { x: trap.x, y: trap.y }
        : null;
    return {
      trap: {
        ...trap,
        triggered: true,
        remainingSeconds,
        armed: remainingSeconds > 0,
      },
      restrainedTargetId: null,
      restraintSeconds: 0,
      noise: pulse
        ? {
            id: `${trap.id}-pulse-${pulseIndex}`,
            sourceId: trap.ownerId,
            kind: "vocalization",
            x: trap.x,
            y: trap.y,
            loudness: 0.86,
            radius: trap.radius,
            createdAtSeconds: elapsedSeconds,
            durationSeconds: 0.65,
            highFrequency: 0.35,
          }
        : null,
      decoyPulse: pulse,
    };
  }

  const target = targets
    .filter((candidate) => candidate.alive && distance(candidate, trap) <= trap.radius)
    .sort((left, right) => {
      const rangeDifference = distance(left, trap) - distance(right, trap);
      return rangeDifference || left.id.localeCompare(right.id);
    })[0];
  if (!target) {
    return {
      trap: { ...trap, remainingSeconds: Math.max(0, trap.remainingSeconds - delta) },
      restrainedTargetId: null,
      restraintSeconds: 0,
      noise: null,
      decoyPulse: null,
    };
  }

  const baseDuration = trap.kind === "netgun" ? 4 : 5;
  const restraintSeconds = Math.max(
    0.75,
    baseDuration *
      (1 - clamp(target.trapResistance) * 0.65) *
      (1 - clamp(target.speed / 500) * 0.12),
  );
  return {
    trap: {
      ...trap,
      armed: false,
      triggered: true,
      remainingSeconds: 0,
      targetId: target.id,
    },
    restrainedTargetId: target.id,
    restraintSeconds,
    noise: {
      id: `${trap.id}-trigger`,
      sourceId: trap.ownerId,
      kind: "trap",
      x: trap.x,
      y: trap.y,
      loudness: trap.kind === "netgun" ? 0.68 : 0.42,
      radius: trap.kind === "netgun" ? 310 : 210,
      createdAtSeconds: elapsedSeconds,
      durationSeconds: 0.8,
      highFrequency: trap.kind === "netgun" ? 0.7 : 0.35,
    },
    decoyPulse: null,
  };
}

export const DEFAULT_AI_CONFIG: Readonly<Record<AiRole, AiConfig>> = {
  human: {
    visionWeight: 0.72,
    hearingWeight: 0.58,
    scentWeight: 0,
    trackWeight: 0.18,
    suspicionDecayPerSecond: 0.07,
    searchSeconds: 8,
    bravery: 0.62,
    fleeHealthRatio: 0.16,
    preferredRange: 260,
    coordinationRadius: 520,
  },
  beast: {
    visionWeight: 0.42,
    hearingWeight: 0.62,
    scentWeight: 0.82,
    trackWeight: 0.7,
    suspicionDecayPerSecond: 0.035,
    searchSeconds: 12,
    bravery: 0.82,
    fleeHealthRatio: 0.1,
    preferredRange: 58,
    coordinationRadius: 430,
  },
  yautja: {
    visionWeight: 0.66,
    hearingWeight: 0.64,
    scentWeight: 0.3,
    trackWeight: 0.58,
    suspicionDecayPerSecond: 0.025,
    searchSeconds: 14,
    bravery: 0.96,
    fleeHealthRatio: 0.05,
    preferredRange: 180,
    coordinationRadius: 620,
  },
};

export function createAiBrain(agentId: string, role: AiRole): AiBrain {
  return {
    agentId,
    role,
    mode: "patrol",
    suspicion: 0,
    morale: DEFAULT_AI_CONFIG[role].bravery,
    timeInMode: 0,
    lostContactSeconds: 0,
    lastKnownTarget: null,
    searchDirection: deterministicUnit(stringSeed(agentId), 0) >= 0.5 ? 1 : -1,
    coverId: null,
    coordinationEpoch: 0,
    alertedAllyIds: [],
  };
}

const SHARED_ALERT_SUSPICION = 0.56;

/**
 * Apply fresh contact shared by another agent without mutating either input.
 * Relayed contact is actionable evidence, so an isolated patrol starts a real
 * search instead of silently retaining suspicion while staying in patrol.
 */
export function receiveAiAlert(
  brain: AiBrain,
  target: WorldPoint,
  allyIds?: readonly string[],
): AiBrain {
  const alertedAllyIds = allyIds
    ? [...new Set(allyIds.filter((allyId) => allyId !== brain.agentId))].sort()
    : [...brain.alertedAllyIds];
  return {
    ...brain,
    mode: "search",
    suspicion: Math.max(brain.suspicion, SHARED_ALERT_SUSPICION),
    timeInMode: 0,
    lostContactSeconds: 0,
    lastKnownTarget: { ...target },
    coverId: null,
    alertedAllyIds,
  };
}

/** Resolve a stable coordination faction without mixing unrelated ecology. */
export function resolveAiCoordinationFaction(
  input: AiCoordinationFactionInput,
): string {
  switch (input.group) {
    case "human":
      return "coordination:human";
    case "bad-blood":
      return "coordination:bad-blood";
    case "xeno":
      return "coordination:xeno";
    case "automaton":
      return `coordination:automaton:${input.missionId}`;
    case "fauna":
    case "flora":
    case "other":
      return `coordination:${input.group}:${input.archetype}`;
  }
}

/**
 * Advance one ordinary-enemy attack without applying damage. Cooldown starts
 * with the warning, so a whiff or dodge cannot immediately retrigger it.
 */
export function stepRegularAttackTelegraph(
  previous: RegularAttackTelegraphState,
  input: RegularAttackTelegraphInput,
): RegularAttackTelegraphStep {
  const deltaSeconds = Number.isFinite(input.deltaSeconds)
    ? Math.max(0, input.deltaSeconds)
    : 0;
  const cooldownSeconds = Math.max(
    0,
    previous.cooldownSeconds - deltaSeconds,
  );

  if (input.cancelled) {
    return {
      state: {
        cooldownSeconds,
        telegraphSeconds: 0,
        pendingAttackId: null,
      },
      startedAttackId: null,
      executedAttackId: null,
      immobilized: false,
    };
  }

  if (previous.pendingAttackId) {
    const telegraphSeconds = Math.max(
      0,
      previous.telegraphSeconds - deltaSeconds,
    );
    if (telegraphSeconds <= 0) {
      return {
        state: {
          cooldownSeconds,
          telegraphSeconds: 0,
          pendingAttackId: null,
        },
        startedAttackId: null,
        executedAttackId: previous.pendingAttackId,
        immobilized: true,
      };
    }
    return {
      state: {
        cooldownSeconds,
        telegraphSeconds,
        pendingAttackId: previous.pendingAttackId,
      },
      startedAttackId: null,
      executedAttackId: null,
      immobilized: true,
    };
  }

  const attackId = input.request?.attackId.trim() ?? "";
  if (cooldownSeconds <= 0 && input.request && attackId) {
    const telegraphSeconds = Number.isFinite(
      input.request.telegraphSeconds,
    )
      ? Math.max(0.08, input.request.telegraphSeconds)
      : 0.08;
    const nextCooldown = Number.isFinite(input.request.cooldownSeconds)
      ? Math.max(0, input.request.cooldownSeconds)
      : 0;
    return {
      state: {
        cooldownSeconds: nextCooldown,
        telegraphSeconds,
        pendingAttackId: attackId,
      },
      startedAttackId: attackId,
      executedAttackId: null,
      immobilized: true,
    };
  }

  return {
    state: {
      cooldownSeconds,
      telegraphSeconds: 0,
      pendingAttackId: null,
    },
    startedAttackId: null,
    executedAttackId: null,
    immobilized: false,
  };
}

const AI_LEASH_EXPANSION: Readonly<Record<AiMode, number>> = {
  patrol: 0,
  suspicion: 260,
  search: 440,
  cover: 620,
  coordinate: 620,
  engage: 720,
  flee: 900,
};

/**
 * Patrols keep their authored territory, while an alerted agent may pursue,
 * flank or flee far enough for those decisions to have a visible effect.
 */
export function resolveAiMovementLeash(
  mode: AiMode,
  patrolLeft: number,
  patrolRight: number,
  worldWidth: number,
  entityWidth: number,
): { left: number; right: number } {
  const expansion = AI_LEASH_EXPANSION[mode];
  const worldLeft = 40;
  const worldRight = Math.max(worldLeft, worldWidth - entityWidth - 40);
  const left = clamp(patrolLeft - expansion, worldLeft, worldRight);
  const right = clamp(patrolRight + expansion, left, worldRight);
  return { left, right };
}

function chooseCover(
  covers: readonly AiCoverChoice[],
): AiCoverChoice | null {
  return (
    covers
      .filter((cover) => !cover.occupied)
      .sort(
        (left, right) =>
          right.protection / Math.max(60, right.distance) -
            left.protection / Math.max(60, left.distance) ||
          left.id.localeCompare(right.id),
      )[0] ?? null
  );
}

function setAiMode(brain: AiBrain, mode: AiMode): AiBrain {
  return brain.mode === mode
    ? brain
    : {
        ...brain,
        mode,
        timeInMode: 0,
        coverId: mode === "cover" ? brain.coverId : null,
      };
}

export function stepAiBrain(
  previous: AiBrain,
  observation: AiObservation,
  config: AiConfig = DEFAULT_AI_CONFIG[previous.role],
): AiStep {
  const delta = Math.max(0, observation.deltaSeconds);
  const visualSignal =
    Math.max(observation.visualContact, observation.thermalContact * 0.82) *
    config.visionWeight;
  const hearingSignal =
    (observation.heardNoise?.strength ?? 0) * config.hearingWeight;
  const scentSignal = observation.scentStrength * config.scentWeight;
  const trackSignal = observation.trackStrength * config.trackWeight;
  const strongestSignal = Math.max(
    visualSignal,
    hearingSignal,
    scentSignal,
    trackSignal,
  );
  const hasContact = visualSignal >= 0.34;
  const scentPosition =
    observation.scentDirection
      ? {
          x:
            observation.self.x +
            observation.scentDirection * Math.max(120, config.preferredRange),
          y: observation.self.y,
        }
      : null;
  const signalPosition = hasContact
    ? observation.target
    : hearingSignal >= trackSignal && hearingSignal >= scentSignal
      ? observation.heardNoise?.estimatedPosition ?? previous.lastKnownTarget
      : trackSignal >= scentSignal
        ? observation.trackPosition ?? previous.lastKnownTarget
        : scentPosition ?? previous.lastKnownTarget;
  const suspicion = clamp(
    previous.suspicion +
      strongestSignal * delta * 0.9 -
      (strongestSignal < 0.08 ? config.suspicionDecayPerSecond * delta : 0),
  );
  const morale = clamp(
    previous.morale -
      (observation.healthRatio < 0.35 ? (0.35 - observation.healthRatio) * delta * 0.18 : 0) +
      observation.alliesEngaged * delta * 0.008,
  );
  let brain: AiBrain = {
    ...previous,
    suspicion,
    morale,
    timeInMode: previous.timeInMode + delta,
    lostContactSeconds: hasContact ? 0 : previous.lostContactSeconds + delta,
    lastKnownTarget: signalPosition ?? previous.lastKnownTarget,
  };
  let raisedAlert = false;

  const fleeThreshold =
    config.fleeHealthRatio * (1.25 - clamp(brain.morale) * 0.5);
  if (
    observation.healthRatio <= fleeThreshold &&
    previous.role !== "yautja"
  ) {
    brain = setAiMode(brain, "flee");
  } else if (hasContact && visualSignal >= 0.46) {
    if (
      observation.underRangedThreat &&
      previous.role === "human" &&
      observation.nearbyCovers.some((cover) => !cover.occupied)
    ) {
      brain = setAiMode(brain, "cover");
    } else if (
      observation.alliesInRange.length >= 2 &&
      previous.mode !== "coordinate" &&
      previous.mode !== "engage"
    ) {
      brain = {
        ...setAiMode(brain, "coordinate"),
        coordinationEpoch: previous.coordinationEpoch + 1,
        alertedAllyIds: [...observation.alliesInRange].sort(),
      };
      raisedAlert = true;
    } else {
      brain = setAiMode(brain, "engage");
    }
  } else if (strongestSignal >= 0.18 && brain.mode === "patrol") {
    brain = setAiMode(brain, "suspicion");
  } else if (
    brain.mode === "suspicion" &&
    (brain.suspicion >= 0.48 || brain.timeInMode >= 2.2)
  ) {
    brain = setAiMode(brain, "search");
  } else if (
    brain.mode === "engage" &&
    brain.lostContactSeconds >= 1.4
  ) {
    brain = setAiMode(brain, "search");
  } else if (
    brain.mode === "cover" &&
    brain.timeInMode >= 1.5 &&
    observation.alliesInRange.length > 0
  ) {
    brain = {
      ...setAiMode(brain, "coordinate"),
      coordinationEpoch: previous.coordinationEpoch + 1,
      alertedAllyIds: [...observation.alliesInRange].sort(),
    };
    raisedAlert = true;
  } else if (
    brain.mode === "coordinate" &&
    brain.timeInMode >= 0.8
  ) {
    brain = setAiMode(brain, "engage");
  } else if (
    brain.mode === "search" &&
    brain.timeInMode >= config.searchSeconds &&
    brain.suspicion < 0.3
  ) {
    brain = setAiMode(brain, "patrol");
  }

  const targetDirection = signDirection(
    (brain.lastKnownTarget?.x ?? observation.target.x) - observation.self.x,
  );
  const awayDirection = signDirection(
    observation.self.x - observation.target.x,
  );
  const targetRange = distance(observation.self, observation.target);
  let intent: AiIntent = {
    moveX: 0,
    speedMultiplier: 0,
    aimAt: null,
    action: "none",
    targetCoverId: null,
  };

  switch (brain.mode) {
    case "patrol":
      intent = {
        ...intent,
        moveX: brain.searchDirection,
        speedMultiplier: 0.42,
        action: "observe",
      };
      break;
    case "suspicion":
      intent = {
        ...intent,
        moveX: targetDirection,
        speedMultiplier: 0.35,
        aimAt: brain.lastKnownTarget,
        action: "observe",
      };
      break;
    case "search":
      intent = {
        ...intent,
        moveX:
          brain.timeInMode % 3.2 < 2.2
            ? targetDirection || brain.searchDirection
            : (-(brain.searchDirection) as -1 | 1),
        speedMultiplier: previous.role === "beast" ? 0.85 : 0.58,
        aimAt: brain.lastKnownTarget,
        action: "inspect",
      };
      break;
    case "cover": {
      const cover = chooseCover(observation.nearbyCovers);
      brain = { ...brain, coverId: cover?.id ?? brain.coverId };
      intent = {
        ...intent,
        moveX: cover ? signDirection(cover.position.x - observation.self.x) : awayDirection,
        speedMultiplier: 1,
        aimAt: observation.target,
        action: cover && cover.distance > 24 ? "take-cover" : "suppress",
        targetCoverId: cover?.id ?? brain.coverId,
      };
      break;
    }
    case "coordinate": {
      const flankDirection =
        deterministicUnit(
          stringSeed(brain.agentId),
          brain.coordinationEpoch,
        ) >= 0.5
          ? 1
          : -1;
      intent = {
        ...intent,
        moveX: flankDirection,
        speedMultiplier: 0.82,
        aimAt: observation.target,
        action: brain.timeInMode < 0.25 ? "share-contact" : "flank",
      };
      break;
    }
    case "engage":
      intent = {
        ...intent,
        moveX:
          targetRange > config.preferredRange * 1.18
            ? targetDirection
            : targetRange < config.preferredRange * 0.72
              ? awayDirection
              : 0,
        speedMultiplier: previous.role === "beast" ? 1.08 : 0.9,
        aimAt: observation.target,
        action: "attack",
      };
      break;
    case "flee":
      intent = {
        ...intent,
        moveX: awayDirection || (-(brain.searchDirection) as -1 | 1),
        speedMultiplier: 1.15,
        aimAt: observation.target,
        action: "retreat",
      };
      break;
  }

  return { brain, intent, raisedAlert };
}

export function createBossMechanicState(
  missionId: MissionId,
): BossMechanicState {
  if (missionId === "jungle-vey") {
    return {
      missionId,
      elapsedSeconds: 0,
      phaseId: "vey-hunt",
      phaseElapsedSeconds: 0,
      attackCooldownSeconds: 1.2,
      sequence: 0,
      flareCharges: 4,
      mudCamouflage: 0,
      lostLineOfSightSeconds: 0,
      reinforcementsCalled: false,
      duelExposureSeconds: 0,
    };
  }
  if (missionId === "ice-cryostalker") {
    return {
      missionId,
      elapsedSeconds: 0,
      phaseId: "cryo-armored",
      phaseElapsedSeconds: 0,
      attackCooldownSeconds: 1.4,
      sequence: 0,
      armorPlates: 3,
      burrowed: false,
      burrowSeconds: 0,
      packCalled: false,
      pillarHitLatch: false,
    };
  }
  if (missionId !== "volcano-bad-blood") {
    return {
      missionId,
      elapsedSeconds: 0,
      phaseId: `${missionId}-phase-1`,
      phaseElapsedSeconds: 0,
      attackCooldownSeconds: 1.35,
      sequence: 0,
      ...(missionId === "ruins-ancient-guardian"
        ? { guardianAdaptation: createGuardianAdaptationState() }
        : {}),
    };
  }
  return {
    missionId: "volcano-bad-blood",
    elapsedSeconds: 0,
    phaseId: "pariah-stalk",
    phaseElapsedSeconds: 0,
    attackCooldownSeconds: 1.25,
    sequence: 0,
    cloaked: true,
    energyWeaponsLocked: false,
    purgeSeconds: null,
    disabledConsoleIds: [],
    purgeResolved: false,
  };
}

function phaseChanged(
  previous: BossCommonState,
  phaseId: string,
): Pick<BossCommonState, "phaseId" | "phaseElapsedSeconds"> {
  return {
    phaseId,
    phaseElapsedSeconds:
      previous.phaseId === phaseId ? previous.phaseElapsedSeconds : 0,
  };
}

function stepVey(
  previous: VeyBossState,
  input: BossMechanicInput,
): BossMechanicStep {
  const delta = Math.max(0, input.deltaSeconds);
  const phaseId =
    input.healthRatio <= 0.3
      ? "vey-duel"
      : input.healthRatio <= 0.65
        ? "vey-reinforcements"
        : "vey-hunt";
  const phase = phaseChanged(previous, phaseId);
  const effects: BossEffect[] = [];
  const lostLineOfSightSeconds = input.lineOfSight
    ? 0
    : previous.lostLineOfSightSeconds + delta;
  let mudCamouflage = clamp(
    previous.mudCamouflage +
      (lostLineOfSightSeconds > 1.15 ? delta * 0.42 : -delta * 0.11),
  );
  if (mudCamouflage > previous.mudCamouflage + 0.05) {
    effects.push({ kind: "mud-camouflage", value: mudCamouflage, id: null });
  }
  let flareCharges = previous.flareCharges;
  let reinforcementsCalled = previous.reinforcementsCalled;
  let attackCooldownSeconds = Math.max(
    0,
    previous.attackCooldownSeconds - delta,
  );
  let sequence = previous.sequence;
  let attackId: string | null = null;
  let duelExposureSeconds = Math.max(
    0,
    previous.duelExposureSeconds - delta,
  );

  if (phaseId === "vey-reinforcements" && !reinforcementsCalled) {
    effects.push({ kind: "spawn-support", value: 2, id: "vey-guard" });
    reinforcementsCalled = true;
  }
  if (
    attackCooldownSeconds <= 0 &&
    phaseId !== "vey-duel" &&
    flareCharges > 0 &&
    (input.playerCloaked || lostLineOfSightSeconds > 0.8)
  ) {
    attackId = "vey-flare";
    flareCharges -= 1;
    attackCooldownSeconds = 6.6;
    sequence += 1;
    effects.push({ kind: "reveal-cloak", value: 3.2, id: "vey-flare" });
  } else if (attackCooldownSeconds <= 0) {
    if (phaseId === "vey-duel" || input.distanceToPlayer < 120) {
      attackId = "vey-knife";
      attackCooldownSeconds = phaseId === "vey-duel" ? 1.35 : 1.7;
      duelExposureSeconds = 0.8;
    } else {
      attackId = "vey-rifle-burst";
      attackCooldownSeconds = phaseId === "vey-reinforcements" ? 1.85 : 2.25;
      effects.push({
        kind: "suppression-zone",
        value: input.playerOnHighGround ? 0.75 : 1,
        id: "vey-burst-lane",
      });
    }
    sequence += 1;
  }

  if (phaseId === "vey-duel") mudCamouflage = Math.max(0, mudCamouflage - delta * 0.3);
  const state: VeyBossState = {
    ...previous,
    ...phase,
    phaseElapsedSeconds: phase.phaseElapsedSeconds + delta,
    elapsedSeconds: previous.elapsedSeconds + delta,
    attackCooldownSeconds,
    sequence,
    flareCharges,
    mudCamouflage,
    lostLineOfSightSeconds,
    reinforcementsCalled,
    duelExposureSeconds,
  };
  return {
    state,
    effects,
    decision: {
      phaseId,
      attackId,
      movement:
        phaseId === "vey-duel"
          ? "approach"
          : input.lineOfSight
            ? "flank"
            : "retreat",
      speedMultiplier:
        phaseId === "vey-duel" ? 1.18 : phaseId === "vey-reinforcements" ? 1.08 : 1,
      damageMultiplier:
        phaseId === "vey-duel" ? 1.2 : phaseId === "vey-reinforcements" ? 1.1 : 1,
      vulnerabilityMultiplier: duelExposureSeconds > 0 ? 1.35 : 1,
      thermalVisibility: clamp(1 - mudCamouflage * 0.76, 0.18, 1),
      energyWeaponsLocked: false,
      trophyAtRisk: false,
    },
  };
}

function stepCryostalker(
  previous: CryostalkerBossState,
  input: BossMechanicInput,
): BossMechanicStep {
  const delta = Math.max(0, input.deltaSeconds);
  const phaseId =
    input.healthRatio <= 0.22
      ? "cryo-exposed"
      : input.healthRatio <= 0.55
        ? "cryo-pack"
        : "cryo-armored";
  const phase = phaseChanged(previous, phaseId);
  const effects: BossEffect[] = [];
  const pillarImpact = input.bossHitPillar && !previous.pillarHitLatch;
  const armorPlates = pillarImpact
    ? Math.max(0, previous.armorPlates - 1)
    : previous.armorPlates;
  if (pillarImpact) {
    effects.push({
      kind: "armor-plate-broken",
      value: previous.armorPlates - armorPlates,
      id: `cryo-plate-${armorPlates + 1}`,
    });
  }
  let packCalled = previous.packCalled;
  if (phaseId === "cryo-pack" && !packCalled) {
    packCalled = true;
    effects.push({ kind: "spawn-support", value: 2, id: "ice-runners" });
  }
  let burrowed = previous.burrowed;
  let burrowSeconds = Math.max(0, previous.burrowSeconds - delta);
  if (burrowSeconds <= 0) burrowed = false;
  let attackCooldownSeconds = Math.max(
    0,
    previous.attackCooldownSeconds - delta,
  );
  let attackId: string | null = null;
  let sequence = previous.sequence;
  if (attackCooldownSeconds <= 0) {
    const selector = sequence % 4;
    if (
      input.distanceToPlayer > 190 &&
      armorPlates > 0 &&
      selector !== 2
    ) {
      attackId = "cryo-charge";
      attackCooldownSeconds = phaseId === "cryo-exposed" ? 3.6 : 4.7;
    } else if (selector === 2 || input.playerOnHighGround) {
      attackId = "cryo-burrow";
      burrowed = true;
      burrowSeconds = 1.35;
      attackCooldownSeconds = 6;
      effects.push({
        kind: "burrow-warning",
        value: Math.max(0.55, 1.1 - sequence * 0.03),
        id: `cryo-burrow-${sequence}`,
      });
    } else {
      attackId = "cryo-claws";
      attackCooldownSeconds = 1.75;
    }
    if (phaseId === "cryo-exposed" && selector === 0) {
      effects.push({
        kind: "falling-ice",
        value: 3,
        id: `cryo-fall-${sequence}`,
      });
    }
    sequence += 1;
  }

  const state: CryostalkerBossState = {
    ...previous,
    ...phase,
    phaseElapsedSeconds: phase.phaseElapsedSeconds + delta,
    elapsedSeconds: previous.elapsedSeconds + delta,
    attackCooldownSeconds,
    sequence,
    armorPlates,
    burrowed,
    burrowSeconds,
    packCalled,
    pillarHitLatch: input.bossHitPillar,
  };
  return {
    state,
    effects,
    decision: {
      phaseId,
      attackId,
      movement: burrowed
        ? "burrow"
        : attackId === "cryo-charge"
          ? "charge"
          : input.distanceToPlayer > 100
            ? "approach"
            : "hold",
      speedMultiplier:
        phaseId === "cryo-exposed" ? 1.25 : phaseId === "cryo-pack" ? 1.12 : 1,
      damageMultiplier:
        phaseId === "cryo-exposed" ? 1.18 : phaseId === "cryo-pack" ? 1.08 : 1,
      vulnerabilityMultiplier:
        1 + (3 - armorPlates) * 0.13 + (phaseId === "cryo-exposed" ? 0.2 : 0),
      thermalVisibility: burrowed ? 0.08 : armorPlates > 0 ? 0.34 : 0.92,
      energyWeaponsLocked: false,
      trophyAtRisk: false,
    },
  };
}

function stepBadBlood(
  previous: BadBloodBossState,
  input: BossMechanicInput,
): BossMechanicStep {
  const delta = Math.max(0, input.deltaSeconds);
  const phaseId =
    input.healthRatio <= 0.18
      ? "pariah-self-destruct"
      : input.healthRatio <= 0.58
        ? "pariah-duel"
        : "pariah-stalk";
  const phase = phaseChanged(previous, phaseId);
  const effects: BossEffect[] = [];
  let energyWeaponsLocked = phaseId !== "pariah-stalk";
  if (energyWeaponsLocked && !previous.energyWeaponsLocked) {
    effects.push({ kind: "energy-lock", value: 1, id: "sanctum-pulse" });
  }
  if (
    phaseId === "pariah-duel" &&
    (input.playerUsedRangedWeapon || input.playerUsedEnergyWeapon)
  ) {
    effects.push({ kind: "duel-violation", value: 30, id: "accept-final-duel" });
  }

  let purgeSeconds = previous.purgeSeconds;
  let purgeResolved = previous.purgeResolved;
  let disabledConsoleIds = [...previous.disabledConsoleIds];
  if (
    phaseId === "pariah-self-destruct" &&
    purgeSeconds === null &&
    !purgeResolved
  ) {
    purgeSeconds = 45;
    effects.push({ kind: "purge-started", value: 45, id: "pariah-purge" });
  }
  if (
    input.disabledConsoleId &&
    purgeSeconds !== null &&
    !disabledConsoleIds.includes(input.disabledConsoleId)
  ) {
    disabledConsoleIds = [...disabledConsoleIds, input.disabledConsoleId].sort();
    effects.push({
      kind: "purge-console-disabled",
      value: disabledConsoleIds.length,
      id: input.disabledConsoleId,
    });
  }
  if (purgeSeconds !== null && !purgeResolved) {
    purgeSeconds = Math.max(0, purgeSeconds - delta);
    if (disabledConsoleIds.length >= 3) {
      purgeResolved = true;
      purgeSeconds = null;
      energyWeaponsLocked = false;
      effects.push({ kind: "purge-cancelled", value: 1, id: "pariah-purge" });
    } else if (purgeSeconds <= 0) {
      purgeResolved = true;
      effects.push({ kind: "purge-detonated", value: 1, id: "pariah-purge" });
    }
  }

  let attackCooldownSeconds = Math.max(
    0,
    previous.attackCooldownSeconds - delta,
  );
  let attackId: string | null = null;
  let sequence = previous.sequence;
  if (attackCooldownSeconds <= 0) {
    if (phaseId === "pariah-duel") {
      attackId = "pariah-combistick";
      attackCooldownSeconds = 1.4;
    } else if (phaseId === "pariah-self-destruct") {
      attackId =
        sequence % 3 === 0 ? "pariah-purge" : "pariah-combistick";
      attackCooldownSeconds = attackId === "pariah-purge" ? 5.2 : 1.25;
    } else {
      attackId =
        sequence % 2 === 0 ? "pariah-disc" : "pariah-plasma";
      attackCooldownSeconds = attackId === "pariah-disc" ? 4.8 : 3.9;
    }
    sequence += 1;
  }
  const cloaked =
    phaseId === "pariah-stalk" &&
    !input.lineOfSight &&
    sequence % 3 !== 2;
  const trophyAtRisk =
    phaseId === "pariah-self-destruct" &&
    !purgeResolved &&
    purgeSeconds !== null;
  const state: BadBloodBossState = {
    ...previous,
    ...phase,
    phaseElapsedSeconds: phase.phaseElapsedSeconds + delta,
    elapsedSeconds: previous.elapsedSeconds + delta,
    attackCooldownSeconds,
    sequence,
    cloaked,
    energyWeaponsLocked,
    purgeSeconds,
    disabledConsoleIds,
    purgeResolved,
  };
  return {
    state,
    effects,
    decision: {
      phaseId,
      attackId,
      movement:
        phaseId === "pariah-stalk"
          ? cloaked
            ? "flank"
            : input.distanceToPlayer < 180
              ? "retreat"
              : "hold"
          : "approach",
      speedMultiplier:
        phaseId === "pariah-self-destruct"
          ? 1.25
          : phaseId === "pariah-duel"
            ? 1.16
            : 1,
      damageMultiplier:
        phaseId === "pariah-self-destruct"
          ? 1.25
          : phaseId === "pariah-duel"
            ? 1.12
            : 1,
      vulnerabilityMultiplier:
        purgeResolved && disabledConsoleIds.length >= 3 ? 1.4 : 1,
      thermalVisibility: cloaked ? 0.12 : 1,
      energyWeaponsLocked,
      trophyAtRisk,
    },
  };
}

/**
 * The Guardian learns only observed, successfully fired energy shots. A warning
 * can be broken with cover, cloak or distance; the resulting field has a finite
 * lifetime and only locks energy weapons while its line of sight reaches prey.
 */
export function stepGuardianAdaptation(
  previous: GuardianAdaptationState | undefined,
  input: BossMechanicInput,
  phaseWarning: boolean,
): { state: GuardianAdaptationState; effects: BossEffect[]; energyWeaponsLocked: boolean } {
  const finite = (value: number | undefined, maximum: number): number =>
    Number.isFinite(value) ? clamp(value!, 0, maximum) : 0;
  const delta = Math.max(0, input.deltaSeconds);
  const canObserve = input.lineOfSight && !input.playerCloaked &&
    input.distanceToPlayer <= GUARDIAN_ADAPTATION.rangePx;
  const previousWarning = finite(previous?.warningSeconds, GUARDIAN_ADAPTATION.warningSeconds);
  const previousField = finite(previous?.fieldSeconds, GUARDIAN_ADAPTATION.fieldSeconds);
  const state: GuardianAdaptationState = {
    energyUses: Math.floor(finite(previous?.energyUses, GUARDIAN_ADAPTATION.energyUsesBeforeWarning)),
    observationSeconds: Math.max(0, finite(previous?.observationSeconds, GUARDIAN_ADAPTATION.observationMemorySeconds) - delta),
    warningSeconds: Math.max(0, previousWarning - delta),
    fieldSeconds: Math.max(0, previousField - delta),
  };
  const effects: BossEffect[] = [];
  if (state.observationSeconds <= 0) state.energyUses = 0;

  if (previousWarning > 0) {
    if (!canObserve) {
      state.warningSeconds = 0;
      effects.push({ kind: "guardian-adaptive-evaded", value: 0, id: null });
    } else if (state.warningSeconds <= 0) {
      state.fieldSeconds = Math.max(0, GUARDIAN_ADAPTATION.fieldSeconds - Math.max(0, delta - previousWarning));
      effects.push({ kind: "guardian-adaptive-field", value: state.fieldSeconds, id: null });
    }
  }

  // Do not renew a running field or consume a shot on the warning's terminal tick.
  if (previousWarning <= 0 && previousField <= 0 && canObserve) {
    if (input.playerUsedEnergyWeapon) {
      state.energyUses += 1;
      state.observationSeconds = GUARDIAN_ADAPTATION.observationMemorySeconds;
    } else if (input.playerUsedRangedWeapon) {
      state.energyUses = 0;
      state.observationSeconds = 0;
    }
    if (phaseWarning || state.energyUses >= GUARDIAN_ADAPTATION.energyUsesBeforeWarning) {
      state.energyUses = 0;
      state.observationSeconds = 0;
      state.warningSeconds = GUARDIAN_ADAPTATION.warningSeconds;
      effects.push({ kind: "guardian-adaptive-warning", value: state.warningSeconds, id: null });
    }
  }
  return { state, effects, energyWeaponsLocked: state.fieldSeconds > 0 && canObserve };
}

function stepExpansionBoss(
  previous: ExpansionBossState,
  input: BossMechanicInput,
): BossMechanicStep {
  const attacks = EXPANSION_BOSS_ATTACKS[previous.missionId];
  const delta = Math.max(0, input.deltaSeconds);
  const phaseIndex = input.healthRatio <= 0.25 ? 3 : input.healthRatio <= 0.6 ? 2 : 1;
  const phaseId = `${previous.missionId}-phase-${phaseIndex}`;
  const enteredPhase = previous.phaseId !== phaseId;
  const phaseState = phaseChanged(previous, phaseId);
  const effects: BossEffect[] = [];
  let attackCooldownSeconds = Math.max(
    0,
    previous.attackCooldownSeconds - delta,
  );
  let sequence = previous.sequence;
  let attackId: string | null = null;

  if (attackCooldownSeconds <= 0) {
    const selected =
      input.distanceToPlayer <= attacks.melee.rangePx * 1.2
        ? attacks.melee
        : attacks.ranged[sequence % attacks.ranged.length];
    attackId = selected.id;
    attackCooldownSeconds = selected.cooldownSeconds;
    sequence += 1;
  }

  const guardianStep = previous.missionId === "ruins-ancient-guardian"
    ? stepGuardianAdaptation(previous.guardianAdaptation, input, enteredPhase && phaseIndex > 1)
    : null;
  if (guardianStep) effects.push(...guardianStep.effects);

  if (!guardianStep && enteredPhase && phaseIndex > 1) {
    const signature = EXPANSION_BOSS_EFFECTS[previous.missionId];
    effects.push({
      kind: signature.kind,
      value: signature.value * (phaseIndex === 3 ? 1.25 : 1),
      id: `${phaseId}-signature`,
    });
  }

  const state: ExpansionBossState = {
    ...previous,
    ...phaseState,
    phaseElapsedSeconds: phaseState.phaseElapsedSeconds + delta,
    elapsedSeconds: previous.elapsedSeconds + delta,
    attackCooldownSeconds,
    sequence,
    ...(guardianStep ? { guardianAdaptation: guardianStep.state } : {}),
  };
  const guardianWarning = (guardianStep?.state.warningSeconds ?? 0) > 0;
  const latePhase = input.healthRatio <= 0.25;
  return {
    state,
    effects,
    decision: {
      phaseId,
      attackId: guardianWarning ? null : attackId,
      movement:
        guardianWarning ? "hold" : input.distanceToPlayer < 105
          ? "retreat"
          : input.lineOfSight
            ? latePhase
              ? "charge"
              : "flank"
            : "approach",
      speedMultiplier: phaseIndex === 3 ? 1.24 : phaseIndex === 2 ? 1.12 : 1,
      damageMultiplier: phaseIndex === 3 ? 1.22 : phaseIndex === 2 ? 1.1 : 1,
      vulnerabilityMultiplier: latePhase ? 1.18 : 1,
      thermalVisibility: previous.missionId === "ruins-ancient-guardian" ? 0.62 : 1,
      energyWeaponsLocked: guardianStep?.energyWeaponsLocked ?? false,
      trophyAtRisk: false,
    },
  };
}

export function stepBossMechanics(
  previous: BossMechanicState,
  input: BossMechanicInput,
): BossMechanicStep {
  if (previous.missionId === "jungle-vey") {
    return stepVey(previous, input);
  }
  if (previous.missionId === "ice-cryostalker") {
    return stepCryostalker(previous, input);
  }
  if (previous.missionId === "volcano-bad-blood") {
    return stepBadBlood(previous, input);
  }
  return stepExpansionBoss(previous, input);
}
