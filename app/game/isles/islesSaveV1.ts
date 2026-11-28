/** The Isles V1 · mode profile `islesV1`, stored under its own local key. It never reads or
 * writes the campaign slots (decision of 21 November 2026: no effect on the campaign). */

export const ISLES_PROFILE_KEY_V1 = "yautja.isles.profile.v1";
export const ISLES_PROFILE_VERSION_V1 = 1;

export interface IslesTrophyV1 {
  id: string;
  /** Species or human type (jaguar, braconnier…). */
  kind: string;
  label: string;
  /** Honor of the kill, before the +20 % of the delivery. */
  honor: number;
  takenAtSeconds: number;
  place: string;
  named?: string;
}

export interface IslesProfileV1 {
  version: 1;
  honor: number;
  /** Reputation levels lost to grave faults, applied on top of the honor thresholds. */
  reputationPenalty: number;
  faults: number;
  worldSeconds: number;
  trophies: IslesTrophyV1[];
  lairs: string[];
  fragments: string[];
  codex: string[];
  bountiesClaimed: string[];
  legendariesTaken: string[];
  trialBestSeconds: number | null;
  trialMedals: string[];
  missions: Record<string, "done">;
  contracts: {day: number; accepted: string[]; done: string[]; progress: Record<string, number>};
}

export function defaultIslesProfileV1(): IslesProfileV1 {
  return {version: 1, honor: 0, reputationPenalty: 0, faults: 0, worldSeconds: 0, trophies: [], lairs: [], fragments: [], codex: [],
    bountiesClaimed: [], legendariesTaken: [], trialBestSeconds: null, trialMedals: [], missions: {}, contracts: {day: -1, accepted: [], done: [], progress: {}}};
}

const strings = (value: unknown, limit = 500): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length <= 80))].slice(0, limit) : [];
const count = (value: unknown, max = 1e9) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;

/** Reads any stored value (missing, older, damaged) into a valid profile; never throws. */
export function migrateIslesProfileV1(raw: unknown): IslesProfileV1 {
  const base = defaultIslesProfileV1();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Record<string, unknown>;
  const trophies = Array.isArray(value.trophies) ? value.trophies.flatMap(item => {
    const t = item as Record<string, unknown>;
    return t && typeof t.id === "string" && typeof t.kind === "string" && typeof t.label === "string"
      ? [{id: t.id.slice(0, 80), kind: t.kind.slice(0, 40), label: t.label.slice(0, 80), honor: count(t.honor, 10000), takenAtSeconds: count(t.takenAtSeconds),
        place: typeof t.place === "string" ? t.place.slice(0, 80) : "Verdant", ...(typeof t.named === "string" ? {named: t.named.slice(0, 80)} : {})}]
      : [];
  }).slice(0, 2000) : [];
  const contracts = (value.contracts ?? {}) as Record<string, unknown>;
  const progress: Record<string, number> = {};
  if (contracts.progress && typeof contracts.progress === "object") {
    for (const [key, amount] of Object.entries(contracts.progress as Record<string, unknown>)) if (key.length <= 80) progress[key] = count(amount, 100);
  }
  const missions: Record<string, "done"> = {};
  if (value.missions && typeof value.missions === "object") {
    for (const [key, state] of Object.entries(value.missions as Record<string, unknown>)) if (state === "done" && key.length <= 40) missions[key] = "done";
  }
  return {
    version: 1,
    honor: count(value.honor),
    reputationPenalty: Math.round(count(value.reputationPenalty, 9)),
    faults: Math.round(count(value.faults, 1e6)),
    worldSeconds: count(value.worldSeconds),
    trophies,
    lairs: strings(value.lairs, 50), fragments: strings(value.fragments, 100), codex: strings(value.codex, 200),
    bountiesClaimed: strings(value.bountiesClaimed, 50), legendariesTaken: strings(value.legendariesTaken, 50),
    trialBestSeconds: typeof value.trialBestSeconds === "number" && Number.isFinite(value.trialBestSeconds) && value.trialBestSeconds > 0 ? value.trialBestSeconds : null,
    trialMedals: strings(value.trialMedals, 10), missions,
    contracts: {day: Number.isSafeInteger(contracts.day) ? contracts.day as number : -1, accepted: strings(contracts.accepted, 10), done: strings(contracts.done, 10), progress},
  };
}

/** Reputation level 1 to 10 from the honor thresholds, less the levels lost to grave faults. */
export function islesReputationV1(profile: IslesProfileV1, thresholds: number[]): number {
  let level = 0;
  thresholds.forEach((threshold, index) => { if (profile.honor >= threshold) level = index + 1; });
  return Math.max(1, level - profile.reputationPenalty);
}

/** Minimal storage interface (window.localStorage in the game, a map in the tests). */
export interface IslesStorageV1 { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function loadIslesProfileV1(storage: IslesStorageV1 | null): {profile: IslesProfileV1; warning: string | null} {
  if (!storage) return {profile: defaultIslesProfileV1(), warning: "Stockage local indisponible : la progression des Îles ne sera pas gardée."};
  try {
    const text = storage.getItem(ISLES_PROFILE_KEY_V1);
    if (!text) return {profile: defaultIslesProfileV1(), warning: null};
    return {profile: migrateIslesProfileV1(JSON.parse(text)), warning: null};
  } catch {
    return {profile: defaultIslesProfileV1(), warning: "Profil des Îles illisible : une nouvelle progression commence."};
  }
}

export function saveIslesProfileV1(storage: IslesStorageV1 | null, profile: IslesProfileV1): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ISLES_PROFILE_KEY_V1, JSON.stringify(migrateIslesProfileV1(profile)));
    return true;
  } catch {
    return false;
  }
}
