import type { WarPlanetLandBiomeV96, WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { PLANET_MATERIAL_ROOT_V101, planetMaterialSourceV101, unwrapPlanetPolygonV101 } from "./systems/planetMaterialV101";
import { planetLandProfileV103, planetMaterialSourceV103, planetRegionalLayoutV103 } from "./systems/planetMaterialProfilesV103";
import { planetTextureUriV115 } from "./systems/clanWarTextureLibraryV115";
import { planetTextureUriV126 } from "./systems/clanWarPlanetGeneratorV126";
import { loadPlanetDetailedMaterialV103 } from "./planetDetailMaterialsV103";

// A single atlas keeps the renderer within WebGL1's texture-unit budget.
// V102 keeps its original six cells; V103 fits 3–12 into a bounded grid.
const atlases = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement>>();
const masks = new Map<string, HTMLCanvasElement>();
export const PLANET_REGIONAL_ATLAS_LIMIT_V102 = 3;
const MASK_LIMIT = 6;

function remember(cache: Map<string, HTMLCanvasElement>, key: string, value: HTMLCanvasElement, limit: number) {
  cache.delete(key); cache.set(key, value);
  while (cache.size > limit) cache.delete(cache.keys().next().value!);
  return value;
}

export function planetRegionalBiomesV102(planet: WarPlanetV96): WarPlanetLandBiomeV96[] {
  return planet.regions.map(region => planet.procedural?.regions.find(item => item.regionId === region.id)?.biome ?? planet.landBiome);
}

export function planetRegionalAtlasKeyV102(planet: WarPlanetV96, tileSize: number, sourceSize: number) {
  const recipe = planet.procedural?.recipe;
  // Only bitmap selection is baked into a V103 atlas. Other visual controls
  // are uniforms and geography lives in separate masks, so neither duplicates it.
  return recipe?.version === 103
    ? `v103:${planetRegionalBiomesV102(planet).join(",")}:${recipe.landVariant}:${sourceSize}:${tileSize}`
    : recipe?.version === 115
      ? `v115:${planetRegionalBiomesV102(planet).join(",")}:${recipe.landMaterial}:${sourceSize}:${tileSize}`
      : recipe?.version === 126
        ? `v126:${planet.seed}:${planetRegionalBiomesV102(planet).join(",")}:${recipe.regionalLandMaterials.join(",")}:${sourceSize}:${tileSize}`
        : `${planet.id}:${sourceSize}:${tileSize}`;
}

export async function loadPlanetRegionalAtlasV102(
  planet: WarPlanetV96,
  tileSize: number,
  sourceSize: number,
  load: (url: string, size: number) => Promise<HTMLCanvasElement>,
): Promise<HTMLCanvasElement> {
  const key = planetRegionalAtlasKeyV102(planet, tileSize, sourceSize);
  const cached = atlases.get(key);
  if (cached) return remember(atlases, key, cached, PLANET_REGIONAL_ATLAS_LIMIT_V102);
  const loading = pending.get(key);
  if (loading) return loading;
  const task = (async () => {
    const recipe = planet.procedural?.recipe;
    const profile = recipe?.version === 103 || recipe?.version === 115 || recipe?.version === 126 ? planetLandProfileV103(recipe) : null;
    const layout = profile ? planetRegionalLayoutV103(planet.regions.length, tileSize, Number.MAX_SAFE_INTEGER) : null;
    if (layout && layout.tileSize !== tileSize) throw new RangeError("Regional material atlas exceeds its pixel budget");
    if (!profile && planet.regions.length !== 6) throw new Error("Regional materials require the six-region planet schema");
    const columns = layout?.columns ?? 4, rows = layout?.rows ?? 2;
    const detail = recipe?.version === 115 ? planetTextureUriV115("land", recipe.landMaterial)
      : profile?.detail ? sourceSize > 512 ? planetMaterialSourceV103(profile.detail) : profile.detail : null;
    const sources = await Promise.all(planetRegionalBiomesV102(planet).map((biome, index) => {
      const runtime = `${PLANET_MATERIAL_ROOT_V101}land-${biome}.webp`;
      const url = sourceSize > 512 ? planetMaterialSourceV101(runtime) : runtime;
      // Per-region selection is encoded only for V126. Source identity also
      // includes a bounded deterministic seed for V125 supplemental textures.
      const regionalDetail = recipe?.version === 126
        ? planetTextureUriV126("land", recipe.regionalLandMaterials[index],
            (planet.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0)
        : detail;
      return regionalDetail
        ? loadPlanetDetailedMaterialV103(url, regionalDetail, sourceSize, load)
        : load(url, sourceSize);
    }));
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * columns; canvas.height = tileSize * rows;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Regional material atlas unavailable");
    sources.forEach((source, index) => context.drawImage(source, index % columns * tileSize, Math.floor(index / columns) * tileSize, tileSize, tileSize));
    return remember(atlases, key, canvas, PLANET_REGIONAL_ATLAS_LIMIT_V102);
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

/** Region IDs are categorical: the GPU uses nearest filtering for this map,
 * while the separate coastline mask retains linear filtering and its alpha. */
export function createPlanetRegionMaskV102(planet: WarPlanetV96, width: number): HTMLCanvasElement {
  const key = `${planet.id}:${width}`;
  const cached = masks.get(key);
  if (cached) return remember(masks, key, cached, MASK_LIMIT);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Region mask unavailable");
  context.fillStyle = "#000"; context.fillRect(0, 0, canvas.width, canvas.height);
  const indexByRegion = new Map(planet.regions.map((region, index) => [region.id, index]));
  // Rasterize to an integer categorical map after painting. This removes the
  // antialias shades that would otherwise invent another region on a border.
  const result = context.createImageData(canvas.width, canvas.height);
  const coverage = new Uint8Array(canvas.width * canvas.height);
  const regionCanvas = document.createElement("canvas");
  regionCanvas.width = width; regionCanvas.height = width / 2;
  const regionContext = regionCanvas.getContext("2d", { willReadFrequently: true });
  if (!regionContext) throw new Error("Region stencil unavailable");
  for (let regionIndex = 0; regionIndex < planet.regions.length; regionIndex++) {
    regionContext.clearRect(0, 0, width, width / 2);
    regionContext.fillStyle = "#fff";
    regionContext.beginPath();
    for (const territory of planet.territories) {
      if (indexByRegion.get(territory.regionId) !== regionIndex) continue;
      const points = unwrapPlanetPolygonV101(territory.points);
      for (const offset of [-360, 0, 360]) {
        points.forEach(([longitude, latitude], index) => {
          const x = (longitude + offset + 180) / 360 * width, y = (90 - latitude) / 180 * regionCanvas.height;
          if (index === 0) regionContext.moveTo(x, y); else regionContext.lineTo(x, y);
        });
        regionContext.closePath();
      }
    }
    regionContext.fill();
    const data = regionContext.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let pixel = 0; pixel < coverage.length; pixel++) {
      const alpha = data[pixel * 4 + 3];
      if (alpha > coverage[pixel]) { coverage[pixel] = alpha; result.data[pixel * 4] = regionIndex; }
      result.data[pixel * 4 + 3] = 255;
    }
  }
  context.putImageData(result, 0, 0);
  return remember(masks, key, canvas, MASK_LIMIT);
}

export function planetRegionalMaterialStatusV102() {
  return { regionalAtlases: atlases.size, regionalAtlasPixels: [...atlases.values()].reduce((sum, canvas) => sum + canvas.width * canvas.height, 0), regionalMasks: masks.size, pendingRegionalAtlases: pending.size };
}
