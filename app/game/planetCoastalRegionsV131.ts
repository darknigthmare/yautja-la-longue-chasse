import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { validPlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { createPlanetLandMaskV101 } from "./planetMaterialRendererV101";
import { createPlanetRegionMaskV102 } from "./planetRegionalMaterialsV102";
import { PLANET_RADII_KM_V115 } from "./systems/clanWarShapeAtlasV115";

/** A coastal *visual* influence map, not political ownership of oceans.
 * Land retains the exact V102 region index; other pixels may inherit that
 * region's material only within an explicitly bounded physical distance.
 * The sentinel index (regionCount) means native/unmodified sea everywhere.
 */
export const PLANET_COAST_INFLUENCE_KM_V131 = 900;

type CoastNode = { pixel: number; distance: number; region: number };
class MinCoastHeap {
  private data: CoastNode[] = [];
  push(node: CoastNode) {
    const values = this.data;
    let index = values.length; values.push(node);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (values[parent].distance <= node.distance) break;
      values[index] = values[parent]; index = parent;
    }
    values[index] = node;
  }
  pop(): CoastNode | undefined {
    const values = this.data;
    const first = values[0], last = values.pop();
    if (!last || values.length === 0) return first;
    let index = 0;
    while (index * 2 + 1 < values.length) {
      let child = index * 2 + 1;
      if (child + 1 < values.length && values[child + 1].distance < values[child].distance) child++;
      if (values[child].distance >= last.distance) break;
      values[index] = values[child]; index = child;
    }
    values[index] = last; return first;
  }
  get length() { return this.data.length; }
}

/** Pure function for deterministic QA, no GPU/canvas state or world writes.
 * A geographic Dijkstra distance is accumulated at raster resolution.
 * Longitude wraps at 180 degrees, latitude does not wrap at the poles.
 * The spherical metric uses real planetary radius, including small worlds.
 */
export function encodePlanetCoastalRegionsV131(
  land: Uint8ClampedArray,
  landRegion: Uint8ClampedArray,
  width: number, height: number, radiusKm: number,
  regionalSurfaceActive: readonly boolean[], influenceKm = PLANET_COAST_INFLUENCE_KM_V131,
): Uint8ClampedArray {
  const count = regionalSurfaceActive.length, cells = width * height;
  if (!Number.isInteger(width) || width < 16 || width > 2048 || width % 2 !== 0 ||
      height !== width / 2 || count < 1 || count > 254 ||
      land.length !== cells * 4 || landRegion.length !== land.length ||
      !Number.isFinite(radiusKm) || radiusKm < 100 || radiusKm > 25000 ||
      !Number.isFinite(influenceKm) || influenceKm < 0 || influenceKm > 3000)
    throw new RangeError("Dimensions, surface ou rayon de la planète incompatibles avec V131.");
  const native = count;
  const owner = new Uint8Array(cells);
  owner.fill(native);
  const isLand = new Uint8Array(cells);
  const best = new Float32Array(cells);
  best.fill(Infinity);
  const dx = new Float32Array(height);
  const dy = Math.PI * radiusKm / height;
  for (let y = 0; y < height; y++) {
    const latitude = (0.5 - (y + 0.5) / height) * Math.PI;
    dx[y] = 2 * Math.PI * radiusKm * Math.max(0.01, Math.cos(latitude)) / width;
  }
  for (let pixel = 0; pixel < cells; pixel++) {
    if (land[pixel * 4] < 128) continue;
    const region = landRegion[pixel * 4];
    if (region >= count) throw new RangeError("Masque de région étrangère à la planète.");
    isLand[pixel] = 1; owner[pixel] = region; best[pixel] = 0;
  }
  const heap = new MinCoastHeap();
  const neighbors = (pixel: number, visit: (neighbor: number, distance: number) => void) => {
    const y = Math.floor(pixel / width), x = pixel - y * width;
    visit(y * width + (x + 1) % width, dx[y]);
    visit(y * width + (x + width - 1) % width, dx[y]);
    if (y > 0) visit(pixel - width, dy);
    if (y + 1 < height) visit(pixel + width, dy);
  };
  const relax = (pixel: number, candidate: number, region: number) => {
    if (isLand[pixel] || candidate > influenceKm) return;
    if (candidate + 0.0001 >= best[pixel]) return;
    best[pixel] = candidate; owner[pixel] = region;
    heap.push({ pixel, distance: candidate, region });
  };
  // Coast pixels seed a min-heap without filling the heap with entire continents.
  for (let pixel = 0; pixel < cells; pixel++) {
    if (!isLand[pixel]) continue;
    neighbors(pixel, (neighbor, step) => relax(neighbor, step, owner[pixel]));
  }
  while (heap.length) {
    const node = heap.pop()!;
    if (node.distance > best[node.pixel] + 0.0001 || node.region !== owner[node.pixel]) continue;
    neighbors(node.pixel, (neighbor, step) =>
      relax(neighbor, node.distance + step, node.region));
  }
  const rgba = new Uint8ClampedArray(land.length);
  for (let pixel = 0; pixel < cells; pixel++) {
    const region = owner[pixel];
    const shoreline = !isLand[pixel] && region < count &&
      regionalSurfaceActive[region] && best[pixel] <= influenceKm;
    rgba[pixel * 4] = isLand[pixel] ? region : shoreline ? region : native;
    // The blue channel carries visual weight, never a geographical claim.
    // Smooth the final 35 percent to avoid a sudden colour-change ring.
    const fade = shoreline && influenceKm > 0
      ? Math.max(0, Math.min(1, (influenceKm - best[pixel]) / (influenceKm * .35))) : 0;
    rgba[pixel * 4 + 2] = Math.round(255 * fade * fade * (3 - 2 * fade));
    rgba[pixel * 4 + 3] = 255;
  }
  return rgba;
}

const maskCache = new Map<string, HTMLCanvasElement>();
export function createPlanetCoastalRegionMaskV131(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  width = 512, influenceKm = PLANET_COAST_INFLUENCE_KM_V131,
): HTMLCanvasElement {
  if (!validPlanetRegionalMaterialKitV128(planet, kit))
    throw new RangeError("Kit régional incohérent avec la planète.");
  const sizes = planet.procedural?.recipe;
  const radius = sizes?.version === 115 ? PLANET_RADII_KM_V115[sizes.planetSize] : PLANET_RADII_KM_V115.terran;
  const active = kit.entries.map(entry => entry.surfaceMaterialId !== null);
  const key = [planet.id, width, radius, influenceKm, ...active.map(Boolean)].join(":");
  const existing = maskCache.get(key);
  if (existing) { maskCache.delete(key); maskCache.set(key, existing); return existing; }
  const regions = createPlanetRegionMaskV102(planet, width)
    .getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, width, width / 2).data;
  const land = createPlanetLandMaskV101(planet, width)
    .getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, width, width / 2).data;
  if (!regions || !land) throw new Error("Masques de côte V131 indisponibles.");
  const bytes = encodePlanetCoastalRegionsV131(land, regions, width, width / 2, radius, active, influenceKm);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas V131 indisponible.");
  const pixels = context.createImageData(width, width / 2);
  pixels.data.set(bytes); context.putImageData(pixels, 0, 0);
  maskCache.set(key, canvas);
  while (maskCache.size > 3) maskCache.delete(maskCache.keys().next().value!);
  return canvas;
}
