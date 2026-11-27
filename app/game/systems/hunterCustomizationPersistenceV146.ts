/**
 * V146: owner-bound, durable customisation change (same contract as V116):
 * the caller updates React state only after this write is confirmed.
 */
import type { ArmorId, SaveGame, UpgradeLevel, WeaponId } from "../types";
import type { SaveWriteFailure, SaveWriteResult, SaveWriteReconciliation } from "../save";
import type { HunterPieceIdV146 } from "../hunterPiecesV146";
import { normalizeHarvestInventoryV112, type HarvestInventoryV112 } from "./harvestInventoryV112";
import { payRepairFromArchiveV146, repairCostV146, repairPieceV146 } from "./hunterCustomizationV146";
import { quoteUpgrade } from "./arsenal";
import { ownsFieldToolV111 } from "./fieldToolsV111";

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


const ARMOR_RECIPE_V146 = {
  1: { bone: 2, hide: 1 },
  2: { bone: 3, hide: 2 },
} as const;

type ForgeArmorMaterialSelectionV146 = Readonly<{ bone: string; hide: string }>;

interface ForgeArmorRecipeV146 {
  armorId: ArmorId;
  currentLevel: UpgradeLevel;
  nextLevel: 1 | 2;
  requirements: Readonly<{ bone: number; hide: number }>;
}

export interface ForgeArmorQuoteV146 extends ForgeArmorRecipeV146 {
  selection: ForgeArmorMaterialSelectionV146;
  units: ForgeRepairQuoteV146["units"];
}

/** Both paths to an armor level use the native unlock and level limits. */
export function forgeArmorRecipeV146(save: SaveGame): ForgeArmorRecipeV146 | null {
  const armorId = save.loadout.armorId;
  const equipment = quoteUpgrade(save, { domain: "armor", id: armorId });
  const { currentLevel, nextLevel } = equipment;
  if (!equipment.unlocked || (nextLevel !== 1 && nextLevel !== 2)) return null;
  return { armorId, currentLevel, nextLevel, requirements: ARMOR_RECIPE_V146[nextLevel] };
}

export function planForgeArmorMaterialsV146(save: SaveGame, selection: ForgeArmorMaterialSelectionV146):
  { harvest: HarvestInventoryV112; quote: ForgeArmorQuoteV146 } | null {
  const recipe = forgeArmorRecipeV146(save);
  const harvest = normalizeHarvestInventoryV112(save.inventory.harvestV112);
  if (!recipe || !harvest) return null;

  const bone = harvest.archive.find(entry => forgeMaterialKeyV146(entry) === selection.bone && entry.partId === "bone");
  const hide = harvest.archive.find(entry => forgeMaterialKeyV146(entry) === selection.hide && entry.partId === "hide");
  if (!bone || !hide) return null;

  const bonePayment = planForgeRepairMaterialsV146(harvest.archive, recipe.requirements.bone, selection.bone);
  if (!bonePayment) return null;
  const hidePayment = planForgeRepairMaterialsV146(bonePayment.archive, recipe.requirements.hide, selection.hide);
  if (!hidePayment) return null;
  return {
    harvest: { ...harvest, archive: hidePayment.archive },
    quote: {
      ...recipe,
      selection: { bone: selection.bone, hide: selection.hide },
      units: [...bonePayment.quote.units, ...hidePayment.quote.units],
    },
  };
}

/** Revalidate the worn armor, the tier and both lots before writing one save. */
export function applyHunterForgeArmorUpgradeV146(current: SaveGame, expected: ForgeArmorQuoteV146): SaveGame | null {
  const plan = planForgeArmorMaterialsV146(current, expected.selection);
  if (!plan || JSON.stringify(plan.quote) !== JSON.stringify(expected)) return null;
  return {
    ...current,
    inventory: {
      ...current.inventory,
      armorUpgrades: { ...current.inventory.armorUpgrades, [plan.quote.armorId]: plan.quote.nextLevel },
      harvestV112: plan.harvest,
    },
  };
}


export type ForgeWeaponIdV146 = Extract<WeaponId, "wristblades" | "combistick">;
const FORGE_WEAPON_RECIPES_V146 = {
  1: { bone: 2, tissue: 1 },
  2: { bone: 3, tissue: 2 },
} as const;

type ForgeWeaponMaterialSelectionV146 = Readonly<{ bone: string; tissue: string }>;

interface ForgeWeaponRecipeV146 {
  weaponId: ForgeWeaponIdV146;
  currentLevel: UpgradeLevel;
  nextLevel: 1 | 2;
  requirements: Readonly<{ bone: number; tissue: number }>;
}

export interface ForgeWeaponQuoteV146 extends ForgeWeaponRecipeV146 {
  selection: ForgeWeaponMaterialSelectionV146;
  units: ForgeRepairQuoteV146["units"];
}

export function equippedForgeWeaponsV146(save: SaveGame): ForgeWeaponIdV146[] {
  return [...new Set(save.loadout.weaponIds.filter((id): id is ForgeWeaponIdV146 =>
    (id === "wristblades" || id === "combistick") && save.inventory.unlockedWeaponIds.includes(id)))];
}

export function forgeWeaponRecipeV146(save: SaveGame, weaponId: ForgeWeaponIdV146): ForgeWeaponRecipeV146 | null {
  if (!equippedForgeWeaponsV146(save).includes(weaponId)) return null;
  const { currentLevel, nextLevel } = quoteUpgrade(save, { domain: "weapon", id: weaponId });
  if (nextLevel !== 1 && nextLevel !== 2) return null;
  return { weaponId, currentLevel, nextLevel, requirements: FORGE_WEAPON_RECIPES_V146[nextLevel] };
}

export function planForgeWeaponMaterialsV146(save: SaveGame, weaponId: ForgeWeaponIdV146, selection: ForgeWeaponMaterialSelectionV146):
  { harvest: HarvestInventoryV112; quote: ForgeWeaponQuoteV146 } | null {
  const recipe = forgeWeaponRecipeV146(save, weaponId);
  const harvest = normalizeHarvestInventoryV112(save.inventory.harvestV112);
  if (!recipe || !harvest) return null;

  const bone = harvest.archive.find(entry => entry.partId === "bone" && forgeMaterialKeyV146(entry) === selection.bone);
  const tissue = harvest.archive.find(entry => entry.partId === "tissue" && forgeMaterialKeyV146(entry) === selection.tissue);
  if (!bone || !tissue) return null;

  const bonePayment = planForgeRepairMaterialsV146(harvest.archive, recipe.requirements.bone, selection.bone);
  if (!bonePayment) return null;
  const tissuePayment = planForgeRepairMaterialsV146(bonePayment.archive, recipe.requirements.tissue, selection.tissue);
  if (!tissuePayment) return null;

  return {
    harvest: { ...harvest, archive: tissuePayment.archive },
    quote: {
      ...recipe,
      selection: { bone: selection.bone, tissue: selection.tissue },
      units: [...bonePayment.quote.units, ...tissuePayment.quote.units],
    },
  };
}

/** Agree on the equipped weapon, its next level and both archive debits at write time. */
export function applyHunterForgeWeaponUpgradeV146(current: SaveGame, expected: ForgeWeaponQuoteV146): SaveGame | null {
  const plan = planForgeWeaponMaterialsV146(current, expected.weaponId, expected.selection);
  if (!plan || JSON.stringify(plan.quote) !== JSON.stringify(expected)) return null;
  return {
    ...current,
    inventory: {
      ...current.inventory,
      weaponUpgrades: { ...current.inventory.weaponUpgrades, [plan.quote.weaponId]: plan.quote.nextLevel },
      harvestV112: plan.harvest,
    },
  };
}

export const FORGE_FIELD_TOOL_BONE_COST_V146 = 2;

/** A reinforced tool consumes secondary bone from one explicitly chosen archival lot. */
export function planForgeToolReinforcementV146(current: SaveGame, materialKey: string | null):
  { harvest: HarvestInventoryV112; quote: ForgeRepairQuoteV146 } | null {
  const harvest = normalizeHarvestInventoryV112(current.inventory.harvestV112);
  if (!harvest || harvest.reinforcedTool || !ownsFieldToolV111(current.inventory, "flaying-tool")) return null;
  const lot = harvest.archive.find(entry => entry.partId === "bone" && forgeMaterialKeyV146(entry) === materialKey);
  if (!lot) return null;
  const payment = planForgeRepairMaterialsV146(harvest.archive, FORGE_FIELD_TOOL_BONE_COST_V146, materialKey);
  if (!payment) return null;
  return { harvest: { ...harvest, archive: payment.archive, reinforcedTool: true }, quote: payment.quote };
}

export function applyHunterForgeToolReinforcementV146(current: SaveGame, expected: ForgeRepairQuoteV146): SaveGame | null {
  const plan = planForgeToolReinforcementV146(current, expected.materialKey);
  if (!plan || JSON.stringify(plan.quote) !== JSON.stringify(expected)) return null;
  return { ...current, inventory: { ...current.inventory, harvestV112: plan.harvest } };
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
