import { MISSIONS } from '../data';
import { GALAXY_NAVIGATION } from '../galaxyNavigation';
import { galaxyBodyVisualPath } from '../galaxyVisuals';
import { HUNTER_PRESET_BY_ID } from '../hunterLore';
import { isShipId, shipProfileAssetPath, type ShipId } from '../shipCatalogue';
import type { BiomeId, HunterPresetId, MissionId } from '../types';
import { backgroundPathForBiome } from '../worldScreens';
import { worldBlueprintFor } from './worldBlueprints';
import { wolfCastleRuntimeAsset } from './wolfCastleRuntimeArt';
import { ARRIVAL_COMPLETION_ART, arrivalImpactArtForBiome } from './planetArrivalArt';

/** The montage has no gameplay clock, resource cost or reward of its own. */
export const PLANET_ARRIVAL_VERSION = 1 as const;
export const PLANET_ARRIVAL_DURATION_MS = 62_000;
export const PLANET_ARRIVAL_MAX_STEP_MS = 100;
export const PLANET_ARRIVAL_SUSPEND_GAP_MS = 1_500;
/** The surface shot reaches the ground at this fraction; sound shares this event. */
export const PLANET_ARRIVAL_CONTACT_PROGRESS = .62;

export const PLANET_ARRIVAL_SHOTS = [
  { id: 'orbit', label: 'Aux confins de la chasse', startMs: 0, endMs: 7_000 },
  { id: 'title', label: 'Destination confirmée', startMs: 7_000, endMs: 13_000 },
  { id: 'carrier', label: 'Approche orbitale', startMs: 13_000, endMs: 23_000 },
  { id: 'release', label: 'Largage de la capsule', startMs: 23_000, endMs: 31_000 },
  { id: 'descent', label: 'Descente vers la planète', startMs: 31_000, endMs: 41_000 },
  { id: 'atmosphere', label: 'Entrée atmosphérique', startMs: 41_000, endMs: 49_000 },
  { id: 'landing', label: 'Contact avec la surface', startMs: 49_000, endMs: 57_000 },
  { id: 'egress', label: 'La chasse commence', startMs: 57_000, endMs: 62_000 },
] as const;

export type PlanetArrivalShotId = (typeof PLANET_ARRIVAL_SHOTS)[number]['id'];
export type PlanetArrivalStatus = 'prepared' | 'playing' | 'paused' | 'handoff-pending' | 'complete' | 'recoverable-error';
export type PlanetArrivalCompletion = 'natural' | 'skipped';

/**
 * Campaign-owned DTO. Configuration/loadout and its durable transaction belong
 * to GameClient/save.ts. Paths are resolved from registered IDs, never a save.
 */
export interface PlanetArrivalState {
  version: typeof PLANET_ARRIVAL_VERSION;
  ownerCreatedAt: string;
  runId: string;
  missionId: MissionId;
  encounterRun: number;
  destinationId: string;
  destinationDisplayName: string;
  biomeId: BiomeId;
  personalShipId: ShipId;
  hunterPresetId: HunterPresetId;
  spawnId: string;
  /** Same ecology input as HuntCanvas: the existing encounter index. */
  seed: number;
  elapsedMs: number;
  status: PlanetArrivalStatus;
  completedBy: PlanetArrivalCompletion | null;
}

export interface PlanetArrivalInput {
  ownerCreatedAt: string;
  runId: string;
  missionId: MissionId;
  encounterRun: number;
  personalShipId: ShipId;
  hunterPresetId: HunterPresetId;
}

export interface PlanetArrivalInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: PlanetArrivalState | null;
  reason: string | null;
}

const KEYS = ['version', 'ownerCreatedAt', 'runId', 'missionId', 'encounterRun',
  'destinationId', 'destinationDisplayName', 'biomeId', 'personalShipId',
  'hunterPresetId', 'spawnId', 'seed', 'elapsedMs', 'status', 'completedBy'] as const;
const STATUSES: readonly PlanetArrivalStatus[] = ['prepared', 'playing', 'paused', 'handoff-pending', 'complete', 'recoverable-error'];

function identity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 &&
    value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor?.enumerable && 'value' in descriptor;
  });
}

export function planetArrivalDestination(missionId: MissionId) {
  const mission = MISSIONS.find(candidate => candidate.id === missionId);
  if (!mission) return null;
  for (const system of GALAXY_NAVIGATION.systems) {
    const body = system.bodies.find(candidate => candidate.missions.some(entry => entry.id === missionId));
    if (body) return { mission, system, body, world: worldBlueprintFor(missionId) };
  }
  return null;
}

export function createPlanetArrival(input: PlanetArrivalInput): PlanetArrivalState {
  const destination = planetArrivalDestination(input.missionId);
  if (!destination || !identity(input.ownerCreatedAt) || !identity(input.runId) ||
      !Number.isInteger(input.encounterRun) || input.encounterRun < 0 || input.encounterRun > 1_000_000_000 ||
      !isShipId(input.personalShipId) || !identity(input.hunterPresetId) ||
      (input.hunterPresetId !== 'custom' && !Object.hasOwn(HUNTER_PRESET_BY_ID, input.hunterPresetId))) {
    throw new TypeError('Identité, mission, coque ou apparence d’arrivée invalide.');
  }
  return {
    version: PLANET_ARRIVAL_VERSION,
    ownerCreatedAt: input.ownerCreatedAt,
    runId: input.runId,
    missionId: input.missionId,
    encounterRun: input.encounterRun,
    destinationId: destination.body.id,
    destinationDisplayName: destination.mission.planetName,
    biomeId: destination.mission.biome,
    personalShipId: input.personalShipId,
    hunterPresetId: input.hunterPresetId,
    spawnId: `${input.missionId}:spawn`,
    seed: input.encounterRun,
    elapsedMs: 0,
    status: 'prepared',
    completedBy: null,
  };
}

export function inspectPlanetArrival(value: unknown, expectedOwnerCreatedAt?: string, expectedRunId?: string): PlanetArrivalInspection {
  const invalid = (reason: string): PlanetArrivalInspection => ({ status: 'invalid-save', state: null, reason });
  if (value === undefined || value === null) return { status: 'absent', state: null, reason: null };
  if (!plainRecord(value)) return invalid('structure');
  if (typeof value.version === 'number' && value.version > PLANET_ARRIVAL_VERSION) {
    return { status: 'future-version', state: null, reason: 'version' };
  }
  if (value.version !== PLANET_ARRIVAL_VERSION || Object.keys(value).length !== KEYS.length ||
      !KEYS.every(key => Object.hasOwn(value, key))) return invalid('structure');
  if (!identity(value.ownerCreatedAt) || !identity(value.runId)) return invalid('identity');
  if (expectedOwnerCreatedAt !== undefined && value.ownerCreatedAt !== expectedOwnerCreatedAt) return invalid('owner');
  if (expectedRunId !== undefined && value.runId !== expectedRunId) return invalid('run');
  let canonical: PlanetArrivalState;
  try { canonical = createPlanetArrival(value as unknown as PlanetArrivalInput); }
  catch { return invalid('catalogue'); }
  for (const key of ['destinationId', 'destinationDisplayName', 'biomeId', 'spawnId', 'seed'] as const) {
    if (value[key] !== canonical[key]) return invalid(key);
  }
  if (typeof value.elapsedMs !== 'number' || !Number.isFinite(value.elapsedMs) ||
      value.elapsedMs < 0 || value.elapsedMs > PLANET_ARRIVAL_DURATION_MS ||
      !STATUSES.includes(value.status as PlanetArrivalStatus)) return invalid('timeline');
  const terminal = value.status === 'handoff-pending' || value.status === 'complete' || value.status === 'recoverable-error';
  if (terminal ? value.completedBy !== 'natural' && value.completedBy !== 'skipped' : value.completedBy !== null) return invalid('handoff');
  if (value.status === 'prepared' && value.elapsedMs !== 0) return invalid('prepared');
  if (value.completedBy === 'natural' && value.elapsedMs !== PLANET_ARRIVAL_DURATION_MS) return invalid('natural-end');
  // A playing save at the exact end cannot resume into an inert final frame.
  if ((value.status === 'playing' || value.status === 'paused') && value.elapsedMs === PLANET_ARRIVAL_DURATION_MS) return invalid('uncommitted-end');
  return { status: 'valid', state: { ...value } as unknown as PlanetArrivalState, reason: null };
}

export function normalizePlanetArrival(value: unknown, ownerCreatedAt?: string): PlanetArrivalState | null {
  return inspectPlanetArrival(value, ownerCreatedAt).state;
}

export function planetArrivalShotAt(elapsedMs: number) {
  const milliseconds = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(PLANET_ARRIVAL_DURATION_MS, elapsedMs)) : 0;
  const index = PLANET_ARRIVAL_SHOTS.findIndex(shot => milliseconds < shot.endMs);
  const shotIndex = index < 0 ? PLANET_ARRIVAL_SHOTS.length - 1 : index;
  const shot = PLANET_ARRIVAL_SHOTS[shotIndex];
  return { ...shot, index: shotIndex, progress: Math.min(1, (milliseconds - shot.startMs) / (shot.endMs - shot.startMs)) };
}

export function startPlanetArrival(state: PlanetArrivalState): PlanetArrivalState {
  return state.status === 'prepared' || state.status === 'paused'
    ? { ...state, status: 'playing' } : state;
}

export function pausePlanetArrival(state: PlanetArrivalState): PlanetArrivalState {
  return state.status === 'playing' ? { ...state, status: 'paused' } : state;
}

/** A reloaded montage starts at its current shot, paused until explicitly resumed. */
export function resumePlanetArrival(state: PlanetArrivalState): PlanetArrivalState {
  if (state.status !== 'playing' && state.status !== 'paused') return state;
  return { ...state, elapsedMs: planetArrivalShotAt(state.elapsedMs).startMs, status: 'paused' };
}

/** No callback or gameplay effect is attached to an animation frame or CSS event. */
export function requestPlanetArrivalHandoff(state: PlanetArrivalState, completedBy: PlanetArrivalCompletion = 'skipped'): PlanetArrivalState {
  if (state.status === 'complete' || state.status === 'handoff-pending') return state;
  if (completedBy === 'natural' && state.elapsedMs < PLANET_ARRIVAL_DURATION_MS && state.status !== 'recoverable-error') return state;
  return { ...state, status: 'handoff-pending', completedBy: state.completedBy ?? completedBy };
}

export function completePlanetArrivalHandoff(state: PlanetArrivalState): PlanetArrivalState {
  return state.status === 'handoff-pending' ? { ...state, status: 'complete' } : state;
}

export function failPlanetArrivalHandoff(state: PlanetArrivalState): PlanetArrivalState {
  return state.status === 'handoff-pending' ? { ...state, status: 'recoverable-error' } : state;
}

/**
 * RAF deltas are milliseconds. A hidden tab / system suspension cannot consume
 * the montage. Short dropped frames are bounded; a long gap requires Resume.
 */
export function advancePlanetArrival(state: PlanetArrivalState, deltaMs: number): PlanetArrivalState {
  if (state.status !== 'playing' || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  if (deltaMs > PLANET_ARRIVAL_SUSPEND_GAP_MS) return pausePlanetArrival(state);
  const elapsedMs = Math.min(PLANET_ARRIVAL_DURATION_MS, state.elapsedMs + Math.min(deltaMs, PLANET_ARRIVAL_MAX_STEP_MS));
  const next = { ...state, elapsedMs };
  return elapsedMs === PLANET_ARRIVAL_DURATION_MS ? requestPlanetArrivalHandoff(next, 'natural') : next;
}

export const PLANET_ARRIVAL_ART = {
  space: '/game/planet-arrival/v1/space.png',
  podFlight: '/game/planet-arrival/v1/pod-flight.png',
  podGround: '/game/planet-arrival/v1/pod-ground.png',
  podDoor: '/game/planet-arrival/v1/pod-door.png',
  releaseJet: '/game/planet-arrival/v1/release-jet.png',
  heatTrail: '/game/planet-arrival/v1/heat-trail.png',
  clouds: '/game/planet-arrival/v1/atmosphere-clouds.png',
  impactDust: '/game/planet-arrival/v1/impact-dust.png',
} as const;

const PLANET_ARRIVAL_RUNTIME_ART = {
  ...Object.fromEntries(Object.entries(PLANET_ARRIVAL_ART).map(([key, source]) => [key, wolfCastleRuntimeAsset(source)])) as Record<keyof typeof PLANET_ARRIVAL_ART, string>,
  ...ARRIVAL_COMPLETION_ART,
};

export function planetArrivalAssets(state: PlanetArrivalState) {
  const destination = planetArrivalDestination(state.missionId);
  if (!destination || destination.body.id !== state.destinationId) return null;
  return {
    ...PLANET_ARRIVAL_RUNTIME_ART,
    impactDust: arrivalImpactArtForBiome(state.biomeId).path,
    carrier: shipProfileAssetPath(state.personalShipId),
    planet: galaxyBodyVisualPath(destination.body),
    ground: backgroundPathForBiome(destination.mission.biome),
  };
}

/** Authored landing geometry, in the same world units and floor as HuntCanvas. */
export function planetArrivalLanding(state: PlanetArrivalState) {
  const world = worldBlueprintFor(state.missionId);
  return { spawnX: world.spawn.x, floorY: world.floorY, height: world.height, hunterWidth: 72, hunterHeight: 116,
    capsuleX: Math.max(22, world.spawn.x - 96), capsuleWidth: 128, capsuleHeight: 208 };
}
