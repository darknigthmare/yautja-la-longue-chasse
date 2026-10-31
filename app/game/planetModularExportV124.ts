import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { createPlanetRegionMaskV102 } from "./planetRegionalMaterialsV102";
import { createPlanetLandMaskV101 } from "./planetMaterialRendererV101";
import { unwrapPlanetPolygonV101 } from "./systems/planetMaterialV101";
import { WAR_PLANET_LAND_TEXTURES_V115 } from "./systems/clanWarTextureLibraryV115";
import { analyzeWarPlanetPhysicalIndexV125, describeWarPlanetShapeCatalogV125 } from "./systems/clanWarPlanetPhysicalIndexV125";
import { WAR_PLANET_TEXTURES_V125 } from "./systems/clanWarTextureLibraryV125";
import { WAR_PLANET_TEXTURES_V130 } from "./systems/clanWarTextureLibraryV130";
import { analyzePlanetPhysicalSurfaceV136 } from "./systems/clanWarPlanetSurfaceBudgetV136";

export type PlanetInlandMaskKindV124 = "lake" | "river";

/** No features are invented for V102 or historical planets. */
export function planetInlandFeaturesV124(planet: WarPlanetV96) {
  const procedural = planet.procedural;
  return procedural && "hydrology" in procedural ? procedural.hydrology.features : [];
}

function validateSize(width: number) {
  if (!Number.isInteger(width) || width < 256 || width > 2048 || width % 2 !== 0)
    throw new RangeError("La largeur du masque doit être paire, entre 256 et 2 048 px.");
}

/** Pure byte codec for the categorical region+coast masks. */
export function encodePlanetRegionPixelsV124(
  regionPixels: Uint8ClampedArray, landPixels: Uint8ClampedArray, regionCount: number,
): Uint8ClampedArray {
  if (regionPixels.length !== landPixels.length || regionPixels.length % 4 !== 0 ||
      !Number.isInteger(regionCount) || regionCount < 1 || regionCount > 254)
    throw new RangeError("Pixels ou nombre de régions invalides.");
  const encoded = new Uint8ClampedArray(regionPixels.length);
  for (let offset = 0; offset < landPixels.length; offset += 4) {
    if (landPixels[offset] < 128) continue;
    if (regionPixels[offset] >= regionCount) throw new Error("Indice de région incohérent avec cette planète.");
    encoded[offset] = regionPixels[offset] + 1;
    encoded[offset + 3] = 255;
  }
  return encoded;
}

/**
 * Region IDs use R=regionIndex+1, G=B=0 and A=255 where there is actual land.
 * R=0 and A=0 mean not a region (sea, lake, river or outside the map).
 * This does not alter the categorical shader mask or the saved planet.
 */
export function createPlanetRegionIndexMaskV124(planet: WarPlanetV96, width = 1024): HTMLCanvasElement {
  validateSize(width);
  if (planet.regions.length > 254) throw new RangeError("Trop de régions pour un masque à huit bits.");
  const regional = createPlanetRegionMaskV102(planet, width);
  const land = createPlanetLandMaskV101(planet, width);
  const regionPixels = regional.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, width, width / 2).data;
  const landPixels = land.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, width, width / 2).data;
  if (!regionPixels || !landPixels) throw new Error("Lecture des masques géographiques indisponible.");
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas du masque régional indisponible.");
  const output = context.createImageData(canvas.width, canvas.height);
  output.data.set(encodePlanetRegionPixelsV124(regionPixels, landPixels, planet.regions.length));
  context.putImageData(output, 0, 0);
  return canvas;
}

/** A dedicated transparent raster for each inland liquid topology.
 * Polygon wrap copies follow the exact renderer's spherical map projection.
 * Their fill is white; transparent pixels denote absence of that feature. */
export function createPlanetInlandMaskV124(
  planet: WarPlanetV96, kind: PlanetInlandMaskKindV124, width = 1024,
): HTMLCanvasElement {
  validateSize(width);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas d'hydrologie indisponible.");
  context.fillStyle = "#fff";
  for (const feature of planetInlandFeaturesV124(planet)) {
    if (feature.kind !== kind) continue;
    const points = unwrapPlanetPolygonV101(feature.points);
    for (const longitudeOffset of [-360, 0, 360]) {
      context.beginPath();
      points.forEach(([longitude, latitude], index) => {
        const x = (longitude + longitudeOffset + 180) / 360 * width;
        const y = (90 - latitude) / 180 * canvas.height;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.closePath();
      context.fill();
    }
  }
  return canvas;
}

/** Stable descriptive reconstruction metadata, never a source of gameplay state. */
export function describePlanetModularMasksV124(planet: WarPlanetV96) {
  const procedural = planet.procedural;
  const recipe = procedural?.recipe;
  const landMaterial = recipe?.version === 115
    ? WAR_PLANET_LAND_TEXTURES_V115[recipe.landMaterial]
    : null;
  return {
    format: "yautja-planet-modular-mask-index",
    version: 124,
    planetId: planet.id,
    projection: "equirectangular",
    regionMask: {
      redChannel: "one-based region index",
      greenChannel: 0, blueChannel: 0,
      alpha: "255 for emergent land, 0 for seas and inland liquids",
      backgroundValue: 0,
    },
    atlas: {
      columns: planet.regions.length <= 4 ? 2 : 4,
      rows: Math.ceil(planet.regions.length / (planet.regions.length <= 4 ? 2 : 4)),
      tileSize: 256,
      landDetailMaterial: landMaterial?.id ?? null,
      landDetailDescription: landMaterial?.description ?? null,
    },
    regions: planet.regions.map((region, index) => ({
      index,
      redValue: index + 1,
      id: region.id,
      name: region.name,
      territoryIds: [...region.territoryIds],
      biome: procedural?.regions.find(item => item.regionId === region.id)?.biome ?? planet.landBiome,
      atlasColumn: index % (planet.regions.length <= 4 ? 2 : 4),
      atlasRow: Math.floor(index / (planet.regions.length <= 4 ? 2 : 4)),
    })),
    inlandFeatures: planetInlandFeaturesV124(planet).map(feature => ({
      id: feature.id,
      kind: feature.kind,
      name: feature.name,
      regionIds: [...feature.regionIds],
    })),
    physicalIndex: analyzeWarPlanetPhysicalIndexV125(planet),
    physicalSurfaceBudgetV136: analyzePlanetPhysicalSurfaceV136(planet),
    selectedShapeIds: recipe?.version === 115 ? {
      island: `isl-${String(recipe.islandShape + 1).padStart(2, "0")}`,
      continent: `con-${String(recipe.continentShape + 1).padStart(2, "0")}`,
      region: `reg-${String(recipe.regionShape + 1).padStart(2, "0")}`,
    } : null,
    shapeCatalog: describeWarPlanetShapeCatalogV125(),
    supplementalMaterialCatalog: WAR_PLANET_TEXTURES_V125.map(item => ({
      id: item.id, name: item.name, description: item.description,
      domain: item.domain, origin: item.origin, pattern: item.pattern,
      channels: ["albedo", "height", "normal", "roughness", "emissive"] as const,
    })),
    // The V124 32-source field is stable; V130 adds its 16 unique sources
    // separately instead of silently changing the established manifest.
    supplementalMaterialAdditionsV130: WAR_PLANET_TEXTURES_V130
      .slice(WAR_PLANET_TEXTURES_V125.length).map(item => ({
        id: item.id, name: item.name, description: item.description,
        domain: item.domain, origin: item.origin, pattern: item.pattern,
        channels: ["albedo", "height", "normal", "roughness", "emissive"] as const,
      })),
  };
}
