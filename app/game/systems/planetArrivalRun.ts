import { DIFFICULTIES } from '../data';
import type { DifficultyId } from '../types';
import type { JsonObject } from './activeHuntSave';
import type { PlanetArrivalState } from './planetArrival';
import { samePlanetInsertion } from './planetInsertion';

/** Frozen mission-start configuration, committed in the same campaign document as the montage. */
export interface PlanetArrivalRun {
  version: 1;
  ownerCreatedAt: string;
  runId: string;
  startedAt: string;
  difficultyId: DifficultyId;
  configuration: JsonObject;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** No storage access and no import of save.ts: safe at the campaign validation boundary. */
export function inspectPlanetArrivalRun(value: unknown, arrival: PlanetArrivalState | null): {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: PlanetArrivalRun | null;
} {
  const invalid = { status: 'invalid-save' as const, state: null };
  if (value === undefined || value === null) return arrival ? invalid : { status: 'absent', state: null };
  if (!record(value)) return invalid;
  if (typeof value.version === 'number' && value.version > 1) return { status: 'future-version', state: null };
  if (!arrival || value.version !== 1 || Object.keys(value).length !== 6 ||
      !['version', 'ownerCreatedAt', 'runId', 'startedAt', 'difficultyId', 'configuration'].every(key => Object.hasOwn(value, key)) ||
      value.ownerCreatedAt !== arrival.ownerCreatedAt || value.runId !== arrival.runId ||
      typeof value.startedAt !== 'string' || value.startedAt.length > 40 || !Number.isFinite(Date.parse(value.startedAt)) ||
      !DIFFICULTIES.some(item => item.id === value.difficultyId) || !record(value.configuration)) return invalid;
  const config = value.configuration;
  if (!record(config.inventory) || !record(config.loadout) || !record(config.appearance) ||
      !record(config.visualOptions) || config.appearance.presetId !== arrival.hunterPresetId ||
      !['screenShake', 'reducedGore', 'highContrastVision'].every(key => typeof (config.visualOptions as Record<string, unknown>)[key] === 'boolean') ||
      typeof config.gauntletVariantId !== 'string' || config.gauntletVariantId.length > 160 ||
      config.elapsedSeconds !== 0 || !samePlanetInsertion(config.insertion, arrival.insertion) ||
      (config.insertion !== undefined && config.insertionShipId !== arrival.personalShipId) ||
      (config.insertionShipId !== undefined && config.insertionShipId !== arrival.personalShipId)) return invalid;
  try {
    // Bound the frozen equipment snapshot and reject values that cannot survive JSON storage.
    const serialized = JSON.stringify(config);
    if (serialized.length > 160_000 || serialized.includes('"__proto__"')) return invalid;
    const cloned = JSON.parse(serialized) as JsonObject;
    return { status: 'valid', state: { version: 1, ownerCreatedAt: arrival.ownerCreatedAt,
      runId: arrival.runId, startedAt: value.startedAt, difficultyId: value.difficultyId as DifficultyId,
      configuration: cloned } };
  } catch { return invalid; }
}
