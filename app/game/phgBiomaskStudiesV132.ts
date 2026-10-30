/** V132 seven ORIGINAL, provisional masked-metal tint studies from PHG patch 2.19 names.
 * Palette colors and exact PHG UV/PBR pixels are NOT verified or extracted.
 */
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";
import catalog from "./data/phgBiomaskV132Catalog.json" with { type: "json" };
import installed from "./data/phgBiomaskV132Installed.json" with { type: "json" };

export type PhgMaskClassV132 = "alpha" | "samurai";
export const PHG_BIOMASK_V132_SOURCE = catalog.sourceUrl;
const active = new Set<string>(installed.installed as readonly string[]);
const bundleVerified = String(installed.bundleSha256 ?? "") === catalog.bundleSha256;
export const PHG_BIOMASK_V132_CANDIDATES: readonly ChromaticMaterialV113[] =
  Object.freeze(catalog.items.map((record): ChromaticMaterialV113 => {
    const enabled = bundleVerified && active.has(record.id);
    return {
      id: "phg-study-v132-" + record.id,
      label: "Étude V132 · biomask " + record.name,
      channel: "biomask",
      evidence: "provisional",
      status: enabled ? "integrated" : "drive-only",
      src: enabled ? catalog.atlasPath : null,
      sourceFile: "PHG_V132_Seven_Biomask_Studies.zip",
      atlas: {columns:4,rows:2,column:record.column,row:record.row},
      note: "Teinte de masque nommée au patch 2.19. Matière originale provisoire, "
        + "couleur exacte et UV 1:1 non certifiés. " + catalog.sourceUrl,
    };
  }));

/** In our 2D game the historical Alpha/Samurai masks are Feral/Celtic proxies.
 * Keep their owned class lineage in chromatics, not in the mutable custom presetId.
 */
export function maskClassForAppearanceV132(appearance: {
  presetId?: string;
  biomaskId?: string | null;
  chromaticsV113?: unknown;
}): PhgMaskClassV132 | null {
  const p=appearance.chromaticsV113;
  const prior=p && typeof p === "object" && !Array.isArray(p) && "maskOriginId" in p
    ? p.maskOriginId : null;
  if(appearance.biomaskId==="feral" && (appearance.presetId==="alpha" || prior==="alpha"))
    return "alpha";
  if(appearance.biomaskId==="celtic" && (appearance.presetId==="samurai" || prior==="samurai"))
    return "samurai";
  return null;
}
export function maskMaterialAllowedV132(
  appearance: {presetId?:string;biomaskId?:string|null;chromaticsV113?:unknown},
  materialId: unknown,
): boolean {
  const cls=maskClassForAppearanceV132(appearance);
  if(typeof materialId!=="string" || !cls)return false;
  const entry=catalog.items.find(item=>"phg-study-v132-"+item.id===materialId);
  return !!entry && entry.classes.some(value=>value===cls);
}
