import type { WarPlanetRecipeV102 } from "./clanWarPlanetGeneratorV102";
import {
  DEFAULT_WAR_PLANET_RECIPE_V103, WAR_PLANET_REGION_COUNTS_V103, WAR_PLANET_TERRITORY_COUNTS_V103,
  validateWarPlanetRecipeV103, type WarPlanetRecipeFieldV103, type WarPlanetRecipeV103,
} from "./clanWarPlanetGeneratorV103";

export type WarPlanetPresetV103 = "earthlike" | "alien";
export type WarPlanetStrategicPresetV114 = "skirmish" | "frontier" | "campaign" | "archipelago" | "continental" | "grand";
export type WarPlanetAmbiencePresetV114 = "oceanic" | "jungle" | "desert" | "cryo" | "volcanic" | "toxic" | "crystal" | "fungal";

export const WAR_PLANET_STRATEGIC_PRESETS_V114: Readonly<Record<WarPlanetStrategicPresetV114, string>> = Object.freeze({
  skirmish: "Escarmouche", frontier: "Frontière", campaign: "Campagne", archipelago: "Archipel", continental: "Continental", grand: "Grande guerre",
});
export const WAR_PLANET_AMBIENCE_PRESETS_V114: Readonly<Record<WarPlanetAmbiencePresetV114, string>> = Object.freeze({
  oceanic: "Terrestre océanique", jungle: "Jungle humide", desert: "Désert minéral", cryo: "Monde cryogénique",
  volcanic: "Volcanique", toxic: "Toxique irradié", crystal: "Cristallin alien", fungal: "Fongique alien",
});

const presets: Record<WarPlanetPresetV103, Omit<WarPlanetRecipeV103, "seed" | "version">> = {
  earthlike: {
    territoryCount: 48, regionCount: 8, landform: "continents", arrangement: "scattered",
    landCoverage: "balanced", coast: "peninsulas", territoryStyle: "organic", regionBalance: "balanced",
    landBiome: "temperate", surface: "water", biomeDiversity: "varied", atmosphere: "haze", hydrology: "mixed",
    landVariant: "earthlike", surfaceVariant: "earthlike", landScale: "medium", surfaceScale: "broad",
    landContrast: "balanced", surfaceContrast: "soft", landPalette: "verdant", surfacePalette: "azure",
  },
  alien: {
    territoryCount: 48, regionCount: 8, landform: "archipelago", arrangement: "hemispheres",
    landCoverage: "low", coast: "lobed", territoryStyle: "organic", regionBalance: "uneven",
    landBiome: "crystal", surface: "acid", biomeDiversity: "varied", atmosphere: "aurora", hydrology: "lakes",
    landVariant: "alien", surfaceVariant: "alien", landScale: "fine", surfaceScale: "medium",
    landContrast: "strong", surfaceContrast: "strong", landPalette: "violet", surfacePalette: "turquoise",
  },
};

const strategicPresets: Record<WarPlanetStrategicPresetV114, Partial<WarPlanetRecipeV103>> = {
  skirmish: { territoryCount: 18, regionCount: 3, landform: "continents", arrangement: "scattered", landCoverage: "balanced", coast: "rugged", territoryStyle: "compact", regionBalance: "balanced", hydrology: "none" },
  frontier: { territoryCount: 24, regionCount: 4, landform: "continents", arrangement: "hemispheres", landCoverage: "balanced", coast: "peninsulas", territoryStyle: "organic", regionBalance: "uneven", hydrology: "rivers" },
  campaign: { territoryCount: 36, regionCount: 6, landform: "continents", arrangement: "scattered", landCoverage: "balanced", coast: "rugged", territoryStyle: "organic", regionBalance: "balanced", hydrology: "mixed" },
  archipelago: { territoryCount: 48, regionCount: 8, landform: "archipelago", arrangement: "scattered", landCoverage: "low", coast: "fjords", territoryStyle: "organic", regionBalance: "uneven", hydrology: "mixed" },
  continental: { territoryCount: 72, regionCount: 12, landform: "supercontinent", arrangement: "equatorial", landCoverage: "high", coast: "lobed", territoryStyle: "compact", regionBalance: "uneven", hydrology: "lakes" },
  grand: { territoryCount: 96, regionCount: 12, landform: "shattered", arrangement: "polar", landCoverage: "balanced", coast: "peninsulas", territoryStyle: "organic", regionBalance: "uneven", hydrology: "mixed" },
};

const ambiencePresets: Record<WarPlanetAmbiencePresetV114, Partial<WarPlanetRecipeV103>> = {
  oceanic: { landBiome: "temperate", surface: "water", biomeDiversity: "varied", atmosphere: "haze", landVariant: "earthlike", surfaceVariant: "earthlike", landScale: "medium", surfaceScale: "broad", landContrast: "balanced", surfaceContrast: "soft", landPalette: "verdant", surfacePalette: "azure" },
  jungle: { landBiome: "jungle", surface: "water", biomeDiversity: "varied", atmosphere: "haze", landVariant: "earthlike", surfaceVariant: "earthlike", landScale: "fine", surfaceScale: "medium", landContrast: "strong", surfaceContrast: "soft", landPalette: "verdant", surfacePalette: "turquoise" },
  desert: { landBiome: "desert", surface: "sand", biomeDiversity: "varied", atmosphere: "clear", landVariant: "earthlike", surfaceVariant: "earthlike", landScale: "medium", surfaceScale: "broad", landContrast: "balanced", surfaceContrast: "balanced", landPalette: "ochre", surfacePalette: "amber" },
  cryo: { landBiome: "snow", surface: "ice", biomeDiversity: "varied", atmosphere: "clear", landVariant: "earthlike", surfaceVariant: "earthlike", landScale: "fine", surfaceScale: "medium", landContrast: "soft", surfaceContrast: "balanced", landPalette: "ashen", surfacePalette: "azure" },
  volcanic: { landBiome: "volcanic", surface: "lava", biomeDiversity: "varied", atmosphere: "storm", landVariant: "alien", surfaceVariant: "alien", landScale: "medium", surfaceScale: "medium", landContrast: "strong", surfaceContrast: "strong", landPalette: "ashen", surfacePalette: "amber" },
  toxic: { landBiome: "irradiated", surface: "acid", biomeDiversity: "varied", atmosphere: "storm", landVariant: "alien", surfaceVariant: "alien", landScale: "fine", surfaceScale: "medium", landContrast: "strong", surfaceContrast: "strong", landPalette: "ochre", surfacePalette: "turquoise" },
  crystal: { landBiome: "crystal", surface: "crystal", biomeDiversity: "varied", atmosphere: "aurora", landVariant: "alien", surfaceVariant: "alien", landScale: "fine", surfaceScale: "fine", landContrast: "strong", surfaceContrast: "strong", landPalette: "violet", surfacePalette: "violet" },
  fungal: { landBiome: "fungal", surface: "spores", biomeDiversity: "varied", atmosphere: "haze", landVariant: "alien", surfaceVariant: "alien", landScale: "fine", surfaceScale: "medium", landContrast: "balanced", surfaceContrast: "strong", landPalette: "violet", surfacePalette: "obsidian" },
};

function applyPartialPreset(base: WarPlanetRecipeV103, values: Partial<WarPlanetRecipeV103>, lockedFields: readonly WarPlanetRecipeFieldV103[]) {
  if (!validateWarPlanetRecipeV103(base)) throw new RangeError("Base de monde invalide.");
  const locked = new Set(lockedFields), recipe = { ...base };
  for (const [key, value] of Object.entries(values) as [WarPlanetRecipeFieldV103, WarPlanetRecipeV103[WarPlanetRecipeFieldV103]][]) {
    if (!locked.has(key)) Object.assign(recipe, { [key]: value });
  }
  if (recipe.territoryCount < recipe.regionCount * 3) {
    if (!locked.has("regionCount")) recipe.regionCount = WAR_PLANET_REGION_COUNTS_V103.filter(count => count * 3 <= recipe.territoryCount).at(-1)!;
    else if (!locked.has("territoryCount")) recipe.territoryCount = WAR_PLANET_TERRITORY_COUNTS_V103.find(count => count >= recipe.regionCount * 3)!;
  }
  const valid = validateWarPlanetRecipeV103(recipe);
  if (!valid) throw new RangeError("Ce profil ne convient pas aux réglages conservés.");
  return valid;
}

export function applyWarPlanetStrategicPresetV114(base: WarPlanetRecipeV103, preset: WarPlanetStrategicPresetV114, lockedFields: readonly WarPlanetRecipeFieldV103[] = []) {
  return applyPartialPreset(base, strategicPresets[preset], lockedFields);
}

export function applyWarPlanetAmbiencePresetV114(base: WarPlanetRecipeV103, preset: WarPlanetAmbiencePresetV114, lockedFields: readonly WarPlanetRecipeFieldV103[] = []) {
  return applyPartialPreset(base, ambiencePresets[preset], lockedFields);
}

/** Presets change the draft only. Every editor lock is respected, including
 * count locks: any compatibility correction concerns an unlocked count. */
export function applyWarPlanetPresetV103(base: WarPlanetRecipeV103, preset: WarPlanetPresetV103, lockedFields: readonly WarPlanetRecipeFieldV103[] = []): WarPlanetRecipeV103 {
  if (!validateWarPlanetRecipeV103(base) || !presets[preset]) throw new RangeError("Base de monde invalide.");
  const locked = new Set(lockedFields);
  const recipe = { ...base };
  for (const key of Object.keys(presets[preset]) as (keyof typeof presets[WarPlanetPresetV103])[]) {
    if (!locked.has(key)) Object.assign(recipe, { [key]: presets[preset][key] });
  }
  if (recipe.territoryCount < recipe.regionCount * 3) {
    if (!locked.has("regionCount")) {
      recipe.regionCount = WAR_PLANET_REGION_COUNTS_V103.filter(count => count * 3 <= recipe.territoryCount).at(-1)!;
    } else if (!locked.has("territoryCount")) {
      recipe.territoryCount = WAR_PLANET_TERRITORY_COUNTS_V103.find(count => count >= recipe.regionCount * 3)!;
    }
  }
  const valid = validateWarPlanetRecipeV103(recipe);
  if (!valid) throw new RangeError("Cette base ne convient pas aux réglages conservés.");
  return valid;
}

/** Called only after the explicit variant action. The original code, world and
 * archive remain untouched; generating this draft creates a different world. */
export function prepareWarPlanetVariantV103(recipe: WarPlanetRecipeV102): WarPlanetRecipeV103 {
  return {
    ...DEFAULT_WAR_PLANET_RECIPE_V103, ...recipe, version: 103,
    territoryCount: 36, regionCount: 6, hydrology: "none",
  };
}
