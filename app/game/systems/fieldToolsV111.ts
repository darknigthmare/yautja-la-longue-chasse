import type {FieldToolId, PlayerInventory, SaveGame} from "../types";

/** Original balance values. Permanent tools have no charges or active gear slot. */
export const FIELD_TOOLS_V111 = Object.freeze([Object.freeze({
  id: "flaying-tool" as const,
  name: "Flaying Tool",
  description: "Outil de dépeçage distinct des lames de poignet. Permet de préparer une proie réellement vaincue ; le geste reste interruptible.",
  clanMarkCost: 120,
})]);

export function normalizeFieldToolIdsV111(raw: unknown): FieldToolId[] {
  return Array.isArray(raw) && raw.includes("flaying-tool") ? ["flaying-tool"] : [];
}

export function ownsFieldToolV111(inventory: Pick<PlayerInventory, "fieldToolIds">, id: FieldToolId): boolean {
  return normalizeFieldToolIdsV111(inventory.fieldToolIds).includes(id);
}

export type FieldToolPurchaseFailureV111 = "unknown-tool" | "already-owned" | "invalid-balance" | "insufficient-clan-marks";
export interface FieldToolQuoteV111 {
  id: string;
  cost: number | null;
  availableClanMarks: number;
  owned: boolean;
  canPurchase: boolean;
  failure: FieldToolPurchaseFailureV111 | null;
}
export function quoteFieldToolV111(save: SaveGame, id: string): FieldToolQuoteV111 {
  const tool = FIELD_TOOLS_V111.find(candidate => candidate.id === id);
  const balance = save.profile.clanMarks;
  const validBalance = Number.isSafeInteger(balance) && balance >= 0;
  const owned = !!tool && ownsFieldToolV111(save.inventory, tool.id);
  const failure: FieldToolPurchaseFailureV111 | null = !tool ? "unknown-tool" : owned ? "already-owned" :
    !validBalance ? "invalid-balance" : balance < tool.clanMarkCost ? "insufficient-clan-marks" : null;
  return {id, cost: tool?.clanMarkCost ?? null, availableClanMarks: validBalance ? balance : 0, owned, canPurchase: failure === null, failure};
}
/** Pure purchase; GameClient owns durable writes and their acknowledgement. */
export function purchaseFieldToolV111(save: SaveGame, id: string): {ok: boolean; save: SaveGame; quote: FieldToolQuoteV111; spentClanMarks: number} {
  const quote = quoteFieldToolV111(save, id);
  if (!quote.canPurchase || quote.cost === null) return {ok: false, save, quote, spentClanMarks: 0};
  return {ok: true, quote, spentClanMarks: quote.cost, save: {
    ...save,
    profile: {...save.profile, clanMarks: save.profile.clanMarks - quote.cost},
    inventory: {...save.inventory, fieldToolIds: ["flaying-tool"]},
  }};
}
