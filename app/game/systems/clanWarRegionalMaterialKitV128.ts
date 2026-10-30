import type { WarPlanetLandBiomeV96, WarPlanetSurfaceKindV96, WarPlanetV96 } from "./clanWarPlanetsV96";
import { findPlanetTextureV125, WAR_PLANET_TEXTURES_V125 } from "./clanWarTextureLibraryV125";

/**
 * Versioned *asset sidecar* for region-specific texture sources. This does not
 * change a canonical proc-v102/v103/v115 world code or its war save.
 */
export interface PlanetRegionMaterialsV128 {
  regionId: string;
  regionName: string;
  biome: WarPlanetLandBiomeV96;
  seed: number;
  landMaterialId: string;
  surfaceMaterialId: string | null;
}
export interface PlanetRegionalMaterialKitV128 {
  format: "yautja-planet-regional-material-kit";
  version: 128;
  worldCode: string;
  entries: PlanetRegionMaterialsV128[];
}

export const PLANET_LAND_AFFINITIES_V128: Readonly<Record<WarPlanetLandBiomeV96, readonly string[]>> = Object.freeze({
  temperate: ["land-loess", "land-redclay", "land-riverdelta", "land-karst", "land-gravel"],
  jungle: ["land-peat", "land-riverdelta", "land-bioceramic", "land-spore-bed"],
  tundra: ["land-permafrost", "land-gravel", "land-karst", "land-hex-prism"],
  snow: ["land-permafrost", "land-gravel", "land-hex-prism"],
  desert: ["land-white-sand", "land-loess", "land-redclay", "land-glass-erg"],
  volcanic: ["land-vascular-basalt", "land-glass-erg", "land-metal-root", "land-phosphor"],
  salt: ["land-white-sand", "land-loess", "land-karst", "land-glass-erg"],
  mountain: ["land-karst", "land-gravel", "land-hex-prism", "land-metal-root"],
  ocean: ["land-riverdelta", "land-peat", "land-gravel", "land-karst"],
  swamp: ["land-peat", "land-riverdelta", "land-spore-bed", "land-redclay"],
  crystal: ["land-hex-prism", "land-silicon-honeycomb", "land-glass-erg", "land-phosphor"],
  fungal: ["land-spore-bed", "land-bioceramic", "land-silicon-honeycomb", "land-peat"],
  irradiated: ["land-vascular-basalt", "land-metal-root", "land-phosphor", "land-redclay"],
});

/** Not every surrounding medium is a liquid. No invented liquid map is assigned
 * to particulate sand/spores, crystal fields, radioactive mists or dry fog. */
export const PLANET_SURFACE_AFFINITIES_V128: Readonly<Record<WarPlanetSurfaceKindV96, readonly string[]>> = Object.freeze({
  water: ["liquid-estuary", "liquid-tidal-foam", "liquid-bogwater", "liquid-whitewater", "liquid-silt", "liquid-iceflow"],
  acid: ["liquid-violet-acid", "liquid-sulfurlake"],
  ice: ["liquid-iceflow", "liquid-cryo-solvent"],
  sand: [],
  lava: ["liquid-magma-crust"],
  brine: ["liquid-saltlake", "liquid-biolume-brine"],
  radioactive: [],
  crystal: [],
  spores: [],
  mist: [],
});

const COLD_BIOMES = new Set<WarPlanetLandBiomeV96>(["snow", "tundra"]);
const WET_BIOMES = new Set<WarPlanetLandBiomeV96>(["swamp", "jungle"]);
const COASTAL_BIOMES = new Set<WarPlanetLandBiomeV96>(["ocean", "temperate"]);
const textureIds = new Set(WAR_PLANET_TEXTURES_V125.map(item => item.id));

export function regionBiomeV128(planet: WarPlanetV96, regionId: string): WarPlanetLandBiomeV96 {
  const region = planet.regions.find(item => item.id === regionId);
  if (!region) throw new RangeError("Région absente de cette planète.");
  return planet.procedural?.regions.find(item => item.regionId === regionId)?.biome ?? planet.landBiome;
}

export function compatibleLandMaterialsV128(biome: WarPlanetLandBiomeV96): readonly string[] {
  return PLANET_LAND_AFFINITIES_V128[biome] ?? [];
}

export function compatibleSurfaceMaterialsV128(
  surface: WarPlanetSurfaceKindV96, biome: WarPlanetLandBiomeV96,
): readonly string[] {
  const choices = PLANET_SURFACE_AFFINITIES_V128[surface] ?? [];
  if (surface !== "water") return choices;
  // Banquise on water requires cold coasts. Likewise, peat bogs require wetlands.
  if (COLD_BIOMES.has(biome)) return choices.filter(id => id === "liquid-iceflow" || id === "liquid-silt" || id === "liquid-whitewater");
  if (WET_BIOMES.has(biome)) return choices.filter(id => id !== "liquid-iceflow");
  if (COASTAL_BIOMES.has(biome)) return choices.filter(id => id !== "liquid-iceflow" && id !== "liquid-bogwater");
  return choices.filter(id => id !== "liquid-iceflow" && id !== "liquid-bogwater");
}

export function regionalMaterialSeedV128(seed: number, regionIndex: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isInteger(regionIndex) || regionIndex < 0 || regionIndex > 255)
    throw new RangeError("Graine ou indice de région invalide.");
  return (seed ^ Math.imul(regionIndex + 1, 0x9e3779b1)) >>> 0;
}

function recommendedId(
  ids: readonly string[], origin: "earthlike" | "alien", seed: number,
): string {
  if (!ids.length) throw new RangeError("Aucun matériau compatible.");
  const preferred = ids.filter(id => findPlanetTextureV125(id)?.origin === origin);
  const choices = preferred.length ? preferred : ids;
  return choices[seed % choices.length];
}

export function createPlanetRegionalMaterialKitV128(planet: WarPlanetV96): PlanetRegionalMaterialKitV128 {
  const origin = planet.style === "exotic" ? "alien" : "earthlike";
  return {
    format: "yautja-planet-regional-material-kit",
    version: 128,
    worldCode: planet.id,
    entries: planet.regions.map((region, index) => {
      const biome = regionBiomeV128(planet, region.id);
      const seed = regionalMaterialSeedV128(planet.seed, index);
      const land = compatibleLandMaterialsV128(biome);
      const surfaces = compatibleSurfaceMaterialsV128(planet.surface.kind, biome);
      return {
        regionId: region.id, regionName: region.name, biome, seed,
        landMaterialId: recommendedId(land, origin, seed),
        surfaceMaterialId: surfaces.length ? recommendedId(surfaces, origin, seed >>> 9) : null,
      };
    }),
  };
}

export function validPlanetRegionalMaterialKitV128(planet: WarPlanetV96, value: unknown): value is PlanetRegionalMaterialKitV128 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const kit = value as Partial<PlanetRegionalMaterialKitV128>;
  if (kit.format !== "yautja-planet-regional-material-kit" || kit.version !== 128 || kit.worldCode !== planet.id ||
    Object.keys(kit).sort().join(",") !== "entries,format,version,worldCode" ||
    !Array.isArray(kit.entries) || kit.entries.length !== planet.regions.length) return false;
  return kit.entries.every((entry, index) => {
    const region = planet.regions[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
      Object.keys(entry).sort().join(",") !== "biome,landMaterialId,regionId,regionName,seed,surfaceMaterialId") return false;
    const biome = regionBiomeV128(planet, region.id);
    const surfaces = compatibleSurfaceMaterialsV128(planet.surface.kind, biome);
    return entry.regionId === region.id && entry.regionName === region.name && entry.biome === biome &&
      entry.seed === regionalMaterialSeedV128(planet.seed, index) &&
      typeof entry.landMaterialId === "string" && textureIds.has(entry.landMaterialId) &&
      compatibleLandMaterialsV128(biome).includes(entry.landMaterialId) &&
      (entry.surfaceMaterialId === null || typeof entry.surfaceMaterialId === "string" && surfaces.includes(entry.surfaceMaterialId));
  });
}

export function editPlanetRegionalMaterialKitV128(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  regionId: string, domain: "land" | "surface", textureId: string | null,
): PlanetRegionalMaterialKitV128 {
  if (!validPlanetRegionalMaterialKitV128(planet, kit)) throw new RangeError("Kit régional incohérent ou périmé.");
  const found = kit.entries.find(item => item.regionId === regionId);
  if (!found) throw new RangeError("Région inconnue.");
  const allowed = domain === "land" ? compatibleLandMaterialsV128(found.biome) : compatibleSurfaceMaterialsV128(planet.surface.kind, found.biome);
  if (domain === "land" && (typeof textureId !== "string" || !allowed.includes(textureId)) ||
      domain === "surface" && textureId !== null && !allowed.includes(textureId))
    throw new RangeError("Matière incompatible avec le biome et le milieu de cette région.");
  return {
    ...kit,
    entries: kit.entries.map(item => item.regionId !== regionId ? item :
      domain === "land" ? { ...item, landMaterialId: textureId as string } : { ...item, surfaceMaterialId: textureId }),
  };
}

/** Exportable attribution receipt. No conquest, enemy data or save state. */
export function describePlanetRegionAssetsV128(planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128, regionId: string) {
  if (!validPlanetRegionalMaterialKitV128(planet, kit)) throw new RangeError("Attributions de région invalides.");
  const entry = kit.entries.find(item => item.regionId === regionId);
  if (!entry) throw new RangeError("Région inconnue.");
  const land = findPlanetTextureV125(entry.landMaterialId)!;
  const surface = entry.surfaceMaterialId ? findPlanetTextureV125(entry.surfaceMaterialId) : null;
  return {
    format: "yautja-planet-region-asset-pack",
    version: 128, worldCode: planet.id, regionId, regionName: entry.regionName, biome: entry.biome,
    globalSurfaceKind: planet.surface.kind, seed: entry.seed,
    land: { id: land.id, name: land.name, description: land.description, origin: land.origin, pattern: land.pattern },
    surface: surface ? { id: surface.id, name: surface.name, description: surface.description, origin: surface.origin, pattern: surface.pattern } : null,
    assignments: kit.entries,
    projection: "region-mask-equirectangular-512x256; texture-channels-tileable-256x256",
    notes: "Reconstruction visuelle descriptive. Les couches ne remplacent pas les biomes du renderer et ne modifient ni les combats, ni les ressources, ni le code canonique ou la sauvegarde.",
  };
}
