import {
  describeWarPlanetV102, encodeWarPlanetV102, generatedWarPlanetV102, parseWarPlanetV102, validateWarPlanetRecipeV102,
  type GeneratedWarPlanetV102, type WarPlanetRecipeV102,
} from "./clanWarPlanetGeneratorV102";
import {
  describeWarPlanetV103, encodeWarPlanetV103, generatedWarPlanetV103, parseWarPlanetV103, validateWarPlanetRecipeV103,
  type GeneratedWarPlanetV103, type WarPlanetRecipeV103,
} from "./clanWarPlanetGeneratorV103";
import type { WarPlanetV96 } from "./clanWarPlanetsV96";

/** Version dispatch never upgrades a recipe. A V102 code retains its original
 * geometry, strategy and material rendering after the V103 editor is installed. */
export type WarPlanetRecipeAnyV103 = WarPlanetRecipeV102 | WarPlanetRecipeV103;
export type GeneratedWarPlanetAnyV103 = GeneratedWarPlanetV102 | GeneratedWarPlanetV103;
export type WarPlanetSummaryV103 = Pick<WarPlanetV96, "id" | "name" | "subtitle" | "landBiome" | "surface" | "style"> & {
  version: 102 | 103; territoryCount: number; regionCount: number;
};

export function describeProceduralWarPlanetV103(id: string): WarPlanetSummaryV103 | undefined {
  if (typeof id !== "string" || id.length > 64) return undefined;
  return id.startsWith("proc-v102-") ? describeWarPlanetV102(id) : id.startsWith("proc-v103-") ? describeWarPlanetV103(id) : undefined;
}

export function parseWarPlanetRecipeCodeV103(id: string): WarPlanetRecipeAnyV103 | null {
  if (typeof id !== "string" || id.length > 64) return null;
  if (id.startsWith("proc-v102-")) return parseWarPlanetV102(id);
  if (id.startsWith("proc-v103-")) return parseWarPlanetV103(id);
  return null;
}

export function validateWarPlanetRecipeAnyV103(value: unknown): WarPlanetRecipeAnyV103 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = (value as { version?: unknown }).version;
  return version === 102 ? validateWarPlanetRecipeV102(value) : version === 103 ? validateWarPlanetRecipeV103(value) : null;
}

export function encodeWarPlanetRecipeCodeV103(recipe: WarPlanetRecipeAnyV103): string {
  const valid = validateWarPlanetRecipeAnyV103(recipe);
  if (!valid) throw new RangeError("Version ou recette planétaire invalide.");
  return valid.version === 102 ? encodeWarPlanetV102(valid) : encodeWarPlanetV103(valid);
}

export function resolveProceduralWarPlanetV103(id: string): GeneratedWarPlanetAnyV103 | undefined {
  const recipe = parseWarPlanetRecipeCodeV103(id);
  return recipe?.version === 102 ? generatedWarPlanetV102(id) : recipe?.version === 103 ? generatedWarPlanetV103(id) : undefined;
}
