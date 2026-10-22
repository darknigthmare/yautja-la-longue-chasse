import type { WarAtlasPointV95 } from "./clanWarAtlasV95";
import type { WarPlanetLandBiomeV96, WarPlanetV96 } from "./clanWarPlanetsV96";
import { planetLandProfileV103, planetSurfaceProfileV103 } from "./planetMaterialProfilesV103";

export const PLANET_MATERIAL_ROOT_V101 = "/game/planets/v101/runtime/";
export const PLANET_MATERIAL_SOURCE_ROOT_V101 = "/game/planets/v101/materials/";
export function planetMaterialSourceV101(path: string) {
  return path.replace(PLANET_MATERIAL_ROOT_V101, PLANET_MATERIAL_SOURCE_ROOT_V101).replace(/\.webp$/, ".png");
}

export type PlanetMaterialLayerV101 = "composite" | "albedo" | "surface" | "land" | "clouds" | "weather" | "atmosphere" | "night" | "aurora" | "emissive";
export const PLANET_MATERIAL_LAYERS_V101: readonly PlanetMaterialLayerV101[] = ["composite", "albedo", "surface", "land", "clouds", "weather", "atmosphere", "night", "aurora", "emissive"];

export interface PlanetMaterialSettingsV101 {
  atmosphere: boolean;
  clouds: boolean;
  weather: boolean;
  lighting: boolean;
}
export const DEFAULT_PLANET_MATERIAL_SETTINGS_V101: Readonly<PlanetMaterialSettingsV101> = Object.freeze({ atmosphere: true, clouds: true, weather: true, lighting: true });

const landColors: Record<WarPlanetLandBiomeV96, string> = {
  temperate: "#67734b", jungle: "#315e3b", tundra: "#838772", snow: "#d4e0df", desert: "#b79568",
  volcanic: "#403a3d", salt: "#c5bdaa", mountain: "#828a82", ocean: "#9caa90", swamp: "#54634a",
  crystal: "#9d85b8", fungal: "#597969", irradiated: "#686e52",
};

/** Visual recipes consume the effective V96 profiles. They do not redefine
 * planets, coastlines, route graphs, biome rules or save data. */
export function planetMaterialRecipeV101(planet: WarPlanetV96) {
  const kind = planet.surface.kind, biome = planet.landBiome;
  const cold = biome === "snow" || biome === "tundra";
  const dry = biome === "desert" || biome === "salt";
  const wet = biome === "jungle" || biome === "swamp" || biome === "ocean";
  const fungal = biome === "fungal";
  const volcanic = biome === "volcanic";
  const irradiated = biome === "irradiated";
  const profile = planet.procedural?.recipe.atmosphere;
  const options = planet.procedural?.recipe.version === 103 ? planet.procedural.recipe : null;
  const cloud = profile === "storm" ? "clouds-storm" : profile === "haze" ? "clouds-low" : profile ? "clouds-cirrus"
    : wet ? "clouds-storm" : cold || kind === "mist" ? "clouds-low" : "clouds-cirrus";
  const weather = profile === "storm" ? "clouds-storm" : profile === "aurora" ? "clouds-low" : profile ? "haze-dust"
    : volcanic ? "haze-ash" : fungal ? "particles-spores" : dry || kind === "acid" || irradiated ? "haze-dust" : "clouds-low";
  const sky = profile ? { clear: "#82b8e2", haze: "#c4b599", storm: "#a4b3d2", aurora: "#80dace" }[profile]
    : planet.style === "exotic" ? planet.surface.accent : dry ? "#d7bb8a" : volcanic ? "#d18a68" : "#82b8e2";
  return {
    id: planet.id,
    land: `${PLANET_MATERIAL_ROOT_V101}land-${biome}.webp`,
    surface: `${PLANET_MATERIAL_ROOT_V101}surface-${kind}.webp`,
    clouds: `${PLANET_MATERIAL_ROOT_V101}${cloud}.webp`,
    weather: `${PLANET_MATERIAL_ROOT_V101}${weather}.webp`,
    aurora: `${PLANET_MATERIAL_ROOT_V101}aurora.webp`,
    landColor: !profile && (biome === "crystal" || irradiated) ? planet.surface.accent : landColors[biome],
    atmosphereColor: sky,
    weatherColor: profile ? sky : planet.surface.accent,
    cloudOpacity: profile === "clear" ? .06 : profile === "haze" ? .14 : profile === "storm" ? .58 : profile === "aurora" ? .18
      : dry ? .12 : volcanic ? .16 : wet ? .39 : cold ? .28 : .24,
    weatherOpacity: profile === "clear" ? .025 : profile === "haze" ? .34 : profile === "storm" ? .24 : profile === "aurora" ? .06
      : volcanic ? .22 : fungal ? .19 : kind === "mist" ? .28 : dry || kind === "acid" ? .18 : irradiated ? .12 : .07,
    auroraOpacity: profile ? profile === "aurora" ? .62 : 0 : cold ? .42 : irradiated ? .28 : 0,
    atmosphereDensity: profile === "clear" ? .38 : profile === "haze" ? 1.45 : profile === "storm" ? 1.2 : profile === "aurora" ? .9 : 1,
    emission: kind === "lava" ? .5 : kind === "radioactive" ? .28 : kind === "spores" ? .13 : kind === "crystal" ? .06 : 0,
    seed: planet.seed,
    mapping: planet.procedural?.recipe.biomeDiversity === "varied" ? "world-space-triplanar-regional" as const : "world-space-triplanar-mirrored" as const,
    materials: options ? { land: planetLandProfileV103(options), surface: planetSurfaceProfileV103(options) } : null,
  };
}

export interface PlanetMaterialViewV101 {
  projection: "globe" | "map";
  width: number;
  height: number;
  longitude: number;
  latitude: number;
  radius: number;
  centerX: number;
  centerY: number;
  mapTop: number;
  mapHeight: number;
}

export function wrapPlanetLongitudeV101(longitude: number) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

/** CPU counterpart of the shader inverse projection, used to verify that a
 * texture point follows the same surface point as the interactive SVG atlas. */
export function planetPointFromPixelV101(x: number, y: number, view: PlanetMaterialViewV101): WarAtlasPointV95 | null {
  if (view.projection === "map") {
    if (x < 0 || x > view.width || y < view.mapTop || y > view.mapTop + view.mapHeight) return null;
    return [x / view.width * 360 - 180, 90 - (y - view.mapTop) / view.mapHeight * 180];
  }
  const nx = (x - view.centerX) / view.radius, ny = -(y - view.centerY) / view.radius;
  const distance = nx * nx + ny * ny;
  if (distance > 1 + 1e-12) return null;
  const z = Math.sqrt(Math.max(0, 1 - distance)), lat = view.latitude * Math.PI / 180;
  const latitude = Math.asin(Math.max(-1, Math.min(1, ny * Math.cos(lat) + z * Math.sin(lat))));
  const longitude = Math.atan2(nx, z * Math.cos(lat) - ny * Math.sin(lat));
  return [wrapPlanetLongitudeV101(view.longitude + longitude * 180 / Math.PI), latitude * 180 / Math.PI];
}

/** Unwrap coast edges before drawing three periodic copies into the mask.
 * This avoids a continent crossing the dateline becoming a stripe over the map. */
export function unwrapPlanetPolygonV101(points: readonly WarAtlasPointV95[]): WarAtlasPointV95[] {
  const result: WarAtlasPointV95[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    result.push([previous ? previous[0] + wrapPlanetLongitudeV101(point[0] - previous[0]) : point[0], point[1]]);
  }
  return result;
}
