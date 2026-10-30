import { PHG_MATERIALS_V113, phgMaterialLabelV113 } from "./hunterMaterialsV113.ts";
/**
 * Chromatic materials are planar reconstructions, NOT ripped PHG textures.
 * Identity is save-safe: only registered local paths may be loaded.
 * The existing Yautja morph, mask, head, skeleton and equipment remain authoritative.
 */
export type ChromaticChannelV113 = "skin" | "dreads" | "outfit" | "armor";
export type ChromaticMaterialStatusV113 = "integrated" | "drive-only";
export type ChromaticEvidenceV113 = "observed-reconstruction" | "provisional";

export interface HunterChromaticsV113 {
  skinHex: string | null;
  dreadHex: string | null;
  outfitHex: string | null;
  armorHex: string | null;
  skinMaterialId: string | null;
  dreadMaterialId: string | null;
  outfitMaterialId: string | null;
  armorMaterialId: string | null;
}

export interface ChromaticMaterialV113 {
  readonly id: string;
  readonly channel: ChromaticChannelV113;
  readonly label: string;
  readonly status: ChromaticMaterialStatusV113;
  readonly evidence: ChromaticEvidenceV113;
  readonly src: string | null;
  readonly sourceFile: string;
  readonly note: string;
}

const ASSET_ROOT = "/game/assets/v113/phg";
const LEGACY_CHROMATIC_MATERIALS_V113: readonly ChromaticMaterialV113[] = Object.freeze([
  {
    id: "phg-shatter-demon-study", channel: "skin",
    label: "Shatter · Demon (étude)", status: "integrated", evidence: "provisional",
    src: ASSET_ROOT + "/skin_shatter_demon_provisoire.png",
    sourceFile: "skin_shatter_demon_provisoire.png",
    note: "Proposition initiale à partir de descriptions ; la révision Mr Black est conservée sur Drive, non intégrée à ce lot.",
  },
  {
    id: "phg-viking-skin-study", channel: "skin",
    label: "Viking · ambre observé", status: "drive-only", evidence: "observed-reconstruction",
    src: null, sourceFile: "skin_classe_viking_base_observee.png",
    note: "PNG présent sur Drive ; intégration runtime à préparer après optimisation et revue.",
  },
  {
    id: "phg-samurai-skin-study", channel: "skin",
    label: "Samurai · moucheté observé", status: "drive-only", evidence: "observed-reconstruction",
    src: null, sourceFile: "skin_classe_samurai_base_observee.png",
    note: "PNG présent sur Drive ; intégration runtime à préparer.",
  },
  {
    id: "phg-anubis-dreads", channel: "dreads",
    label: "Anubis · écailles grises", status: "drive-only", evidence: "observed-reconstruction",
    src: null, sourceFile: "dread_anubis_gris_motif_ecaille.png",
    note: "Matière plane ; elle ne remplace ni les mèches articulées ni leur géométrie.",
  },
  {
    id: "phg-exalted-dreads", channel: "dreads",
    label: "Exalted · anneaux noirs", status: "drive-only", evidence: "observed-reconstruction",
    src: null, sourceFile: "dread_exalted_noir_annele_fin.png",
    note: "Matière plane ; la coiffure et les anneaux restent des éléments indépendants.",
  },
  {
    id: "phg-fine-net", channel: "outfit",
    label: "Filet noir à mailles fines", status: "integrated", evidence: "observed-reconstruction",
    src: ASSET_ROOT + "/armor_filet_fin_noir_losanges.png",
    sourceFile: "armor_filet_fin_noir_losanges.png",
    note: "PNG RGBA à trous transparents ; surimpression limitée au vêtement.",
  },
  {
    id: "phg-wolf-cloth", channel: "outfit",
    label: "Wolf · étoffe gris brun", status: "drive-only", evidence: "observed-reconstruction",
    src: null, sourceFile: "armor_classe_wolf_tablier_gris_brun.png",
    note: "Texture de tissu uniquement ; aucune silhouette de vêtement fournie.",
  },
  {
    id: "phg-samurai-red-lacquer", channel: "armor",
    label: "Samurai · laque rouge", status: "integrated", evidence: "observed-reconstruction",
    src: ASSET_ROOT + "/armor_classe_samurai_laque_rouge_volutes.png",
    sourceFile: "armor_classe_samurai_laque_rouge_volutes.png",
    note: "Reconstruction de matière observée ; la forme des plaques demeure celle du rig.",
  },
]);

/**
 * V114: reuse the 44 historical V85 PNGs which ALREADY exist in the repository.
 * A raw material is not a UV map: each layer is still clipped by the rig's
 * real alpha. No binary is copied, and the two special-purpose accessories
 * below remain in inventory rather than being misapplied as body cloth.
 */
const EXCLUDED_NATIVE_IDS_V114 = new Set([
  "armor_classe_father_masque_beige_strie", // mask, not textile
  "anneau_ligature_fil_rouge_observe_2022", // ring accessory, not hair surface
  "armor_filet_fin_noir_losanges", // retained V113 save ID and native plate
  "armor_classe_samurai_laque_rouge_volutes", // retained V113 save ID and native plate
]);
export const PHG_CHROMATIC_MATERIALS_V113: readonly ChromaticMaterialV113[] = Object.freeze([
  // Preserve all previously selectable V113 save IDs and their original art.
  ...LEGACY_CHROMATIC_MATERIALS_V113.filter(item => item.status === "integrated"),
  ...PHG_MATERIALS_V113
    .filter(item => !item.archived && !EXCLUDED_NATIVE_IDS_V114.has(item.id))
    .map((item): ChromaticMaterialV113 => ({
      id: "phg-" + item.id,
      channel: item.category === "dread" ? "dreads" :
        item.category === "skin" ? "skin" :
        item.id.includes("_laque_") ? "armor" : "outfit",
      label: item.label,
      status: "integrated",
      evidence: item.provisional ? "provisional" : "observed-reconstruction",
      src: item.src,
      sourceFile: item.src.split("/").at(-1) ?? item.id + ".png",
      note: phgMaterialLabelV113(item) + ". Texture plane appliquée uniquement à la silhouette du calque correspondant.",
    })),
]);

export const DEFAULT_CHROMATICS_V113: Readonly<HunterChromaticsV113> = Object.freeze({
  skinHex: null, dreadHex: null, outfitHex: null, armorHex: null,
  skinMaterialId: null, dreadMaterialId: null, outfitMaterialId: null, armorMaterialId: null,
});

export const CHROMATIC_CHANNELS_V113 = [
  { id: "skin", colorKey: "skinHex", materialKey: "skinMaterialId", label: "Chromatophores", subtitle: "Analyse dermique et pigmentation" , naturalHex: "#9b7247" },
  { id: "dreads", colorKey: "dreadHex", materialKey: "dreadMaterialId", label: "Atelier des ligatures", subtitle: "Mèches, anneaux et fibres", naturalHex: "#342a27" },
  { id: "outfit", colorKey: "outfitHex", materialKey: "outfitMaterialId", label: "Teinturier du clan", subtitle: "Filets, étoffes et cuirs", naturalHex: "#665347" },
  { id: "armor", colorKey: "armorHex", materialKey: "armorMaterialId", label: "Forge des patines", subtitle: "Finitions des plaques", naturalHex: "#98704b" },
] as const satisfies readonly {
  id: ChromaticChannelV113; colorKey: keyof HunterChromaticsV113;
  materialKey: keyof HunterChromaticsV113; label: string; subtitle: string; naturalHex: string;
}[];

const colorField = { skin: "skinHex", dreads: "dreadHex", outfit: "outfitHex", armor: "armorHex" } as const;
const materialField = { skin: "skinMaterialId", dreads: "dreadMaterialId", outfit: "outfitMaterialId", armor: "armorMaterialId" } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function normalizeChromaticHexV113(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}

export function getChromaticMaterialV113(channel: ChromaticChannelV113, id: unknown): ChromaticMaterialV113 | null {
  if (typeof id !== "string") return null;
  return PHG_CHROMATIC_MATERIALS_V113.find(item =>
    item.id === id && item.channel === channel && item.status === "integrated" && !!item.src
  ) ?? null;
}

export function normalizeHunterChromaticsV113(source: unknown): HunterChromaticsV113 {
  if (!isRecord(source)) return { ...DEFAULT_CHROMATICS_V113 };
  const result: HunterChromaticsV113 = { ...DEFAULT_CHROMATICS_V113 };
  for (const channel of CHROMATIC_CHANNELS_V113) {
    result[channel.colorKey] = normalizeChromaticHexV113(source[channel.colorKey]);
    result[channel.materialKey] = getChromaticMaterialV113(channel.id, source[channel.materialKey])?.id ?? null;
  }
  return result;
}

export function hasCustomChromaticsV113(value: unknown): boolean {
  const safe = normalizeHunterChromaticsV113(value);
  return Object.values(safe).some(item => item !== null);
}

/**
 * Alpha mask always comes from the rig's existing body/strand/plate.
 * "Cover" is a 2D approximation, not an official game's UV map.
 */
export function chromaticOverlayStyleV113(
  source: unknown,
  channel: ChromaticChannelV113,
  maskPath: string,
): Record<string, string | number> | null {
  const chromatics = normalizeHunterChromaticsV113(source);
  const color = chromatics[colorField[channel]];
  const texture = getChromaticMaterialV113(channel, chromatics[materialField[channel]]);
  if (!color && !texture?.src) return null;
  const mask = 'url("' + maskPath + '")';
  return {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    userSelect: "none",
    backgroundColor: color ?? "transparent",
    backgroundImage: texture?.src ? 'url("' + texture.src + '")' : "none",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    maskImage: mask,
    WebkitMaskImage: mask,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    mixBlendMode: texture?.src ? "multiply" : "color",
    opacity: channel === "skin" ? 0.58 : channel === "dreads" ? 0.7 : 0.78,
  };
}
