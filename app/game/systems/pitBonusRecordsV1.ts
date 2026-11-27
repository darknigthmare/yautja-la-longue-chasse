import { archiveTransferPending } from "./archiveTransferGuard";
import { PIT_ARENAS, PIT_FIGHTERS, type PitArenaId, type PitFighterId } from "./pitCombat";
import { normalizePitUserVariant } from "./pitUserRoster";
import { PIT_BONUS_TARGET_V1, PIT_BONUS_TRIAL_ID_V1, pitBonusResultV1, pitBonusRulesV1,
  type PitBonusDifficultyV1, type PitBonusTrialV1 } from "./pitBonusTrialV1";

/** Optional local bests only. Never read by duel results, honors, unlocks or campaign progression. */
export const PIT_BONUS_RECORDS_KEY_V1 = "yautja-long-hunt.the-pit-bonus.v1";
export const PIT_BONUS_RECORDS_MAX_LENGTH_V1 = 8192;
export interface PitBonusRecordV1 {
  readonly difficulty: PitBonusDifficultyV1;
  readonly playerId: PitFighterId;
  readonly variantId: string | null;
  readonly arenaId: PitArenaId;
  readonly elapsedTicks: number;
  readonly mistakes: number;
  readonly score: number;
  readonly completedAt: string;
}
export interface PitBonusRecordsV1 {
  readonly version: 1;
  readonly trialId: typeof PIT_BONUS_TRIAL_ID_V1;
  readonly ownerSaveCreatedAt: string;
  readonly best: Readonly<Partial<Record<PitBonusDifficultyV1, PitBonusRecordV1>>>;
}
export interface PitBonusStorageV1 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface PitBonusRecordsReadV1 {
  readonly status: "ready" | "empty" | "unavailable" | "invalid" | "owner-missing" | "owner-mismatch" | "unsupported";
  readonly records: PitBonusRecordsV1 | null;
  readonly message: string;
}
function validOwner(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && Number.isFinite(Date.parse(value));
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function integer(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}
export function pitBonusRecordsStorageKeyV1(owner: string): string {
  if (!validOwner(owner)) throw new Error("A PIT bonus record requires a valid campaign owner.");
  return `${PIT_BONUS_RECORDS_KEY_V1}.${encodeURIComponent(owner)}`;
}
function browserStorage(): PitBonusStorageV1 | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
function blank(owner: string): PitBonusRecordsV1 {
  return { version: 1, trialId: PIT_BONUS_TRIAL_ID_V1, ownerSaveCreatedAt: owner, best: {} };
}
function validRecord(value: unknown, difficulty: PitBonusDifficultyV1): value is PitBonusRecordV1 {
  if ((difficulty !== "standard" && difficulty !== "assisted") || !object(value) || value.difficulty !== difficulty || typeof value.playerId !== "string" ||
    !Object.hasOwn(PIT_FIGHTERS, value.playerId) || typeof value.arenaId !== "string" ||
    !Object.hasOwn(PIT_ARENAS, value.arenaId) || !validOwner(value.completedAt)) return false;
  if (value.variantId !== null && (typeof value.variantId !== "string" ||
    normalizePitUserVariant(value.playerId as PitFighterId, value.variantId) !== value.variantId)) return false;
  const rules = pitBonusRulesV1(difficulty);
  return integer(value.elapsedTicks, 1, rules.limitTicks) && integer(value.mistakes, 0, rules.maxMistakes - 1) &&
    value.score === PIT_BONUS_TARGET_V1 * 1000 - value.mistakes * 200 + Math.floor((rules.limitTicks - value.elapsedTicks) / 6);
}

export function loadPitBonusRecordsV1(owner: string | undefined, storage: PitBonusStorageV1 | null = browserStorage()): PitBonusRecordsReadV1 {
  if (!validOwner(owner)) return { status: "owner-missing", records: null, message: "Aucun profil propriétaire : cette tentative reste disponible pour jouer, sans conservation de record." };
  if (!storage) return { status: "unavailable", records: null, message: "Stockage local indisponible. Le résultat reste visible pendant cette session." };
  try {
    const raw = storage.getItem(pitBonusRecordsStorageKeyV1(owner));
    if (raw === null) return { status: "empty", records: blank(owner), message: "Aucun record conservé. L’enregistrement se fait uniquement sur votre demande après une réussite." };
    if (raw.length > PIT_BONUS_RECORDS_MAX_LENGTH_V1) return { status: "invalid", records: null, message: "Archives bonus invalides : leur contenu est conservé sans écrasement." };
    const value: unknown = JSON.parse(raw);
    if (!object(value)) throw new Error("Invalid record root.");
    if (value.version !== 1 || value.trialId !== PIT_BONUS_TRIAL_ID_V1) return { status: "unsupported", records: null, message: "Cette version des archives bonus n’est pas prise en charge. Elle ne sera pas remplacée." };
    if (value.ownerSaveCreatedAt !== owner) return { status: "owner-mismatch", records: null, message: "Ces archives bonus appartiennent à un autre profil. Elles ne seront pas remplacées." };
    if (!object(value.best) || Object.keys(value.best).some(key => key !== "standard" && key !== "assisted") ||
      (["standard", "assisted"] as const).some(difficulty => Object.hasOwn(value.best as object, difficulty) && !validRecord((value.best as Record<string, unknown>)[difficulty], difficulty))) throw new Error("Invalid best record.");
    return { status: "ready", records: value as unknown as PitBonusRecordsV1, message: "Records locaux chargés ; les deux niveaux d’aide sont conservés séparément." };
  } catch {
    return { status: "invalid", records: null, message: "Archives bonus illisibles ou stockage bloqué. Aucun contenu existant n’a été modifié." };
  }
}

/** Explicit opt-in only. Comparing two bests is idempotent; there is no cumulative award counter. */
export function savePitBonusRecordV1(owner: string | undefined, trial: PitBonusTrialV1,
  completedAt: string, storage: PitBonusStorageV1 | null = browserStorage()) {
  const loaded = loadPitBonusRecordsV1(owner, storage);
  const fail = (message: string) => ({ saved: false, improved: false, records: loaded.records, message });
  if (!loaded.records || !storage || !owner) return fail(loaded.message);
  if (archiveTransferPending(storage)) return fail("Transfert d’archives en cours : conservation du record suspendue.");
  const record: PitBonusRecordV1 = {
    difficulty: trial.difficulty, playerId: trial.playerId, variantId: trial.variantId, arenaId: trial.arenaId,
    elapsedTicks: trial.elapsedTicks, mistakes: trial.mistakes, score: pitBonusResultV1(trial).score, completedAt,
  };
  if (trial.id !== PIT_BONUS_TRIAL_ID_V1 || trial.version !== 1 || trial.status !== "success" ||
    trial.completed !== PIT_BONUS_TARGET_V1 || trial.observedFrame !== trial.elapsedTicks || !validRecord(record, trial.difficulty)) {
    return fail("Seule une épreuve réussie avec des données valides peut conserver un record.");
  }
  const previous = loaded.records.best[trial.difficulty];
  if (previous && (previous.score > record.score || (previous.score === record.score && previous.elapsedTicks <= record.elapsedTicks))) {
    return { saved: true, improved: false, records: loaded.records, message: "Votre meilleur record est déjà conservé. Aucun doublon ajouté." };
  }
  const records: PitBonusRecordsV1 = { ...loaded.records, best: { ...loaded.records.best, [trial.difficulty]: record } };
  try {
    const serialized = JSON.stringify(records), key = pitBonusRecordsStorageKeyV1(owner);
    if (serialized.length > PIT_BONUS_RECORDS_MAX_LENGTH_V1) {
      return fail("Les archives bonus ont atteint leur taille maximale. Leur contenu existant est conservé ; ce résultat reste visible dans la session.");
    }
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return fail("Le stockage n’a pas confirmé l’écriture. Le résultat reste visible ; vous pouvez réessayer.");
    return { saved: true, improved: true, records, message: "Record personnel conservé pour ce niveau d’aide. Aucun gain de progression attribué." };
  } catch {
    return fail("Le record n’a pas pu être conservé. Le résultat reste visible ; vous pouvez réessayer.");
  }
}
