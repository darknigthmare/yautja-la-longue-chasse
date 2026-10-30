import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { validPlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { PLANET_RADII_KM_V115 } from "./systems/clanWarShapeAtlasV115";
import { createPlanetTextureCanvasV125 } from "./systems/clanWarTextureLibraryV125";

/** V129 is an opt-in albedo study, never an implicit V115 save migration. */
const atlasCache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 2;

/** Keep approximate kilometre-per-texel density comparable on different-size worlds.
 * This changes visual sampling only; it does not change landforms or tactical costs. */
export function planetRegionalTextureScaleV129(planet: WarPlanetV96): number {
  const recipe = planet.procedural?.recipe;
  return recipe?.version === 115 ? PLANET_RADII_KM_V115[recipe.planetSize] / PLANET_RADII_KM_V115.terran : 1;
}

/** Full assignment is part of the cache identity, so one edited region cannot
 * reuse an atlas holding the previous materials. */
export function planetRegionalShaderAtlasKeyV129(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  tileSize: number, columns: number, rows: number,
): string {
  if (!validPlanetRegionalMaterialKitV128(planet, kit))
    throw new RangeError("Kit de matières incompatible avec le code planétaire.");
  if (!Number.isInteger(tileSize) || tileSize < 16 || tileSize > 1024 ||
      !Number.isInteger(columns) || columns < 1 || columns > 16 ||
      !Number.isInteger(rows) || rows < 1 || rows > 32 || columns * rows < kit.entries.length)
    throw new RangeError("Dimensions d'atlas régional invalides.");
  return ["planet-regional-v129", planet.id, tileSize, columns, rows,
    ...kit.entries.map(entry => [entry.regionId, entry.seed, entry.landMaterialId].join(":"))].join("|");
}

/** Same atlas cell ordering as V103 GLSL (index % columns, floor(index / columns)).
 * The actual globe region index and coastline masks stay untouched. */
export function createPlanetRegionalShaderAtlasV129(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  tileSize: number, columns: number, rows: number, signal?: AbortSignal,
): HTMLCanvasElement | null {
  if (signal?.aborted) return null;
  const key = planetRegionalShaderAtlasKeyV129(planet, kit, tileSize, columns, rows);
  const cached = atlasCache.get(key);
  if (cached) { atlasCache.delete(key); atlasCache.set(key, cached); return cached; }
  const canvas = document.createElement("canvas");
  canvas.width = columns * tileSize;
  canvas.height = rows * tileSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas d'atlas régional indisponible.");
  for (let index = 0; index < kit.entries.length; index++) {
    if (signal?.aborted) return null;
    const entry = kit.entries[index];
    const tile = createPlanetTextureCanvasV125(entry.landMaterialId, "albedo", tileSize, entry.seed);
    context.drawImage(tile, (index % columns) * tileSize, Math.floor(index / columns) * tileSize);
  }
  if (signal?.aborted) return null;
  atlasCache.set(key, canvas);
  while (atlasCache.size > CACHE_LIMIT) atlasCache.delete(atlasCache.keys().next().value!);
  return canvas;
}
