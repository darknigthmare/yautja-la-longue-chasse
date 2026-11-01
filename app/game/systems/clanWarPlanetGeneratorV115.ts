import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import {
  DEFAULT_WAR_PLANET_RECIPE_V103, describeWarPlanetV103, encodeWarPlanetV103, generateWarPlanetV103,
  parseWarPlanetV103, validateWarPlanetRecipeV103,
  type WarPlanetProceduralV103, type WarPlanetRecipeV103,
} from "./clanWarPlanetGeneratorV103";
import { PLANET_RADII_KM_V115, planetArcKilometersV115, type PlanetSizeV115, warShapeTemplateV115 } from "./clanWarShapeAtlasV115";
import { WAR_PLANET_LAND_TEXTURES_V115, WAR_PLANET_LIQUID_TEXTURES_V115 } from "./clanWarTextureLibraryV115";

/** V115 adds physical radii, three shape recipes and two real detail materials.
 * V102/V103 codes never deserialize into this version automatically. */
export type WarPlanetRecipeV115 = Omit<WarPlanetRecipeV103, "version"> & {
  version: 115;
  planetSize: PlanetSizeV115;
  islandShape: number;
  continentShape: number;
  regionShape: number;
  landMaterial: number;
  liquidMaterial: number;
};
export type WarPlanetProceduralV115 = Omit<WarPlanetProceduralV103, "recipe"> & {
  recipe: WarPlanetRecipeV115;
  physical: {
    radiusKm: number;
    diameterKm: number;
    circumferenceKm: number;
    surfaceKm2: number;
    landAreaKm2: number;
    routeDistancesKm: { fromId: string; toId: string; distanceKm: number }[];
  };
  shapes: {
    island: string; continent: string; region: string;
    islandDescription: string; continentDescription: string; regionDescription: string;
  };
  materialDiversity: {
    land: string; liquid: string;
    landDescription: string; liquidDescription: string;
  };
};
export type GeneratedWarPlanetV115 = Omit<WarPlanetV96, "procedural"> & { procedural: WarPlanetProceduralV115 };

const sizes = ["dwarf", "small", "terran", "large", "giant", "colossal"] as const;
const integer = (value: unknown, limit: number) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value < limit;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const extraFields = ["planetSize", "islandShape", "continentShape", "regionShape", "landMaterial", "liquidMaterial"] as const;
function fnv(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
function checksum(text: string) { return fnv(text).toString(36).padStart(7, "0").slice(-5); }
export const DEFAULT_WAR_PLANET_RECIPE_V115: Readonly<WarPlanetRecipeV115> = Object.freeze({
  ...DEFAULT_WAR_PLANET_RECIPE_V103, version: 115, planetSize: "terran",
  islandShape: 2, continentShape: 3, regionShape: 2, landMaterial: 0, liquidMaterial: 0,
});
export function validateWarPlanetRecipeV115(value: unknown): WarPlanetRecipeV115 | null {
  if (!record(value) || value.version !== 115) return null;
  const { planetSize, islandShape, continentShape, regionShape, landMaterial, liquidMaterial, ...base } = value;
  if (!sizes.includes(planetSize as PlanetSizeV115) || !integer(islandShape, 40) || !integer(continentShape, 40)
    || !integer(regionShape, 40) || !integer(landMaterial, 16) || !integer(liquidMaterial, 16)) return null;
  const legacy = validateWarPlanetRecipeV103({ ...base, version: 103 });
  if (!legacy || Object.keys(value).length !== Object.keys(legacy).length + extraFields.length) return null;
  return { ...legacy, version: 115, planetSize: planetSize as PlanetSizeV115,
    islandShape: islandShape as number, continentShape: continentShape as number, regionShape: regionShape as number,
    landMaterial: landMaterial as number, liquidMaterial: liquidMaterial as number };
}
export function normalizeWarPlanetRecipeV115(value: Partial<WarPlanetRecipeV115> = {}): WarPlanetRecipeV115 {
  const result = validateWarPlanetRecipeV115({ ...DEFAULT_WAR_PLANET_RECIPE_V115, ...value });
  if (!result) throw new RangeError("Recette planétaire V115 invalide.");
  return result;
}
export function encodeWarPlanetV115(value: WarPlanetRecipeV115): string {
  const recipe = validateWarPlanetRecipeV115(value);
  if (!recipe) throw new RangeError("Recette planétaire V115 invalide.");
  const { version, planetSize, islandShape, continentShape, regionShape, landMaterial, liquidMaterial, ...base } = recipe;
  const legacy = encodeWarPlanetV103({ ...base, version: 103 });
  const segments = legacy.split("-");
  const suffix = [sizes.indexOf(planetSize).toString(36),
    islandShape.toString(36).padStart(2, "0"),
    continentShape.toString(36).padStart(2, "0"),
    regionShape.toString(36).padStart(2, "0"),
    landMaterial.toString(36), liquidMaterial.toString(36)].join("");
  const code = `proc-v115-${segments[2]}-${segments[3]}${suffix}`;
  return `${code}-${checksum(code)}`;
}
export function parseWarPlanetV115(code: string): WarPlanetRecipeV115 | null {
  if (typeof code !== "string" || code.length > 64) return null;
  const result = /^proc-v115-([0-9a-z]{1,7})-([0-9a-z]{30})-([0-9a-z]{5})$/.exec(code);
  if (!result || checksum(`proc-v115-${result[1]}-${result[2]}`) !== result[3]) return null;
  const original = `proc-v103-${result[1]}-${result[2].slice(0, 21)}`;
  const base = parseWarPlanetV103(`${original}-${checksum(original)}`);
  if (!base) return null;
  const data = result[2].slice(21);
  const size = sizes[parseInt(data[0], 36)];
  if (!size) return null;
  const recipe = validateWarPlanetRecipeV115({
    ...base, version: 115, planetSize: size,
    islandShape: parseInt(data.slice(1, 3), 36),
    continentShape: parseInt(data.slice(3, 5), 36),
    regionShape: parseInt(data.slice(5, 7), 36),
    landMaterial: parseInt(data[7], 36), liquidMaterial: parseInt(data[8], 36),
  });
  return recipe && encodeWarPlanetV115(recipe) === code ? recipe : null;
}
export function describeWarPlanetV115(id: string) {
  const recipe = parseWarPlanetV115(id);
  if (!recipe) return undefined;
  const { version, planetSize, islandShape, continentShape, regionShape, landMaterial, liquidMaterial, ...base } = recipe;
  const legacyId = encodeWarPlanetV103({ ...base, version: 103 });
  const summary = describeWarPlanetV103(legacyId);
  if (!summary) return undefined;
  return { ...summary, id, version: 115 as const,
    subtitle: `${summary.territoryCount} territoires · ${summary.regionCount} régions · rayon ${PLANET_RADII_KM_V115[planetSize]} km` };
}
export function generateWarPlanetV115(input: WarPlanetRecipeV115): GeneratedWarPlanetV115 {
  const recipe = validateWarPlanetRecipeV115(input);
  if (!recipe) throw new RangeError("Recette planétaire V115 invalide.");
  const { version, planetSize, islandShape, continentShape, regionShape, landMaterial, liquidMaterial, ...base } = recipe;
  const id = encodeWarPlanetV115(recipe), radiusKm = PLANET_RADII_KM_V115[planetSize];
  const planet = generateWarPlanetV103({ ...base, version: 103 }, {
    worldId: id, shapes: { islandShape, continentShape, regionShape },
  });
  const island = warShapeTemplateV115("island", islandShape);
  const continent = warShapeTemplateV115("continent", continentShape);
  const region = warShapeTemplateV115("region", regionShape);
  const land = WAR_PLANET_LAND_TEXTURES_V115[landMaterial], liquid = WAR_PLANET_LIQUID_TEXTURES_V115[liquidMaterial];
  const routesKm = planet.procedural.routes.map(route => ({
    fromId: route.fromId, toId: route.toId,
    distanceKm: Math.round(planetArcKilometersV115(route.distanceDegrees, planetSize)),
  }));
  const procedural: WarPlanetProceduralV115 = {
    ...planet.procedural,
    recipe,
    physical: {
      radiusKm, diameterKm: radiusKm * 2,
      circumferenceKm: Math.round(2 * Math.PI * radiusKm),
      surfaceKm2: Math.round(4 * Math.PI * radiusKm ** 2),
      landAreaKm2: Math.round(4 * Math.PI * radiusKm ** 2 * planet.landFraction),
      routeDistancesKm: routesKm,
    },
    shapes: {
      island: island.name, continent: continent.name, region: region.name,
      islandDescription: island.description, continentDescription: continent.description, regionDescription: region.description,
    },
    materialDiversity: {
      land: land.name, liquid: liquid.name,
      landDescription: land.description, liquidDescription: liquid.description,
    },
    traits: [
      ...planet.procedural.traits,
      { id: "v115-scale", name: "Taille physique du monde", description: `Rayon de ${radiusKm.toLocaleString("fr-FR")} km : surfaces et distances physiques calculées sur la sphère. Les coûts de guerre existants ne sont pas multipliés arbitrairement.` },
      { id: "v115-shapes", name: "Formes modulaires", description: `${continent.name}, ${island.name} et ${region.name} : trois profils géographiques indépendants du biome.` },
      { id: "v115-textures", name: "Matières indépendantes", description: `${land.name} sur les terres et ${liquid.name} sur la surface intermédiaire ; calques de détail procéduraux indépendants.` },
    ],
    provenance: "Monde original V115 : trois des 120 formes paramétriques, deux des 32 textures et une taille physique enregistrées dans son code. Les recettes V102/V103 restent inchangées.",
  };
  return Object.freeze({
    ...planet, id, name: `${planet.name} · ${planetSize.toUpperCase()}`,
    subtitle: `${recipe.territoryCount} territoires · ${recipe.regionCount} régions · rayon ${radiusKm.toLocaleString("fr-FR")} km`,
    description: `${planet.description} Monde de rayon ${radiusKm.toLocaleString("fr-FR")} km aux formes et textures originales configurables.`,
    layout: `procedural-v115-${recipe.landform}-${recipe.arrangement}`,
    procedural: Object.freeze(procedural),
  });
}
const cache = new Map<string, GeneratedWarPlanetV115>();
export function generatedWarPlanetV115(id: string): GeneratedWarPlanetV115 | undefined {
  const existing = cache.get(id);
  if (existing) { cache.delete(id); cache.set(id, existing); return existing; }
  const recipe = parseWarPlanetV115(id);
  if (!recipe) return undefined;
  const planet = generateWarPlanetV115(recipe);
  cache.set(id, planet);
  while (cache.size > 24) cache.delete(cache.keys().next().value!);
  return planet;
}
