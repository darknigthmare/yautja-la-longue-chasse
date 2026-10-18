import { archiveTransferPending } from "./archiveTransferGuard";
import { parseSaveImport, SAVE_STORAGE_KEY } from "../save";
import {
  createDefaultShipProgression, recordTrainingResult, SHIP_PROGRESSION_STORAGE_KEY,
  synchronizeShipProgression, TRAINING_LABELS, validateCanonicalShipProgression,
  writeShipProgressionWithStatus,
  type ShipProgressionState, type ShipProgressionWriteResult, type TrainingDisciplineId,
} from "./progression";
import type { SaveGame } from "../types";

export interface ShipTrainingStorageV94 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface ShipTrainingIOV94 {
  storage(): ShipTrainingStorageV94 | null;
  write(state: ShipProgressionState, save: SaveGame, storage: ShipTrainingStorageV94): ShipProgressionWriteResult;
}
export type ShipTrainingAttemptV94 =
  | { status: "confirmed"; state: ShipProgressionState }
  | { status: "pending"; message: string }
  | { status: "ignored" };
export interface ShipTrainingReceiptV94 {
  readonly owner: string;
  readonly disciplineId: TrainingDisciplineId;
  readonly score: number;
  /** A recovery copy is not a confirmation that the score reached the sidecar. */
  recoveryCopy(): ShipTrainingRecoveryCopyV94 | null;
  attempt(save: SaveGame, current: ShipProgressionState, allowed?: boolean): ShipTrainingAttemptV94;
}
export const SHIP_TRAINING_RECOVERY_MAX_BYTES_V94 = 2_000_000;
export interface ShipTrainingRecoveryCopyV94 {
  format: "yautja-ship-training-recovery";
  version: 1;
  id: string;
  owner: string;
  disciplineId: TrainingDisciplineId;
  score: number;
  completedAt: string;
  clock: string;
  baseline: string;
  observed: boolean;
  before: string | null;
  attempted: ShipProgressionState | null;
  unknownWrite: boolean;
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const browserIO: ShipTrainingIOV94 = {
  storage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } },
  write: (state, save, storage) => writeShipProgressionWithStatus(state, save, storage as Storage),
};

/** One completed attempt, not a second source of campaign truth. This receipt
 * can be copied to the independent recovery journal. It does not make legacy sidecar writers atomic
 * across tabs. Never count a failed write twice, or replay an ambiguous writer. */
export function createShipTrainingReceiptV94(
  save: SaveGame, base: ShipProgressionState, disciplineId: TrainingDisciplineId,
  score: number, io: ShipTrainingIOV94 = browserIO, completedAt = new Date().toISOString(),
): ShipTrainingReceiptV94 | null {
  if (!Object.hasOwn(TRAINING_LABELS, disciplineId) || !Number.isInteger(score) || score < 0 || score > 100 ||
      base.ownerSaveCreatedAt !== save.createdAt || !Number.isFinite(Date.parse(completedAt))) return null;
  // A fixed comparison clock ignores only the outer UI clock, not progress.
  const clock = save.updatedAt;
  let baseline: string, candidate: ShipProgressionState;
  try {
    baseline = JSON.stringify(synchronizeShipProgression(base, save, clock));
    candidate = synchronizeShipProgression(recordTrainingResult(copy(base), disciplineId, score, completedAt), save, completedAt);
    if (!validateCanonicalShipProgression(candidate, save)) return null;
  } catch { return null; }
  return receiptFromPlan(save, disciplineId, score, completedAt, clock, baseline, candidate, io);
}

/** Rebuild only the one authored score operation. Future/corrupt copies and a
 * different owner are protected, never used as a campaign import. No IO here. */
export function restoreShipTrainingReceiptV94(
  raw: string, save: SaveGame, io: ShipTrainingIOV94 = browserIO,
): ShipTrainingReceiptV94 | null {
  if (typeof raw !== "string" || raw.length > SHIP_TRAINING_RECOVERY_MAX_BYTES_V94 ||
      new TextEncoder().encode(raw).byteLength > SHIP_TRAINING_RECOVERY_MAX_BYTES_V94) return null;
  try {
    const v: ShipTrainingRecoveryCopyV94 = JSON.parse(raw);
    if (!v || v.format !== "yautja-ship-training-recovery" || v.version !== 1 ||
        typeof v.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id) ||
        v.owner !== save.createdAt || !Object.hasOwn(TRAINING_LABELS, v.disciplineId) ||
        !Number.isInteger(v.score) || v.score < 0 || v.score > 100 ||
        typeof v.completedAt !== "string" || !Number.isFinite(Date.parse(v.completedAt)) ||
        typeof v.clock !== "string" || !Number.isFinite(Date.parse(v.clock)) ||
        typeof v.baseline !== "string" || typeof v.observed !== "boolean" ||
        (v.before !== null && typeof v.before !== "string") || typeof v.unknownWrite !== "boolean" ||
        (!v.observed && v.before !== null)) return null;
    const base = validateCanonicalShipProgression(JSON.parse(v.baseline), save);
    if (!base || JSON.stringify(synchronizeShipProgression(base, save, v.clock)) !== v.baseline) return null;
    const candidate = synchronizeShipProgression(recordTrainingResult(base, v.disciplineId, v.score, v.completedAt), save, v.completedAt);
    if (!validateCanonicalShipProgression(candidate, save)) return null;
    if (v.observed) {
      const stored = v.before === null ? createDefaultShipProgression(save, v.clock)
        : validateCanonicalShipProgression(JSON.parse(v.before), save);
      if (!stored || JSON.stringify(synchronizeShipProgression(stored, save, v.clock)) !== v.baseline) return null;
    }
    if (v.attempted !== null) {
      const attempted = validateCanonicalShipProgression(v.attempted, save);
      if (!v.observed || !attempted || JSON.stringify(synchronizeShipProgression(attempted, save, v.completedAt)) !== JSON.stringify(candidate)) return null;
    }
    return receiptFromPlan(save, v.disciplineId, v.score, v.completedAt, v.clock, v.baseline, candidate, io, v);
  } catch { return null; }
}

function receiptFromPlan(
  save: SaveGame, disciplineId: TrainingDisciplineId, score: number, completedAt: string,
  clock: string, baseline: string, candidate: ShipProgressionState, io: ShipTrainingIOV94,
  restored?: ShipTrainingRecoveryCopyV94,
): ShipTrainingReceiptV94 {
  const owner = save.createdAt;
  let id = restored?.id ?? "";
  try { if (!id) id = globalThis.crypto.randomUUID(); } catch { /* Memory receipt still works without persistent recovery. */ }
  let before: string | null | undefined = restored?.observed ? restored.before : undefined;
  let attempted: ShipProgressionState | null = restored?.attempted ? copy(restored.attempted) : null;
  let busy = false, delivered = false, unknownWrite = restored?.unknownWrite ?? false;
  const pending = (message: string): ShipTrainingAttemptV94 => ({ status: "pending", message });
  const conflict = () => pending("La progression du vaisseau a changé. Le score reste en mémoire ; aucune ancienne archive n’a été réécrite.");
  return {
    owner, disciplineId, score,
    recoveryCopy() {
      if (delivered || !id) return null;
      return copy({ format: "yautja-ship-training-recovery", version: 1, id, owner, disciplineId, score,
        completedAt, clock, baseline, observed: before !== undefined, before: before ?? null, attempted, unknownWrite });
    },
    attempt(currentSave, current, allowed = true) {
      if (busy || delivered) return { status: "ignored" };
      if (!allowed) return pending("Score en mémoire : enregistrement suspendu. Réessayez après la reprise.");
      if (currentSave.createdAt !== owner || current.ownerSaveCreatedAt !== owner) return conflict();
      busy = true;
      try {
        const currentBaseline = JSON.stringify(synchronizeShipProgression(current, currentSave, clock));
        // A recovered receipt may be left behind after a successful write and a
        // crash before journal cleanup. Accept only its exact semantic result,
        // never re-apply it to a newer progression or increment another attempt.
        const recoverAlreadyApplied = !!restored && !!attempted &&
          JSON.stringify(synchronizeShipProgression(current, currentSave, completedAt)) === JSON.stringify(candidate);
        if (currentBaseline !== baseline && !recoverAlreadyApplied) return conflict();
        const storage = io.storage();
        if (!storage) return pending("Stockage indisponible. Score en mémoire, non sauvegardé. Réessayez avant de quitter le vaisseau.");
        if (archiveTransferPending(storage as Storage)) return pending("Un transfert protège les archives. Score en mémoire ; réessayez après sa clôture.");
        const primary = storage.getItem(SAVE_STORAGE_KEY);
        if (primary !== null) {
          const parsed = parseSaveImport(primary).save;
          if (!parsed || parsed.createdAt !== owner) return conflict();
        }
        const raw = storage.getItem(SHIP_PROGRESSION_STORAGE_KEY);
        if (recoverAlreadyApplied && raw !== null) {
          const stored = validateCanonicalShipProgression(JSON.parse(raw), currentSave);
          if (!stored || JSON.stringify(synchronizeShipProgression(stored, currentSave, completedAt)) !== JSON.stringify(candidate)) return conflict();
          delivered = true;
          return { status: "confirmed", state: copy(stored) };
        }
        // Exact acknowledgement after a write-before-throw/readback failure.
        if (attempted && raw === JSON.stringify(attempted)) {
          delivered = true;
          return { status: "confirmed", state: copy(attempted) };
        }
        if (unknownWrite) return pending("Transmission incertaine. Aucun renvoi automatique du score ; conservez cette session pour vérifier la sauvegarde.");
        if (before === undefined) {
          const stored = raw === null ? createDefaultShipProgression(currentSave, clock)
            : validateCanonicalShipProgression(JSON.parse(raw), currentSave);
          if (!stored || JSON.stringify(synchronizeShipProgression(stored, currentSave, clock)) !== baseline) return conflict();
          before = raw;
        }
        if (raw !== before) return conflict();
        // Recheck after validation and before entering the existing guarded writer.
        if (archiveTransferPending(storage as Storage) || storage.getItem(SHIP_PROGRESSION_STORAGE_KEY) !== before) return conflict();
        let result: ShipProgressionWriteResult;
        try { result = io.write(copy(candidate), currentSave, storage); }
        catch { unknownWrite = true; return pending("Transmission incertaine. Aucun renvoi automatique du score ; conservez cette session pour vérifier la sauvegarde."); }
        attempted = copy(result.state);
        if (result.persisted && storage.getItem(SHIP_PROGRESSION_STORAGE_KEY) === JSON.stringify(attempted)) {
          delivered = true;
          return { status: "confirmed", state: copy(attempted) };
        }
        return pending("Score en mémoire, sauvegarde non confirmée. Réessayez sans recommencer l’épreuve, avant de quitter le vaisseau.");
      } catch {
        return pending("Lecture ou écriture non confirmée. Le score reste en mémoire ; réessayez sans recommencer l’épreuve.");
      } finally { busy = false; }
    },
  };
}
