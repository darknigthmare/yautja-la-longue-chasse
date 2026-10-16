import { reconcileSaveWrite, writeSaveWithStatus, type SaveWriteFailure, type SaveWriteReconciliation, type SaveWriteResult } from "../save";
import type { SaveGame } from "../types";
import { TROPHY_WORKSHOP_ACTIONS, type TrophyWorkshopAction, type TrophyWorkshopResult } from "./trophyWorkshop";

export interface TrophyWorkshopTargetV94 { trophyId: string; trophyName: string; action: TrophyWorkshopAction }
export interface TrophyWorkshopCommitIOV94 {
  write: (save: SaveGame) => SaveWriteResult;
  reconcile: (attempt: SaveWriteResult, owner: string) => SaveWriteReconciliation;
}
export type TrophyWorkshopCommitOutcomeV94 =
  | { status: "confirmed"; save: SaveGame }
  | { status: "pending"; failure: SaveWriteFailure }
  | { status: "ignored" };
export interface TrophyWorkshopCommitV94 {
  readonly target: Readonly<TrophyWorkshopTargetV94>;
  readonly grade: TrophyWorkshopResult["grade"];
  candidate: () => SaveGame;
  run: (current: SaveGame, allowed: boolean) => TrophyWorkshopCommitOutcomeV94;
}
const order: readonly TrophyWorkshopAction[] = ["clean", "prepare", "display", "rite"];

/** A successful gesture sequence creates one immutable write intent. Retrying
 * reconciles that exact attempt, never replays the rite or rebuilds its date.
 * The caller keeps unconfirmed progress out of its authoritative SaveGame. */
export function createTrophyWorkshopCommitV94(
  base: SaveGame, target: TrophyWorkshopTargetV94, result: TrophyWorkshopResult,
  io: TrophyWorkshopCommitIOV94 = { write: writeSaveWithStatus, reconcile: reconcileSaveWrite },
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
  const before = JSON.stringify(base);
  const intended = JSON.stringify({ ...base, trophies: base.trophies.map(trophy => trophy.id !== target.trophyId ? trophy : {
    ...trophy, workshop: {
      completedActions: [...new Set([...(trophy.workshop?.completedActions ?? []), target.action])],
      bestScore: Math.max(trophy.workshop?.bestScore ?? 0, result.score),
      lastCompletedAt: completedAt,
    },
  }) });
  const owner = base.createdAt;
  let attempt: SaveWriteResult | null = null, busy = false, delivered = false, uncertainException = false;
  const pending = (failure: SaveWriteFailure): TrophyWorkshopCommitOutcomeV94 => ({ status: "pending", failure });
  return Object.freeze({
    target: Object.freeze({ ...target }), grade: result.grade,
    candidate: () => JSON.parse(intended) as SaveGame,
    run(current: SaveGame, allowed: boolean): TrophyWorkshopCommitOutcomeV94 {
      if (busy || delivered) return { status: "ignored" };
      if (!allowed) return pending("protected-save");
      if (current.createdAt !== owner || JSON.stringify(current) !== before) return pending("save-conflict");
      if (uncertainException) return pending("write-failed");
      busy = true;
      try {
        if (attempt?.failure === "write-failed") {
          const reconciled = io.reconcile(attempt, owner);
          if (reconciled.status === "refused") return pending(reconciled.failure);
          if (reconciled.status === "confirmed") {
            delivered = true; return { status: "confirmed", save: reconciled.save };
          }
          attempt = null;
        }
        attempt = io.write(JSON.parse(intended) as SaveGame);
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
