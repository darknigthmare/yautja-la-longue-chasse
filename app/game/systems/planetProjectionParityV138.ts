import type { PlanetMaterialViewV101 } from "./planetMaterialV101";
import { wrapPlanetLongitudeV101 } from "./planetMaterialV101";

export type PlanetGeographicPointV138 = readonly [longitude: number, latitude: number];
export type PlanetScreenPointV138 = { x: number; y: number };

const RAD = Math.PI / 180;

/** CPU inverse of the *same* mapping used by the GPU V101/V131/V135.
 * No second geography generator or invented world coordinates. */
export function projectPlanetGeographyV138(
  [longitude, latitude]: PlanetGeographicPointV138,
  view: PlanetMaterialViewV101,
): PlanetScreenPointV138 | null {
  if (![longitude,latitude,view.width,view.height,view.longitude,view.latitude,
    view.radius,view.centerX,view.centerY,view.mapTop,view.mapHeight].every(Number.isFinite) ||
    latitude < -90 || latitude > 90 || view.width <= 0 || view.height <= 0 ||
    view.radius <= 0 || view.mapHeight <= 0)
    throw new RangeError("Coordonnées ou projection planétaire invalides.");
  const lon = wrapPlanetLongitudeV101(longitude);
  if (view.projection === "map") return {
    x: (lon + 180) / 360 * view.width,
    y: view.mapTop + (90 - latitude) / 180 * view.mapHeight,
  };
  if (view.projection !== "globe") throw new RangeError("Projection inconnue.");
  const delta = wrapPlanetLongitudeV101(lon - view.longitude) * RAD;
  const phi = view.latitude * RAD;
  const lat = latitude * RAD;
  const cos = Math.cos(lat), sin = Math.sin(lat);
  const towardCamera = sin * Math.sin(phi) + cos * Math.cos(phi) * Math.cos(delta);
  // Far hemisphere is never made visible just to satisfy a comparison test.
  if (towardCamera < 0) return null;
  const screenX = cos * Math.sin(delta), screenY = sin * Math.cos(phi) - cos * Math.cos(delta) * Math.sin(phi);
  return { x: view.centerX + view.radius * screenX,
    y: view.centerY - view.radius * screenY };
}
