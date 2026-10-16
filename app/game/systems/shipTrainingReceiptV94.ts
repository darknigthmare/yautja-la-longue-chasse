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
  attempt(save: SaveGame, current: ShipProgressionState, allowed?: boolean): ShipTrainingAttemptV94;
}
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const browserIO: ShipTrainingIOV94 = {
  storage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } },
  write: (state, save, storage) => writeShipProgressionWithStatus(state, save, storage as Storage),
};

/** One completed attempt, not a second source of campaign truth. This receipt
 * lives in the open ShipHub only. It does not make legacy sidecar writers atomic
 * across tabs. Never count a failed write twice, or replay an ambiguous writer. */
export function createShipTrainingReceiptV94(
  save: SaveGame, base: ShipProgressionState, disciplineId: TrainingDisciplineId,
  score: number, io: ShipTrainingIOV94 = browserIO, completedAt = new Date().toISOString(),
): ShipTrainingReceiptV94 | null {
  if (!Object.hasOwn(TRAINING_LABELS, disciplineId) || !Number.isInteger(score) || score < 0 || score > 100 ||
      base.ownerSaveCreatedAt !== save.createdAt || !Number.isFinite(Date.parse(completedAt))) return null;
  const owner = save.createdAt;
  // A fixed comparison clock ignores only the outer UI clock, not progress.
  const clock = save.updatedAt;
  let baseline: string, candidate: ShipProgressionState;
  try {
    baseline = JSON.stringify(synchronizeShipProgression(base, save, clock));
    candidate = synchronizeShipProgression(recordTrainingResult(copy(base), disciplineId, score, completedAt), save, completedAt);
    if (!validateCanonicalShipProgression(candidate, save)) return null;
  } catch { return null; }
  let before: string | null | undefined;
  let attempted: ShipProgressionState | null = null;
  let busy = false, delivered = false, unknownWrite = false;
  const pending = (message: string): ShipTrainingAttemptV94 => ({ status: "pending", message });
  const conflict = () => pending("La progression du vaisseau a changé. Le score reste en mémoire ; aucune ancienne archive n’a été réécrite.");
  return {
    owner, disciplineId, score,
    attempt(currentSave, current, allowed = true) {
      if (busy || delivered) return { status: "ignored" };
      if (!allowed) return pending("Score en mémoire : enregistrement suspendu. Réessayez après la reprise.");
      if (currentSave.createdAt !== owner || current.ownerSaveCreatedAt !== owner) return conflict();
      busy = true;
      try {
        if (JSON.stringify(synchronizeShipProgression(current, currentSave, clock)) !== baseline) return conflict();
        const storage = io.storage();
        if (!storage) return pending("Stockage indisponible. Score en mémoire, non sauvegardé. Réessayez avant de quitter le vaisseau.");
        if (archiveTransferPending(storage as Storage)) return pending("Un transfert protège les archives. Score en mémoire ; réessayez après sa clôture.");
        const primary = storage.getItem(SAVE_STORAGE_KEY);
        if (primary !== null) {
          const parsed = parseSaveImport(primary).save;
          if (!parsed || parsed.createdAt !== owner) return conflict();
        }
        const raw = storage.getItem(SHIP_PROGRESSION_STORAGE_KEY);
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
