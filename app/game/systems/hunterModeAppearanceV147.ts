/**
 * V147 appearance worn in each mode (campaign bible, "Tenues" : une tenue par
 * mode). The outfit assigned to a mode wins; otherwise the campaign look is
 * kept, i.e. the campaign outfit when one is assigned, else the saved
 * appearance. Nothing here grants stats or writes the save.
 */
import {
  emptyCustomizationV146, outfitForModeV146,
  type CustomizationModeV146, type CustomizationV146, type OutfitAppearanceV146,
} from "./hunterCustomizationV146.ts";

export type ModeAppearanceSourceV147 = "mode-outfit" | "campaign-outfit" | "campaign";

export interface ModeAppearanceV147<A> {
  readonly appearance: A;
  readonly source: ModeAppearanceSourceV147;
  /** Name of the outfit actually worn, null for the saved appearance. */
  readonly outfitName: string | null;
}

export interface ModeAppearanceSaveV147<A> {
  readonly appearance: A;
  readonly customizationV146?: CustomizationV146 | null;
}

/**
 * `normalize` is the save normaliser (`normalizeHunterAppearanceV146`): an
 * outfit stores a raw snapshot that must be read like any saved appearance.
 */
export function appearanceForModeV147<A>(
  save: ModeAppearanceSaveV147<A>,
  mode: CustomizationModeV146,
  normalize: (raw: OutfitAppearanceV146 | unknown) => A,
): ModeAppearanceV147<A> {
  const customization = save.customizationV146 ?? emptyCustomizationV146();
  const own = outfitForModeV146(customization, mode);
  if (own) {
    return { appearance: normalize(own.appearance), source: mode === "campaign" ? "campaign-outfit" : "mode-outfit", outfitName: own.name };
  }
  const campaign = mode === "campaign" ? null : outfitForModeV146(customization, "campaign");
  if (campaign) return { appearance: normalize(campaign.appearance), source: "campaign-outfit", outfitName: campaign.name };
  return { appearance: save.appearance, source: "campaign", outfitName: null };
}

export function modeAppearanceLabelV147(result: Pick<ModeAppearanceV147<unknown>, "source" | "outfitName">): string {
  if (result.source === "mode-outfit") return `Tenue « ${result.outfitName} »`;
  if (result.source === "campaign-outfit") return `Tenue de campagne « ${result.outfitName} »`;
  return "Apparence de campagne";
}
