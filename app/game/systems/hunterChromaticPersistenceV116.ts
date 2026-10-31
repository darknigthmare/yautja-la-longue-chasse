/**
 * V116: owner-bound, durable chromatic change. Rendering reads only an approved
 * save; the caller must update React state AFTER this operation confirms.
 */
import { normalizeHunterChromaticsV113, maskOriginForCustomizationV135,
  type HunterChromaticsV113 } from "../hunterChromaticsV113.ts";
import type { SaveGame } from "../types";
import type { SaveWriteFailure, SaveWriteResult, SaveWriteReconciliation } from "../save";

export type HunterChromaticCommitV116 =
  | { readonly ok: true; readonly save: SaveGame; readonly recovered: boolean }
  | { readonly ok: false; readonly failure: SaveWriteFailure };

export function commitHunterChromaticsV116(input: {
  current: SaveGame;
  expectedOwnerCreatedAt: string;
  draft: HunterChromaticsV113;
  write: (next: SaveGame) => SaveWriteResult;
  reconcile: (attempt: SaveWriteResult, owner: string) => SaveWriteReconciliation;
}): HunterChromaticCommitV116 {
  const { current, expectedOwnerCreatedAt, draft, write, reconcile } = input;
  const refuse = (failure: SaveWriteFailure): HunterChromaticCommitV116 => ({ ok: false, failure });
  if (current.createdAt !== expectedOwnerCreatedAt) return refuse("save-conflict");
  const approved = normalizeHunterChromaticsV113(draft);
  // The caller may change colors, but cannot grant an Alpha/Samurai-only
  // biomask by forging draft.maskOriginId. Use the last durable owner record.
  approved.maskOriginId = maskOriginForCustomizationV135(current.appearance);
  const next: SaveGame = {
    ...current,
    appearance: { ...current.appearance, presetId: "custom",
      chromaticsV113: approved },
  };
  let attempt: SaveWriteResult;
  try { attempt = write(next); }
  catch { return refuse("write-failed"); }
  if (!attempt?.save || attempt.save.createdAt !== expectedOwnerCreatedAt) return refuse("save-conflict");
  if (attempt.persisted && !attempt.failure) return { ok: true, save: attempt.save, recovered: false };
  if (attempt.failure !== "write-failed") return refuse(attempt.failure ?? "write-failed");
  // Readback might fail after setItem succeeded. Only the existing receipt of
  // these exact bytes and owner can confirm an ambiguous original write.
  try {
    const recovered = reconcile(attempt, expectedOwnerCreatedAt);
    if (recovered.status === "confirmed" && recovered.save.createdAt === expectedOwnerCreatedAt)
      return { ok: true, save: recovered.save, recovered: true };
    return refuse(recovered.status === "refused" ? recovered.failure : "write-failed");
  } catch { return refuse("read-failed"); }
}
