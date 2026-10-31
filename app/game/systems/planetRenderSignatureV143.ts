/** Identifies the actual content of a shared planet canvas, independently of
 * React object references. A new profile or camera position must repaint
 * rather than showing the previous globe as if it were current. */
export interface PlanetCanvasRenderSignatureV143 {
  worldCode: string;
  projection: "map" | "globe";
  geometry: readonly number[];
  qualityPbr: boolean;
  coastKm: number;
  layer: string;
  switches: readonly (number | boolean | undefined)[];
  regions: readonly {
    regionId: string;
    landMaterialId: string;
    surfaceMaterialId: string | null;
    seed: number;
  }[] | null;
  revision: number;
}
export function planetCanvasRenderSignatureV143(input: PlanetCanvasRenderSignatureV143): string {
  if (!input.worldCode || !["map","globe"].includes(input.projection) ||
      !input.geometry.every(Number.isFinite) ||
      !Number.isFinite(input.coastKm) || input.coastKm < 0 ||
      !Number.isInteger(input.revision) || input.revision < 0)
    throw new RangeError("Signature de rendu planétaire invalide.");
  return JSON.stringify([
    "planet-canvas-v143", input.worldCode, input.projection, input.geometry,
    input.qualityPbr, input.coastKm, input.layer, input.switches,
    input.regions?.map(entry=>[
      entry.regionId,entry.landMaterialId,entry.surfaceMaterialId,entry.seed,
    ]) ?? null, input.revision,
  ]);
}
