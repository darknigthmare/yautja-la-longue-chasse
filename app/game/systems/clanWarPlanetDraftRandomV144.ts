import {
  WAR_PLANET_RECIPE_FIELDS_V103, randomizeWarPlanetRecipeV103,
  planetRandomV103, validateWarPlanetRecipeV103,
  type WarPlanetRecipeV103, type WarPlanetRecipeFieldV103,
} from "./clanWarPlanetGeneratorV103";
import {
  validateWarPlanetRecipeV115, type WarPlanetRecipeV115,
} from "./clanWarPlanetGeneratorV115";
import { PLANET_RADII_KM_V115 } from "./clanWarShapeAtlasV115";
import { WAR_PLANET_LAND_TEXTURES_V115, WAR_PLANET_LIQUID_TEXTURES_V115 } from "./clanWarTextureLibraryV115";
import { PLANET_GENERATOR_SECTIONS_V103 } from "../planetGeneratorControlsV103";

export const PLANET_ADVANCED_FIELDS_V144 = [
  "planetSize", "islandShape", "continentShape", "regionShape", "landMaterial", "liquidMaterial",
] as const;
export type PlanetAdvancedFieldV144 = typeof PLANET_ADVANCED_FIELDS_V144[number];
export type PlanetAdvancedValuesV144 = Pick<WarPlanetRecipeV115, PlanetAdvancedFieldV144>;
export type PlanetRandomFieldV144 = WarPlanetRecipeFieldV103 | PlanetAdvancedFieldV144;
export type PlanetRandomScopeV144 =
  | "all" | "seed" | "geography" | "land" | "surface" | "atmosphere"
  | "v115" | "v115-size" | "v115-shapes" | "v115-materials"
  | { field: PlanetRandomFieldV144 };

export interface PlanetRandomDraftRequestV144 {
  recipe: WarPlanetRecipeV103;
  advanced: PlanetAdvancedValuesV144;
  advancedEnabled: boolean;
  lockedV103: readonly WarPlanetRecipeFieldV103[];
  lockedV115: readonly PlanetAdvancedFieldV144[];
  scope: PlanetRandomScopeV144;
  entropy: number;
}

const advancedGroups: Readonly<Record<string, readonly PlanetAdvancedFieldV144[]>> = {
  "v115": PLANET_ADVANCED_FIELDS_V144,
  "v115-size": ["planetSize"],
  "v115-shapes": ["islandShape", "continentShape", "regionShape"],
  "v115-materials": ["landMaterial", "liquidMaterial"],
};
const physicalSizes = Object.keys(PLANET_RADII_KM_V115);
const indexes = (count: number) => Array.from({ length: count }, (_, index) => index);
const advancedChoices: Readonly<Record<PlanetAdvancedFieldV144, readonly (number | string)[]>> = {
  planetSize: physicalSizes,
  islandShape: indexes(40),
  continentShape: indexes(40),
  regionShape: indexes(40),
  landMaterial: indexes(WAR_PLANET_LAND_TEXTURES_V115.length),
  liquidMaterial: indexes(WAR_PLANET_LIQUID_TEXTURES_V115.length),
};
const validV103 = (field: unknown): field is WarPlanetRecipeFieldV103 =>
  WAR_PLANET_RECIPE_FIELDS_V103.includes(field as WarPlanetRecipeFieldV103);
const validV115 = (field: unknown): field is PlanetAdvancedFieldV144 =>
  PLANET_ADVANCED_FIELDS_V144.includes(field as PlanetAdvancedFieldV144);

/** Returns only editable fields from the requested actual generator section.
 * A V115 section is deliberately unavailable while the V103 recipe is active.
 * Locks protect randomization and presets, not intentional direct edits. */
export function selectablePlanetRandomFieldsV144(
  scope: PlanetRandomScopeV144,
  advancedEnabled: boolean,
  lockedV103: readonly WarPlanetRecipeFieldV103[] = [],
  lockedV115: readonly PlanetAdvancedFieldV144[] = [],
): readonly PlanetRandomFieldV144[] {
  if (typeof advancedEnabled !== "boolean" ||
      lockedV103.some(field => !validV103(field)) ||
      lockedV115.some(field => !validV115(field)))
    throw new RangeError("Verrous de tirage planétaire invalides.");
  let chosen: readonly PlanetRandomFieldV144[];
  if (scope === "all") chosen = [
    ...WAR_PLANET_RECIPE_FIELDS_V103,
    ...(advancedEnabled ? PLANET_ADVANCED_FIELDS_V144 : []),
  ];
  else if (scope === "seed") chosen = ["seed"];
  else if (typeof scope === "object" && scope !== null && "field" in scope) {
    if (!validV103(scope.field) && !validV115(scope.field))
      throw new RangeError("Réglage aléatoire planétaire inconnu.");
    chosen = validV115(scope.field) && !advancedEnabled ? [] : [scope.field];
  } else if (typeof scope === "string" && Object.prototype.hasOwnProperty.call(advancedGroups, scope)) {
    chosen = advancedEnabled ? advancedGroups[scope] : [];
  } else {
    const section = PLANET_GENERATOR_SECTIONS_V103.find(item => item.id === scope);
    if (!section) throw new RangeError("Section de tirage planétaire inconnue.");
    chosen = section.fields;
  }
  const locked = new Set<PlanetRandomFieldV144>([...lockedV103, ...lockedV115]);
  return chosen.filter(field => !locked.has(field));
}

function chooseDifferentV144(
  choices: readonly (string | number)[], current: string | number, entropy: number, salt: number,
): string | number {
  if (choices.length < 2) return current;
  const index = Math.floor(planetRandomV103(entropy, salt) * choices.length);
  const candidate = choices[index];
  return candidate === current ? choices[(index + 1) % choices.length] : candidate;
}

/** Pure, deterministic, fully versioned DRAFT randomizer. All old planet
 * codecs, existing codes, active wars and save archives are untouched. */
export function randomizePlanetDraftV144(request: PlanetRandomDraftRequestV144): {
  recipe: WarPlanetRecipeV103;
  advanced: PlanetAdvancedValuesV144;
  changedFields: readonly PlanetRandomFieldV144[];
} {
  if (!validateWarPlanetRecipeV103(request.recipe) ||
      !Number.isInteger(request.entropy) || request.entropy < 0 || request.entropy > 0xffffffff ||
      !validateWarPlanetRecipeV115({ ...request.recipe, version: 115, ...request.advanced }))
    throw new RangeError("Recette ou graine de tirage planétaire invalide.");
  const selected = selectablePlanetRandomFieldsV144(
    request.scope, request.advancedEnabled, request.lockedV103, request.lockedV115,
  );
  const target103 = selected.filter(validV103), target115 = selected.filter(validV115);
  let recipe = request.recipe;
  if (target103.length) {
    const fixed = WAR_PLANET_RECIPE_FIELDS_V103.filter(field => !target103.includes(field));
    for (let attempt = 0; attempt < 24; attempt++) {
      const salt = (request.entropy + Math.imul(attempt, 0x9e3779b1)) >>> 0;
      const candidate = randomizeWarPlanetRecipeV103(request.recipe, salt, fixed);
      recipe = candidate;
      if (target103.some(field => candidate[field] !== request.recipe[field])) break;
    }
  }
  const values: Record<string, string | number> = { ...request.advanced };
  for (const [index, field] of target115.entries()) {
    const current = request.advanced[field];
    values[field] = chooseDifferentV144(
      advancedChoices[field], current, request.entropy, 1400 + index * 17 + PLANET_ADVANCED_FIELDS_V144.indexOf(field),
    );
  }
  const advanced = values as PlanetAdvancedValuesV144;
  if (!validateWarPlanetRecipeV115({ ...recipe, version: 115, ...advanced }))
    throw new RangeError("Le tirage a produit une recette incompatible.");
  return {
    recipe, advanced,
    changedFields: selected.filter(field =>
      validV103(field) ? recipe[field] !== request.recipe[field] :
        advanced[field as PlanetAdvancedFieldV144] !== request.advanced[field as PlanetAdvancedFieldV144]),
  };
}
