import { parseSaveImport, SAVE_STORAGE_KEY, SAVE_MAX_SERIALIZED_BYTES, reconcileSaveWrite, writeSaveWithStatus, type SaveWriteFailure, type SaveWriteReconciliation, type SaveWriteResult } from "../save";
import { archiveTransferPending } from "./archiveTransferGuard";
import type { SaveGame } from "../types";
import { TROPHY_WORKSHOP_ACTIONS, type TrophyWorkshopAction, type TrophyWorkshopResult } from "./trophyWorkshop";

export interface TrophyWorkshopTargetV94 { trophyId: string; trophyName: string; action: TrophyWorkshopAction }
export interface TrophyWorkshopCommitIOV94 {
  write: (save: SaveGame) => SaveWriteResult;
  reconcile: (attempt: SaveWriteResult, owner: string) => SaveWriteReconciliation;
  /** Read-only inspection on explicit recovery, not a fabricated writer receipt. */
  readForRecovery?: () => { save: SaveGame | null; failure: SaveWriteFailure | null };
  recoveryAllowed?: () => boolean;
}
export type TrophyWorkshopCommitOutcomeV94 =
  | { status: "confirmed"; save: SaveGame }
  | { status: "pending"; failure: SaveWriteFailure }
  | { status: "ignored" };
export interface TrophyWorkshopCommitV94 {
  readonly target: Readonly<TrophyWorkshopTargetV94>;
  readonly grade: TrophyWorkshopResult["grade"];
  candidate: () => SaveGame;
  recoveryCopy: () => TrophyWorkshopRecoveryCopyV94 | null;
  run: (current: SaveGame, allowed: boolean) => TrophyWorkshopCommitOutcomeV94;
}
const order: readonly TrophyWorkshopAction[] = ["clean", "prepare", "display", "rite"];

export const TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94 = 4 * SAVE_MAX_SERIALIZED_BYTES;
export interface TrophyWorkshopRecoveryCopyV94 {
  format: "yautja-trophy-workshop-recovery";
  version: 1;
  id: string;
  owner: string;
  base: string;
  target: TrophyWorkshopTargetV94;
  result: TrophyWorkshopResult;
  completedAt: string;
  attempted: SaveGame | null;
  uncertainException: boolean;
}
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const defaultIO: TrophyWorkshopCommitIOV94 = {
  write: writeSaveWithStatus, reconcile: reconcileSaveWrite,
  readForRecovery: () => {
    // Unlike loadSaveWithStatus, this inspection NEVER changes the writer’s
    // observed preimage when it encounters a newer/different campaign.
    try {
      if (typeof window === "undefined") return { save: null, failure: "storage-unavailable" };
      const storage = window.localStorage;
      if (archiveTransferPending(storage)) return { save: null, failure: "protected-save" };
      const raw = storage.getItem(SAVE_STORAGE_KEY);
      if (raw === null) return { save: null, failure: "save-conflict" };
      const parsed = parseSaveImport(raw);
      return parsed.save ? { save: parsed.save, failure: null } : { save: null, failure: "protected-save" };
    } catch { return { save: null, failure: "read-failed" }; }
  },
  recoveryAllowed: () => {
    try { return typeof window !== "undefined" && !archiveTransferPending(window.localStorage); }
    catch { return false; }
  },
};
/** Only the outer write timestamp may differ after a successful retry. Every
 * other campaign field, including the rite date and score, must match exactly. */
function recoveryIdentity(save: SaveGame): string | null {
  const parsed = parseSaveImport(JSON.stringify(save));
  return parsed.save ? JSON.stringify({ ...parsed.save, updatedAt: parsed.save.createdAt }) : null;
}

/** Decode only a bounded, versioned, single-rite operation. No reads or writes
 * occur during restoration, and no WeakMap save receipt is forged. */
export function restoreTrophyWorkshopCommitV94(
  raw: string, current: SaveGame, io: TrophyWorkshopCommitIOV94 = defaultIO,
): TrophyWorkshopCommitV94 | null {
  if (typeof raw !== "string" || raw.length > TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94 ||
      new TextEncoder().encode(raw).byteLength > TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94) return null;
  try {
    const value: TrophyWorkshopRecoveryCopyV94 = JSON.parse(raw);
    if (!value || value.format !== "yautja-trophy-workshop-recovery" || value.version !== 1 ||
        value.owner !== current.createdAt || typeof value.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id) ||
        typeof value.base !== "string" || typeof value.completedAt !== "string" ||
        !Number.isFinite(Date.parse(value.completedAt)) || typeof value.uncertainException !== "boolean" ||
        !value.target || typeof value.target.trophyId !== "string" || value.target.trophyId.length > 256 ||
        typeof value.target.trophyName !== "string" || value.target.trophyName.length > 256 || !value.result) return null;
    const parsed = parseSaveImport(value.base);
    if (!parsed.save || parsed.save.createdAt !== value.owner || JSON.stringify(parsed.save) !== value.base) return null;
    const plan = createTrophyWorkshopCommitV94(parsed.save, value.target, value.result, io, value.completedAt);
    if (!plan) return null;
    if (value.attempted !== null && (!value.attempted ||
        typeof value.attempted.updatedAt !== "string" || !Number.isFinite(Date.parse(value.attempted.updatedAt)) ||
        recoveryIdentity(value.attempted) !== recoveryIdentity(plan.candidate()))) return null;
    return commitFromPlan(parsed.save, value.target, value.result, io, value.completedAt, value);
  } catch { return null; }
}


/** A successful gesture sequence creates one immutable write intent. Retrying
 * reconciles that exact attempt, never replays the rite or rebuilds its date.
 * The caller keeps unconfirmed progress out of its authoritative SaveGame. */
export function createTrophyWorkshopCommitV94(
  base: SaveGame, target: TrophyWorkshopTargetV94, result: TrophyWorkshopResult,
  io: TrophyWorkshopCommitIOV94 = defaultIO,
  completedAt = new Date().toISOString(),
): TrophyWorkshopCommitV94 | null {
  const index = order.indexOf(target.action);
  const config = TROPHY_WORKSHOP_ACTIONS[target.action];
  if (index < 0 || !config || result.action !== target.action || !Number.isFinite(Date.parse(completedAt)) ||
      !Number.isSafeInteger(result.score) || result.score < 0 || result.score > config.cueCount * 100 ||
      !Number.isSafeInteger(result.mistakes) || result.mistakes < 0 || result.mistakes >= config.maximumMistakes ||
      !Number.isFinite(result.accuracy) || result.accuracy < 0 || result.accuracy > 1 ||
      !Number.isFinite(result.elapsedSeconds) || result.elapsedSeconds < 0 ||
      !["worthy", "blooded", "elite", "flawless"].includes(result.grade)) return null;
  const matches = base.trophies.filter(trophy => trophy.id === target.trophyId);
  if (matches.length !== 1 || (index > 0 && !matches[0].workshop?.completedActions.includes(order[index - 1]))) return null;
  return commitFromPlan(base, target, result, io, completedAt);
}

function commitFromPlan(
  base: SaveGame, target: TrophyWorkshopTargetV94, result: TrophyWorkshopResult,
  io: TrophyWorkshopCommitIOV94, completedAt: string, restored?: TrophyWorkshopRecoveryCopyV94,
): TrophyWorkshopCommitV94 {
  // Clone caller-owned result/target before any asynchronous journal operation.
  target = copy(target); result = copy(result);
  const before = JSON.stringify(base);
  const intended = JSON.stringify({ ...base, trophies: base.trophies.map(trophy => trophy.id !== target.trophyId ? trophy : {
    ...trophy, workshop: {
      completedActions: [...new Set([...(trophy.workshop?.completedActions ?? []), target.action])],
      bestScore: Math.max(trophy.workshop?.bestScore ?? 0, result.score),
      lastCompletedAt: completedAt,
    },
  }) });
  const owner = base.createdAt;
  let id = restored?.id ?? "";
  try { if (!id) id = globalThis.crypto.randomUUID(); } catch { /* Memory-only result remains retryable. */ }
  let attempt: SaveWriteResult | null = null, busy = false, delivered = false;
  let uncertainException = restored?.uncertainException ?? false;
  let attemptedSnapshot: SaveGame | null = restored?.attempted ? copy(restored.attempted) : null;
  const recovered = !!restored;
  const baseIdentity = recoveryIdentity(base);
  const intendedIdentity = recoveryIdentity(JSON.parse(intended) as SaveGame);
  const pending = (failure: SaveWriteFailure): TrophyWorkshopCommitOutcomeV94 => ({ status: "pending", failure });
  return Object.freeze({
    target: Object.freeze({ ...target }), grade: result.grade,
    candidate: () => JSON.parse(intended) as SaveGame,
    recoveryCopy() {
      if (delivered || !id || !baseIdentity || !intendedIdentity) return null;
      const snapshot: TrophyWorkshopRecoveryCopyV94 = { format: "yautja-trophy-workshop-recovery", version: 1,
        id, owner, base: before, target: copy(target), result: copy(result), completedAt,
        attempted: copy(attemptedSnapshot), uncertainException };
      const raw = JSON.stringify(snapshot);
      return new TextEncoder().encode(raw).byteLength <= TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94 ? snapshot : null;
    },
    run(current: SaveGame, allowed: boolean): TrophyWorkshopCommitOutcomeV94 {
      if (busy || delivered) return { status: "ignored" };
      if (!allowed) return pending("protected-save");
      if (current.createdAt !== owner || (!recovered && JSON.stringify(current) !== before)) return pending("save-conflict");
      if (uncertainException) return pending("write-failed");
      busy = true;
      try {
        if (recovered) {
          if (!io.readForRecovery || !io.recoveryAllowed?.()) return pending("protected-save");
          const liveIdentity = recoveryIdentity(current);
          if (!liveIdentity || (liveIdentity !== baseIdentity && liveIdentity !== intendedIdentity)) return pending("save-conflict");
          let loaded: { save: SaveGame | null; failure: SaveWriteFailure | null };
          try { loaded = io.readForRecovery(); } catch { return pending("read-failed"); }
          if (!io.recoveryAllowed()) return pending("protected-save");
          if (loaded.failure) return pending(loaded.failure);
          if (!loaded.save || loaded.save.createdAt !== owner) return pending("save-conflict");
          const diskIdentity = recoveryIdentity(loaded.save);
          if (attemptedSnapshot && diskIdentity === intendedIdentity) {
            delivered = true; return { status: "confirmed", save: copy(loaded.save) };
          }
          if (liveIdentity !== baseIdentity || diskIdentity !== baseIdentity) return pending("save-conflict");
          // An old serialized failure is never passed to reconcileSaveWrite.
          // A new write below creates its own authentic, in-session receipt.
          // Keep recovery identity rules for subsequent explicit retries too;
          // loading a save may have normalized only its outer timestamp.
        }
        if (attempt?.failure === "write-failed") {
          const reconciled = io.reconcile(attempt, owner);
          if (reconciled.status === "refused") return pending(reconciled.failure);
          if (reconciled.status === "confirmed") {
            delivered = true; return { status: "confirmed", save: reconciled.save };
          }
          attempt = null;
        }
        attempt = io.write(JSON.parse(intended) as SaveGame);
        attemptedSnapshot = copy(attempt.save);
        if (!attempt.persisted) return pending(attempt.failure ?? "write-failed");
        delivered = true;
        return { status: "confirmed", save: attempt.save };
      } catch {
        // An injected/custom receiver might have written before throwing and
        // supplied no authentic receipt. Preserve the export, never guess retry.
        uncertainException = true; return pending("write-failed");
      } finally { busy = false; }
    },
  });
}
