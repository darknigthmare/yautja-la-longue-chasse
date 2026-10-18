import { type WarSimulationV85 } from "./clanWarV85";
import { WAR_FACTIONS_V85, WAR_TERRITORIES_V85, type WarFactionIdV85 } from "./clanWarV85Data";

export type WarAtlasPointV95 = readonly [number, number];
export interface WarAtlasViewV95 {
  longitude: number;
  latitude: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
}
export interface WarAtlasRegionV95 {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  territoryIds: string[];
}
export interface WarAtlasTerritoryV95 {
  id: string;
  regionId: string;
  longitude: number;
  latitude: number;
  points: WarAtlasPointV95[];
}

export const WAR_ATLAS_FACTIONS_V95: Record<WarFactionIdV85, { id: WarFactionIdV85; name: string; shortName: string; color: string }> = {
  "CON-F01": { id: "CON-F01", name: WAR_FACTIONS_V85["CON-F01"], shortName: "Haltes", color: "#63dcc5" },
  "CON-F02": { id: "CON-F02", name: WAR_FACTIONS_V85["CON-F02"], shortName: "Forges", color: "#f1816b" },
  "CON-F03": { id: "CON-F03", name: WAR_FACTIONS_V85["CON-F03"], shortName: "Passes", color: "#d8be79" },
};
const factionIds = Object.keys(WAR_ATLAS_FACTIONS_V95) as WarFactionIdV85[];

// This schematic planetary geography is an atlas illustration, not workbook
// measurements. The six source regions retain every source territory and route.
// Shared vertices and edge bends make six irregular, tessellated landmasses;
// geometry never introduces adjacency, ownership, income or combat rules.
const regionPlacements = [
  { longitude: -115, latitude: 35, width: 46, height: 42 },
  { longitude: -35, latitude: 42, width: 47, height: 34 },
  { longitude: 62, latitude: 33, width: 53, height: 44 },
  { longitude: -78, latitude: -24, width: 53, height: 43 },
  { longitude: 12, latitude: -29, width: 52, height: 45 },
  { longitude: 125, latitude: -26, width: 44, height: 46 },
];
const sourceRegions = [...new Set(WAR_TERRITORIES_V85.map(territory => territory.region))];
export const WAR_ATLAS_REGIONS_V95: WarAtlasRegionV95[] = sourceRegions.map((region, index) => ({
  id: region.split(" ")[0],
  name: region.replace(/^CON-REG\d+\s*/, ""),
  longitude: regionPlacements[index].longitude,
  latitude: regionPlacements[index].latitude,
  territoryIds: WAR_TERRITORIES_V85.filter(territory => territory.region === region).map(territory => territory.id),
}));

// Four rows of three vertices define each distinct coast and its internal borders.
const regionMeshes: WarAtlasPointV95[][][] = [
  [
    [[-0.58, -0.78], [-0.02, -1], [0.48, -0.63]],
    [[-0.97, -0.34], [0.08, -0.27], [0.88, -0.42]],
    [[-0.79, 0.38], [-0.11, 0.31], [0.97, 0.40]],
    [[-0.36, 0.81], [0.09, 1], [0.57, 0.74]],
  ],
  [
    [[-0.92, -0.64], [-0.19, -0.83], [0.78, -0.95]],
    [[-0.80, -0.20], [0.06, -0.28], [1, -0.16]],
    [[-0.48, 0.52], [0.25, 0.35], [0.85, 0.42]],
    [[0.02, 0.92], [0.43, 0.75], [0.63, 0.86]],
  ],
  [
    [[-0.26, -0.88], [0.17, -0.98], [0.69, -0.65]],
    [[-0.73, -0.27], [0.07, -0.42], [0.45, -0.31]],
    [[-0.96, 0.32], [-0.13, 0.18], [0.91, 0.40]],
    [[-0.60, 0.91], [0.12, 0.74], [0.80, 0.86]],
  ],
  [
    [[-0.80, -0.69], [-0.24, -0.94], [0.29, -0.84]],
    [[-0.49, -0.30], [0.18, -0.22], [1, -0.37]],
    [[-1, 0.37], [-0.10, 0.26], [0.59, 0.49]],
    [[-0.56, 0.78], [0.07, 0.97], [0.84, 0.73]],
  ],
  [
    [[-0.42, -0.97], [0.18, -0.76], [0.77, -0.85]],
    [[-0.95, -0.35], [-0.08, -0.39], [0.99, -0.06]],
    [[-0.73, 0.24], [0.14, 0.41], [0.70, 0.49]],
    [[-0.85, 0.72], [-0.30, 0.98], [0.39, 0.73]],
  ],
  [
    [[-0.29, -0.89], [0.11, -0.99], [0.53, -0.66]],
    [[-0.93, -0.21], [-0.19, -0.38], [0.66, -0.45]],
    [[-0.56, 0.34], [0.10, 0.28], [0.92, 0.18]],
    [[-0.17, 0.88], [0.26, 0.68], [0.57, 0.92]],
  ],
];
function midpointBend(a: WarAtlasPointV95, b: WarAtlasPointV95, salt: number): WarAtlasPointV95 {
  const sign = salt % 2 ? 1 : -1;
  return [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.065 * sign, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.065 * sign];
}
export const WAR_ATLAS_TERRITORIES_V95: WarAtlasTerritoryV95[] = WAR_ATLAS_REGIONS_V95.flatMap((region, regionIndex) => {
  const placement = regionPlacements[regionIndex];
  const mesh = regionMeshes[regionIndex];
  const translate = (point: WarAtlasPointV95): WarAtlasPointV95 => [placement.longitude + point[0] * placement.width / 2, placement.latitude - point[1] * placement.height / 2];
  return region.territoryIds.map((id, index) => {
    const row = Math.floor(index / 2), column = index % 2;
    const a = mesh[row][column], b = mesh[row][column + 1], c = mesh[row + 1][column + 1], d = mesh[row + 1][column];
    // A border uses the same bend in either neighboring polygon's direction.
    const top = midpointBend(a, b, row * 3 + column);
    const right = midpointBend(b, c, 20 + row * 3 + column + 1);
    const bottom = midpointBend(d, c, (row + 1) * 3 + column);
    const left = midpointBend(a, d, 20 + row * 3 + column);
    const points = [a, top, b, right, c, bottom, d, left].map(translate);
    const center = translate([(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4]);
    return { id, regionId: region.id, longitude: center[0], latitude: center[1], points };
  });
});

const radians = Math.PI / 180;
const finite = (value: number | undefined, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const round = (value: number) => Number(value.toFixed(3));
const wrapLongitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
function viewValues(view: WarAtlasViewV95) {
  return {
    longitude: wrapLongitude(finite(view.longitude, 0)) * radians,
    latitude: Math.max(-90, Math.min(90, finite(view.latitude, 0))) * radians,
    radius: Math.max(1, Math.min(10000, finite(view.radius, 200))),
    centerX: finite(view.centerX, 220), centerY: finite(view.centerY, 220),
  };
}
function cameraPoint(longitude: number, latitude: number, view: ReturnType<typeof viewValues>) {
  const lon = wrapLongitude(finite(longitude, 0)) * radians - view.longitude;
  const lat = Math.max(-90, Math.min(90, finite(latitude, 0))) * radians;
  return {
    x: Math.cos(lat) * Math.sin(lon),
    y: -(Math.cos(view.latitude) * Math.sin(lat) - Math.sin(view.latitude) * Math.cos(lat) * Math.cos(lon)),
    z: Math.sin(view.latitude) * Math.sin(lat) + Math.cos(view.latitude) * Math.cos(lat) * Math.cos(lon),
  };
}
export function projectWarAtlasGlobeV95(longitude: number, latitude: number, view: WarAtlasViewV95) {
  const values = viewValues(view), point = cameraPoint(longitude, latitude, values);
  return { x: values.centerX + point.x * values.radius, y: values.centerY + point.y * values.radius, depth: point.z, visible: point.z >= -1e-10 };
}
export function projectWarAtlasMapV95(longitude: number, latitude: number, width = 960, height = 480) {
  return {
    x: (Math.max(-180, Math.min(180, finite(longitude, 0))) + 180) / 360 * Math.max(1, finite(width, 960)),
    y: (90 - Math.max(-90, Math.min(90, finite(latitude, 0)))) / 180 * Math.max(1, finite(height, 480)),
  };
}
export function warAtlasMapPathV95(points: readonly WarAtlasPointV95[], width = 960, height = 480): string {
  if (points.length < 3 || points.some(point => !point.every(Number.isFinite))) return "";
  return points.map((point, index) => { const p = projectWarAtlasMapV95(point[0], point[1], width, height); return `${index === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`; }).join(" ") + " Z";
}

/** Orthographic polygon clipped to the visible hemisphere, with horizon arcs.
 * Boundary sampling follows this schematic map's lon/lat edges. It prevents
 * backside polygons or a closing chord from cutting across the planet's face. */
export function warAtlasGlobePathV95(points: readonly WarAtlasPointV95[], view: WarAtlasViewV95): string {
  if (points.length < 3 || points.some(point => !point.every(Number.isFinite))) return "";
  const values = viewValues(view), sampled: ReturnType<typeof cameraPoint>[] = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    const longitudeSpan = wrapLongitude(b[0] - a[0]);
    const steps = Math.max(1, Math.min(120, Math.ceil(Math.max(Math.abs(longitudeSpan), Math.abs(b[1] - a[1])) / 2)));
    for (let step = 0; step < steps; step++) sampled.push(cameraPoint(a[0] + longitudeSpan * step / steps, a[1] + (b[1] - a[1]) * step / steps, values));
  }
  type Vertex = { x: number; y: number; horizon: boolean; gapBefore: boolean };
  const visible: Vertex[] = [];
  const project = (point: { x: number; y: number }, horizon: boolean, gapBefore = false): Vertex => ({ x: values.centerX + point.x * values.radius, y: values.centerY + point.y * values.radius, horizon, gapBefore });
  const intersection = (a: typeof sampled[number], b: typeof sampled[number]) => {
    const t = a.z / (a.z - b.z), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  };
  for (let index = 0; index < sampled.length; index++) {
    const previous = sampled[(index + sampled.length - 1) % sampled.length], current = sampled[index];
    if (current.z >= 0) {
      if (previous.z < 0) visible.push(project(intersection(previous, current), true, true));
      visible.push(project(current, false));
    } else if (previous.z >= 0) visible.push(project(intersection(previous, current), true));
  }
  if (visible.length < 3) return "";
  const edge = (from: Vertex, to: Vertex) => {
    if (to.gapBefore && from.horizon && to.horizon) {
      const delta = Math.atan2(Math.sin(Math.atan2(to.y - values.centerY, to.x - values.centerX) - Math.atan2(from.y - values.centerY, from.x - values.centerX)), Math.cos(Math.atan2(to.y - values.centerY, to.x - values.centerX) - Math.atan2(from.y - values.centerY, from.x - values.centerX)));
      return `A${values.radius},${values.radius} 0 0 ${delta >= 0 ? 1 : 0} ${round(to.x)},${round(to.y)}`;
    }
    return `L${round(to.x)},${round(to.y)}`;
  };
  return `M${round(visible[0].x)},${round(visible[0].y)} ` + visible.slice(1).map((point, index) => edge(visible[index], point)).join(" ") + ` ${edge(visible[visible.length - 1], visible[0])} Z`;
}

export function warAtlasFactionMetricsV95(simulation: WarSimulationV85) {
  return factionIds.map(id => {
    const territoryCount = WAR_TERRITORIES_V85.filter(territory => simulation.territories[territory.id].controller === id).length;
    const regionCount = WAR_ATLAS_REGIONS_V95.filter(region => region.territoryIds.every(territoryId => simulation.territories[territoryId].controller === id)).length;
    return { ...WAR_ATLAS_FACTIONS_V95[id], territoryCount, share: territoryCount / WAR_TERRITORIES_V85.length, regionCount };
  });
}
export function warAtlasRegionMetricsV95(simulation: WarSimulationV85) {
  return WAR_ATLAS_REGIONS_V95.map(region => {
    const factions: Record<WarFactionIdV85, number> = { "CON-F01": 0, "CON-F02": 0, "CON-F03": 0 };
    for (const id of region.territoryIds) factions[simulation.territories[id].controller]++;
    return { id: region.id, name: region.name, territoryCount: region.territoryIds.length, playerCount: factions["CON-F01"], controller: factionIds.find(id => factions[id] === region.territoryIds.length) ?? null, factions };
  });
}

export interface WarAtlasIntelV95 {
  kind: "own" | "observed" | "unknown";
  label: string;
  count: number | null;
  lower: number | null;
  upper: number | null;
  turn: number | null;
  stale: boolean;
}
/** Enemy and neutral rosters are never exposed through this atlas selector.
 * A dated estimate remains an estimate, even when a later roster is available. */
export function warAtlasIntelV95(simulation: WarSimulationV85, territoryId: string): WarAtlasIntelV95 {
  if (simulation.territories[territoryId]?.controller === "CON-F01") {
    const count = simulation.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === territoryId && actor.status === "fit" && actor.trainingUntilTurn === null).length;
    return { kind: "own", label: `${count} personne${count === 1 ? "" : "s"} apte${count === 1 ? "" : "s"}`, count, lower: count, upper: count, turn: simulation.turn, stale: false };
  }
  const observation = simulation.observations.filter(item => item.territoryId === territoryId && item.turn <= simulation.turn).sort((a, b) => b.turn - a.turn)[0];
  if (!observation) return { kind: "unknown", label: "Effectif inconnu", count: null, lower: null, upper: null, turn: null, stale: false };
  const stale = simulation.turn - observation.turn > 2;
  return { kind: "observed", label: `${observation.lower}–${observation.upper} estimées · tour ${observation.turn}${stale ? " · ancien renseignement" : ""}`, count: null, lower: observation.lower, upper: observation.upper, turn: observation.turn, stale };
}
