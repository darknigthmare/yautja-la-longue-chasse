import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { createPlanetRegionIndexMaskV124 } from "./planetModularExportV124";

/** The RGBA categorical mask is the same coastline/region source as the game.
 * White pixels belong to the requested region; all others are transparent. */
export function createPlanetSingleRegionMaskV128(
  planet: WarPlanetV96, regionId: string, width = 512,
): HTMLCanvasElement {
  const regionIndex = planet.regions.findIndex(region => region.id === regionId);
  if (regionIndex < 0) throw new RangeError("Région inconnue pour le masque.");
  if (!Number.isInteger(width) || width % 2 !== 0 || width < 256 || width > 2048)
    throw new RangeError("Largeur de masque invalide.");
  const source = createPlanetRegionIndexMaskV124(planet, width);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("Masque régional source indisponible.");
  const input = sourceContext.getImageData(0, 0, width, width / 2);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const target = canvas.getContext("2d");
  if (!target) throw new Error("Masque régional cible indisponible.");
  const output = target.createImageData(width, width / 2);
  const redIndex = regionIndex + 1;
  for (let offset = 0; offset < input.data.length; offset += 4) {
    if (input.data[offset] !== redIndex || input.data[offset + 3] === 0) continue;
    output.data[offset] = 255;
    output.data[offset + 1] = 255;
    output.data[offset + 2] = 255;
    output.data[offset + 3] = 255;
  }
  target.putImageData(output, 0, 0);
  return canvas;
}
