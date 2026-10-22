import type { WarPlanetRecipeV102 } from "./clanWarPlanetGeneratorV102";
import {
  DEFAULT_WAR_PLANET_RECIPE_V103, WAR_PLANET_REGION_COUNTS_V103, WAR_PLANET_TERRITORY_COUNTS_V103,
  validateWarPlanetRecipeV103, type WarPlanetRecipeFieldV103, type WarPlanetRecipeV103,
} from "./clanWarPlanetGeneratorV103";

export type WarPlanetPresetV103 = "earthlike" | "alien";

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
