import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import {
  DEFAULT_WAR_PLANET_RECIPE_V115, describeWarPlanetV115, encodeWarPlanetV115,
  generateWarPlanetV115, parseWarPlanetV115, validateWarPlanetRecipeV115,
  type WarPlanetProceduralV115, type WarPlanetRecipeV115,
} from "./clanWarPlanetGeneratorV115";
import { WAR_PLANET_LAND_TEXTURES_V115, WAR_PLANET_LIQUID_TEXTURES_V115, planetTextureUriV115 } from "./clanWarTextureLibraryV115";
import { WAR_PLANET_TEXTURES_V125, type PlanetTextureDomainV125 } from "./clanWarTextureLibraryV125";

/** Versioned material choices: V102/V103/V115 codes and gameplay remain untouched. */
export type WarPlanetRecipeV126 = Omit<WarPlanetRecipeV115, "version"> & {
  version: 126; regionalLandMaterials: number[]; liquidMaterialV126: number;
};
export type WarPlanetProceduralV126 = Omit<WarPlanetProceduralV115, "recipe"> & {
  recipe: WarPlanetRecipeV126;
  regionalMaterialAssignments: { regionId: string; landMaterialIndex: number; landMaterialId: string; landMaterialName: string; description: string }[];
  globalLiquidAssignment: { materialIndex: number; id: string; name: string; description: string };
};
export type GeneratedWarPlanetV126 = Omit<WarPlanetV96, "procedural"> & { procedural: WarPlanetProceduralV126 };
const validNumber = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
function checksum(text: string) { let n = 2166136261; for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619); return (n >>> 0).toString(36).padStart(7, "0").slice(-5); }
const additional = {
  land: WAR_PLANET_TEXTURES_V125.filter(t => t.domain === "land"),
  liquid: WAR_PLANET_TEXTURES_V125.filter(t => t.domain === "liquid"),
};
export const WAR_PLANET_MATERIAL_COUNT_PER_DOMAIN_V126 = 32;
const { version: unusedV115Version, ...defaultParent } = DEFAULT_WAR_PLANET_RECIPE_V115;
export const DEFAULT_WAR_PLANET_RECIPE_V126: Readonly<WarPlanetRecipeV126> = Object.freeze({
  ...defaultParent, version: 126, regionalLandMaterials: Array.from({ length: defaultParent.regionCount }, () => defaultParent.landMaterial),
  liquidMaterialV126: defaultParent.liquidMaterial,
});

export function planetMaterialDefinitionV126(domain: PlanetTextureDomainV125, index: number) {
  if (!validNumber(index, 32)) throw new RangeError("Indice de matière V126 invalide.");
  const material = index < 16
    ? (domain === "land" ? WAR_PLANET_LAND_TEXTURES_V115 : WAR_PLANET_LIQUID_TEXTURES_V115)[index]
    : additional[domain][index - 16];
  if (!material) throw new RangeError("Matière V126 indisponible.");
  return { id: material.id, name: material.name, origin: material.origin, description: material.description };
}

/** URI references an actual V115/V125 bitmap; high indices use a regional seed. */
export function planetTextureUriV126(domain: PlanetTextureDomainV125, index: number, seed = 0): string {
  if (!validNumber(seed, 0x100000000)) throw new RangeError("Graine de texture invalide.");
  if (!validNumber(index, 32)) throw new RangeError("Indice de matière invalide.");
  return index < 16 ? planetTextureUriV115(domain, index)
    : "yautja-v125:" + planetMaterialDefinitionV126(domain, index).id + ":" + seed.toString(36);
}
export function validateWarPlanetRecipeV126(value: unknown): WarPlanetRecipeV126 | null {
  if (!record(value) || value.version !== 126) return null;
  const { regionalLandMaterials, liquidMaterialV126, ...parent } = value;
  const base = validateWarPlanetRecipeV115({ ...parent, version: 115 });
  if (!base || Object.keys(value).length !== Object.keys(base).length + 2 ||
      !Array.isArray(regionalLandMaterials) || regionalLandMaterials.length !== base.regionCount ||
      !regionalLandMaterials.every(v => validNumber(v, 32)) || !validNumber(liquidMaterialV126, 32)) return null;
  return { ...base, version: 126, regionalLandMaterials: [...regionalLandMaterials], liquidMaterialV126 };
}
export function normalizeWarPlanetRecipeV126(value: Partial<WarPlanetRecipeV126> = {}): WarPlanetRecipeV126 {
  const candidate: WarPlanetRecipeV126 = { ...DEFAULT_WAR_PLANET_RECIPE_V126, ...value };
  if (value.regionCount !== undefined && value.regionalLandMaterials === undefined)
    candidate.regionalLandMaterials = Array.from({ length: value.regionCount }, () => candidate.landMaterial);
  const result = validateWarPlanetRecipeV126(candidate);
  if (!result) throw new RangeError("Recette planétaire V126 invalide.");
  return result;
}
export function encodeWarPlanetV126(value: WarPlanetRecipeV126): string {
  const recipe = validateWarPlanetRecipeV126(value);
  if (!recipe) throw new RangeError("Recette planétaire V126 invalide.");
  const { version, regionalLandMaterials, liquidMaterialV126, ...parent } = recipe;
  const old = encodeWarPlanetV115({ ...parent, version: 115 });
  const match = /^proc-v115-([0-9a-z]{1,7})-([0-9a-z]{30})-[0-9a-z]{5}$/.exec(old);
  if (!match) throw new Error("Identité géographique V115 invalide.");
  const materialDigits = regionalLandMaterials.map(v => v.toString(36)).join("") + liquidMaterialV126.toString(36);
  const body = "proc-v126-" + match[1] + "-" + match[2] + "-" + materialDigits;
  return body + "-" + checksum(body);
}
export function parseWarPlanetV126(id: string): WarPlanetRecipeV126 | null {
  if (typeof id !== "string" || id.length > 96) return null;
  const match = /^proc-v126-([0-9a-z]{1,7})-([0-9a-z]{30})-([0-9a-z]{4,13})-([0-9a-z]{5})$/.exec(id);
  if (!match || checksum(id.slice(0, -6)) !== match[4]) return null;
  const oldBody = "proc-v115-" + match[1] + "-" + match[2];
  const base = parseWarPlanetV115(oldBody + "-" + checksum(oldBody));
  if (!base || match[3].length !== base.regionCount + 1) return null;
  const selections = [...match[3]].map(d => parseInt(d, 36));
  const result = validateWarPlanetRecipeV126({
    ...base, version: 126, regionalLandMaterials: selections.slice(0, -1),
    liquidMaterialV126: selections[selections.length - 1],
  });
  return result && encodeWarPlanetV126(result) === id ? result : null;
}
export function describeWarPlanetV126(id: string) {
  const recipe = parseWarPlanetV126(id);
  if (!recipe) return undefined;
  const { version, regionalLandMaterials, liquidMaterialV126, ...base } = recipe;
  const summary = describeWarPlanetV115(encodeWarPlanetV115({ ...base, version: 115 }));
  if (!summary) return undefined;
  return { ...summary, id, version: 126 as const,
    subtitle: summary.subtitle + " · " + new Set(regionalLandMaterials).size + " matières régionales" };
}
export function generateWarPlanetV126(input: WarPlanetRecipeV126): GeneratedWarPlanetV126 {
  const recipe = validateWarPlanetRecipeV126(input);
  if (!recipe) throw new RangeError("Recette planétaire V126 invalide.");
  const { version, regionalLandMaterials, liquidMaterialV126, ...base } = recipe;
  const original = generateWarPlanetV115({ ...base, version: 115 });
  const assignments = original.regions.map((region, index) => {
    const value = regionalLandMaterials[index], material = planetMaterialDefinitionV126("land", value);
    return { regionId: region.id, landMaterialIndex: value, landMaterialId: material.id,
      landMaterialName: material.name, description: material.description };
  });
  const liquid = planetMaterialDefinitionV126("liquid", liquidMaterialV126);
  const procedural: WarPlanetProceduralV126 = {
    ...original.procedural, recipe, regionalMaterialAssignments: assignments,
    globalLiquidAssignment: { materialIndex: liquidMaterialV126, id: liquid.id, name: liquid.name, description: liquid.description },
    materialDiversity: {
      ...original.procedural.materialDiversity,
      land: new Set(regionalLandMaterials).size + " matières régionales",
      landDescription: assignments.map(item => item.regionId + ": " + item.landMaterialName).join(" ; "),
      liquid: liquid.name, liquidDescription: liquid.description,
    },
    traits: [...original.procedural.traits, { id: "v126-regional-materials",
      name: "Matières régionales persistantes",
      description: "Chaque région possède un détail terrestre indépendant. Le milieu liquide est mondial ; routes et territoires restent identiques." }],
    provenance: original.procedural.provenance + " Variante V126 : matières régionales et liquide mondial inscrits dans un nouveau code ; anciennes sauvegardes inchangées.",
  };
  return Object.freeze({ ...original, id: encodeWarPlanetV126(recipe), procedural: Object.freeze(procedural),
    description: original.description + " Les détails minéraux varient par région.",
    subtitle: original.subtitle + " · " + new Set(regionalLandMaterials).size + " matières",
    layout: original.layout.replace("v115", "v126") });
}
const cache = new Map<string, GeneratedWarPlanetV126>();
export function generatedWarPlanetV126(id: string): GeneratedWarPlanetV126 | undefined {
  const existing = cache.get(id);
  if (existing) { cache.delete(id); cache.set(id, existing); return existing; }
  const recipe = parseWarPlanetV126(id);
  if (!recipe) return undefined;
  const planet = generateWarPlanetV126(recipe);
  cache.set(id, planet);
  while (cache.size > 24) cache.delete(cache.keys().next().value!);
  return planet;
}
