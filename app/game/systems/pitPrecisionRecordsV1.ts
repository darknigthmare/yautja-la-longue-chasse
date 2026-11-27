import { archiveTransferPending } from "./archiveTransferGuard";
import { PIT_ARENAS } from "./pitCombat";
import { pitHasShoulderPlasma } from "./pitEquipmentV57";
import { normalizePitUserVariant } from "./pitUserRoster";
import type { PitBonusRecordV1, PitBonusRecordsReadV1, PitBonusStorageV1 } from "./pitBonusRecordsV1";
import type { PitBonusDifficultyV1 } from "./pitBonusTrialV1";
import {
  PIT_PRECISION_FIGHTERS_V1, PIT_PRECISION_MIN_DISTANCE_V1, PIT_PRECISION_TARGET_V1, PIT_PRECISION_TRIAL_ID_V1,
  pitPrecisionResultV1, pitPrecisionRulesV1, type PitPrecisionTrialV1,
} from "./pitPrecisionTrialV1";

export const PIT_PRECISION_RECORDS_KEY_V1 = "yautja-long-hunt.the-pit-precision.v1";
export const PIT_PRECISION_RECORDS_MAX_LENGTH_V1 = 8192;

export interface PitPrecisionRecordsV1 {
  readonly version: 1;
  readonly trialId: typeof PIT_PRECISION_TRIAL_ID_V1;
  readonly ownerSaveCreatedAt: string;
  readonly best: Readonly<Partial<Record<PitBonusDifficultyV1, PitBonusRecordV1>>>;
}

export interface PitPrecisionRecordsReadV1 {
  readonly status: PitBonusRecordsReadV1["status"];
  readonly records: PitPrecisionRecordsV1 | null;
  readonly message: string;
}

const DIFFICULTIES = ["standard", "assisted"] as const;

function validDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && Number.isFinite(Date.parse(value));
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function browserStorage(): PitBonusStorageV1 | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

export function pitPrecisionRecordsStorageKeyV1(owner: string): string {
  if (!validDate(owner)) throw new Error("A PIT precision record requires a valid campaign owner.");
  return `${PIT_PRECISION_RECORDS_KEY_V1}.${encodeURIComponent(owner)}`;
}

function validRecord(value: unknown, difficulty: PitBonusDifficultyV1): value is PitBonusRecordV1 {
  if (!DIFFICULTIES.includes(difficulty) || !object(value) || value.difficulty !== difficulty ||
    typeof value.playerId !== "string" || !PIT_PRECISION_FIGHTERS_V1.some(id => id === value.playerId) ||
    typeof value.arenaId !== "string" || !Object.hasOwn(PIT_ARENAS, value.arenaId) || !validDate(value.completedAt)) {
    return false;
  }
  if (value.variantId !== null && (typeof value.variantId !== "string" ||
    normalizePitUserVariant(value.playerId, value.variantId) !== value.variantId ||
    !pitHasShoulderPlasma(value.playerId, value.variantId))) return false;
  const rules = pitPrecisionRulesV1(difficulty);
  return integer(value.elapsedTicks, 1, rules.limitTicks) && integer(value.mistakes, 0, rules.maxMistakes - 1) &&
    value.score === PIT_PRECISION_TARGET_V1 * 1000 - value.mistakes * 200 + Math.floor((rules.limitTicks - value.elapsedTicks) / 6);
}

export function loadPitPrecisionRecordsV1(
  owner: string | undefined,
  storage: PitBonusStorageV1 | null = browserStorage(),
): PitPrecisionRecordsReadV1 {
  if (!validDate(owner)) return { status: "owner-missing", records: null, message: "Aucun profil propriétaire pour conserver ce record." };
  if (!storage) return { status: "unavailable", records: null, message: "Le stockage local est indisponible." };
  try {
    const raw = storage.getItem(pitPrecisionRecordsStorageKeyV1(owner));
    if (raw === null) return { status: "empty", records: { version: 1, trialId: PIT_PRECISION_TRIAL_ID_V1,
      ownerSaveCreatedAt: owner, best: {} }, message: "Aucun record de précision conservé." };
    if (raw.length > PIT_PRECISION_RECORDS_MAX_LENGTH_V1) throw new Error("Oversized precision records.");
    const value: unknown = JSON.parse(raw);
    if (!object(value)) throw new Error("Invalid precision record root.");
    if (value.version !== 1 || value.trialId !== PIT_PRECISION_TRIAL_ID_V1) {
      return { status: "unsupported", records: null, message: "La version des archives de précision est inconnue. Ces archives sont conservées." };
    }
    if (value.ownerSaveCreatedAt !== owner) {
      return { status: "owner-mismatch", records: null, message: "Les archives de précision appartiennent à un autre profil." };
    }
    const best = value.best;
    if (!object(best) || Object.keys(best).some(key => key !== "standard" && key !== "assisted") ||
      DIFFICULTIES.some(key => Object.hasOwn(best, key) && !validRecord(best[key], key))) {
      throw new Error("Invalid precision best.");
    }
    return { status: "ready", records: value as unknown as PitPrecisionRecordsV1, message: "Records de précision chargés par niveau d’aide." };
  } catch {
    return { status: "invalid", records: null, message: "Les archives de précision sont illisibles ou le stockage est bloqué. Leur contenu est conservé." };
  }
}

export function savePitPrecisionRecordV1(
  owner: string | undefined,
  trial: PitPrecisionTrialV1,
  completedAt: string,
  storage: PitBonusStorageV1 | null = browserStorage(),
) {
  const loaded = loadPitPrecisionRecordsV1(owner, storage);
  const fail = (message: string) => ({ saved: false, improved: false, records: loaded.records, message });
  if (!loaded.records || !storage || !owner) return fail(loaded.message);
  if (archiveTransferPending(storage)) return fail("Transfert d’archives en cours. La conservation du record est suspendue.");
  const record: PitBonusRecordV1 = {
    difficulty: trial.difficulty, playerId: trial.playerId, variantId: trial.variantId, arenaId: trial.arenaId,
    elapsedTicks: trial.elapsedTicks, mistakes: trial.mistakes, score: pitPrecisionResultV1(trial).score, completedAt,
  };
  if (trial.id !== PIT_PRECISION_TRIAL_ID_V1 || trial.version !== 1 || trial.status !== "success" ||
    trial.completed !== PIT_PRECISION_TARGET_V1 || trial.observedFrame !== trial.elapsedTicks || trial.stage !== "reset" ||
    trial.stageTicks !== 0 || trial.dummyId !== "berserker" || trial.projectileSeen !== true ||
    trial.shotDistance === null || !Number.isFinite(trial.shotDistance) || trial.shotDistance < PIT_PRECISION_MIN_DISTANCE_V1 ||
    !integer(trial.shotMinEffectId, 0, Number.MAX_SAFE_INTEGER) || !validRecord(record, trial.difficulty)) {
    return fail("Seule une épreuve réussie avec quatre impacts de précision peut conserver un record.");
  }

  const previous = loaded.records.best[record.difficulty];
  if (previous && (previous.score > record.score ||
    (previous.score === record.score && previous.elapsedTicks <= record.elapsedTicks))) {
    return { saved: true, improved: false, records: loaded.records, message: "Votre meilleur record est déjà conservé." };
  }

  const records: PitPrecisionRecordsV1 = { ...loaded.records, best: { ...loaded.records.best, [record.difficulty]: record } };
  try {
    const key = pitPrecisionRecordsStorageKeyV1(owner);
    const serialized = JSON.stringify(records);
    if (serialized.length > PIT_PRECISION_RECORDS_MAX_LENGTH_V1) {
      return fail("Les archives de précision ont atteint leur taille maximale. Leur contenu est conservé.");
    }
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return fail("Le stockage n’a pas confirmé le record. Vous pouvez réessayer.");
    return { saved: true, improved: true, records, message: "Record personnel de précision conservé pour ce niveau d’aide." };
  } catch {
    return fail("Le record de précision n’a pas pu être conservé. Vous pouvez réessayer.");
  }
}
