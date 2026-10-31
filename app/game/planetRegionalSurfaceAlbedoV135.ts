import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { validPlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { createPlanetTextureCanvasV130 } from "./systems/clanWarTextureLibraryV130";
import { planetRegionalShaderAtlasKeyV129 } from "./planetRegionalShaderAtlasV129";

export type PlanetRegionalPipelineV135 = "native" | "albedo-v129" | "albedo-coastal-v135" | "pbr-v131";
export interface PlanetRegionalPipelineOptionsV135 {
  selected: boolean;
  wantsPbr: boolean;
  hasSurface: boolean;
  samplers: number;
  maxTextureSize: number;
  regionalRows: number;
  tileSize: number;
}

/** WebGL1 guarantees 8 fragment samplers, not 10. Even on an 8-sampler
 * device, preserve the selected regional sea ALBEDO rather than discarding it
 * when the full normal/roughness/emissive PBR path cannot run. */
export function choosePlanetRegionalPipelineV135(options: PlanetRegionalPipelineOptionsV135): PlanetRegionalPipelineV135 {
  const { selected, wantsPbr, hasSurface, samplers, maxTextureSize, regionalRows, tileSize } = options;
  if (!selected) return "native";
  if (!Number.isInteger(samplers) || samplers < 0 || !Number.isInteger(maxTextureSize) ||
      maxTextureSize < 16 || !Number.isInteger(regionalRows) || regionalRows < 1 ||
      !Number.isInteger(tileSize) || tileSize < 16)
    throw new RangeError("Capacités GPU régionales invalides.");
  if (wantsPbr && samplers >= 10 && maxTextureSize >= 32 * regionalRows * 2)
    return "pbr-v131";
  if (hasSurface && samplers >= 8 && maxTextureSize >= regionalRows * tileSize)
    return "albedo-coastal-v135";
  return "albedo-v129";
}

const surfaceCache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 2;

export function planetRegionalSurfaceAtlasKeyV135(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  tileSize: number, columns: number, rows: number,
): string {
  const prefix = planetRegionalShaderAtlasKeyV129(planet, kit, tileSize, columns, rows);
  return ["regional-surface-v135", prefix,
    ...kit.entries.map(e => e.regionId + ":" + e.seed + ":" + (e.surfaceMaterialId ?? "native"))].join("|");
}

export function createPlanetRegionalSurfaceAlbedoV135(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  tileSize: number, columns: number, rows: number, signal?: AbortSignal,
): HTMLCanvasElement | null {
  if (signal?.aborted) return null;
  if (!validPlanetRegionalMaterialKitV128(planet, kit))
    throw new RangeError("Kit des milieux régionaux incompatible.");
  const key = planetRegionalSurfaceAtlasKeyV135(planet, kit, tileSize, columns, rows);
  const cached = surfaceCache.get(key);
  if (cached) { surfaceCache.delete(key); surfaceCache.set(key, cached); return cached; }
  const canvas = document.createElement("canvas");
  canvas.width = columns * tileSize; canvas.height = rows * tileSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas régional des milieux indisponible.");
  for (const [index, region] of kit.entries.entries()) {
    if (signal?.aborted) return null;
    if (!region.surfaceMaterialId) continue;
    const source = createPlanetTextureCanvasV130(region.surfaceMaterialId, "albedo", tileSize, region.seed);
    context.drawImage(source, index % columns * tileSize, Math.floor(index / columns) * tileSize);
  }
  if (signal?.aborted) return null;
  surfaceCache.set(key, canvas);
  while (surfaceCache.size > CACHE_LIMIT) surfaceCache.delete(surfaceCache.keys().next().value!);
  return canvas;
}
