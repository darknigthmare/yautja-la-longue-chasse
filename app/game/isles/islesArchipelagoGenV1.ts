/** The Isles V1 · the whole archipelago at real scale (app/game/data/islesArchipelagoV1.json).
 * 48 × 49 km at 2 m per tile is about 590 million tiles: nothing is stored. Each 32 × 32 zone is
 * computed on demand from the island outlines, fractal coast noise, a rule set per biome and the
 * zone anchors, then kept in a bounded cache. Same data and seed, same world, tile for tile. */
import type {IslesLegendEntryV1, IslesMapV1, IslesTileKindV1} from "./islesMapV1";
import {valueNoiseV1, type IslesWorldSiteV1} from "./islesWorldGenV1";

type Point = [number, number];
export type IslesStampV1 = "none" | "camp" | "village" | "town" | "industrial" | "ruins" | "city";

export interface IslesArchipelagoZoneV1 { id: string; name: string; at: Point; stamp: IslesStampV1 }
export interface IslesArchipelagoSourceV1 {
  version: number; seed: number; scale: number; sizeKm: Point; tileMeters: number;
  islands: {number: string; id: string; name: string; biome: string; climate: string; outline: Point[]; zones: IslesArchipelagoZoneV1[]}[];
  chain: {number: string; id: string; name: string; biome: string; islets: {name: string; center: Point; radiusKm: number}[]; zones: IslesArchipelagoZoneV1[]};
  islets: {id: string; name: string; center: Point; radiusKm: number; note: string}[];
  seaZone: {id: string; name: string; rigs: {id: string; name: string; center: Point; kind: string}[]};
  links: [string, string, string][];
}

/** A tile of the streamed world: trees and props also say what ground they stand on. */
export interface IslesWorldTileV1 extends IslesLegendEntryV1 { base: number; ground: IslesTileKindV1 }

export interface IslesArchipelagoWorldV1 {
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
  minX: number; minZ: number; maxX: number; maxZ: number; amp: number; warp: number; size: number; anchors: {x: number; z: number; r: number; zone: IslesArchipelagoZoneV1}[];
}

const ZONE = 32;
const ISLET_BIOME: Record<string, string> = {ironhook: "militaire", blackrock: "rocher", "twin-keys": "commercial", navigator: "rocher",
  breakwater: "rocher", "gull-rock": "rocher", "cinder-rocks": "volcan", "little-ember": "volcan"};
const STAMP_RADIUS: Record<IslesStampV1, number> = {none: 24, camp: 60, village: 120, town: 190, industrial: 170, ruins: 130, city: 0};
const TREE_HEIGHT: Record<string, number> = {tree: 7, pine: 9, palm: 6};

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
export function createArchipelagoWorldV1(source: IslesArchipelagoSourceV1, cacheZones = 900): IslesArchipelagoWorldV1 {
  const tile = source.tileMeters, perKm = source.scale * 1000 / tile, seed = source.seed;
  const width = Math.round(source.sizeKm[0] * perKm), depth = Math.round(source.sizeKm[1] * perKm);
  const toTile = ([x, y]: Point): Point => [x * perKm, y * perKm];

  const shapes: Shape[] = [];
  const addShape = (id: string, name: string, biome: string, polygon: Point[] | null, center: Point, radius: number, zones: IslesArchipelagoZoneV1[]) => {
    const xs = polygon ? polygon.map(p => p[0]) : [center[0] - radius, center[0] + radius];
    const zs = polygon ? polygon.map(p => p[1]) : [center[1] - radius, center[1] + radius];
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    // Real shores are not polygons: the outline is bent at the scale of the island, then cut into bays and capes.
    const warp = Math.min(1500, size * (polygon ? 0.16 : 0.3)), amp = Math.min(420, Math.max(40, size * 0.055));
    const margin = warp * 1.25 + amp * 1.6 + 8;
    const cx = polygon ? xs.reduce((a, b) => a + b, 0) / xs.length : center[0], cz = polygon ? zs.reduce((a, b) => a + b, 0) / zs.length : center[1];
    shapes.push({id, name, biome, polygon, cx, cz, radius: polygon ? size / 2 : radius, amp, warp, size,
      minX: Math.min(...xs) - margin, minZ: Math.min(...zs) - margin, maxX: Math.max(...xs) + margin, maxZ: Math.max(...zs) + margin,
      anchors: zones.map(zone => { const [x, z] = toTile(zone.at); return {x, z, r: STAMP_RADIUS[zone.stamp], zone}; })});
  };
  for (const island of source.islands) addShape(island.id, island.name, island.biome, island.outline.map(toTile), [0, 0], 0, island.zones);
  source.chain.islets.forEach((islet, i) => addShape(source.chain.id + ":" + i, source.chain.name, "mangroves", null, toTile(islet.center), islet.radiusKm * perKm,
    source.chain.zones.filter(zone => zone.at[0] === islet.center[0] && zone.at[1] === islet.center[1])));
  for (const islet of source.islets) addShape(islet.id, islet.name, ISLET_BIOME[islet.id] ?? "rocher", null, toTile(islet.center), islet.radiusKm * perKm, []);

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
      const hold = Math.max(18, anchor.r * 0.55) - Math.hypot(x - anchor.x, z - anchor.z);
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
  const tree = (kind: "tree" | "pine" | "palm", under: IslesTileKindV1, base: number): IslesWorldTileV1 => ({kind, height: base + TREE_HEIGHT[kind], base, ground: under});
  const terrace = (metres: number) => metres < 3 ? 0 : Math.floor(metres / 3) * 3;

  /** Buildings on a local street grid around a zone anchor. */
  function stamp(shape: Shape, x: number, z: number, land: IslesTileKindV1): IslesWorldTileV1 | null {
    for (const anchor of shape.anchors) {
      const kind = anchor.zone.stamp;
      if (kind === "city") continue;
      const dx = x - anchor.x, dz = z - anchor.z, dist = Math.hypot(dx, dz);
      if (dist > anchor.r) continue;
      if (kind === "none") return dist < 10 ? ground(land === "snow" ? "snow" : "mud") : null;
      const cell = kind === "industrial" ? 30 : kind === "town" ? 18 : kind === "camp" ? 12 : 16;
      const lx = ((Math.round(dx) % cell) + cell) % cell, lz = ((Math.round(dz) % cell) + cell) % cell;
      const street: IslesTileKindV1 = kind === "camp" || kind === "ruins" ? "mud" : "road";
      if (lx < 2 || lz < 2) return ground(street);
      const cx = Math.floor(Math.round(dx) / cell), cz = Math.floor(Math.round(dz) / cell);
      const pick = hash2(cx * 7 + 3, cz * 11 + 5, seed + anchor.zone.id.length * 97 + Math.round(anchor.x));
      const density = kind === "camp" ? 0.3 : kind === "ruins" ? 0.6 : kind === "village" ? 0.62 : 0.8;
      const edge = dist > anchor.r * 0.82;
      if (pick > density || edge) return ground(kind === "village" || kind === "camp" ? "grass" : street);
      const inset = kind === "industrial" ? 4 : 3, far = cell - (kind === "industrial" ? 3 : 2);
      if (lx < inset || lz < inset || lx >= far || lz >= far) return ground(kind === "village" ? "grass" : street);
      if (kind === "camp") return pick < 0.08 ? ground("crate", 1) : ground("roof", 3.5);
      if (kind === "village") return ground("roof", 3.5);
      if (kind === "ruins") return hash2(x, z, seed + 41) < 0.25 ? ground("mud") : ground("ruin", pick < 0.2 ? 6.5 : pick < 0.4 ? 4 : 2);
      if (kind === "industrial") return ground("building", pick < 0.25 ? 15 : pick < 0.55 ? 12 : 9);
      return ground("building", pick < 0.3 ? 10.5 : 7);
    }
    return null;
  }

  /** Street grid, blocks and parks of the metropolis; taller toward Downtown. */
  function city(shape: Shape, x: number, z: number, dM: number): IslesWorldTileV1 | null {
    const anchors = shape.anchors.filter(a => a.zone.stamp === "city");
    if (!anchors.length || dM < 90) return null;
    const hills = shape.anchors.find(a => a.zone.id === "4.9");
    if (hills && z < hills.z + 700 + (fbm(x / 500, z / 500, seed + 241, 3) - 0.5) * 1100) return null;
    const park = shape.anchors.find(a => a.zone.id === "4.4");
    if (park && Math.abs(x - park.x) < 420 && Math.abs(z - park.z) < 170) {
      if (Math.hypot((x - park.x - 120) / 1.8, z - park.z) < 60) return water;
      return hash2(x, z, seed + 51) < 0.07 ? tree("tree", "grass", 0) : ground("grass");
    }
    const block = 46, lx = ((x % block) + block) % block, lz = ((z % block) + block) % block;
    const avenue = (Math.floor(x / block) % 5 === 0 && lx < 9) || (Math.floor(z / block) % 6 === 0 && lz < 8);
    if (lx < 6 || lz < 5 || avenue) return ground("road");
    const bx = Math.floor(x / block), bz = Math.floor(z / block), pick = hash2(bx, bz, seed + 61);
    if (pick < 0.05) return hash2(x, z, seed + 53) < 0.06 ? tree("tree", "grass", 0) : ground("grass");
    if (lx < 8 || lz < 7 || lx > block - 3 || lz > block - 3) return ground("road");
    const downtown = anchors.reduce((best, a) => Math.min(best, a.zone.id === "4.1" || a.zone.id === "4.3" ? Math.hypot(x - a.x, z - a.z) : best), Infinity);
    const nearest = anchors.reduce((best, a) => Math.min(best, Math.hypot(x - a.x, z - a.z)), Infinity);
    if (nearest > 1500) return pick < 0.5 ? ground("roof", 3.5) : ground("grass");
    // Each block is split in two lots of different heights.
    const lot = hash2(bx * 2 + (lx > block / 2 ? 1 : 0), bz, seed + 67);
    const tall = 12 + Math.round((120 * Math.exp(-downtown / 520) * (0.35 + 0.65 * lot) + 18 * lot) / 3) * 3;
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
      return water;
    }
    if (own.reef) return {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
    const {shape, d} = own, dM = d * tile, biome = shape.biome;
    const ridge = fbm(tx / 620 + 11, tz / 620 + 5, seed + 3, 4), detail = fbm(tx / 90, tz / 90, seed + 5, 3), r = hash2(tx, tz, seed + 7);
    const rr = Math.hypot(tx - shape.cx, tz - shape.cz) / Math.max(1, shape.radius);
    const beach: IslesTileKindV1 = biome === "toundra" ? "snow" : biome === "lande" || biome === "volcan" || biome === "rocher" ? "rock" : "sand";

    if (biome === "métropole") {
      const built = city(shape, tx, tz, dM);
      if (built) return built;
    }
    let land: IslesTileKindV1 = "grass", relief = 0, treeKind: "tree" | "pine" | "palm" = "tree", trees = 0, bushes = 0;
    switch (biome) {
      case "forêt de pins": {
        const north = smooth(shape.cz + shape.radius * 0.12 - tz, -300, 900);
        relief = (6 + 46 * north) * smooth(dM, 150, 3200) * Math.pow(ridge, 2.6) * 2.9;
        treeKind = "pine"; trees = 0.05 + 0.2 * north * detail * 1.6; bushes = 0.03;
        if (dM > 500 && fbm(tx / 520, tz / 520, seed + 71, 2) < 0.2 && relief < 6) return water;
        break;
      }
      case "toundra": land = "snow"; relief = 16 * smooth(dM, 60, 900) * ridge * 1.7; treeKind = "pine"; trees = 0.012; break;
      case "lande": relief = dM > 16 ? 9 + (ridge > 0.6 ? 3 : 0) : 0; bushes = 0.07; trees = 0.004; treeKind = "pine"; break;
      case "quarantaine": {
        const site = shape.anchors.find(a => a.zone.id === "1N.3");
        const burn = site ? Math.hypot(tx - site.x, tz - site.z) : Infinity;
        relief = 15 * smooth(shape.cz - shape.radius * 0.3 - tz + (detail - 0.5) * 700, -200, 500) * smooth(dM, 100, 1200) * ridge * 1.8;
        if (burn < 70) return ground("rock", burn < 46 ? 0 : 3);
        if (burn < 800 + (ridge - 0.5) * 900) { land = "mud"; trees = 0.035; bushes = 0.01; } else { trees = 0.11 * detail * 1.7; bushes = 0.05; }
        break;
      }
      case "désert": land = "sand"; relief = ridge > 0.66 && dM > 200 ? 15 : ridge > 0.6 && dM > 160 ? 9 : 0; bushes = 0.012; break;
      case "savane": land = "savanna"; relief = ridge > 0.74 && detail > 0.55 ? 6 : 0; trees = 0.012; bushes = 0.03; break;
      case "marais": {
        const w = Math.abs(fbm(tx / 230, tz / 230, seed + 73, 2) - 0.5);
        if (w < 0.035 && dM > 40) return water;
        if (w < 0.07) return r < 0.14 ? tree("tree", "ford", -0.35) : {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
        land = "mud"; trees = 0.1; bushes = 0.08;
        break;
      }
      case "volcan": {
        land = "rock"; relief = 72 * Math.pow(Math.max(0, 1 - rr * 1.15), 1.25) * (0.85 + 0.3 * detail);
        if (rr < 0.075) return ground("lava", Math.max(0, terrace(relief) - 6));
        if (Math.abs(fbm(tx / 150 + rr * 3, tz / 150, seed + 79, 2) - 0.5) < 0.012 && rr < 0.6) land = "lava";
        treeKind = "palm"; trees = rr > 0.7 ? 0.04 : 0; bushes = rr > 0.55 ? 0.03 : 0;
        break;
      }
      case "méditerranéen": land = "savanna"; relief = 16 * smooth(dM, 150, 1800) * ridge * 1.5; treeKind = "pine"; trees = 0.028; bushes = 0.07; break;
      case "tropical": case "jungle": land = "jungle"; relief = ridge > 0.7 && dM > 300 ? 6 : 0; trees = 0.17 * (0.6 + detail); bushes = 0.1; break;
      case "mangroves":
        if (rr < 0.38 + (detail - 0.5) * 0.3) return {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
        if (dM < 46) return r < 0.2 ? tree("tree", "ford", -0.35) : {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
        land = "sand"; treeKind = "palm"; trees = 0.06; bushes = 0.05;
        break;
      case "métropole": relief = 20 * smooth(dM, 150, 1500) * ridge * 1.6; trees = 0.1; bushes = 0.04; break;
      case "commercial": {
        const cell = 84, lx = ((tx % cell) + cell) % cell, lz = ((tz % cell) + cell) % cell, pick = hash2(Math.floor(tx / cell), Math.floor(tz / cell), seed + 83);
        if (dM > 60) {
          if (lx < 6 || lz < 6) return ground("road");
          if (pick < 0.4) return lx > 18 && lz > 14 && lx < 66 && lz < 60 ? ground("building", pick < 0.12 ? 12 : 9) : ground("road");
          if (pick < 0.55) return ground("road");
        }
        trees = 0.03; break;
      }
      case "industriel": case "militaire": {
        const cell = 64, lx = ((tx % cell) + cell) % cell, lz = ((tz % cell) + cell) % cell, pick = hash2(Math.floor(tx / cell), Math.floor(tz / cell), seed + 89);
        land = "road";
        if (dM > 50 && pick < 0.55 && lx > 10 && lz > 10 && lx < 54 && lz < 50) return pick < 0.12 ? ground("pillar", 18) : ground("building", pick < 0.3 ? 15 : 9);
        if (dM > 50 && pick > 0.9 && r < 0.2) return ground("crate", 1);
        break;
      }
      default: land = "rock"; relief = dM > 20 ? 3 + (ridge > 0.55 ? 3 : 0) : 0; bushes = 0.02;
    }
    const built = stamp(shape, tx, tz, land);
    if (built) return built;
    if (dM < 14 && relief < 3 && biome !== "lande") return ground(beach);
    const height = terrace(relief);
    const top: IslesTileKindV1 = biome === "forêt de pins" || biome === "quarantaine" ? (height >= 42 ? "snow" : height >= 21 ? "rock" : land)
      : height >= 3 && (biome === "désert" || biome === "savane") ? "rock" : height >= 12 && biome === "méditerranéen" ? "rock" : land;
    if (biome === "tropical" || biome === "jungle") { if (dM < 90 && r < 0.07) return tree("palm", "sand", height); }
    if (top !== "rock" && top !== "lava" && r < trees) return tree(treeKind, top, height);
    if (top !== "lava" && r < trees + bushes) return {kind: "bush", height, base: height, ground: top};
    return ground(top, height);
  }

  // Bounded zone cache: the last zone used is checked first.
  const KIND_LIST: IslesTileKindV1[] = ["water", "ford", "sand", "grass", "jungle", "mud", "road", "bush", "crate", "rock", "tree", "wall", "roof", "pillar", "ruin",
    "snow", "lava", "savanna", "pine", "palm", "building"];
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

  return {
    map, sites,
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
      const island = source.islands.find(item => item.id === own.shape.id);
      return {islandId: own.shape.id.split(":")[0], island: own.shape.name, biome: island?.biome ?? own.shape.biome, zone};
    },
  };
}
