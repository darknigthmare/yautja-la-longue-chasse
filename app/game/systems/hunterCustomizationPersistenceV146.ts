/**
 * V146: owner-bound, durable customisation change (same contract as V116):
 * the caller updates React state only after this write is confirmed.
 */
import type { SaveGame } from "../types";
import type { SaveWriteFailure, SaveWriteResult, SaveWriteReconciliation } from "../save";
import type { HunterPieceIdV146 } from "../hunterPiecesV146";
import { normalizeHarvestInventoryV112, type HarvestInventoryV112 } from "./harvestInventoryV112";
import { payRepairFromArchiveV146, repairCostV146, repairPieceV146 } from "./hunterCustomizationV146";

type ArchivedMaterialV146 = HarvestInventoryV112["archive"][number];

export const forgeMaterialKeyV146 = ({ speciesId, partId }: ArchivedMaterialV146): string =>
  JSON.stringify([speciesId, partId]);

export interface ForgeRepairQuoteV146 {
  materialKey: string | null;
  cost: number;
  units: ReadonlyArray<ArchivedMaterialV146 & { consumed: number }>;
}

/** Use the same debit and quality rounding for the preview and the write. */
export function planForgeRepairMaterialsV146(
  archive: readonly ArchivedMaterialV146[], cost: number, materialKey: string | null = null,
): { archive: ArchivedMaterialV146[]; quote: ForgeRepairQuoteV146 } | null {
  if (!Number.isSafeInteger(cost) || cost <= 0) return null;
  const material = materialKey === null ? archive : archive.filter(entry => forgeMaterialKeyV146(entry) === materialKey);
  const paid = payRepairFromArchiveV146(material, cost);
  if (!paid) return null;

  const remaining = new Map(paid.map(entry => [forgeMaterialKeyV146(entry), entry]));
  const units: Array<ArchivedMaterialV146 & { consumed: number }> = [];
  const retained = archive.flatMap(entry => {
    const key = forgeMaterialKeyV146(entry);
    if (materialKey !== null && key !== materialKey) return [entry];
    const rest = remaining.get(key);
    const consumed = entry.count - (rest?.count ?? 0);
    if (consumed > 0) units.push({ ...entry, consumed });
    return rest ? [rest] : [];
  });
  return { archive: retained, quote: { materialKey, cost, units } };
}

/** Confirm the damage, stock and exact notified debit against the durable campaign. */
export function applyHunterForgeRepairV146(
  current: SaveGame, piece: HunterPieceIdV146, expectedLevel: number, expectedQuote?: ForgeRepairQuoteV146,
): SaveGame | null {
  const customization = current.customizationV146;
  if (!customization || !Number.isInteger(expectedLevel) || expectedLevel < 1 || expectedLevel > 3 ||
      customization.heavyWear[piece] !== expectedLevel) return null;
  const harvest = normalizeHarvestInventoryV112(current.inventory.harvestV112);
  if (!harvest) return null;
  const payment = planForgeRepairMaterialsV146(harvest.archive, repairCostV146(customization, piece), expectedQuote?.materialKey);
  if (!payment || (expectedQuote && JSON.stringify(payment.quote) !== JSON.stringify(expectedQuote))) return null;
  return {
    ...current,
    inventory: { ...current.inventory, harvestV112: { ...harvest, archive: payment.archive } },
    customizationV146: repairPieceV146(customization, piece),
  };
}

export type HunterCustomizationCommitV146 =
  | { readonly ok: true; readonly save: SaveGame; readonly recovered: boolean }
  | { readonly ok: false; readonly failure: SaveWriteFailure | "refused" };

export function commitHunterCustomizationV146(input: {
  current: SaveGame;
  expectedOwnerCreatedAt: string;
  /** Pure change; returning null refuses it (e.g. not enough materials). */
  apply: (current: SaveGame) => SaveGame | null;
  write: (next: SaveGame) => SaveWriteResult;
  reconcile: (attempt: SaveWriteResult, owner: string) => SaveWriteReconciliation;
}): HunterCustomizationCommitV146 {
  const { current, expectedOwnerCreatedAt, apply, write, reconcile } = input;
  const refuse = (failure: SaveWriteFailure | "refused"): HunterCustomizationCommitV146 => ({ ok: false, failure });
  if (current.createdAt !== expectedOwnerCreatedAt) return refuse("save-conflict");
  let next: SaveGame | null;
  try { next = apply(current); } catch { return refuse("refused"); }
  if (!next || next.createdAt !== expectedOwnerCreatedAt) return refuse("refused");
  let attempt: SaveWriteResult;
  try { attempt = write(next); } catch { return refuse("write-failed"); }
  if (!attempt?.save || attempt.save.createdAt !== expectedOwnerCreatedAt) return refuse("save-conflict");
  if (attempt.persisted && !attempt.failure) return { ok: true, save: attempt.save, recovered: false };
  if (attempt.failure !== "write-failed") return refuse(attempt.failure ?? "write-failed");
  try {
    const recovered = reconcile(attempt, expectedOwnerCreatedAt);
    if (recovered.status === "confirmed" && recovered.save.createdAt === expectedOwnerCreatedAt)
      return { ok: true, save: recovered.save, recovered: true };
    return refuse(recovered.status === "refused" ? recovered.failure : "write-failed");
  } catch { return refuse("read-failed"); }
}
