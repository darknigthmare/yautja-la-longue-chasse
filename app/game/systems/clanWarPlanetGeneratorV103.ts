import type { WarPlanetLandBiomeV96, WarPlanetSurfaceKindV96, WarPlanetSurfaceV96, WarPlanetV96 } from "./clanWarPlanetsV96";
import type { WarAtlasPointV95 } from "./clanWarAtlasV95";
import type { WarTerritoryDefinitionV85 } from "./clanWarV85Data";
import { WAR_PLANET_BIOME_DESCRIPTIONS_V102, seedFromTextV102, type WarPlanetRegionDescriptionV102 } from "./clanWarPlanetGeneratorV102";
import {
  DEFAULT_PLANET_MATERIAL_OPTIONS_V103, PLANET_MATERIAL_VARIANTS_V103, PLANET_MATERIAL_SCALES_V103,
  PLANET_MATERIAL_CONTRASTS_V103, PLANET_LAND_PALETTES_V103, PLANET_SURFACE_PALETTES_V103,
  type PlanetMaterialOptionsV103,
} from "./planetMaterialProfilesV103";
import { generatedPlanetGeographyV103, sphericalPolygonAreaV103 } from "./clanWarPlanetGeographyV103";

export const WAR_PLANET_TERRITORY_COUNTS_V103 = [18, 24, 36, 48, 72, 96] as const;
export const WAR_PLANET_REGION_COUNTS_V103 = [3, 4, 6, 8, 12] as const;
export const WAR_PLANET_LANDFORMS_V103 = ["supercontinent", "continents", "archipelago", "shattered"] as const;
export const WAR_PLANET_ARRANGEMENTS_V103 = ["scattered", "equatorial", "hemispheres", "polar"] as const;
export const WAR_PLANET_COVERAGES_V103 = ["low", "balanced", "high"] as const;
export const WAR_PLANET_COASTS_V103 = ["smooth", "rugged", "fjords", "peninsulas", "lobed"] as const;
export const WAR_PLANET_TERRITORY_STYLES_V103 = ["compact", "organic"] as const;
export const WAR_PLANET_REGION_BALANCES_V103 = ["balanced", "uneven"] as const;
export const WAR_PLANET_BIOMES_V103 = ["temperate", "jungle", "tundra", "snow", "desert", "volcanic", "salt", "mountain", "ocean", "swamp", "crystal", "fungal", "irradiated"] as const;
export const WAR_PLANET_SURFACES_V103 = ["water", "acid", "ice", "sand", "lava", "brine", "radioactive", "crystal", "spores", "mist"] as const;
export const WAR_PLANET_DIVERSITIES_V103 = ["uniform", "varied"] as const;
export const WAR_PLANET_ATMOSPHERES_V103 = ["clear", "haze", "storm", "aurora"] as const;
export const WAR_PLANET_HYDROLOGIES_V103 = ["none", "lakes", "rivers", "mixed"] as const;

/** Published recipe indices and geographic interpretation are immutable.
 * A change of geography, strategic graph or identity needs another version. */
export interface WarPlanetRecipeV103 extends PlanetMaterialOptionsV103 {
  version: 103;
  seed: number;
  territoryCount: typeof WAR_PLANET_TERRITORY_COUNTS_V103[number];
  regionCount: typeof WAR_PLANET_REGION_COUNTS_V103[number];
  landform: typeof WAR_PLANET_LANDFORMS_V103[number];
  arrangement: typeof WAR_PLANET_ARRANGEMENTS_V103[number];
  landCoverage: typeof WAR_PLANET_COVERAGES_V103[number];
  coast: typeof WAR_PLANET_COASTS_V103[number];
  territoryStyle: typeof WAR_PLANET_TERRITORY_STYLES_V103[number];
  regionBalance: typeof WAR_PLANET_REGION_BALANCES_V103[number];
  landBiome: WarPlanetLandBiomeV96;
  surface: WarPlanetSurfaceKindV96;
  biomeDiversity: typeof WAR_PLANET_DIVERSITIES_V103[number];
  atmosphere: typeof WAR_PLANET_ATMOSPHERES_V103[number];
  hydrology: typeof WAR_PLANET_HYDROLOGIES_V103[number];
}
export interface WarPlanetHydrologyFeatureV103 {
  id: string;
  kind: "lake" | "river";
  name: string;
  landmassId: string;
  regionIds: string[];
  points: WarAtlasPointV95[];
  description: string;
}
export interface WarPlanetStrategyV103 {
  headquarters: { "CON-F01": string; "CON-F02": string };
  startingTerritoryIds: { "CON-F01": string[]; "CON-F02": string[] };
  objectiveCorridor: string[];
}
export interface WarPlanetRouteV103 {
  fromId: string; toId: string; kind: "land" | "crossing"; distanceDegrees: number;
  hydrologyIds: string[];
  /** Continuous, unwrapped longitudes. Drawing and intersection checks use this exact path. */
  points: WarAtlasPointV95[];
}
export interface WarPlanetProceduralV103 {
  recipe: WarPlanetRecipeV103;
  regions: WarPlanetRegionDescriptionV102[];
  landmasses: { landmassId: string; name: string; kind: "continent" | "island"; description: string }[];
  traits: { id: string; name: string; description: string }[];
  environment: { climate: string; atmosphere: string; liquid: string; gravity: number; dayLengthHours: number };
  routes: WarPlanetRouteV103[];
  hydrology: { features: WarPlanetHydrologyFeatureV103[]; coveredFraction: number };
  strategy: WarPlanetStrategyV103;
  provenance: string;
}
export type GeneratedWarPlanetV103 = Omit<WarPlanetV96, "procedural"> & { procedural: WarPlanetProceduralV103 };
export type WarPlanetRecipeFieldV103 = Exclude<keyof WarPlanetRecipeV103, "version">;

export const DEFAULT_WAR_PLANET_RECIPE_V103: Readonly<WarPlanetRecipeV103> = Object.freeze({
  version: 103, seed: 1038507, territoryCount: 48, regionCount: 8,
  landform: "continents", arrangement: "scattered", landCoverage: "balanced", coast: "peninsulas",
  territoryStyle: "organic", regionBalance: "balanced", landBiome: "temperate", surface: "water",
  biomeDiversity: "varied", atmosphere: "haze", hydrology: "mixed", ...DEFAULT_PLANET_MATERIAL_OPTIONS_V103,
});
const fields = ["territoryCount", "regionCount", "landform", "arrangement", "landCoverage", "coast", "territoryStyle", "regionBalance", "landBiome", "surface", "biomeDiversity", "atmosphere", "hydrology", "landVariant", "surfaceVariant", "landScale", "surfaceScale", "landContrast", "surfaceContrast", "landPalette", "surfacePalette"] as const;
const options: readonly (readonly (string | number)[])[] = [WAR_PLANET_TERRITORY_COUNTS_V103, WAR_PLANET_REGION_COUNTS_V103, WAR_PLANET_LANDFORMS_V103, WAR_PLANET_ARRANGEMENTS_V103, WAR_PLANET_COVERAGES_V103, WAR_PLANET_COASTS_V103, WAR_PLANET_TERRITORY_STYLES_V103, WAR_PLANET_REGION_BALANCES_V103, WAR_PLANET_BIOMES_V103, WAR_PLANET_SURFACES_V103, WAR_PLANET_DIVERSITIES_V103, WAR_PLANET_ATMOSPHERES_V103, WAR_PLANET_HYDROLOGIES_V103, PLANET_MATERIAL_VARIANTS_V103, PLANET_MATERIAL_VARIANTS_V103, PLANET_MATERIAL_SCALES_V103, PLANET_MATERIAL_SCALES_V103, PLANET_MATERIAL_CONTRASTS_V103, PLANET_MATERIAL_CONTRASTS_V103, PLANET_LAND_PALETTES_V103, PLANET_SURFACE_PALETTES_V103];
export const WAR_PLANET_RECIPE_FIELDS_V103: readonly WarPlanetRecipeFieldV103[] = ["seed", ...fields];
const keys: readonly string[] = ["version", ...WAR_PLANET_RECIPE_FIELDS_V103];
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const uint32 = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
function hash(text: string) { let value = 2166136261; for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619); return value >>> 0; }
export function planetRandomV103(seed: number, salt: number): number {
  let value = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  value = Math.imul(value ^ value >>> 13, 0xc2b2ae35);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}
export const seedFromTextV103 = seedFromTextV102;
export function validateWarPlanetRecipeV103(value: unknown): WarPlanetRecipeV103 | null {
  if (!record(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))
    || value.version !== 103 || !uint32(value.seed) || fields.some((field, index) => !options[index].includes(value[field] as string | number))
    || Number(value.territoryCount) < 3 * Number(value.regionCount)) return null;
  return Object.fromEntries(keys.map(key => [key, value[key]])) as unknown as WarPlanetRecipeV103;
}
export function normalizeWarPlanetRecipeV103(value: Partial<WarPlanetRecipeV103> = {}): WarPlanetRecipeV103 {
  if (!record(value) || Object.keys(value).some(key => !keys.includes(key))) throw new RangeError("Recette planétaire V103 invalide.");
  const valid = validateWarPlanetRecipeV103({ ...DEFAULT_WAR_PLANET_RECIPE_V103, ...value });
  if (!valid) throw new RangeError("Recette V103 invalide : chaque région doit notamment contenir au moins trois territoires.");
  return valid;
}
export function encodeWarPlanetV103(input: WarPlanetRecipeV103): string {
  const recipe = validateWarPlanetRecipeV103(input);
  if (!recipe) throw new RangeError("Recette planétaire V103 invalide.");
  const body = `proc-v103-${recipe.seed.toString(36)}-${fields.map((field, index) => options[index].indexOf(recipe[field]).toString(36)).join("")}`;
  return `${body}-${hash(body).toString(36).padStart(7, "0").slice(-5)}`;
}
export function parseWarPlanetV103(id: string): WarPlanetRecipeV103 | null {
  if (typeof id !== "string" || id.length > 64) return null;
  const match = /^proc-v103-([0-9a-z]{1,7})-([0-9a-z]{21})-([0-9a-z]{5})$/.exec(id);
  if (!match) return null;
  const values: Record<string, unknown> = { version: 103, seed: parseInt(match[1], 36) };
  fields.forEach((field, index) => { values[field] = options[index][parseInt(match[2][index], 36)]; });
  const recipe = validateWarPlanetRecipeV103(values);
  return recipe && encodeWarPlanetV103(recipe) === id ? recipe : null;
}
/** Pure randomization. Editor locks are preferences, never part of the saved
 * planet. Count pairs are selected together and always satisfy N >= 3R. */
export function randomizeWarPlanetRecipeV103(base: WarPlanetRecipeV103, entropy: number, lockedFields: readonly WarPlanetRecipeFieldV103[] = []): WarPlanetRecipeV103 {
  const valid = validateWarPlanetRecipeV103(base);
  if (!valid || !uint32(entropy) || lockedFields.some(field => !WAR_PLANET_RECIPE_FIELDS_V103.includes(field))) throw new RangeError("Tirage planétaire V103 invalide.");
  const locked = new Set(lockedFields), values: Record<string, unknown> = { ...valid, seed: locked.has("seed") ? valid.seed : entropy };
  fields.forEach((field, index) => { if (!locked.has(field)) values[field] = options[index][Math.floor(planetRandomV103(entropy, 500 + index) * options[index].length)]; });
  if (locked.has("territoryCount")) values.regionCount = locked.has("regionCount") ? valid.regionCount : WAR_PLANET_REGION_COUNTS_V103.filter(count => count * 3 <= valid.territoryCount)[Math.floor(planetRandomV103(entropy, 550) * WAR_PLANET_REGION_COUNTS_V103.filter(count => count * 3 <= valid.territoryCount).length)];
  else if (locked.has("regionCount")) {
    const counts = WAR_PLANET_TERRITORY_COUNTS_V103.filter(count => count >= valid.regionCount * 3);
    values.territoryCount = counts[Math.floor(planetRandomV103(entropy, 551) * counts.length)];
  } else {
    const counts = WAR_PLANET_REGION_COUNTS_V103.filter(count => count * 3 <= Number(values.territoryCount));
    values.regionCount = counts[Math.floor(planetRandomV103(entropy, 552) * counts.length)];
  }
  return validateWarPlanetRecipeV103(values)!;
}

const surfaceNames: Record<WarPlanetSurfaceKindV96, string> = { water: "Océans et eaux intérieures", acid: "Bassins corrosifs", ice: "Banquises et chenaux gelés", sand: "Étendues de dunes", lava: "Bassins de roche en fusion", brine: "Saumures minérales", radioactive: "Nappes irradiées", crystal: "Champs cristallins", spores: "Nappes de spores", mist: "Bassins de brume" };
const hues: Record<WarPlanetSurfaceKindV96, number> = { water: 204, acid: 85, ice: 191, sand: 34, lava: 13, brine: 322, radioactive: 142, crystal: 273, spores: 288, mist: 188 };
const atmospheric = { clear: "Ciel clair et diffusion discrète", haze: "Brumes, aérosols et nébulosité modérée", storm: "Couches orageuses et perturbations visibles", aurora: "Émissions polaires et nuages fins" };
const epithets = ["des Veilleurs", "du Levant", "des Échos", "de la Longue Veille", "des Ombres", "du Crépuscule", "des Brasiers", "des Balises", "des Refuges", "des Horizons", "des Roches", "des Brumes"];
const regionKinds = ["Marches", "Dorsale", "Terrasses", "Caps", "Plateaux", "Vallées", "Confins", "Hauteurs", "Bassin", "Corniches", "Lisières", "Rives"];
function color(hue: number, saturation: number, lightness: number) {
  const f = (n: number) => { const k = (n + hue / 30) % 12, a = saturation * Math.min(lightness, 1 - lightness); return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function surfaceFor(recipe: WarPlanetRecipeV103): WarPlanetSurfaceV96 {
  const hue = (hues[recipe.surface] + planetRandomV103(recipe.seed, 70) * 24 - 12 + 360) % 360;
  return { kind: recipe.surface, name: surfaceNames[recipe.surface], base: color(hue, .5, recipe.surface === "ice" ? .63 : .34), deep: color(hue, .42, .13), accent: color(hue, .58, .65), detail: color(hue, .3, .86) };
}
function worldName(seed: number) {
  const starts = ["Vael", "Kor", "Nyr", "Sha", "Ura", "Thel", "Oma", "Zhar", "Kel", "Ira", "Vor", "Rha"], ends = ["atha", "ion", "ek", "ora", "ys", "uun", "ara", "oth", "ir", "essa", "aal", "eth"];
  return `${starts[Math.floor(planetRandomV103(seed, 80) * starts.length)]}${ends[Math.floor(planetRandomV103(seed, 81) * ends.length)]}-${seed.toString(36).toUpperCase()}`;
}
/** Catalogue cards resolve identity without allocating any mesh or route graph. */
export function describeWarPlanetV103(id: string): (Pick<WarPlanetV96, "id" | "name" | "subtitle" | "landBiome" | "surface" | "style"> & { territoryCount: number; regionCount: number; version: 103 }) | undefined {
  const recipe = parseWarPlanetV103(id);
  if (!recipe) return undefined;
  const surface = surfaceFor(recipe);
  return { id, name: worldName(recipe.seed), subtitle: `${recipe.territoryCount} territoires · ${recipe.regionCount} régions · ${surface.name}`, landBiome: recipe.landBiome, surface, territoryCount: recipe.territoryCount, regionCount: recipe.regionCount, version: 103,
    style: ["water", "ice", "sand"].includes(recipe.surface) && !["crystal", "fungal", "irradiated"].includes(recipe.landBiome) ? "classic" : "exotic" };
}
function freeze<T>(value: T): T { if (typeof value === "object" && value !== null && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function strategicPlan(territories: { id: string; regionId: string }[], regions: { territoryIds: string[] }[], neighbors: Map<string, Set<string>>, recipe: WarPlanetRecipeV103): WarPlanetStrategyV103 {
  const start = regions[0].territoryIds[0];
  const paths = new Map<string, string[]>([[start, [start]]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of [...neighbors.get(queue[i])!].sort()) if (!paths.has(next)) { paths.set(next, [...paths.get(queue[i])!, next]); queue.push(next); }
  const byId = new Map(territories.map(item => [item.id, item]));
  const far = territories.filter(item => item.regionId !== byId.get(start)!.regionId).sort((a, b) => paths.get(b.id)!.length - paths.get(a.id)!.length || a.id.localeCompare(b.id))[0].id;
  const pocket = (root: string) => {
    const target = Math.min(6, Math.max(3, Math.round(recipe.territoryCount / 12))), regionId = byId.get(root)!.regionId, result = [root], visited = new Set(result);
    for (let i = 0; i < result.length && result.length < target; i++) for (const next of [...neighbors.get(result[i])!].sort()) if (!visited.has(next) && byId.get(next)!.regionId === regionId && result.length < target) { visited.add(next); result.push(next); }
    return result;
  };
  return { headquarters: { "CON-F01": start, "CON-F02": far }, startingTerritoryIds: { "CON-F01": pocket(start), "CON-F02": pocket(far) }, objectiveCorridor: paths.get(far)! };
}
export function generateWarPlanetV103(input: WarPlanetRecipeV103): GeneratedWarPlanetV103 {
  const recipe = validateWarPlanetRecipeV103(input);
  if (!recipe) throw new RangeError("Recette planétaire V103 invalide.");
  const id = encodeWarPlanetV103(recipe), seed = recipe.seed, name = worldName(seed), surface = surfaceFor(recipe);
  const regionNames = Array.from({ length: recipe.regionCount }, (_, index) => `${regionKinds[index]} ${epithets[(index + Math.floor(planetRandomV103(seed, 82) * epithets.length)) % epithets.length]}`);
  const geography = generatedPlanetGeographyV103(recipe, id, regionNames);
  const strategy = strategicPlan(geography.territories, geography.regions, geography.neighbors, recipe);
  const regionBiomes = geography.regions.map((_, index) => {
    const variants = WAR_PLANET_BIOME_DESCRIPTIONS_V102[recipe.landBiome].variants;
    return recipe.biomeDiversity === "uniform" || index === 0 ? recipe.landBiome : variants[1 + ((index - 1 + Math.floor(planetRandomV103(seed, 91) * (variants.length - 1))) % (variants.length - 1))];
  });
  const roles = ["Dépôt", "Atelier", "Assemblée", "Passage", "Fort", "Habitat", "Observation"];
  const definitions: WarTerritoryDefinitionV85[] = geography.territories.map((territory, index) => {
    const regionIndex = geography.regions.findIndex(item => item.id === territory.regionId), region = geography.regions[regionIndex], local = region.territoryIds.indexOf(territory.id);
    const design = WAR_PLANET_BIOME_DESCRIPTIONS_V102[regionBiomes[regionIndex]], terrain = design.features[local % design.features.length];
    const own = strategy.startingTerritoryIds["CON-F01"].indexOf(territory.id), enemy = strategy.startingTerritoryIds["CON-F02"].indexOf(territory.id);
    const kind = roles[(own >= 0 ? own : enemy >= 0 ? enemy : local) % roles.length];
    const neighbors = [...geography.neighbors.get(territory.id)!].sort(), crossings = geography.routes.filter(route => route.kind === "crossing" && (route.fromId === territory.id || route.toId === territory.id)).length;
    return { id: territory.id, name: `${kind} ${index + 1} · ${region.name}`, region: `${region.id} ${region.name}`, kind, neighbors,
      initialController: own >= 0 ? "CON-F01" : enemy >= 0 ? "CON-F02" : "CON-F03", terrain,
      sites: `${kind} sur ${terrain}`, defenses: `Le relief de ${terrain} décrit le site ; les règles de défense du front restent applicables.`,
      capture: `Conquête selon les règles du front. Liaisons vers ${neighbors.map(next => next.replace("CON-", "")).join(", ")}.`,
      effect: `Production locale : ${kind === "Dépôt" ? "S +2" : kind === "Atelier" ? "M +2" : kind === "Assemblée" ? "I +1" : "aucun revenu de base"}.`,
      risk: `${crossings} traversée${crossings > 1 ? "s" : ""} autorisée${crossings > 1 ? "s" : ""} vers les voisins ; les autres déplacements suivent les frontières terrestres.`,
      income: { s: kind === "Dépôt" ? 2 : 0, m: kind === "Atelier" ? 2 : 0, i: kind === "Assemblée" ? 1 : 0 } };
  });
  const regions: WarPlanetRegionDescriptionV102[] = geography.regions.map((region, index) => {
    const biome = regionBiomes[index], design = WAR_PLANET_BIOME_DESCRIPTIONS_V102[biome], feature = Math.floor(planetRandomV103(seed, 100 + index) * design.features.length);
    const features = [design.features[feature], design.features[(feature + 1) % design.features.length]], resources = [...new Set(definitions.filter(item => region.territoryIds.includes(item.id)).map(item => item.kind))];
    const masses = new Set(geography.territories.filter(item => item.regionId === region.id).map(item => item.landmassId)).size;
    return { regionId: region.id, biome, climate: design.climate, features, resources, description: `${region.name} : ${design.label}, ${features.join(" et ")}. ${region.territoryIds.length} territoires reliés occupent ${masses} masse${masses > 1 ? "s" : ""} terrestre${masses > 1 ? "s" : ""}. Les sites du dossier correspondent aux ressources de ce front.` };
  });
  const landmasses = geography.landmasses.map((mass, index) => {
    const kind = mass.territoryIds.length >= Math.max(6, recipe.territoryCount / 10) ? "continent" as const : "island" as const;
    const title = `${kind === "continent" ? "Terres" : "Île"} ${epithets[(index + Math.floor(planetRandomV103(seed, 130) * epithets.length)) % epithets.length]} ${index + 1}`;
    return { landmassId: mass.id, name: title, kind, description: `${title} porte ${mass.territoryIds.length} territoires aux cellules irrégulières. Ses contours suivent le profil ${recipe.coast === "peninsulas" ? "de péninsules et de golfes" : recipe.coast === "lobed" ? "de lobes et d’isthmes" : recipe.coast === "fjords" ? "de fjords et criques" : recipe.coast === "rugged" ? "de caps et de baies" : "de côtes douces"}.` };
  });
  const medium = ["ice", "sand", "crystal", "spores", "mist"].includes(recipe.surface) ? "Bassins et chenaux du milieu sélectionné ; leur aspect n’implique pas une eau liquide." : `${surface.name} : étendues et chenaux séparant ou traversant les terres.`;
  const hydrology = { ...geography.hydrology, features: geography.hydrology.features.map((feature, index) => ({ ...feature, name: `${feature.kind === "lake" ? "Bassin" : "Chenal"} ${epithets[(index + 3) % epithets.length]}`, description: `${feature.kind === "lake" ? "Bassin intérieur" : "Chenal sinueux"} de ${surface.name.toLocaleLowerCase("fr")}. Les marqueurs restent sur terre et les traversées autorisées sont indiquées par les routes.` })) };
  const gravity = Math.round((.65 + planetRandomV103(seed, 140) * .95) * 100) / 100, dayLengthHours = 16 + Math.floor(planetRandomV103(seed, 141) * 25);
  const landFraction = Math.max(0, geography.landmasses.reduce((sum, mass) => sum + sphericalPolygonAreaV103(mass.points), 0) / (4 * Math.PI) - hydrology.coveredFraction);
  const procedural: WarPlanetProceduralV103 = { recipe, regions, landmasses, routes: geography.routes, hydrology, strategy,
    environment: { climate: WAR_PLANET_BIOME_DESCRIPTIONS_V102[recipe.landBiome].climate, atmosphere: atmospheric[recipe.atmosphere], liquid: medium, gravity, dayLengthHours },
    traits: [
      { id: "format", name: "Format stratégique", description: `${recipe.territoryCount} territoires et ${recipe.regionCount} régions ; les départs des Haltes et des Forges possèdent chacun une poche contiguë et leurs sources S/M/I.` },
      { id: "geography", name: "Terres et traversées", description: `${landmasses.length} masses terrestres et ${geography.routes.filter(route => route.kind === "crossing").length} traversées autorisées forment un front connecté.` },
      { id: "hydrology", name: "Bassins et chenaux", description: `${hydrology.features.length} milieux intérieurs dessinés dans les terres. Ils ne constituent pas de nouveaux territoires ni une simulation de débit.` },
      { id: "gravity", name: "Gravité indicative", description: `${gravity.toLocaleString("fr-FR")} g. Donnée descriptive ; aucun multiplicateur de déplacement ou de combat n’est appliqué.` },
      { id: "day", name: "Durée du jour", description: `${dayLengthHours} heures. Donnée descriptive indépendante des coûts de guerre.` },
    ], provenance: "Monde original du projet généré par recette V103. Le format, les sites et les routes sont réellement stratégiques ; climat, gravité et effets atmosphériques restent descriptifs. Les recettes historiques V102 conservent leur propre générateur." };
  return freeze({ id, name, seed, subtitle: `${recipe.territoryCount} territoires · ${recipe.regionCount} régions · ${surface.name}`, description: `${name} réunit ${landmasses.length} masses terrestres, des régions ${recipe.regionBalance === "uneven" ? "de tailles variables" : "équilibrées"} et ${hydrology.features.length} bassins ou chenaux intérieurs. ${atmospheric[recipe.atmosphere]}.`, style: ["water", "ice", "sand"].includes(recipe.surface) && !["crystal", "fungal", "irradiated"].includes(recipe.landBiome) ? "classic" : "exotic", landBiome: recipe.landBiome, surface, layout: `procedural-v103-${recipe.landform}-${recipe.arrangement}`, landFraction, regions: geography.regions, territories: geography.territories, landmasses: geography.landmasses, definitions, procedural });
}
const cache = new Map<string, GeneratedWarPlanetV103>();
export const WAR_GENERATED_PLANET_CACHE_LIMIT_V103 = 24;
export function generatedWarPlanetV103(id: string): GeneratedWarPlanetV103 | undefined {
  const existing = cache.get(id);
  if (existing) { cache.delete(id); cache.set(id, existing); return existing; }
  const recipe = parseWarPlanetV103(id);
  if (!recipe) return undefined;
  const planet = generateWarPlanetV103(recipe);
  cache.set(id, planet);
  while (cache.size > WAR_GENERATED_PLANET_CACHE_LIMIT_V103) cache.delete(cache.keys().next().value!);
  return planet;
}
