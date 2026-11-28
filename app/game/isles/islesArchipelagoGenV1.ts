/** The Isles V1 · the whole archipelago at real scale (app/game/data/islesArchipelagoV1.json).
 * 48 × 49 km at 2 m per tile is about 590 million tiles: nothing is stored. Each 32 × 32 zone is
 * computed on demand from the island outlines, fractal coast noise, a rule set per biome and the
 * zone anchors, then kept in a bounded cache. Same data and seed, same world, tile for tile. */
import type {IslesMapV1, IslesTileKindV1} from "./islesMapV1";
import {valueNoiseV1, type IslesWorldSiteV1} from "./islesWorldGenV1";
import {ISLES_FEATURE_HOLD_V1, ISLES_FEATURE_OVER_WATER_V1, ISLES_FEATURE_RADIUS_V1, isIslesFeatureV1, islesFeatureTileV1,
  type IslesFeatureKindV1, type IslesWorldTileV1} from "./islesArchipelagoFeaturesV1";
export type {IslesWorldTileV1} from "./islesArchipelagoFeaturesV1";

type Point = [number, number];
/** Generic settlements, or a named feature of islesArchipelagoFeaturesV1.ts. */
export type IslesStampV1 = "none" | "camp" | "village" | "town" | "industrial" | "ruins" | "city" | IslesFeatureKindV1;

/** `angle` (degrees, 0 = east, 90 = south) turns a feature: its length runs along the angle, its front faces 90° further. */
export interface IslesArchipelagoZoneV1 { id: string; name: string; at: Point; stamp: IslesStampV1; angle?: number }
export interface IslesArchipelagoSourceV1 {
  version: number; seed: number; scale: number; sizeKm: Point; tileMeters: number;
  islands: {number: string; id: string; name: string; biome: string; climate: string; outline: Point[]; zones: IslesArchipelagoZoneV1[];
    /** Other lands of the same island (barrier islands, twin islets). */
    parts?: Point[][];
    /** Outline taken from a detailed plan: the shore follows it closely. */
    fidelity?: boolean;
    /** Roads between two zones, added to the network that joins every zone of the island. */
    roads?: [string, string][]}[];
  chain: {number: string; id: string; name: string; biome: string; islets: {name: string; center: Point; radiusKm: number}[]; zones: IslesArchipelagoZoneV1[]};
  islets: {id: string; name: string; center: Point; radiusKm: number; note: string; zones?: IslesArchipelagoZoneV1[]}[];
  seaZone: {id: string; name: string; rigs: {id: string; name: string; center: Point; kind: string}[]};
  links: [string, string, string][];
}

/** Part of app/game/data/islesLivingWorldV1.json the terrain needs: true-scale relief, road types and transport lines. */
export interface IslesLivingSourceV1 {
  relief: {terraceMeters: number; islands: Record<string, {peak: number; snowLine: number | null; treeLine: number}>};
  roadTypes: Record<string, {halfWidth: number; surface: string}>;
  islands: Record<string, {roads: string[]}>;
  transports: Record<string, {class: string}>;
  lines: {id: string; kind: string; loop: boolean; stops: string[]}[];
}

export interface IslesArchipelagoWorldV1 {
  /** Ground route of each rail or road transport line, in metres, stop after stop (islesTransportV1.ts follows it). */
  linePaths: Record<string, [number, number][]>;
  /** Altitude in metres of each zone anchor (its terrace). */
  siteAltitude(id: string): number;
  map: IslesMapV1;
  sites: (IslesWorldSiteV1 & {island: string; stamp: IslesStampV1})[];
  /** Island and nearest zone at a world position (metres), or null at sea. */
  placeAt(x: number, z: number): {islandId: string; island: string; biome: string; zone: string | null} | null;
  /** One tile without touching the cache (maps, tests). */
  tileAt(tx: number, tz: number): IslesWorldTileV1;
  cachedZones(): number;
}

interface Shape {
  id: string; name: string; biome: string; polygon: Point[] | null; cx: number; cz: number; radius: number;
  minX: number; minZ: number; maxX: number; maxZ: number; amp: number; warp: number; size: number; anchors: Anchor[];
  /** Highest value of the unit relief of the shape, measured once: the peak of the data is reached there. */
  rawMax?: number;
}
interface Anchor { x: number; z: number; r: number; hold: number; cos: number; sin: number; zone: IslesArchipelagoZoneV1; shape?: Shape; alt?: number }
interface RoadNode { x: number; z: number; zone?: string; anchor?: Anchor }
interface Road {
  a: RoadNode; b: RoadNode; len: number; amp: number; half: number; surface: IslesTileKindV1; ford: boolean; phase: number;
  minX: number; minZ: number; maxX: number; maxZ: number; ha?: number; hb?: number;
}

const ZONE = 32;
const ISLET_BIOME: Record<string, string> = {ironhook: "militaire", blackrock: "rocher", "twin-keys": "commercial", navigator: "rocher",
  breakwater: "rocher", "gull-rock": "rocher", "cinder-rocks": "volcan", "little-ember": "volcan"};
const STAMP_RADIUS: Record<IslesStampV1, number> = {none: 24, camp: 60, village: 120, town: 190, industrial: 170, ruins: 130, city: 0, ...ISLES_FEATURE_RADIUS_V1};
const ROAD_SHOULDER = 60, ZONE_BLEND = 260, CITY_REACH = 560;
/** Stamps that stand at sea level whatever the relief: shores and the city grid. */
const SEA_LEVEL_STAMPS = new Set<string>(["city", "marina", "pier", "beach", "port", "airport", "lighthouse"]);
const MAJOR_STAMPS = new Set<string>(["city", "mall", "port", "industrial", "airport", "refinery", "parking", "stadium"]);
const LEGACY_PEAK = 100;
const TREE_HEIGHT: Record<string, number> = {tree: 7, pine: 9, palm: 6, cactus: 4, deadtree: 7};
type TreeKind = "tree" | "pine" | "palm" | "cactus" | "deadtree";

function hash2(x: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function fbm(x: number, z: number, seed: number, octaves: number): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += valueNoiseV1(x * freq, z * freq, seed + i * 131) * amp; norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}
const smooth = (value: number, from: number, to: number) => { const t = Math.min(1, Math.max(0, (value - from) / (to - from))); return t * t * (3 - 2 * t); };

/** Signed distance to a polygon, positive inside (same unit as the points). */
function polygonDistance(x: number, z: number, polygon: Point[]): number {
  let inside = false, best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax, dz = bz - az, len = dx * dx + dz * dz;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len)) : 0;
    const ex = ax + dx * t - x, ez = az + dz * t - z;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return inside ? Math.sqrt(best) : -Math.sqrt(best);
}

/** Builds the streamed world. `cacheZones` bounds the memory (a zone is 1 024 tiles). */
export function createArchipelagoWorldV1(source: IslesArchipelagoSourceV1, cacheZones = 900, living?: IslesLivingSourceV1): IslesArchipelagoWorldV1 {
  const tile = source.tileMeters, perKm = source.scale * 1000 / tile, seed = source.seed;
  const width = Math.round(source.sizeKm[0] * perKm), depth = Math.round(source.sizeKm[1] * perKm);
  const toTile = ([x, y]: Point): Point => [x * perKm, y * perKm];

  const shapes: Shape[] = [];
  const addShape = (id: string, name: string, biome: string, polygon: Point[] | null, center: Point, radius: number, zones: IslesArchipelagoZoneV1[], fidelity = false) => {
    const xs = polygon ? polygon.map(p => p[0]) : [center[0] - radius, center[0] + radius];
    const zs = polygon ? polygon.map(p => p[1]) : [center[1] - radius, center[1] + radius];
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    // Real shores are not polygons: the outline is bent at the scale of the island, then cut into bays and capes.
    // An outline taken from a detailed plan is bent far less.
    const warp = Math.min(1500, size * (polygon ? 0.16 : 0.3)) * (fidelity ? 0.22 : 1), amp = Math.min(420, Math.max(40, size * 0.055)) * (fidelity ? 0.55 : 1);
    const margin = warp * 1.25 + amp * 1.6 + 330;
    const cx = polygon ? xs.reduce((a, b) => a + b, 0) / xs.length : center[0], cz = polygon ? zs.reduce((a, b) => a + b, 0) / zs.length : center[1];
    shapes.push({id, name, biome, polygon, cx, cz, radius: polygon ? size / 2 : radius, amp, warp, size,
      minX: Math.min(...xs) - margin, minZ: Math.min(...zs) - margin, maxX: Math.max(...xs) + margin, maxZ: Math.max(...zs) + margin,
      anchors: zones.map(zone => {
        const [x, z] = toTile(zone.at), r = STAMP_RADIUS[zone.stamp], angle = (zone.angle ?? 0) * Math.PI / 180;
        const hold = Math.max(18, r * (isIslesFeatureV1(zone.stamp) ? ISLES_FEATURE_HOLD_V1[zone.stamp] ?? 0.55 : 0.55));
        return {x, z, r, hold, cos: Math.cos(angle), sin: Math.sin(angle), zone};
      })});
    const made = shapes[shapes.length - 1];
    for (const anchor of made.anchors) anchor.shape = made;
  };
  for (const island of source.islands) {
    // A zone belongs to the part of the island that contains it, or else to the main land.
    const parts = (island.parts ?? []).map(part => part.map(toTile));
    const partOf = (zone: IslesArchipelagoZoneV1) => { const [x, z] = toTile(zone.at); return parts.findIndex(part => polygonDistance(x, z, part) > 0); };
    addShape(island.id, island.name, island.biome, island.outline.map(toTile), [0, 0], 0, island.zones.filter(zone => partOf(zone) < 0), island.fidelity);
    parts.forEach((part, k) => addShape(island.id + "#" + k, island.name, island.biome, part, [0, 0], 0, island.zones.filter(zone => partOf(zone) === k), island.fidelity));
  }
  source.chain.islets.forEach((islet, i) => addShape(source.chain.id + ":" + i, source.chain.name, "mangroves", null, toTile(islet.center), islet.radiusKm * perKm,
    source.chain.zones.filter(zone => zone.at[0] === islet.center[0] && zone.at[1] === islet.center[1])));
  for (const islet of source.islets) addShape(islet.id, islet.name, ISLET_BIOME[islet.id] ?? "rocher", null, toTile(islet.center), islet.radiusKm * perKm, islet.zones ?? []);
  const baseId = (id: string) => id.split(/[:#]/)[0];

  // Road network: every zone of an island is joined to the others by the shortest tree, the plans add their own roads,
  // each bridge, causeway or ford of the links joins the two nearest places of its islands, and every rail or road
  // transport line gets its own way from stop to stop. The type of a road follows what the island allows.
  const roads: Road[] = [];
  const roadKeys = new Map<string, Road>();
  const typeOf = (name: string) => living?.roadTypes[name] ?? {halfWidth: name === "track" ? 2 : 3.5, surface: name === "track" ? "mud" : name === "ford" ? "ford" : "road"};
  const nodesOf = (id: string): RoadNode[] => {
    const list = shapes.filter(shape => baseId(shape.id) === id);
    const anchors = list.flatMap(shape => shape.anchors.map(anchor => ({x: anchor.x, z: anchor.z, zone: anchor.zone.id, anchor})));
    return anchors.length ? anchors : list.map(shape => ({x: shape.cx, z: shape.cz}));
  };
  const addRoad = (a: RoadNode, b: RoadNode, type: string, straight = false): Road | null => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 8) return null;
    const key = [a.x, a.z, b.x, b.z, typeOf(type).surface === "rail"].join(","), back = [b.x, b.z, a.x, a.z, typeOf(type).surface === "rail"].join(",");
    const known = roadKeys.get(key) ?? roadKeys.get(back);
    if (known) return known;
    const {halfWidth, surface} = typeOf(type), amp = straight ? 0 : Math.min(90, len * 0.08), pad = amp + halfWidth + ROAD_SHOULDER + 2;
    const road: Road = {a, b, len, amp, half: halfWidth, surface: (surface === "rail" ? "rail" : surface === "mud" || surface === "ford" ? "mud" : "road"), ford: type === "ford", phase: roads.length * 7.31,
      minX: Math.min(a.x, b.x) - pad, minZ: Math.min(a.z, b.z) - pad, maxX: Math.max(a.x, b.x) + pad, maxZ: Math.max(a.z, b.z) + pad};
    roads.push(road); roadKeys.set(key, road);
    return road;
  };
  const allNodes = new Map<string, RoadNode>();
  for (const island of [...source.islands, source.chain]) {
    const allowed = new Set(living?.islands[island.id]?.roads ?? ["road", "track"]);
    const nodes = nodesOf(island.id), linked = new Set([0]);
    for (const node of nodes) if (node.zone) allNodes.set(node.zone, node);
    if (island.id === source.chain.id) continue;
    const pick = (a: RoadNode, b: RoadNode) => {
      const sa = a.anchor?.zone.stamp ?? "none", sb = b.anchor?.zone.stamp ?? "none", wild = (stamp: string) => stamp === "none" || stamp === "camp" || stamp === "ruins";
      if (!wild(sa) && !wild(sb)) return allowed.has("highway") && MAJOR_STAMPS.has(sa) && MAJOR_STAMPS.has(sb) ? "highway" : allowed.has("road") ? "road" : "track";
      return allowed.has("track") ? "track" : allowed.has("road") ? "road" : "trail";
    };
    while (linked.size < nodes.length) {
      let best = Infinity, from = 0, to = 0;
      for (const i of linked) nodes.forEach((node, j) => { const d = linked.has(j) ? Infinity : Math.hypot(node.x - nodes[i].x, node.z - nodes[i].z); if (d < best) { best = d; from = i; to = j; } });
      linked.add(to); addRoad(nodes[from], nodes[to], pick(nodes[from], nodes[to]));
    }
    for (const [a, b] of (island as {roads?: [string, string][]}).roads ?? []) { const na = allNodes.get(a), nb = allNodes.get(b); if (na && nb) addRoad(na, nb, pick(na, nb)); }
  }
  for (const islet of source.islets) for (const node of nodesOf(islet.id)) if (node.zone) allNodes.set(node.zone, node);
  for (const [a, b, means] of source.links) {
    if (!/pont|digue|poste|gué|rail/.test(means)) continue;
    let best = Infinity, pair: [RoadNode, RoadNode] | null = null;
    for (const na of nodesOf(a)) for (const nb of nodesOf(b)) { const d = Math.hypot(na.x - nb.x, na.z - nb.z); if (d < best) { best = d; pair = [na, nb]; } }
    if (pair) addRoad(pair[0], pair[1], /gué/.test(means) && !/pont/.test(means) ? "ford" : "bridge");
  }
  /** Sideways wander of a road at a share `t` of its length, in tiles. */
  const bendOf = (road: Road, t: number) => road.amp ? road.amp * Math.sin(Math.PI * t) * (fbm(t * road.len / 260 + road.phase, road.phase * 0.37, seed + 251, 2) - 0.5) * 2 : 0;
  // Ways of the transport lines: straight rails, and roads for buses, lorries and pick-ups; their course is kept for the vehicles.
  const linePaths: Record<string, [number, number][]> = {};
  for (const line of living?.lines ?? []) {
    const cls = living?.transports[line.kind]?.class;
    if (cls !== "rail" && cls !== "route") continue;
    const stops = line.stops.map(id => allNodes.get(id)).filter((node): node is RoadNode => !!node), points: [number, number][] = [];
    const legs = line.loop ? stops.length : stops.length - 1;
    for (let i = 0; i < legs; i++) {
      const from = stops[i], to = stops[(i + 1) % stops.length];
      const road = addRoad(from, to, cls === "rail" ? "rail" : line.kind === "pickup" || line.kind === "motoneige" ? "track" : "road", cls === "rail");
      if (!road) continue;
      const forward = road.a === from, steps = Math.max(1, Math.ceil(road.len / 8));
      for (let k = i ? 1 : 0; k <= steps; k++) {
        const t = forward ? k / steps : 1 - k / steps, dx = (road.b.x - road.a.x) / road.len, dz = (road.b.z - road.a.z) / road.len, bend = bendOf(road, t);
        points.push([(road.a.x + dx * road.len * t + dz * bend) * tile, (road.a.z + dz * road.len * t - dx * bend) * tile]);
      }
    }
    if (points.length > 1) linePaths[line.id] = points;
  }
  /** Nearest road at a tile: distance to its edge in tiles (0 or less on the road, 99 beyond the shoulder), with its
   * height there and its surface. */
  const near = {edge: 99, height: 0, surface: "road" as IslesTileKindV1, ford: false};
  const roadNear = (x: number, z: number): number => {
    near.edge = 99;
    for (const road of roads) {
      if (x < road.minX || x > road.maxX || z < road.minZ || z > road.maxZ) continue;
      const dx = (road.b.x - road.a.x) / road.len, dz = (road.b.z - road.a.z) / road.len, t = ((x - road.a.x) * dx + (z - road.a.z) * dz) / road.len;
      if (t < 0 || t > 1) continue;
      const edge = Math.abs((x - road.a.x) * dz - (z - road.a.z) * dx - bendOf(road, t)) - road.half;
      // Rails keep their bed where a road runs over them: the train never leaves its track.
      if ((edge < near.edge || (edge <= 0 && road.surface === "rail" && near.surface !== "rail")) && edge <= ROAD_SHOULDER && !(near.edge <= 0 && near.surface === "rail")) {
        if (road.ha === undefined) { road.ha = road.a.anchor ? altitudeOf(road.a.anchor) : 0; road.hb = road.b.anchor ? altitudeOf(road.b.anchor) : 0; }
        near.edge = edge; near.ford = road.ford; near.surface = road.surface;
        // A road climbs at a steady grade between its two ends, in half-metre steps a walker takes without climbing.
        near.height = Math.round((road.ha + (road.hb! - road.ha) * t) * 2) / 2;
      }
    }
    return near.edge;
  };

  /** Land field of one shape: > 0 on land, about the distance to the shore in tiles. */
  const field = (shape: Shape, x: number, z: number): number => {
    const big = shape.size * 0.55, mid = shape.size * 0.16, w = shape.warp;
    const wx = x + (fbm(x / big + 3.7, z / big + 9.2, seed + 211, 2) - 0.5) * 2 * w + (fbm(x / mid + 1.3, z / mid + 4.4, seed + 223, 2) - 0.5) * 0.6 * w;
    const wz = z + (fbm(x / big + 8.1, z / big + 2.6, seed + 227, 2) - 0.5) * 2 * w + (fbm(x / mid + 6.9, z / mid + 0.8, seed + 229, 2) - 0.5) * 0.6 * w;
    const d = shape.polygon ? polygonDistance(wx, wz, shape.polygon) : shape.radius - Math.hypot(wx - shape.cx, wz - shape.cz);
    if (d < -shape.amp * 1.7) return d;
    const s = shape.amp;
    // Bays and headlands at three wavelengths, like a real shoreline.
    const n = (fbm(x / (s * 5) + 7.1, z / (s * 5) + 3.3, seed, 3) - 0.5) * 2.4 * s + (fbm(x / (s * 0.9), z / (s * 0.9), seed + 17, 3) - 0.5) * 0.55 * s +
      (valueNoiseV1(x / 9, z / 9, seed + 29) - 0.5) * 6;
    let f = d + n;
    for (const anchor of shape.anchors) {
      const hold = anchor.hold - Math.hypot(x - anchor.x, z - anchor.z);
      if (hold > f) f = hold;
    }
    return f;
  };
  const owner = (x: number, z: number): {shape: Shape; d: number; reef?: boolean} | null => {
    let best: Shape | null = null, bestF = -Infinity, second = -Infinity;
    for (const shape of shapes) {
      if (x < shape.minX || x > shape.maxX || z < shape.minZ || z > shape.maxZ) continue;
      const f = field(shape, x, z);
      if (f > bestF) { second = bestF; bestF = f; best = shape; } else if (f > second) second = f;
    }
    // Two lands never merge: a strait of about 120 m stays open between neighbours.
    if (!best || second > -60) return null;
    if (bestF > 0) return {shape: best, d: bestF};
    // Offshore: skerries off every coast, and a fringing reef around the tropical islands.
    if (bestF > -best.amp * 1.5 && bestF < -22 && valueNoiseV1(x / 46, z / 46, seed + 233) > 0.84 + Math.max(0, -bestF / (best.amp * 6))) return {shape: best, d: 3};
    if ((best.biome === "jungle" || best.biome === "tropical" || best.biome === "mangroves") && bestF > -150 && bestF < -70 &&
        fbm(x / 120, z / 120, seed + 239, 2) > 0.47) return {shape: best, d: 0, reef: true};
    return null;
  };

  const water: IslesWorldTileV1 = {kind: "water", height: -1.2, base: -1.2, ground: "water"};
  const ground = (kind: IslesTileKindV1, height = 0): IslesWorldTileV1 => ({kind, height, base: height, ground: kind});
  const tree = (kind: TreeKind, under: IslesTileKindV1, base: number, tall = TREE_HEIGHT[kind]): IslesWorldTileV1 => ({kind, height: base + tall, base, ground: under});
  const step = living?.relief.terraceMeters ?? 3;
  const terrace = (metres: number) => metres < step ? 0 : Math.floor(metres / step) * step;
  const shallow = (base: number): IslesWorldTileV1 => ({kind: "ford", height: base - 0.35, base: base - 0.35, ground: "ford"});
  /** Lifts a built tile onto the terrace of its zone; open water does not exist in altitude, a mountain lake is waded. */
  const lift = (built: IslesWorldTileV1, alt: number): IslesWorldTileV1 => alt === 0 ? built
    : built.kind === "water" || built.kind === "ford" ? shallow(alt) : {...built, height: built.height + alt, base: built.base + alt};
  const reliefOf = (shape: Shape) => {
    const main = !/[#:]/.test(shape.id) || shape.id.startsWith(source.chain.id);
    return living?.relief.islands[baseId(shape.id)] && main ? living.relief.islands[baseId(shape.id)] : {peak: main && shape.polygon ? LEGACY_PEAK : 6, snowLine: null, treeLine: 0};
  };

  /** Unit relief of a biome at a tile: only its shape matters, the peak of the data scales it. */
  function rawRelief(shape: Shape, tx: number, tz: number, dM: number, ridge: number, detail: number, rr: number): number {
    switch (shape.biome) {
      case "forêt de pins": return (0.1 + 0.9 * smooth(shape.cz + shape.radius * 0.12 - tz, -300, 900)) * smooth(dM, 150, 3200) * Math.pow(ridge, 2.6);
      case "toundra": return smooth(dM, 60, 1500) * (0.35 + ridge) * Math.max(0.15, 1 - rr * 0.8);
      case "lande": return dM > 16 ? 0.3 + 0.7 * smooth(ridge, 0.45, 0.75) * smooth(dM, 100, 800) : 0;
      case "quarantaine": return smooth(shape.cz - shape.radius * 0.3 - tz + (detail - 0.5) * 700, -200, 500) * smooth(dM, 100, 1200) * ridge;
      case "désert": {
        if (dM < 200) return 0;
        // A plateau cut by canyons, with flat-topped mesas standing on it.
        if (Math.abs(fbm(tx / 340 + 5, tz / 340 + 9, seed + 97, 2) - 0.5) < 0.022) return 0;
        return ridge > 0.66 ? 1 : ridge > 0.6 ? 0.66 : 0.3 * smooth(dM, 200, 900);
      }
      case "savane": return ridge > 0.74 && detail > 0.55 ? 1 : 0.1 * ridge;
      case "marais": return ridge > 0.72 ? 1 : 0;
      case "volcan": return Math.pow(Math.max(0, 1 - rr * 1.15), 1.25) * (0.85 + 0.3 * detail);
      case "méditerranéen": return smooth(dM, 150, 1800) * Math.pow(ridge, 1.6);
      case "tropical": case "jungle": return smooth(dM, 200, 1500) * Math.pow(ridge, 2.4);
      case "mangroves": return detail > 0.7 ? 1 : 0;
      case "métropole": {
        // Plan « Big City »: a mountain in the north around the reservoir, a line of hills along the east shore.
        const north = smooth(shape.cz - shape.radius * 0.25 - tz, -400, 900), east = smooth(tx - shape.cx - shape.radius * 0.45, -200, 500);
        return (0.08 + north + 0.43 * east) * smooth(dM, 150, 1500) * Math.pow(ridge, 2.2);
      }
      // Plan « Comercial Zone »: « Mountain » on the north and east shores.
      case "commercial": return smooth(tx - shape.cx + (shape.cz - tz) * 0.8, shape.radius * 0.45, shape.radius * 0.95) * smooth(dM, 60, 500) * (0.5 + ridge);
      case "industriel": case "militaire": return 0;
      default: return dM > 20 ? 0.5 + (ridge > 0.55 ? 0.5 : 0) : 0;
    }
  }
  const noiseAt = (tx: number, tz: number) => ({ridge: fbm(tx / 620 + 11, tz / 620 + 5, seed + 3, 4), detail: fbm(tx / 90, tz / 90, seed + 5, 3)});
  /** Natural altitude in metres at a tile of a shape, before any terrace, zone or road. */
  function natural(shape: Shape, tx: number, tz: number, dM: number, ridge: number, detail: number): number {
    if (shape.rawMax === undefined) {
      // Measured once on a coarse grid of the shape, so that its highest point is the peak of the data.
      let max = 0;
      const cells = 72, sx = (shape.maxX - shape.minX) / cells, sz = (shape.maxZ - shape.minZ) / cells;
      for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
        const x = shape.minX + i * sx, z = shape.minZ + j * sz, f = field(shape, x, z);
        if (f <= 0) continue;
        const n = noiseAt(x, z);
        max = Math.max(max, rawRelief(shape, x, z, f * tile, n.ridge, n.detail, Math.hypot(x - shape.cx, z - shape.cz) / Math.max(1, shape.radius)));
      }
      shape.rawMax = max || 1;
    }
    const raw = rawRelief(shape, tx, tz, dM, ridge, detail, Math.hypot(tx - shape.cx, tz - shape.cz) / Math.max(1, shape.radius));
    return shape.polygon || shape.id.startsWith(source.chain.id) ? reliefOf(shape).peak * Math.min(1, raw / shape.rawMax) : 6 * raw;
  }
  /** Altitude of the terrace of a zone: the natural ground at its anchor, sea level for shores, city blocks and lowlands. */
  function altitudeOf(anchor: Anchor): number {
    if (anchor.alt !== undefined) return anchor.alt;
    anchor.alt = 0;
    const shape = anchor.shape;
    if (!shape || SEA_LEVEL_STAMPS.has(anchor.zone.stamp)) return 0;
    const n = noiseAt(anchor.x, anchor.z), height = terrace(natural(shape, anchor.x, anchor.z, Math.max(0, field(shape, anchor.x, anchor.z)) * tile, n.ridge, n.detail));
    return anchor.alt = height < 12 ? 0 : height;
  }

  /** Named place of the plans (airport, stadium, marina…) at a tile, if any. */
  function feature(shape: Shape, x: number, z: number, onLand: boolean): IslesWorldTileV1 | null {
    for (const anchor of shape.anchors) {
      const kind = anchor.zone.stamp;
      if (!isIslesFeatureV1(kind) || (!onLand && !ISLES_FEATURE_OVER_WATER_V1.has(kind))) continue;
      const dx = x - anchor.x, dz = z - anchor.z;
      if (Math.abs(dx) > anchor.r || Math.abs(dz) > anchor.r) continue;
      const built = islesFeatureTileV1(kind, dx * anchor.cos + dz * anchor.sin, -dx * anchor.sin + dz * anchor.cos, seed + Math.round(anchor.x), onLand);
      if (built) return lift(built, onLand ? altitudeOf(anchor) : 0);
    }
    return null;
  }

  /** Buildings on a local street grid around a zone anchor. */
  function stamp(shape: Shape, x: number, z: number, land: IslesTileKindV1): IslesWorldTileV1 | null {
    for (const anchor of shape.anchors) {
      const kind = anchor.zone.stamp;
      if (kind === "city" || isIslesFeatureV1(kind)) continue;
      const dx = x - anchor.x, dz = z - anchor.z, dist = Math.hypot(dx, dz), up = (built: IslesWorldTileV1) => lift(built, altitudeOf(anchor));
      if (dist > anchor.r) continue;
      if (kind === "none") return dist < 10 ? up(ground(land === "snow" ? "snow" : "mud")) : null;
      const cell = kind === "industrial" ? 30 : kind === "town" ? 18 : kind === "camp" ? 12 : 16;
      const lx = ((Math.round(dx) % cell) + cell) % cell, lz = ((Math.round(dz) % cell) + cell) % cell;
      const street: IslesTileKindV1 = kind === "camp" || kind === "ruins" ? "mud" : "road";
      if (lx < 2 || lz < 2) return up(ground(street));
      const cx = Math.floor(Math.round(dx) / cell), cz = Math.floor(Math.round(dz) / cell);
      const pick = hash2(cx * 7 + 3, cz * 11 + 5, seed + anchor.zone.id.length * 97 + Math.round(anchor.x));
      const density = kind === "camp" ? 0.3 : kind === "ruins" ? 0.6 : kind === "village" ? 0.62 : 0.8;
      const edge = dist > anchor.r * 0.82;
      if (pick > density || edge) return up(ground(kind === "village" || kind === "camp" ? "grass" : street));
      const inset = kind === "industrial" ? 4 : 3, far = cell - (kind === "industrial" ? 3 : 2);
      if (lx < inset || lz < inset || lx >= far || lz >= far) return up(ground(kind === "village" ? "grass" : street));
      if (kind === "camp") return up(pick < 0.08 ? ground("crate", 1) : ground("roof", 3.5));
      if (kind === "village") return up(ground("roof", 3.5));
      if (kind === "ruins") return up(hash2(x, z, seed + 41) < 0.25 ? ground("mud") : ground("ruin", pick < 0.2 ? 6.5 : pick < 0.4 ? 4 : 2));
      if (kind === "industrial") return up(ground("building", pick < 0.25 ? 15 : pick < 0.55 ? 12 : 9));
      return up(ground("building", pick < 0.3 ? 10.5 : 7));
    }
    return null;
  }

  /** Street grid, blocks and parks of the metropolis; taller toward Downtown. */
  function city(shape: Shape, x: number, z: number, dM: number): IslesWorldTileV1 | null {
    const anchors = shape.anchors.filter(a => a.zone.stamp === "city");
    if (!anchors.length || dM < 90) return null;
    // The grid covers the districts of the plan, not the whole island: hills, suburbs and shores keep their ground.
    const nearest = anchors.reduce((best, a) => Math.min(best, Math.hypot(x - a.x, z - a.z)), Infinity);
    if (nearest > 560 + (fbm(x / 300, z / 300, seed + 241, 2) - 0.5) * 260) return null;
    const block = 46, lx = ((x % block) + block) % block, lz = ((z % block) + block) % block;
    const avenue = (Math.floor(x / block) % 5 === 0 && lx < 9) || (Math.floor(z / block) % 6 === 0 && lz < 8);
    if (lx < 6 || lz < 5 || avenue) return ground("road");
    const bx = Math.floor(x / block), bz = Math.floor(z / block), pick = hash2(bx, bz, seed + 61);
    if (pick < 0.05) return hash2(x, z, seed + 53) < 0.06 ? tree("tree", "grass", 0) : ground("grass");
    if (lx < 8 || lz < 7 || lx > block - 3 || lz > block - 3) return ground("road");
    const downtown = anchors.reduce((best, a) => Math.min(best, a.zone.id === "4.1" || a.zone.id === "4.3" ? Math.hypot(x - a.x, z - a.z) : best), Infinity);
    // Each block is split in two lots of different heights.
    const lot = hash2(bx * 2 + (lx > block / 2 ? 1 : 0), bz, seed + 67);
    // Towers up to about 310 m in the business district, far below the 920 m of mount Calder.
    const tall = Math.min(309, 12 + Math.round((280 * Math.exp(-downtown / 420) * (0.3 + 0.7 * lot) + 18 * lot) / 3) * 3);
    return ground("building", tall);
  }

  function compute(tx: number, tz: number): IslesWorldTileV1 {
    if (tx < 0 || tz < 0 || tx >= width || tz >= depth) return water;
    const own = owner(tx, tz);
    if (!own) {
      for (const rig of source.seaZone.rigs) {
        const [rx, rz] = toTile(rig.center), dx = Math.abs(tx - rx), dz = Math.abs(tz - rz);
        if (dx < 22 && dz < 22) return dx < 6 && dz < 6 ? ground("building", 30) : (dx % 16 < 2 && dz % 16 < 2) ? ground("pillar", 12) : ground("wall", 12);
      }
      for (const shape of shapes) {
        if (tx < shape.minX || tx > shape.maxX || tz < shape.minZ || tz > shape.maxZ) continue;
        const built = feature(shape, tx, tz, false);
        if (built) return built;
      }
      // Bridges, causeways and rail viaducts cross the straits above the water; a ford is waded.
      if (roadNear(tx, tz) <= 0) return near.ford ? shallow(0) : ground(near.surface, Math.max(0.5, near.height));
      return water;
    }
    if (own.reef) return shallow(0);
    const {shape, d} = own, dM = d * tile, biome = shape.biome;
    const {ridge, detail} = noiseAt(tx, tz), r = hash2(tx, tz, seed + 7);
    const rr = Math.hypot(tx - shape.cx, tz - shape.cz) / Math.max(1, shape.radius);
    const beach: IslesTileKindV1 = biome === "toundra" ? "snow" : biome === "lande" || biome === "volcan" || biome === "rocher" ? "rock" : "sand";

    const named = feature(shape, tx, tz, true);
    if (named) return named;
    const edge = roadNear(tx, tz), road = edge <= 0, roadHeight = near.height, roadSurface = near.surface;
    if (biome === "métropole" && !(road && roadSurface === "rail")) {
      const built = city(shape, tx, tz, dM);
      if (built) return built;
    }
    let relief = natural(shape, tx, tz, dM, ridge, detail);
    let land: IslesTileKindV1 = "grass", treeKind: TreeKind = "tree", trees = 0, bushes = 0, shrub: IslesTileKindV1 = "bush", giants = 0;
    switch (biome) {
      case "forêt de pins": {
        const north = smooth(shape.cz + shape.radius * 0.12 - tz, -300, 900);
        treeKind = "pine"; trees = 0.05 + 0.2 * north * detail * 1.6; bushes = 0.03;
        if (dM > 500 && fbm(tx / 520, tz / 520, seed + 71, 2) < 0.2 && relief < 6 && !road) return water;
        // Harvest Flats: fields in straight rows on the southern plain.
        const farm = shape.anchors.find(a => a.zone.id === "2.7");
        if (farm && relief < 6 && Math.hypot(tx - farm.x, tz - farm.z) < 620 && fbm(tx / 70, tz / 70, seed + 101, 2) > 0.42) { trees = 0; bushes = tx % 6 < 4 ? 0.85 : 0; shrub = "crop"; land = "mud"; }
        break;
      }
      case "toundra": land = "snow"; treeKind = "pine"; trees = 0.006; break;
      case "lande": bushes = 0.09; trees = 0.004; treeKind = "pine"; break;
      case "quarantaine": {
        const site = shape.anchors.find(a => a.zone.id === "1N.3");
        const burn = site ? Math.hypot(tx - site.x, tz - site.z) : Infinity;
        if (burn < 70 && !road) return ground("rock", (site ? altitudeOf(site) : 0) + (burn < 46 ? 0 : 3));
        if (burn < 800 + (ridge - 0.5) * 900) { land = "mud"; treeKind = "deadtree"; trees = 0.035; bushes = 0.01; } else { trees = 0.11 * detail * 1.7; bushes = 0.05; }
        break;
      }
      case "désert": land = "sand"; treeKind = "cactus"; trees = 0.006; bushes = 0.012; break;
      case "savane": land = "savanna"; trees = 0.012; bushes = 0.13; break;
      case "marais": {
        const w = Math.abs(fbm(tx / 230, tz / 230, seed + 73, 2) - 0.5);
        if (!road) {
          if (w < 0.035 && dM > 40) return water;
          if (w < 0.07) return r < 0.14 ? tree("tree", "ford", -0.35) : r < 0.42 ? {kind: "reed", height: -0.35, base: -0.35, ground: "ford"} : shallow(0);
        }
        land = "mud"; trees = 0.1; bushes = 0.1; shrub = w < 0.12 ? "reed" : "bush";
        break;
      }
      case "volcan": {
        land = "rock";
        if (rr < 0.075 && !road) return ground("lava", Math.max(0, terrace(relief) - 60));
        if (Math.abs(fbm(tx / 150 + rr * 3, tz / 150, seed + 79, 2) - 0.5) < 0.012 && rr < 0.6) land = "lava";
        treeKind = "palm"; trees = rr > 0.7 ? 0.04 : 0; bushes = rr > 0.55 ? 0.03 : 0;
        break;
      }
      case "méditerranéen": {
        land = "savanna"; treeKind = "tree"; trees = 0.028; bushes = 0.07;
        // Terraces of vines and olive trees around « Les terrasses ».
        const vines = shape.anchors.find(a => a.zone.id === "11.2");
        if (vines && Math.hypot(tx - vines.x, tz - vines.z) < 420) { trees = 0.02; bushes = tz % 4 < 2 ? 0.8 : 0; shrub = "crop"; }
        break;
      }
      case "tropical": case "jungle": land = "jungle"; trees = 0.17 * (0.6 + detail); bushes = 0.1; giants = biome === "jungle" ? 0.06 : 0; break;
      case "mangroves":
        if (rr < 0.38 + (detail - 0.5) * 0.3) return shallow(0);
        if (dM < 46) return r < 0.2 ? tree("tree", "ford", -0.35, 5) : shallow(0);
        land = "sand"; treeKind = "palm"; trees = 0.06; bushes = 0.05;
        break;
      case "métropole": trees = 0.1; bushes = 0.04; if (relief > 300) treeKind = "pine"; break;
      case "commercial": {
        const cell = 84, lx = ((tx % cell) + cell) % cell, lz = ((tz % cell) + cell) % cell, pick = hash2(Math.floor(tx / cell), Math.floor(tz / cell), seed + 83);
        if (dM > 60 && edge > 0 && relief < 3) {
          if (lx < 6 || lz < 6) return ground("road");
          if (pick < 0.4) return lx > 18 && lz > 14 && lx < 66 && lz < 60 ? ground("building", pick < 0.12 ? 12 : 9) : ground("road");
          if (pick < 0.55) return ground("road");
        }
        trees = 0.03; break;
      }
      case "industriel": case "militaire": {
        const cell = 64, lx = ((tx % cell) + cell) % cell, lz = ((tz % cell) + cell) % cell, pick = hash2(Math.floor(tx / cell), Math.floor(tz / cell), seed + 89);
        land = "road";
        if (road) break;
        if (dM > 50 && pick < 0.55 && lx > 10 && lz > 10 && lx < 54 && lz < 50) return pick < 0.12 ? ground("pillar", 18) : ground("building", pick < 0.3 ? 15 : 9);
        if (dM > 50 && pick > 0.9 && r < 0.2) return ground("crate", 1);
        break;
      }
      default: land = "rock"; bushes = 0.02;
    }
    // Zones stand on a terrace at the altitude of their anchor; the ground joins it over about 500 m.
    let reach = Infinity, terraceAt = 0;
    for (const anchor of shape.anchors) {
      const stampKind = anchor.zone.stamp;
      if (stampKind === "none") continue;
      const outside = Math.hypot(tx - anchor.x, tz - anchor.z) - (stampKind === "city" ? CITY_REACH : anchor.r);
      if (outside < reach) { reach = outside; terraceAt = altitudeOf(anchor); }
    }
    if (reach < ZONE_BLEND) relief = terraceAt + (relief - terraceAt) * smooth(reach, 0, ZONE_BLEND);
    // Roads are graded: the ground is cut or filled down to them and joins the slope again over about 120 m.
    if (edge < ROAD_SHOULDER) relief = roadHeight + (relief - roadHeight) * smooth(edge, 1, ROAD_SHOULDER);
    if (road) return ground(roadSurface, roadHeight);
    const built = stamp(shape, tx, tz, land);
    if (built) return built;
    if (dM < 14 && relief < 3 && biome !== "lande") return ground(beach);
    const height = terrace(relief), lines = reliefOf(shape);
    const top: IslesTileKindV1 = lines.snowLine !== null && height >= Math.max(lines.snowLine, 0) && (lines.snowLine > 0 || biome === "toundra") ? "snow"
      : lines.treeLine > 0 && height >= lines.treeLine ? "rock"
      : (biome === "désert" && height >= lines.peak * 0.5) || (biome === "savane" && height >= 30) ? "rock" : height >= 300 && biome === "méditerranéen" ? "rock" : land;
    if (biome === "tropical" || biome === "jungle") { if (dM < 90 && r < 0.07) return tree("palm", "sand", height); }
    const wooded = top !== "rock" && top !== "lava" && (top !== "snow" || biome === "toundra");
    if (wooded && r < trees) {
      // Trees differ in height; a few giants of the canopy stand far above the jungle.
      const vary = hash2(tz, tx, seed + 109);
      return tree(treeKind, top, height, vary < giants ? 30 + Math.round(vary / giants * 5) * 3 : Math.round(TREE_HEIGHT[treeKind] * (0.8 + 0.7 * vary) * 2) / 2);
    }
    if (top !== "lava" && top !== "snow" && r < trees + bushes) return {kind: shrub, height, base: height, ground: top};
    return ground(top, height);
  }

  // Bounded zone cache: the last zone used is checked first.
  const KIND_LIST: IslesTileKindV1[] = ["water", "ford", "sand", "grass", "jungle", "mud", "road", "bush", "crate", "rock", "tree", "wall", "roof", "pillar", "ruin",
    "snow", "lava", "savanna", "pine", "palm", "building", "rail", "cactus", "deadtree", "reed", "crop"];
  const KIND_INDEX = new Map(KIND_LIST.map((kind, i) => [kind, i]));
  interface Chunk { kinds: Uint8Array; grounds: Uint8Array; heights: Float32Array; bases: Float32Array }
  const cache = new Map<number, Chunk>();
  let lastKey = -1, lastChunk: Chunk | null = null;
  const zonesX = Math.ceil(width / ZONE);
  const chunkAt = (tx: number, tz: number): Chunk => {
    const key = Math.floor(tz / ZONE) * zonesX + Math.floor(tx / ZONE);
    if (key === lastKey && lastChunk) return lastChunk;
    let chunk = cache.get(key);
    if (chunk) { cache.delete(key); cache.set(key, chunk); } else {
      chunk = {kinds: new Uint8Array(ZONE * ZONE), grounds: new Uint8Array(ZONE * ZONE), heights: new Float32Array(ZONE * ZONE), bases: new Float32Array(ZONE * ZONE)};
      const x0 = Math.floor(tx / ZONE) * ZONE, z0 = Math.floor(tz / ZONE) * ZONE;
      for (let z = 0; z < ZONE; z++) for (let x = 0; x < ZONE; x++) {
        const t = compute(x0 + x, z0 + z), i = z * ZONE + x;
        chunk.kinds[i] = KIND_INDEX.get(t.kind)!; chunk.grounds[i] = KIND_INDEX.get(t.ground)!; chunk.heights[i] = t.height; chunk.bases[i] = t.base;
      }
      cache.set(key, chunk);
      if (cache.size > cacheZones) cache.delete(cache.keys().next().value as number);
    }
    lastKey = key; lastChunk = chunk;
    return chunk;
  };
  const sample = (tx: number, tz: number): IslesWorldTileV1 => {
    if (tx < 0 || tz < 0 || tx >= width || tz >= depth) return water;
    const chunk = chunkAt(tx, tz), i = (tz % ZONE) * ZONE + (tx % ZONE);
    return {kind: KIND_LIST[chunk.kinds[i]], height: chunk.heights[i], base: chunk.bases[i], ground: KIND_LIST[chunk.grounds[i]]};
  };

  const markers: Record<string, [number, number][]> = {};
  const sites: IslesArchipelagoWorldV1["sites"] = [];
  for (const shape of shapes) for (const anchor of shape.anchors) {
    const tx = Math.round(anchor.x), tz = Math.round(anchor.z);
    markers["site:" + anchor.zone.id] = [[tx, tz]];
    sites.push({id: anchor.zone.id, label: anchor.zone.name, x: (tx + 0.5) * tile, z: (tz + 0.5) * tile, island: shape.name, stamp: anchor.zone.stamp});
  }
  markers.spawn = markers["site:9.1"] ?? [[Math.round(width / 2), Math.round(depth / 2)]];
  const map: IslesMapV1 = {id: "isles-archipelago-v1", name: "Archipel des Îles", width, depth, tileMeters: tile, kinds: [], heights: new Float32Array(0), markers, sample};

  const siteAnchors = new Map(shapes.flatMap(shape => shape.anchors.map(anchor => [anchor.zone.id, anchor] as const)));
  return {
    map, sites, linePaths,
    siteAltitude: id => { const anchor = siteAnchors.get(id); return anchor ? altitudeOf(anchor) : 0; },
    tileAt: compute,
    cachedZones: () => cache.size,
    placeAt(x, z) {
      const own = owner(x / tile, z / tile);
      if (!own) return null;
      let zone: string | null = null, best = Infinity;
      for (const anchor of own.shape.anchors) {
        const d = Math.hypot(x / tile - anchor.x, z / tile - anchor.z);
        if (d < best) { best = d; zone = anchor.zone.id + " " + anchor.zone.name; }
      }
      const island = source.islands.find(item => item.id === baseId(own.shape.id));
      return {islandId: baseId(own.shape.id), island: own.shape.name, biome: island?.biome ?? own.shape.biome, zone};
    },
  };
}
