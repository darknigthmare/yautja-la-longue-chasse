import type { WarPlanetLandBiomeV96, WarPlanetSurfaceKindV96, WarPlanetSurfaceV96, WarPlanetV96 } from "./clanWarPlanetsV96";
import { WAR_TERRITORIES_V85 } from "./clanWarV85Data";
import { generatedPlanetGeographyV102 } from "./clanWarPlanetGeographyV102";

export const WAR_PLANET_LANDFORMS_V102 = ["supercontinent", "continents", "archipelago", "shattered"] as const;
export const WAR_PLANET_COVERAGES_V102 = ["low", "balanced", "high"] as const;
export const WAR_PLANET_COASTS_V102 = ["smooth", "rugged", "fjords"] as const;
export const WAR_PLANET_BIOMES_V102 = ["temperate", "jungle", "tundra", "snow", "desert", "volcanic", "salt", "mountain", "ocean", "swamp", "crystal", "fungal", "irradiated"] as const;
export const WAR_PLANET_SURFACES_V102 = ["water", "acid", "ice", "sand", "lava", "brine", "radioactive", "crystal", "spores", "mist"] as const;
export const WAR_PLANET_DIVERSITIES_V102 = ["uniform", "varied"] as const;
export const WAR_PLANET_ATMOSPHERES_V102 = ["clear", "haze", "storm", "aurora"] as const;

/** A versioned, self-contained recipe. Changing V102's geometry or parameter
 * interpretation after publication requires a new generator version so that
 * saved fronts and shared codes retain the same world and territorial graph. */
export interface WarPlanetRecipeV102 {
  version: 102;
  seed: number;
  landform: typeof WAR_PLANET_LANDFORMS_V102[number];
  landCoverage: typeof WAR_PLANET_COVERAGES_V102[number];
  coast: typeof WAR_PLANET_COASTS_V102[number];
  landBiome: WarPlanetLandBiomeV96;
  surface: WarPlanetSurfaceKindV96;
  biomeDiversity: typeof WAR_PLANET_DIVERSITIES_V102[number];
  atmosphere: typeof WAR_PLANET_ATMOSPHERES_V102[number];
}
export interface WarPlanetRegionDescriptionV102 {
  regionId: string;
  biome: WarPlanetLandBiomeV96;
  description: string;
  features: string[];
  resources: string[];
  climate: string;
}
export interface WarPlanetProceduralV102 {
  recipe: WarPlanetRecipeV102;
  regions: WarPlanetRegionDescriptionV102[];
  landmasses: { landmassId: string; name: string; kind: "continent" | "island"; description: string }[];
  traits: { id: string; name: string; description: string }[];
  environment: { climate: string; atmosphere: string; liquid: string; gravity: number; dayLengthHours: number };
  routes: { fromId: string; toId: string; kind: "land" | "crossing"; distanceDegrees: number }[];
  provenance: string;
}
export type GeneratedWarPlanetV102 = WarPlanetV96 & { procedural: WarPlanetProceduralV102 };

export const DEFAULT_WAR_PLANET_RECIPE_V102: Readonly<WarPlanetRecipeV102> = Object.freeze({
  version: 102, seed: 1028507, landform: "continents", landCoverage: "balanced", coast: "rugged",
  landBiome: "temperate", surface: "water", biomeDiversity: "varied", atmosphere: "haze",
});

const fields = ["landform", "landCoverage", "coast", "landBiome", "surface", "biomeDiversity", "atmosphere"] as const;
const options = [WAR_PLANET_LANDFORMS_V102, WAR_PLANET_COVERAGES_V102, WAR_PLANET_COASTS_V102, WAR_PLANET_BIOMES_V102, WAR_PLANET_SURFACES_V102, WAR_PLANET_DIVERSITIES_V102, WAR_PLANET_ATMOSPHERES_V102];
const keys = ["version", "seed", ...fields];
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}
export function planetRandomV102(seed: number, salt: number): number {
  let value = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  value = Math.imul(value ^ value >>> 13, 0xc2b2ae35);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}

/** Strict validation is used for imported recipes and archive identities. */
export function validateWarPlanetRecipeV102(value: unknown): WarPlanetRecipeV102 | null {
  if (!record(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))
    || value.version !== 102 || typeof value.seed !== "number" || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff
    || fields.some((field, index) => !(options[index] as readonly unknown[]).includes(value[field]))) return null;
  return {
    version: 102, seed: value.seed, landform: value.landform as WarPlanetRecipeV102["landform"],
    landCoverage: value.landCoverage as WarPlanetRecipeV102["landCoverage"], coast: value.coast as WarPlanetRecipeV102["coast"],
    landBiome: value.landBiome as WarPlanetLandBiomeV96, surface: value.surface as WarPlanetSurfaceKindV96,
    biomeDiversity: value.biomeDiversity as WarPlanetRecipeV102["biomeDiversity"], atmosphere: value.atmosphere as WarPlanetRecipeV102["atmosphere"],
  };
}
export function normalizeWarPlanetRecipeV102(value: Partial<WarPlanetRecipeV102> = {}): WarPlanetRecipeV102 {
  if (!record(value) || Object.keys(value).some(key => !keys.includes(key))) throw new RangeError("Recette planétaire V102 invalide.");
  const valid = validateWarPlanetRecipeV102({ ...DEFAULT_WAR_PLANET_RECIPE_V102, ...value });
  if (!valid) throw new RangeError("Recette planétaire V102 invalide.");
  return valid;
}
/** Numeric seeds are preserved; named seeds are NFC-normalized and hashed.
 * The resulting uint32, rather than the unbounded input text, is shared. */
export function seedFromTextV102(text: string): number {
  if (typeof text !== "string" || text.length > 128 || !text.trim()) throw new RangeError("La graine doit contenir entre 1 et 128 caractères.");
  const normalized = text.trim().normalize("NFC");
  if (/^\d{1,10}$/.test(normalized) && Number(normalized) <= 0xffffffff) return Number(normalized);
  return hash(normalized);
}
function identityBody(recipe: WarPlanetRecipeV102) {
  return `proc-v102-${recipe.seed.toString(36)}-${fields.map((field, index) => (options[index] as readonly string[]).indexOf(recipe[field]).toString(36)).join("")}`;
}
export function encodeWarPlanetV102(input: WarPlanetRecipeV102): string {
  const recipe = validateWarPlanetRecipeV102(input);
  if (!recipe) throw new RangeError("Recette planétaire V102 invalide.");
  const body = identityBody(recipe);
  return `${body}-${hash(body).toString(36).padStart(7, "0").slice(-5)}`;
}
/** Bounded parsing needs no geometry or mutable registry. The checksum detects
 * transcription errors; it is not an authentication or integrity credential. */
export function parseWarPlanetV102(id: string): WarPlanetRecipeV102 | null {
  if (typeof id !== "string" || id.length > 40) return null;
  const match = /^proc-v102-([0-9a-z]{1,7})-([0-9a-z]{7})-([0-9a-z]{5})$/.exec(id);
  if (!match) return null;
  const seed = parseInt(match[1], 36);
  const value: Record<string, unknown> = { version: 102, seed };
  fields.forEach((field, index) => { value[field] = options[index][parseInt(match[2][index], 36)]; });
  const recipe = validateWarPlanetRecipeV102(value);
  return recipe && encodeWarPlanetV102(recipe) === id ? recipe : null;
}

interface BiomeDescription { label: string; climate: string; features: readonly string[]; variants: readonly WarPlanetLandBiomeV96[] }
export const WAR_PLANET_BIOME_DESCRIPTIONS_V102: Record<WarPlanetLandBiomeV96, BiomeDescription> = {
  temperate: { label: "forêts tempérées", climate: "Tempéré, précipitations saisonnières", features: ["vallées forestières", "clairières rocheuses", "falaises couvertes de mousses", "dorsales de granite"], variants: ["temperate", "mountain", "jungle", "swamp", "tundra"] },
  jungle: { label: "jungles", climate: "Chaud et humide", features: ["canopée dense", "ravins de racines", "terrasses humides", "falaises tropicales"], variants: ["jungle", "swamp", "temperate", "mountain", "ocean"] },
  tundra: { label: "toundras", climate: "Froid, vents persistants", features: ["plaines de lichens", "moraines pierreuses", "vallées de gel", "crêtes exposées"], variants: ["tundra", "snow", "mountain", "temperate"] },
  snow: { label: "terres enneigées", climate: "Polaire, faibles températures", features: ["névés profonds", "séracs", "plateaux balayés par le vent", "moraines blanches"], variants: ["snow", "tundra", "mountain"] },
  desert: { label: "déserts", climate: "Aride, amplitudes thermiques marquées", features: ["mesas érodées", "canyons secs", "tables de grès", "champs de pierres"], variants: ["desert", "mountain", "salt", "volcanic"] },
  volcanic: { label: "terres volcaniques", climate: "Chaud, émissions minérales locales", features: ["coulées refroidies", "cratères éteints", "corniches d’obsidienne", "fumerolles"], variants: ["volcanic", "mountain", "desert", "crystal"] },
  salt: { label: "plateaux salins", climate: "Sec, dépôts évaporitiques", features: ["dalles de sel", "terrasses calcifiées", "falaises poreuses", "croûtes minérales"], variants: ["salt", "desert", "mountain", "crystal"] },
  mountain: { label: "montagnes", climate: "Montagnard, gradients d’altitude", features: ["hautes crêtes", "cols étroits", "vallées encaissées", "éboulis"], variants: ["mountain", "temperate", "tundra", "desert", "volcanic"] },
  ocean: { label: "terres littorales", climate: "Maritime, vents côtiers", features: ["falaises marines", "baies rocheuses", "caps battus par le vent", "terrasses littorales"], variants: ["ocean", "temperate", "jungle", "swamp", "mountain"] },
  swamp: { label: "marécages", climate: "Humide, poches de brouillard", features: ["berges tourbeuses", "racines compactes", "buttes humides", "forêts inondables"], variants: ["swamp", "jungle", "temperate", "fungal"] },
  crystal: { label: "reliefs cristallins", climate: "Minéral, variations thermiques fortes", features: ["géodes ouvertes", "crêtes de quartz", "failles irisées", "plateaux de prismes"], variants: ["crystal", "mountain", "salt", "irradiated"] },
  fungal: { label: "forêts fongiques", climate: "Humide, dispersion biologique", features: ["réseaux de mycélium", "corolles géantes", "racines minéralisées", "bosquets luminescents"], variants: ["fungal", "swamp", "jungle", "crystal"] },
  irradiated: { label: "roches irradiées", climate: "Milieu minéral exposé", features: ["quartz fluorescents", "dalles denses", "ravins scintillants", "crêtes plombifères"], variants: ["irradiated", "crystal", "volcanic", "desert"] },
};
const surfaceDescriptions: Record<WarPlanetSurfaceKindV96, { name: string; description: string; hue: number; saturation: number }> = {
  water: { name: "Océans et détroits", description: "Eaux libres entre les terres ; les liaisons stratégiques relient les rives.", hue: 202, saturation: 55 },
  acid: { name: "Mers corrosives", description: "Bassins acides ; les surfaces corrosives restent hors des zones conquérables.", hue: 86, saturation: 65 },
  ice: { name: "Banquises et chenaux gelés", description: "Étendues de glace entre les terres ; la banquise ne constitue pas un territoire supplémentaire.", hue: 193, saturation: 35 },
  sand: { name: "Mers de dunes", description: "Bassins de sable entre les plateaux ; cette surface solide ne représente pas un liquide.", hue: 35, saturation: 48 },
  lava: { name: "Bassins de lave", description: "Roche en fusion entre les massifs ; seules les liaisons affichées permettent une traversée stratégique.", hue: 13, saturation: 76 },
  brine: { name: "Saumures minérales", description: "Étendues salines liquides séparant les terres émergées.", hue: 324, saturation: 42 },
  radioactive: { name: "Nappes irradiées", description: "Bassins lumineux exposés aux radiations ; ils restent en dehors des territoires.", hue: 142, saturation: 68 },
  crystal: { name: "Champs de cristaux", description: "Nappes cristallines solides entre les terres ; il ne s’agit pas d’un océan liquide.", hue: 273, saturation: 47 },
  spores: { name: "Nappes de spores", description: "Milieu biologique de spores entre les plateaux ; les terres fermes portent les territoires.", hue: 287, saturation: 38 },
  mist: { name: "Bassins de brume", description: "Vallées noyées de brume entre les terres hautes ; ce fond atmosphérique n’est pas une mer liquide.", hue: 188, saturation: 29 },
};
const atmosphereDescriptions = {
  clear: "Atmosphère claire, nuages rares et voile de diffusion discret",
  haze: "Atmosphère voilée, aérosols diffus et nébulosité modérée",
  storm: "Couches nuageuses denses et bandes de perturbations",
  aurora: "Ciel auroral, émissions polaires et nuages fins",
};
function hexHsl(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100, l = lightness / 100;
  const f = (n: number) => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function generatedSurface(recipe: WarPlanetRecipeV102): WarPlanetSurfaceV96 {
  const design = surfaceDescriptions[recipe.surface];
  const hue = (design.hue + planetRandomV102(recipe.seed, 70) * 24 - 12 + 360) % 360;
  return { kind: recipe.surface, name: design.name, base: hexHsl(hue, design.saturation, recipe.surface === "ice" ? 63 : 34), deep: hexHsl(hue, design.saturation * .75, 13), accent: hexHsl(hue, design.saturation, 65), detail: hexHsl(hue, design.saturation * .55, 86) };
}
function names(seed: number) {
  const beginnings = ["Vael", "Kor", "Nyr", "Sha", "Ura", "Thel", "Oma", "Zhar", "Kel", "Ira", "Vor", "Rha"];
  const endings = ["atha", "ion", "ek", "ora", "ys", "uun", "ara", "oth", "ir", "essa", "aal", "eth"];
  return `${beginnings[Math.floor(planetRandomV102(seed, 80) * beginnings.length)]}${endings[Math.floor(planetRandomV102(seed, 81) * endings.length)]}-${seed.toString(36).toUpperCase()}`;
}
const regionKinds = ["Marches", "Dorsale", "Terrasses", "Caps", "Plateaux", "Vallées"];
const regionEpithets = ["des Veilleurs", "du Levant", "des Échos", "de la Longue Veille", "des Ombres", "du Crépuscule", "des Brasiers", "des Balises", "des Refuges", "des Horizons", "des Roches", "des Brumes"];
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
export function generateWarPlanetV102(input: WarPlanetRecipeV102): GeneratedWarPlanetV102 {
  const recipe = validateWarPlanetRecipeV102(input);
  if (!recipe) throw new RangeError("Recette planétaire V102 invalide.");
  const id = encodeWarPlanetV102(recipe), seed = recipe.seed;
  const name = names(seed), surface = generatedSurface(recipe);
  const regionNames = Array.from({ length: 6 }, (_, index) => `${regionKinds[index]} ${regionEpithets[(index + Math.floor(planetRandomV102(seed, 82) * regionEpithets.length)) % regionEpithets.length]}`);
  const geography = generatedPlanetGeographyV102(recipe, id, regionNames);
  const variants = WAR_PLANET_BIOME_DESCRIPTIONS_V102[recipe.landBiome].variants;
  const regionDetails = geography.regions.map((region, index): WarPlanetRegionDescriptionV102 => {
    const biome = recipe.biomeDiversity === "uniform" || index === 0 ? recipe.landBiome : variants[1 + ((index - 1 + Math.floor(planetRandomV102(seed, 91) * (variants.length - 1))) % (variants.length - 1))];
    const design = WAR_PLANET_BIOME_DESCRIPTIONS_V102[biome];
    const featureIndex = Math.floor(planetRandomV102(seed, 100 + index) * design.features.length);
    const features = [design.features[featureIndex], design.features[(featureIndex + 1) % design.features.length]];
    const members = WAR_TERRITORIES_V85.filter(item => region.territoryIds.includes(item.id));
    const resources = [...new Set(members.map(item => item.kind))];
    const masses = new Set(geography.territories.filter(item => item.regionId === region.id).map(item => item.landmassId)).size;
    return { regionId: region.id, biome, climate: design.climate, features, resources,
      description: `${region.name} : ${design.label}, ${features.join(" et ")}. Ses six territoires occupent ${masses} masse${masses > 1 ? "s" : ""} terrestre${masses > 1 ? "s" : ""}. Les sites et revenus restent ceux du scénario stratégique.` };
  });
  const definitions = WAR_TERRITORIES_V85.map((source, index) => {
    const regionIndex = Math.floor(index / 6), region = geography.regions[regionIndex], detail = regionDetails[regionIndex];
    const neighbors = [...geography.neighbors.get(source.id)!].sort();
    const terrain = detail.features[index % 2];
    const routes = `Liaisons vers ${neighbors.map(neighbor => neighbor.replace("CON-", "")).join(", ")}.`;
    return { ...source, name: `${["Vigie", "Relais", "Redoute", "Passage", "Atelier", "Halte"][index % 6]} · ${region.name}`, region: `${region.id} ${region.name}`,
      neighbors, terrain, sites: `${source.kind} sur ${terrain}`, defenses: `Relief de ${terrain}. Les règles de défense du front restent applicables.`,
      capture: `La prise de ce site suit les règles de conquête du front. ${routes}`, effect: `Site de type ${source.kind} ; production du scénario conservée.`,
      risk: `${surface.name} sépare les terres. ${routes}`, income: { ...source.income } };
  });
  const landmassDetails = geography.landmasses.map((landmass, index) => {
    const kind = landmass.territoryIds.length >= 6 ? "continent" as const : "island" as const;
    const landName = `${kind === "continent" ? "Terres" : "Île"} ${regionEpithets[(index + Math.floor(planetRandomV102(seed, 130) * regionEpithets.length)) % regionEpithets.length]} ${index + 1}`;
    const regionCount = new Set(geography.territories.filter(item => item.landmassId === landmass.id).map(item => item.regionId)).size;
    return { landmassId: landmass.id, name: landName, kind, description: `${landName} porte ${landmass.territoryIds.length} territoire${landmass.territoryIds.length > 1 ? "s" : ""} de ${regionCount} région${regionCount > 1 ? "s" : ""}. ${recipe.coast === "fjords" ? "Des anses profondes découpent ses rivages." : recipe.coast === "rugged" ? "Des caps et des baies irrégulières jalonnent ses côtes." : "Ses rivages présentent de larges courbes et des baies ouvertes."}` };
  });
  const gravity = Math.round((.65 + planetRandomV102(seed, 140) * .95) * 100) / 100;
  const dayLengthHours = 16 + Math.floor(planetRandomV102(seed, 141) * 25);
  const landFraction = geography.territories.reduce((total, territory) => total + Math.abs(territory.points.reduce((area, point, index) => {
    const next = territory.points[(index + 1) % territory.points.length];
    return area + (next[0] - point[0]) * Math.PI / 180 * (Math.sin(point[1] * Math.PI / 180) + Math.sin(next[1] * Math.PI / 180)) / 2;
  }, 0)), 0) / (4 * Math.PI);
  const continents = landmassDetails.filter(item => item.kind === "continent").length, islands = landmassDetails.length - continents;
  const procedural: WarPlanetProceduralV102 = {
    recipe, regions: regionDetails, landmasses: landmassDetails, routes: geography.routes,
    environment: { climate: WAR_PLANET_BIOME_DESCRIPTIONS_V102[recipe.landBiome].climate, atmosphere: atmosphereDescriptions[recipe.atmosphere], liquid: surfaceDescriptions[recipe.surface].description, gravity, dayLengthHours },
    traits: [
      { id: "coasts", name: "Géographie du front", description: `${continents} continent${continents > 1 ? "s" : ""}, ${islands} île${islands > 1 ? "s" : ""} et ${geography.routes.filter(route => route.kind === "crossing").length} liaisons entre terres distinctes.` },
      { id: "gravity", name: "Gravité indicative", description: `${gravity.toLocaleString("fr-FR")} g. Donnée descriptive du monde ; aucun multiplicateur de déplacement ou de combat n’est appliqué.` },
      { id: "day", name: "Durée du jour", description: `${dayLengthHours} heures. Donnée descriptive ; l’éclairage de l’atlas reste réglé par ses modules visuels.` },
      { id: "regional", name: "Diversité des terres", description: `${new Set(regionDetails.map(region => region.biome)).size} famille${new Set(regionDetails.map(region => region.biome)).size > 1 ? "s" : ""} de biomes répartie${new Set(regionDetails.map(region => region.biome)).size > 1 ? "s" : ""} sur six régions administratives.` },
    ],
    provenance: "Monde original du projet, généré par recette V102. Les descriptions environnementales n’ajoutent pas de règles de combat. Les 36 territoires conservent les rôles, factions initiales et revenus du scénario V85.",
  };
  return deepFreeze({ id, name, seed, subtitle: `${continents} continents · ${islands} îles · ${surface.name}`, description: `${name} combine ${WAR_PLANET_BIOME_DESCRIPTIONS_V102[recipe.landBiome].label} et ${surface.name.toLocaleLowerCase("fr")}. ${atmosphereDescriptions[recipe.atmosphere]}. Six régions et 36 territoires forment un front connecté.`, style: ["water", "ice", "sand"].includes(recipe.surface) && !["crystal", "fungal", "irradiated"].includes(recipe.landBiome) ? "classic" : "exotic", landBiome: recipe.landBiome, surface, layout: `procedural-v102-${recipe.landform}`, landFraction, regions: geography.regions, territories: geography.territories, landmasses: geography.landmasses, definitions, procedural });
}

const generatedCache = new Map<string, GeneratedWarPlanetV102>();
export const WAR_GENERATED_PLANET_CACHE_LIMIT_V102 = 24;
export function generatedWarPlanetV102(id: string): GeneratedWarPlanetV102 | undefined {
  const recipe = parseWarPlanetV102(id);
  if (!recipe) return undefined;
  const existing = generatedCache.get(id);
  if (existing) { generatedCache.delete(id); generatedCache.set(id, existing); return existing; }
  const planet = generateWarPlanetV102(recipe);
  generatedCache.set(id, planet);
  while (generatedCache.size > WAR_GENERATED_PLANET_CACHE_LIMIT_V102) generatedCache.delete(generatedCache.keys().next().value!);
  return planet;
}
