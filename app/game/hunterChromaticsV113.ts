import { PHG_MATERIALS_V113, phgMaterialLabelV113 } from "./hunterMaterialsV113.ts";
import { PHG_RECENT_CANDIDATES_V126 } from "./phgRecentMaterialsV126.ts";
import { PHG_HISTORICAL_STUDIES_V127 } from "./phgHistoricalMaterialsV127.ts";
import { PHG_PLATFORM_STUDIES_V128 } from "./phgPlatformStudiesV128.ts";
import { PHG_V129_PATCH_MATERIALS } from "./phgPatchStudiesV129.ts";
import { PHG_OGRE_BIOMASK_MATERIAL_V131, alphaMaskEligibleV131 } from "./phgBiomaskTintsV131.ts";
import { PHG_BIOMASK_V132_CANDIDATES, maskMaterialAllowedV132 } from "./phgBiomaskStudiesV132.ts";
import PHG_DRIVE_CATALOG_V120 from "./data/phgDriveV120Catalog.json" with { type: "json" };
import PHG_DRIVE_INSTALLED_V120 from "./data/phgDriveV120Installed.json" with { type: "json" };
/**
 * Chromatic materials are planar reconstructions, NOT ripped PHG textures.
 * Identity is save-safe: only registered local paths may be loaded.
 * The existing Yautja morph, mask, head, skeleton and equipment remain authoritative.
 */
export type ChromaticChannelV113 = "skin" | "dreads" | "outfit" | "armor" | "biomask";
export type ChromaticMaterialStatusV113 = "integrated" | "drive-only";
export type ChromaticEvidenceV113 = "observed-reconstruction" | "provisional";

export interface HunterChromaticsV113 {
  skinHex: string | null;
  dreadHex: string | null;
  outfitHex: string | null;
  armorHex: string | null;
  maskHex: string | null;
  /** Alpha identity survives the transition to a customized preset. */
  maskOriginId: "alpha" | "samurai" | null;
  skinMaterialId: string | null;
  dreadMaterialId: string | null;
  outfitMaterialId: string | null;
  armorMaterialId: string | null;
  maskMaterialId: string | null;
}

/** One cropped tile within the original, non-certified V125 study atlas. */
export interface ChromaticAtlasV125 {
  readonly columns: number;
  readonly rows: number;
  readonly column: number;
  readonly row: number;
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
  readonly atlas?: ChromaticAtlasV125;
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
/** V120: original 156 RGB reconstructions are NOT automatically trusted as rig textures.
 * Only local files installed after SHA verification can enter the save-safe
 * material registry. Jewelry/biomask assets remain separate from paint channels.
 */
const installedDriveIdsV120 = new Set<string>(
  (PHG_DRIVE_INSTALLED_V120.installed ?? []) as readonly string[]
);
function sourceChannelV120(value: string | null): ChromaticChannelV113 | null {
  return value === "skin" || value === "dreads" || value === "outfit" || value === "armor"
    ? value : null;
}
export const PHG_DRIVE_ACCESSORIES_V120 = Object.freeze(
  PHG_DRIVE_CATALOG_V120.assets.filter(item => sourceChannelV120(item.candidateChannel) === null)
);
export const PHG_DRIVE_CANDIDATES_V120: readonly ChromaticMaterialV113[] = Object.freeze(
  PHG_DRIVE_CATALOG_V120.assets.flatMap((item): ChromaticMaterialV113[] => {
    const channel = sourceChannelV120(item.candidateChannel);
    if (!channel) return [];
    const isInstalled = installedDriveIdsV120.has(item.id)
      && String(PHG_DRIVE_INSTALLED_V120.bundleSha256 ?? "") === PHG_DRIVE_CATALOG_V120.bundleSha256;
    return [{
      id: "phg-drive-" + item.id,
      channel,
      label: "PHG reconstitué · " + item.label,
      status: isInstalled ? "integrated" : "drive-only",
      evidence: "provisional",
      src: isInstalled ? item.runtimePath : null,
      sourceFile: item.sourcePath.split("/").at(-1) ?? item.id + ".png",
      note: "Matière 2D issue du ZIP " + item.sourceArchive
        + ". Source vérifiée SHA-256 ; fidélité colorimétrique et UV 1:1 non certifiées.",
    }];
  })
);


/** V125: 12 selectable ORIGINAL visual studies from a single local WebP atlas.
 * The names and release windows are sourced; the pigment maps themselves are
 * generated reconstructions, not PHG screenshots, ripped game files or UV maps.
 * Selecting a tile affects only the existing masked skin channel.
 */
export const PHG_VISUAL_STUDIES_V125: readonly ChromaticMaterialV113[] = Object.freeze([
  {
    id: "phg-study-v125-jungle87_wasteland", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Jungle Hunter ’87 · Wasteland",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 0, row: 0 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-elder_ancient", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Elder · Ancient",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 1, row: 0 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-jungle87_undergrowth", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Jungle Hunter ’87 · Undergrowth",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 2, row: 0 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-jungle87_badland", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Jungle Hunter ’87 · Badland",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 0, row: 1 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-jungle87_quagmire", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Jungle Hunter ’87 · Quagmire",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 1, row: 1 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-elder_relic", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Elder · Relic",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 2, row: 1 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-elder_primeval", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Elder · Primeval",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 0, row: 2 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-elder_stoic", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Elder · Stoic",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 1, row: 2 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-city97_sector", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · City Hunter ’97 · Sector",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 2, row: 2 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-city97_ward", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · City Hunter ’97 · Ward",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 0, row: 3 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-city97_tract", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · City Hunter ’97 · Tract",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 1, row: 3 },
    note: "Source nominale : 2020 patch 2.0 Part II. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
  {
    id: "phg-study-v125-feral_post_3_6_default", channel: "skin", status: "integrated", evidence: "provisional",
    label: "Étude V125 · Feral · Default (après 3.6.0)",
    src: "/game/assets/v125/phg-studies/atlas.webp", sourceFile: "PHG_V125_12_Etudes_Atlas.webp",
    atlas: { columns: 3, rows: 4, column: 2, row: 3 },
    note: "Source nominale : 2026 patch 3.6.0. Matière originale provisoire, UV et fidélité 1:1 non certifiées.",
  },
]);

export function chromaticAtlasBackgroundV125(atlas: ChromaticAtlasV125, pigment: boolean) {
  // In percent background-position, 0% selects the first tile and 100% the
  // last. This offset is correct even when the element has non-square pixels.
  const x = atlas.columns <= 1 ? 0 : 100 * atlas.column / (atlas.columns - 1);
  const y = atlas.rows <= 1 ? 0 : 100 * atlas.row / (atlas.rows - 1);
  const position = x + "% " + y + "%";
  const size = (100 * atlas.columns) + "% " + (100 * atlas.rows) + "%";
  return {
    backgroundPosition: pigment ? "center, " + position : position,
    backgroundSize: pigment ? "100% 100%, " + size : size,
  };
}

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
  // Never include uninstalled Drive-only candidates in the live renderer.
  ...PHG_DRIVE_CANDIDATES_V120.filter(item => item.status === "integrated"),
  ...PHG_VISUAL_STUDIES_V125,
  ...PHG_RECENT_CANDIDATES_V126.filter(x => x.status === "integrated"),
  ...PHG_HISTORICAL_STUDIES_V127.filter(x => x.status === "integrated"),
  ...PHG_PLATFORM_STUDIES_V128.filter(x => x.status === "integrated"),
  ...PHG_V129_PATCH_MATERIALS.filter(x => x.status === "integrated"),
  PHG_OGRE_BIOMASK_MATERIAL_V131,
  ...PHG_BIOMASK_V132_CANDIDATES.filter(item => item.status === "integrated"),
]);

export const DEFAULT_CHROMATICS_V113: Readonly<HunterChromaticsV113> = Object.freeze({
  skinHex: null, dreadHex: null, outfitHex: null, armorHex: null, maskHex: null, maskOriginId: null,
  skinMaterialId: null, dreadMaterialId: null, outfitMaterialId: null, armorMaterialId: null, maskMaterialId: null,
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

/** Original clan pigment shortcuts, not certified PHG dye names or UV samples.
 * Store only their normalised #RRGGBB values in the existing save schema.
 * Keyboard/gamepad users can pick these without an operating-system color picker.
 */
export const CHROMATIC_PALETTE_PRESETS_V115: readonly {
  readonly channel: ChromaticChannelV113;
  readonly label: string;
  readonly hex: string;
}[] = Object.freeze([
  { channel: "skin", label: "Ocre des chasseurs", hex: "#9b7247" },
  { channel: "skin", label: "Cendre volcanique", hex: "#767b72" },
  { channel: "skin", label: "Sable des dunes", hex: "#b18d61" },
  { channel: "skin", label: "Ombre de la canopée", hex: "#444f42" },
  { channel: "skin", label: "Terre sombre", hex: "#665144" },
  { channel: "dreads", label: "Obsidienne", hex: "#17181b" },
  { channel: "dreads", label: "Terre d'ombre", hex: "#4b3428" },
  { channel: "dreads", label: "Cendre des anciens", hex: "#8a8881" },
  { channel: "dreads", label: "Cuivre assombri", hex: "#705342" },
  { channel: "dreads", label: "Ivoire patiné", hex: "#b2a38e" },
  { channel: "outfit", label: "Cuir brun", hex: "#665347" },
  { channel: "outfit", label: "Filet de suie", hex: "#252729" },
  { channel: "outfit", label: "Fibres d'argile", hex: "#796953" },
  { channel: "outfit", label: "Étoffe cendrée", hex: "#6e716d" },
  { channel: "outfit", label: "Rouge cérémoniel", hex: "#754339" },
  { channel: "armor", label: "Bronze du clan", hex: "#98704b" },
  { channel: "armor", label: "Acier canon", hex: "#75818a" },
  { channel: "armor", label: "Obsidienne polie", hex: "#272b31" },
  { channel: "armor", label: "Cuivre forgé", hex: "#a46f52" },
  { channel: "armor", label: "Fer ancien", hex: "#626767" },
]);

/** Distinct physical services; the ship includes a compact all-purpose preparation desk. */
export type ChromaticFacilityV115 = "ship" | "forge" | "lab";
export function chromaticFacilityChannelsV115(facility: ChromaticFacilityV115) {
  return CHROMATIC_CHANNELS_V113.filter(channel =>
    facility === "ship" ||
    (facility === "lab" ? channel.id === "skin" : channel.id !== "skin")
  );
}

/** Never erase another workshop's changes when resetting the current station. */
export function resetChromaticFacilityV115(source: unknown, facility: ChromaticFacilityV115): HunterChromaticsV113 {
  const result = normalizeHunterChromaticsV113(source);
  for (const channel of chromaticFacilityChannelsV115(facility)) {
    result[channel.colorKey] = null;
    result[channel.materialKey] = null;
  }
  if (facility !== "lab") {
    result.maskHex = null;
    result.maskMaterialId = null;
    // Keep the Alpha origin so returning from the forge can reopen Ogre.
  }
  return result;
}

const colorField = { skin: "skinHex", dreads: "dreadHex", outfit: "outfitHex", armor: "armorHex", biomask: "maskHex" } as const;
const materialField = { skin: "skinMaterialId", dreads: "dreadMaterialId", outfit: "outfitMaterialId", armor: "armorMaterialId", biomask: "maskMaterialId" } as const;

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
  // V131 is intentionally a separate workshop: older V113 games retain all
  // four existing color channels, and untrusted mask URLs are never restored.
  result.maskHex = normalizeChromaticHexV113(source.maskHex);
  result.maskOriginId = source.maskOriginId === "alpha" || source.maskOriginId === "samurai"
    ? source.maskOriginId : null;
  result.maskMaterialId = getChromaticMaterialV113("biomask", source.maskMaterialId)?.id ?? null;
  return result;
}

/** Preserve material selections from the independently developed PR #25 save
 * shape without perpetuating its three parallel fields in the active schema.
 * An explicit chromaticsV113 field (including null) always wins over old data.
 */
export function migrateLegacyPhgAppearanceV115(raw: unknown): HunterChromaticsV113 {
  const appearance = isRecord(raw) ? raw : {};
  // null is an explicit reset, whereas undefined/missing is a legacy PR25 save.
  const explicitlySelected = Object.prototype.hasOwnProperty.call(appearance, "chromaticsV113")
    && appearance.chromaticsV113 !== undefined;
  const modern = isRecord(appearance.chromaticsV113) ? appearance.chromaticsV113 : null;
  const result = normalizeHunterChromaticsV113(modern);
  const acceptsLegacy = (field: keyof HunterChromaticsV113) =>
    !explicitlySelected || (modern !== null && !Object.prototype.hasOwnProperty.call(modern, field));

  const priorSkin: Record<string, string> = {
    "moss-mottle": "#677b4b", "copper-mottle": "#a35a3e",
    "sand-mottle": "#b2a17a", "storm-mottle": "#647b85",
    "ivory-mottle": "#bcb4a2",
  };
  const priorDreads: Record<string, string> = {
    copper: "#85513f", bone: "#bbb29c", moss: "#586a4b",
    "blue-black": "#343e53",
  };
  const priorArmor: Record<string, string> = {
    bone: "#afa68d", jade: "#466f5b", rust: "#8b503d",
    crimson: "#873938",
  };
  const knownColor = (values: Record<string, string>, key: unknown): string | null =>
    typeof key === "string" && Object.prototype.hasOwnProperty.call(values, key)
      ? values[key] : null;
  if (acceptsLegacy("skinHex"))
    result.skinHex = knownColor(priorSkin, appearance.skinId) ?? result.skinHex;
  if (acceptsLegacy("dreadHex"))
    result.dreadHex = knownColor(priorDreads, appearance.dreadTintId) ?? result.dreadHex;
  if (acceptsLegacy("armorHex"))
    result.armorHex = knownColor(priorArmor, appearance.armorTintId) ?? result.armorHex;

  const convert = (channel: ChromaticChannelV113, candidate: unknown): string | null => {
    if (typeof candidate !== "string" || !/^[a-z0-9_-]{1,110}$/.test(candidate)) return null;
    const aliases: Record<string, string> = {
      "armor_filet_fin_noir_losanges": "phg-fine-net",
      "skin_shatter_demon_provisoire": "phg-shatter-demon-study",
      "armor_classe_samurai_laque_rouge_volutes": "phg-samurai-red-lacquer",
    };
    const id = Object.prototype.hasOwnProperty.call(aliases, candidate)
      ? aliases[candidate] : "phg-" + candidate;
    return getChromaticMaterialV113(channel, id)?.id ?? null;
  };
  if (acceptsLegacy("skinMaterialId"))
    result.skinMaterialId = convert("skin", appearance.skinMaterialId) ?? result.skinMaterialId;
  if (acceptsLegacy("dreadMaterialId"))
    result.dreadMaterialId = convert("dreads", appearance.dreadMaterialId) ?? result.dreadMaterialId;
  if (acceptsLegacy("outfitMaterialId")) {
    const oldOutfit = appearance.outfitMaterialId;
    if (oldOutfit === "armor_classe_samurai_laque_rouge_volutes") {
      if (acceptsLegacy("armorMaterialId"))
        result.armorMaterialId = convert("armor", oldOutfit) ?? result.armorMaterialId;
    } else {
      result.outfitMaterialId = convert("outfit", oldOutfit) ?? result.outfitMaterialId;
    }
  }
  return result;
}

export function hasCustomChromaticsV113(value: unknown): boolean {
  const safe = normalizeHunterChromaticsV113(value);
  return Object.values(safe).some(item => item !== null);
}

/** The dedicated biomask surface never paints skin or armor.
 * An Alpha owner keeps that class identity across "custom" saves.
 */
export function maskChromaticsForAppearanceV131(appearance: {
  presetId?: string;
  biomaskId?: string | null;
  chromaticsV113?: unknown;
}): HunterChromaticsV113 {
  const selected = normalizeHunterChromaticsV113(appearance.chromaticsV113);
  const maskId = selected.maskMaterialId;
  const allowed = maskId === PHG_OGRE_BIOMASK_MATERIAL_V131.id
    ? alphaMaskEligibleV131(appearance)
    : maskMaterialAllowedV132(appearance, maskId);
  return !maskId || allowed ? selected : { ...selected, maskMaterialId: null };
}

/** PNG is applied first; a translucent user pigment remains visible above it.
 * Keep the same fraction in the rig CSS and mission Canvas pipelines.
 */
export const CHROMATIC_PIGMENT_OVER_TEXTURE_V117 = 0.4;

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
  // Without a second upper layer, an opaque RGB PNG hides the chosen pigment.
  // CSS #RRGGBBAA is stable, needs no extra DOM element, and respects the rig mask.
  const tintAlpha = Math.round(CHROMATIC_PIGMENT_OVER_TEXTURE_V117 * 255)
    .toString(16).padStart(2, "0");
  const pigmentOverTexture = color && texture?.src
    ? `linear-gradient(${color}${tintAlpha}, ${color}${tintAlpha}), `
    : "";
  const atlas = texture?.atlas
    ? chromaticAtlasBackgroundV125(texture.atlas, Boolean(color)) : null;
  return {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    userSelect: "none",
    backgroundColor: color && !texture?.src ? color : "transparent",
    backgroundImage: texture?.src
      ? pigmentOverTexture + 'url("' + texture.src + '")'
      : "none",
    backgroundPosition: atlas?.backgroundPosition ?? "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: atlas?.backgroundSize ?? "cover",
    maskImage: mask,
    WebkitMaskImage: mask,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    mixBlendMode: texture?.src ? "multiply" : "color",
    opacity: channel === "skin" ? 0.58 : channel === "dreads" ? 0.7 : channel === "biomask" ? 0.73 : 0.78,
  };
}
