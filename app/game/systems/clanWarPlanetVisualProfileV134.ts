import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import {
  validPlanetRegionalMaterialKitV128,
  type PlanetRegionalMaterialKitV128,
} from "./clanWarRegionalMaterialKitV128";

/** Independent visual-only sidecar. NEVER part of V102/V103/V115 world codes,
 * war saves or canonical terrain topology. */
export const PLANET_VISUAL_PROFILE_VERSION_V134 = 134;
export const PLANET_VISUAL_PROFILE_LIMIT_V134 = 65536;
export const PLANET_COAST_CHOICES_V134 = [300, 900, 1800] as const;
export type PlanetVisualQualityV134 = "albedo" | "pbr";
export type PlanetVisualCoastV134 = typeof PLANET_COAST_CHOICES_V134[number];

export interface PlanetVisualProfileV134 {
  format: "yautja-planet-visual-profile";
  version: 134;
  worldCode: string;
  quality: PlanetVisualQualityV134;
  coastalInfluenceKm: PlanetVisualCoastV134;
  kit: PlanetRegionalMaterialKitV128;
}

export interface PlanetVisualStoreV134 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PlanetVisualLoadResultV134 =
  | { status: "loaded"; profile: PlanetVisualProfileV134 }
  | { status: "empty" | "invalid" | "unavailable" };

export function planetVisualStorageKeyV134(planet: WarPlanetV96): string {
  return "yautja:planet-visual-profile:v134:" + encodeURIComponent(planet.id);
}

export function validPlanetVisualProfileV134(
  planet: WarPlanetV96, value: unknown,
): value is PlanetVisualProfileV134 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Partial<PlanetVisualProfileV134>;
  return Object.keys(value).sort().join(",") ===
      "coastalInfluenceKm,format,kit,quality,version,worldCode" &&
    profile.format === "yautja-planet-visual-profile" &&
    profile.version === PLANET_VISUAL_PROFILE_VERSION_V134 &&
    profile.worldCode === planet.id &&
    (profile.quality === "pbr" || profile.quality === "albedo") &&
    PLANET_COAST_CHOICES_V134.some(choice => choice === profile.coastalInfluenceKm) &&
    validPlanetRegionalMaterialKitV128(planet, profile.kit);
}

export function createPlanetVisualProfileV134(
  planet: WarPlanetV96, kit: PlanetRegionalMaterialKitV128,
  quality: PlanetVisualQualityV134 = "pbr",
  coastalInfluenceKm: PlanetVisualCoastV134 = 900,
): PlanetVisualProfileV134 {
  const result: PlanetVisualProfileV134 = {
    format: "yautja-planet-visual-profile",
    version: PLANET_VISUAL_PROFILE_VERSION_V134,
    worldCode: planet.id, quality, coastalInfluenceKm, kit,
  };
  if (!validPlanetVisualProfileV134(planet, result))
    throw new RangeError("Profil visuel incompatible avec cette planète.");
  return result;
}

export function decodePlanetVisualProfileV134(
  planet: WarPlanetV96, raw: string,
): PlanetVisualProfileV134 | null {
  if (typeof raw !== "string" || raw.length > PLANET_VISUAL_PROFILE_LIMIT_V134) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validPlanetVisualProfileV134(planet, value) ? value : null;
  } catch { return null; }
}

export function readPlanetVisualProfileV134(
  planet: WarPlanetV96, store: Pick<PlanetVisualStoreV134, "getItem">,
): PlanetVisualLoadResultV134 {
  try {
    const raw = store.getItem(planetVisualStorageKeyV134(planet));
    if (raw === null) return { status: "empty" };
    const profile = decodePlanetVisualProfileV134(planet, raw);
    return profile ? { status: "loaded", profile } : { status: "invalid" };
  } catch { return { status: "unavailable" }; }
}

export function writePlanetVisualProfileV134(
  planet: WarPlanetV96, store: Pick<PlanetVisualStoreV134, "setItem">,
  profile: PlanetVisualProfileV134,
): boolean {
  if (!validPlanetVisualProfileV134(planet, profile))
    throw new RangeError("Enregistrement visuel incohérent ou destiné à une autre planète.");
  const raw = JSON.stringify(profile);
  if (raw.length > PLANET_VISUAL_PROFILE_LIMIT_V134) return false;
  try {
    store.setItem(planetVisualStorageKeyV134(planet), raw);
    return true;
  } catch { return false; }
}

export function clearPlanetVisualProfileV134(
  planet: WarPlanetV96, store: Pick<PlanetVisualStoreV134, "removeItem">,
): boolean {
  try {
    store.removeItem(planetVisualStorageKeyV134(planet));
    return true;
  } catch { return false; }
}
