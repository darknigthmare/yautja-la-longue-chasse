import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { validPlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { createPlanetTextureCanvasV130 } from "./systems/clanWarTextureLibraryV130";
import { planetRegionalShaderAtlasKeyV129 } from "./planetRegionalShaderAtlasV129";

export interface PlanetRegionalPbrAtlasesV131 {
  key: string;
  normals: HTMLCanvasElement;
  factors: HTMLCanvasElement;
  surfaceAlbedo: HTMLCanvasElement;
}
const cache = new Map<string, PlanetRegionalPbrAtlasesV131>();
const MAX_CACHED = 2;

/** Pack five source channels into three WebGL1 texture units:
 * - regional land and water use their own RGB albedo atlas
 * - RGB normals for both domains share a double-height atlas
 * - (R=height,G=roughness,B=emissive luminance,A=opaque) share another.
 * Albedo is V129 for land. No audio, shaders or game-state bytes are baked.
 */
export function packPlanetPbrFactorsV131(
  height: Uint8ClampedArray, roughness: Uint8ClampedArray, emission: Uint8ClampedArray,
): Uint8ClampedArray {
  if (height.length === 0 || height.length % 4 ||
      height.length !== roughness.length || height.length !== emission.length)
    throw new RangeError("Canaux PBR incompatibles.");
  const bytes = new Uint8ClampedArray(height.length);
  for (let index = 0; index < height.length; index += 4) {
    bytes[index] = height[index];
    bytes[index + 1] = roughness[index];
    // Emissive is RGB in the source atlas. The strongest channel is packed,
    // and its contribution is tinted with the sampled albedo in the shader.
    bytes[index + 2] = Math.max(emission[index], emission[index + 1], emission[index + 2]);
    bytes[index + 3] = 255;
  }
  return bytes;
}
function pixels(canvas: HTMLCanvasElement, size: number): Uint8ClampedArray {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canal PBR illisible.");
  return context.getImageData(0, 0, size, size).data;
}
export function createPlanetRegionalPbrAtlasesV131(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  tileSize: number, columns: number, rows: number, signal?: AbortSignal,
): PlanetRegionalPbrAtlasesV131 | null {
  if (signal?.aborted) return null;
  if (!validPlanetRegionalMaterialKitV128(planet, kit))
    throw new RangeError("Kit régional PBR incompatible.");
  const base = planetRegionalShaderAtlasKeyV129(planet, kit, tileSize, columns, rows);
  if (tileSize > 128 || rows * tileSize * 2 > 4096)
    throw new RangeError("Budget des atlases PBR dépassé.");
  const key = ["planet-pbr-v131", base, ...kit.entries.map(item => item.surfaceMaterialId ?? "native")].join("|");
  const present = cache.get(key);
  if (present) { cache.delete(key); cache.set(key, present); return present; }
  const create = (height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = columns * tileSize; canvas.height = height;
    return canvas;
  };
  const normals = create(rows * tileSize * 2), factors = create(rows * tileSize * 2);
  const surfaceAlbedo = create(rows * tileSize);
  const normalContext = normals.getContext("2d");
  const factorContext = factors.getContext("2d");
  const surfaceContext = surfaceAlbedo.getContext("2d");
  if (!normalContext || !factorContext || !surfaceContext)
    throw new Error("Atlas PBR régional indisponible.");
  for (const [index, region] of kit.entries.entries()) {
    for (const domain of [0, 1] as const) {
      if (signal?.aborted) return null;
      const id = domain === 0 ? region.landMaterialId : region.surfaceMaterialId;
      if (!id) continue;
      const tileX = index % columns * tileSize;
      const tileY = (Math.floor(index / columns) + domain * rows) * tileSize;
      const normal = createPlanetTextureCanvasV130(id, "normal", tileSize, region.seed);
      const height = createPlanetTextureCanvasV130(id, "height", tileSize, region.seed);
      const roughness = createPlanetTextureCanvasV130(id, "roughness", tileSize, region.seed);
      const emission = createPlanetTextureCanvasV130(id, "emissive", tileSize, region.seed);
      normalContext.drawImage(normal, tileX, tileY);
      const packed = factorContext.createImageData(tileSize, tileSize);
      packed.data.set(packPlanetPbrFactorsV131(
        pixels(height, tileSize), pixels(roughness, tileSize), pixels(emission, tileSize)));
      factorContext.putImageData(packed, tileX, tileY);
      if (domain === 1) {
        const albedo = createPlanetTextureCanvasV130(id, "albedo", tileSize, region.seed);
        surfaceContext.drawImage(albedo, tileX, Math.floor(index / columns) * tileSize);
      }
    }
  }
  if (signal?.aborted) return null;
  const result: PlanetRegionalPbrAtlasesV131 = { key, normals, factors, surfaceAlbedo };
  cache.set(key, result);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return result;
}
