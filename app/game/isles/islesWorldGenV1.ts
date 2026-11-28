/** The Isles V1 · Verdant generated from data (app/game/data/islesVerdantWorldV1.json).
 * A 1000 × 1000 tile island (2 km) is too large to store as text rows: sites, highlands,
 * river, trails and vegetation rules are data, and this deterministic generator turns them
 * into the same IslesMapV1 the rest of the mode uses. Same data and seed, same island. */
import type {IslesMapV1, IslesTileKindV1} from "./islesMapV1";

type Point = [number, number];

export interface IslesWorldSourceV1 {
  id: string; name: string; seed: number; size: number;
  island: {centerX: number; centerZ: number; radius: number; coastNoise: number; beach: number};
  highlands: {id: string; x: number; z: number; rx: number; rz: number; level: number}[];
  river: {points: Point[]; width: number; fords: Point[]; pools: {x: number; z: number; rx: number; rz: number}[]};
  vegetation: {treeDensity: number; bushDensity: number; noiseScale: number; clearings: number};
  canopyBand: {points: Point[]; width: number};
  trails: {from: string; to: string; width: number; road?: boolean; via?: Point[]}[];
  sites: Record<string, {x: number; z: number; clear: number; label: string}>;
  structures: Record<string, [number, number, number, number][]>;
  points: Record<string, Point[]>;
}

/** Labelled places of the generated island, for the HUD, the map and the simulation. */
export interface IslesWorldSiteV1 { id: string; label: string; x: number; z: number }

const HEIGHT: Record<IslesTileKindV1, number> = {
  water: -1.2, ford: -0.35, sand: 0, grass: 0, jungle: 0, mud: 0, road: 0, bush: 0, crate: 1,
  rock: 3, tree: 7, wall: 5, roof: 3.5, pillar: 10, ruin: 2, snow: 0, lava: 0, savanna: 0, pine: 9, palm: 6, building: 9,
};

function hash2(x: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function valueNoiseV1(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed), c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz;
}

function fbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += valueNoiseV1(x * freq, z * freq, seed + i * 101) * amp; norm += amp; amp *= 0.5; freq *= 2; }
  return sum / norm;
}

/** Squared distance from a point to a segment. */
function segmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az, len = dx * dx + dz * dz;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len)) : 0;
  const cx = ax + dx * t - px, cz = az + dz * t - pz;
  return cx * cx + cz * cz;
}

/** Generates Verdant. `scale` resizes the island for tests (1 = data size). */
export function generateIslesWorldV1(source: IslesWorldSourceV1, tileMeters = 2, scale = 1): {map: IslesMapV1; sites: IslesWorldSiteV1[]} {
  const size = Math.round(source.size * scale);
  const s = (value: number) => Math.round(value * scale);
  const sp = ([x, z]: Point): Point => [s(x), s(z)];
  const kinds: IslesTileKindV1[] = new Array(size * size).fill("water");
  const index = (x: number, z: number) => z * size + x;
  const inside = (x: number, z: number) => x >= 0 && z >= 0 && x < size && z < size;
  const set = (x: number, z: number, kind: IslesTileKindV1) => { if (inside(x, z)) kinds[index(x, z)] = kind; };
  const get = (x: number, z: number): IslesTileKindV1 => inside(x, z) ? kinds[index(x, z)] : "water";
  const seed = source.seed;
  const isl = source.island, cx = s(isl.centerX), cz = s(isl.centerZ), radius = s(isl.radius), coast = isl.coastNoise * scale;

  // 1. Land, beach, jungle floor.
  const land = new Float32Array(size * size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const angle = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz);
    const edge = radius + (fbm(Math.cos(angle) * 3 + 10, Math.sin(angle) * 3 + 10, seed, 4) - 0.5) * 2 * coast;
    land[index(x, z)] = edge - d;
    if (d < edge - isl.beach * Math.max(scale, 0.5)) set(x, z, "jungle"); else if (d < edge) set(x, z, "sand");
  }
  const isLand = (x: number, z: number) => inside(x, z) && land[index(x, z)] > 0;

  // 2. Highlands with cliff rims.
  for (const h of source.highlands) {
    const hx = s(h.x), hz = s(h.z), rx = h.rx * scale, rz = h.rz * scale;
    for (let z = Math.floor(hz - rz - 4); z <= hz + rz + 4; z++) for (let x = Math.floor(hx - rx - 4); x <= hx + rx + 4; x++) {
      if (!isLand(x, z) || get(x, z) === "sand") continue;
      const e = ((x - hx) / rx) ** 2 + ((z - hz) / rz) ** 2 + (fbm(x * 0.05, z * 0.05, seed + 7) - 0.5) * 0.5;
      if (e < 1) set(x, z, "rock");
    }
  }
  const heights = new Float32Array(size * size);
  // Highland level is stored per tile after kinds are final (see below); remember the level here.
  const level = new Uint8Array(size * size);
  for (const h of source.highlands) {
    const hx = s(h.x), hz = s(h.z), rx = h.rx * scale, rz = h.rz * scale;
    for (let z = Math.floor(hz - rz - 4); z <= hz + rz + 4; z++) for (let x = Math.floor(hx - rx - 4); x <= hx + rx + 4; x++) {
      if (!inside(x, z) || get(x, z) !== "rock") continue;
      const e = ((x - hx) / rx) ** 2 + ((z - hz) / rz) ** 2 + (fbm(x * 0.05, z * 0.05, seed + 7) - 0.5) * 0.5;
      level[index(x, z)] = Math.max(level[index(x, z)], e < 0.7 && h.level >= 6 ? 6 : 3);
    }
  }

  // 3. River, fords, pools (cut through everything, including cliffs: the falls).
  const river = source.river.points.map(sp), half = (source.river.width * Math.max(scale, 0.4)) / 2;
  for (let i = 0; i + 1 < river.length; i++) {
    const [ax, az] = river[i], [bx, bz] = river[i + 1];
    for (let z = Math.floor(Math.min(az, bz) - half - 3); z <= Math.max(az, bz) + half + 3; z++) {
      for (let x = Math.floor(Math.min(ax, bx) - half - 3); x <= Math.max(ax, bx) + half + 3; x++) {
        if (!inside(x, z)) continue;
        const wobble = (valueNoiseV1(x * 0.08, z * 0.08, seed + 3) - 0.5) * 2;
        const d2 = segmentDistance(x, z, ax, az, bx, bz);
        if (d2 < (half + wobble) ** 2) { set(x, z, "water"); level[index(x, z)] = 0; }
        else if (d2 < (half + 2.5) ** 2 && isLand(x, z) && get(x, z) === "jungle") set(x, z, "mud");
      }
    }
  }
  for (const p of source.river.pools) {
    const px = s(p.x), pz = s(p.z), rx = p.rx * scale, rz = p.rz * scale;
    for (let z = Math.floor(pz - rz); z <= pz + rz; z++) for (let x = Math.floor(px - rx); x <= px + rx; x++) {
      if (((x - px) / rx) ** 2 + ((z - pz) / rz) ** 2 <= 1) { set(x, z, "water"); if (inside(x, z)) level[index(x, z)] = 0; }
    }
  }
  for (const f of source.river.fords.map(sp)) {
    for (let z = f[1] - 4; z <= f[1] + 4; z++) for (let x = f[0] - 4; x <= f[0] + 4; x++) {
      if (get(x, z) === "water" && Math.hypot(x - f[0], z - f[1]) <= 4.2) set(x, z, "ford");
    }
  }

  // 4. Vegetation from noise, then the continuous canopy band of the trial.
  const v = source.vegetation;
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    if (get(x, z) !== "jungle") continue;
    const n = fbm(x * v.noiseScale / Math.max(scale, 0.25), z * v.noiseScale / Math.max(scale, 0.25), seed + 11, 3);
    if (n < v.clearings) continue;
    const r = hash2(x, z, seed + 5);
    const density = v.treeDensity * (0.6 + n);
    if (r < density) set(x, z, "tree"); else if (r < density + v.bushDensity) set(x, z, "bush");
  }
  const band = source.canopyBand.points.map(sp), bandHalf = (source.canopyBand.width * Math.max(scale, 0.4)) / 2;
  for (let i = 0; i + 1 < band.length; i++) {
    const [ax, az] = band[i], [bx, bz] = band[i + 1];
    for (let z = Math.floor(Math.min(az, bz) - bandHalf); z <= Math.max(az, bz) + bandHalf; z++) {
      for (let x = Math.floor(Math.min(ax, bx) - bandHalf); x <= Math.max(ax, bx) + bandHalf; x++) {
        if (isLand(x, z) && get(x, z) !== "water" && segmentDistance(x, z, ax, az, bx, bz) < bandHalf ** 2) set(x, z, "tree");
      }
    }
  }

  // 5. Sites: clearings, then the pyramid, buildings and crates.
  const site = (id: string) => source.sites[id];
  const clearDisc = (x0: number, z0: number, r: number, kind: IslesTileKindV1) => {
    for (let z = Math.floor(z0 - r); z <= z0 + r; z++) for (let x = Math.floor(x0 - r); x <= x0 + r; x++) {
      if (Math.hypot(x - x0, z - z0) <= r && isLand(x, z) && !["water", "ford"].includes(get(x, z))) { set(x, z, kind); level[index(x, z)] = 0; }
    }
  };
  for (const [id, place] of Object.entries(source.sites)) {
    if (place.clear > 0) clearDisc(s(place.x), s(place.z), place.clear * Math.max(scale, 0.3), ["village", "piste", "autel"].includes(id) ? "grass" : "mud");
  }
  // Pyramid of the altar, four tiers above the canopy.
  const altar = site("autel"), ax0 = s(altar.x), az0 = s(altar.z);
  const tiers: [number, IslesTileKindV1, number][] = [[14, "ruin", 2], [10, "ruin", 4], [6, "ruin", 6.5], [3, "ruin", 9]];
  const ruinHeight = new Map<number, number>();
  for (const [r, kind, h] of tiers) {
    const rr = Math.max(2, Math.round(r * Math.max(scale, 0.3)));
    for (let z = az0 - rr - 12; z <= az0 + rr - 12; z++) for (let x = ax0 - rr; x <= ax0 + rr; x++) {
      if (!inside(x, z)) continue;
      // The central stair (2 tiles wide, facing south) stays one step lower than each tier.
      const stair = Math.abs(x - ax0) <= 1 && z > az0 - 12;
      set(x, z, kind); ruinHeight.set(index(x, z), stair ? h - 1 : h);
    }
  }
  for (const [id, boxes] of Object.entries(source.structures)) {
    const place = site(id);
    for (const [dx, dz, w, d] of boxes) {
      for (let z = 0; z < Math.max(1, Math.round(d * Math.max(scale, 0.5))); z++) for (let x = 0; x < Math.max(1, Math.round(w * Math.max(scale, 0.5))); x++) {
        set(s(place.x) + Math.round(dx * Math.max(scale, 0.5)) + x, s(place.z) + Math.round(dz * Math.max(scale, 0.5)) + z, "roof");
      }
    }
  }
  const piste = site("piste");
  for (let z = -2; z <= 2; z++) for (let x = -40; x <= 40; x++) set(s(piste.x) + Math.round(x * Math.max(scale, 0.3)), s(piste.z) + z, "road");

  // 6. Trails between sites (a little wobble, never through water: fords are kept).
  for (const trail of source.trails) {
    const from = site(trail.from), to = site(trail.to);
    const route: Point[] = [[s(from.x), s(from.z)], ...(trail.via ?? []).map(sp), [s(to.x), s(to.z)]];
    const w = Math.max(1, trail.width * Math.max(scale, 0.5)) / 2;
    for (let i = 0; i + 1 < route.length; i++) {
      const [ax, az] = route[i], [bx, bz] = route[i + 1];
      for (let z = Math.floor(Math.min(az, bz) - w - 1); z <= Math.max(az, bz) + w + 1; z++) {
        for (let x = Math.floor(Math.min(ax, bx) - w - 1); x <= Math.max(ax, bx) + w + 1; x++) {
          if (!isLand(x, z) || segmentDistance(x, z, ax, az, bx, bz) > w * w) continue;
          const k = get(x, z);
          if (k === "water") set(x, z, "ford");
          else if (k !== "ford" && k !== "ruin" && k !== "roof") { set(x, z, trail.road ? "road" : "mud"); level[index(x, z)] = 0; }
        }
      }
    }
  }

  // 7. Named points always stand on dry, walkable ground.
  const markers: Record<string, [number, number][]> = {};
  for (const [name, points] of Object.entries(source.points)) {
    markers[name] = points.map(sp);
    for (const [x, z] of markers[name]) {
      // Rings hang over the canopy; viewpoints stand on the cliffs, reached by climbing.
      if (name === "trialRings" || name === "viewpoints") continue;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const k = get(x + dx, z + dz);
        if (!["ford", "ruin"].includes(k) && isLand(x + dx, z + dz)) { set(x + dx, z + dz, "mud"); level[index(x + dx, z + dz)] = 0; }
      }
    }
  }
  for (const [id, place] of Object.entries(source.sites)) markers["site:" + id] = [[s(place.x), s(place.z)]];

  // 8. Heights from the final kinds.
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    heights[i] = kind === "rock" ? (level[i] || 3) : kind === "ruin" ? (ruinHeight.get(i) ?? 2) : HEIGHT[kind];
  }
  const map: IslesMapV1 = {id: source.id, name: source.name, width: size, depth: size, tileMeters, kinds, heights, markers};
  const sites = Object.entries(source.sites).map(([id, place]) => ({id, label: place.label, x: (s(place.x) + 0.5) * tileMeters, z: (s(place.z) + 0.5) * tileMeters}));
  return {map, sites};
}
