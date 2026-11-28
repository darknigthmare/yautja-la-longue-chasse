/** The Isles V1 · named places of the archipelago, drawn from the owner's plans
 * (docs/campagne/ISLES_ARCHIPEL_ZONES_20261128.md, sections 7 to 9).
 * Each feature is a pure function of local tile coordinates: `u` runs along the place, `v` toward its front
 * (the sea for a beach, a pier or a marina). A tile is 2 m; nothing here is stored. */
import type {IslesLegendEntryV1, IslesTileKindV1} from "./islesMapV1";

/** Tile of the streamed world: `base` is the ground under a tree, `ground` its kind. */
export interface IslesWorldTileV1 extends IslesLegendEntryV1 { base: number; ground: IslesTileKindV1 }

export type IslesFeatureKindV1 = "airport" | "airfield" | "stadium" | "racetrack" | "lake" | "park" | "suburb" | "marina" | "pier" | "port"
  | "refinery" | "zoo" | "fair" | "waterpark" | "parking" | "mall" | "lighthouse" | "prison" | "beach" | "construction";

/** Radius of each feature, in tiles. */
export const ISLES_FEATURE_RADIUS_V1: Record<IslesFeatureKindV1, number> = {airport: 400, airfield: 190, stadium: 260, racetrack: 300, lake: 370, park: 220,
  suburb: 330, marina: 170, pier: 320, port: 260, refinery: 300, zoo: 210, fair: 200, waterpark: 170, parking: 150, mall: 280, lighthouse: 60, prison: 120,
  beach: 320, construction: 200};
/** Share of the radius kept as land around the anchor (a beach or a pier must stay on the shore). */
export const ISLES_FEATURE_HOLD_V1: Partial<Record<IslesFeatureKindV1, number>> = {airport: 0.95, airfield: 0.95, marina: 0.2, pier: 0.08, beach: 0.1, port: 0.4, lighthouse: 0.5};
/** Features that also build over the sea. */
export const ISLES_FEATURE_OVER_WATER_V1 = new Set<IslesFeatureKindV1>(["marina", "pier"]);

/** True when a stamp name is a named feature rather than a generic settlement. */
export function isIslesFeatureV1(kind: string): kind is IslesFeatureKindV1 { return kind in ISLES_FEATURE_RADIUS_V1; }

const g = (kind: IslesTileKindV1, height = 0): IslesWorldTileV1 => ({kind, height, base: height, ground: kind});
const tree = (kind: "tree" | "palm", under: IslesTileKindV1): IslesWorldTileV1 => ({kind, height: kind === "palm" ? 6 : 7, base: 0, ground: under});
const mod = (a: number, n: number) => ((a % n) + n) % n;
const step3 = (metres: number) => Math.max(3, Math.round(metres / 3) * 3);
function hash(x: number, z: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Car park: lanes, and parked cars as low obstacles. */
function lot(u: number, v: number, seed: number): IslesWorldTileV1 {
  if (mod(v, 9) < 4 || mod(u, 40) < 4) return g("road");
  return mod(u, 3) === 0 && hash(u, v, seed) < 0.35 ? g("crate", 1.5) : g("road");
}

/** Tile of a feature at local coordinates, or null where the natural ground stays. `onLand` is false over the sea. */
export function islesFeatureTileV1(kind: IslesFeatureKindV1, uf: number, vf: number, seed: number, onLand: boolean): IslesWorldTileV1 | null {
  const u = Math.round(uf), v = Math.round(vf), d = Math.hypot(u, v), R = ISLES_FEATURE_RADIUS_V1[kind];
  if (d > R) return null;
  if (!onLand && !ISLES_FEATURE_OVER_WATER_V1.has(kind)) return null;
  switch (kind) {
    case "airport": {
      if (Math.abs(v) < 12 && Math.abs(u) < 360) return g("road");
      if (v >= 36 && v < 44 && Math.abs(u) < 320) return g("road");
      if (v >= 0 && v < 44 && Math.abs(Math.abs(u) - 304) < 4) return g("road");
      if (v >= 44 && v < 70 && Math.abs(u) < 200) return g("road");
      if (Math.abs(u + 150) < 3 && Math.abs(v - 84) < 3) return g("pillar", 36);
      if (v >= 70 && v < 96 && Math.abs(u) < 110) return g("building", 12);
      if (v >= 70 && v < 100 && u > 130 && u < 330) return mod(u - 130, 50) < 40 ? g("building", 15) : g("road");
      if (v >= 104 && v < 140 && Math.abs(u) < 110) return lot(u, v, seed);
      return g("grass");
    }
    case "airfield": {
      if (Math.abs(v) < 7 && Math.abs(u) < 170) return g("road");
      if (v >= 7 && v < 24 && Math.abs(u) < 70) return g("road");
      if (v >= 24 && v < 44 && Math.abs(u) < 60) return mod(u + 60, 30) < 22 ? g("building", 9) : g("road");
      if (Math.abs(u - 80) < 2 && Math.abs(v - 34) < 2) return g("pillar", 18);
      return g("grass");
    }
    case "stadium": {
      // An American-football bowl, a baseball park with its diamond, and their car parks.
      const bowl = Math.hypot((u + 95) / 78, v / 60), park = Math.hypot((u - 110) / 56, (v + 30) / 56);
      if (bowl < 0.52) return mod(u + 95, 12) === 0 ? g("road") : g("grass");
      if (bowl < 1) return g("building", step3(6 + (bowl - 0.52) / 0.48 * 24));
      if (park < 0.6) return Math.abs(u - 110) + Math.abs(v + 30) < 14 ? g("sand") : g("grass");
      if (park < 1) return u - 110 + v + 30 > 20 ? g("grass") : g("building", step3(6 + (park - 0.6) / 0.4 * 15));
      // A small ground beside the big ones (« petit terrain de base ball »).
      if (Math.abs(u - 100) < 26 && Math.abs(v - 80) < 20) return Math.abs(u - 100) > 23 || Math.abs(v - 80) > 17 ? g("wall", 3) : g("grass");
      return lot(u, v, seed);
    }
    case "racetrack": {
      // The « Big Ball » arena inside a racing circuit.
      const angle = Math.atan2(v, u), e = Math.hypot(u / 225, v / 125) / (1 + 0.17 * Math.sin(3 * angle) + 0.08 * Math.cos(5 * angle));
      if (d < 56) return g("building", step3(12 + 27 * (1 - (d / 56) ** 2)));
      if (d < 72) return g("road");
      if (Math.abs(e - 1) < 0.045) return g("road");
      if (e < 1 && v < -60 && v > -78 && Math.abs(u) < 120) return g("building", 9);
      if (e > 1.06 && e < 1.3 && u > 40) return lot(u, v, seed);
      return e < 1.32 ? g("grass") : null;
    }
    case "lake": {
      // A reservoir closed by a dam; the dam town stands below it.
      // The anchor is on the north bank; the water lies in front of it.
      const w = v - 100, e = Math.hypot(u / 250, w / 82);
      if (u >= 244 && u < 252 && Math.abs(w) < 72) return g("wall", 18);
      if (e < 1 && u < 244) return {kind: "water", height: -1.2, base: -1.2, ground: "water"};
      if (u >= 262 && u < 326 && Math.abs(w) < 64) {
        const lu = mod(u - 262, 16), lv = mod(w, 16);
        return lu < 2 || lv < 2 ? g("road") : lu > 4 && lv > 4 && lu < 14 && lv < 13 ? g("roof", 3.5) : g("grass");
      }
      return null;
    }
    case "park": {
      if (Math.hypot((u - 60) / 70, v / 38) < 1) return {kind: "water", height: -1.2, base: -1.2, ground: "water"};
      if (Math.abs(u) < 2 || Math.abs(v) < 2 || Math.abs(d - R * 0.8) < 2) return g("road");
      return hash(u, v, seed) < 0.08 ? tree("tree", "grass") : g("grass");
    }
    case "suburb": {
      // Rich houses with a garden and, often, a pool.
      const lu = mod(u, 30), lv = mod(v, 28), pick = hash(Math.floor(u / 30), Math.floor(v / 28), seed);
      if (lu < 3 || lv < 3) return g("road");
      if (pick < 0.82 && lu >= 8 && lu < 19 && lv >= 8 && lv < 18) return g("roof", pick < 0.3 ? 6.5 : 3.5);
      if (pick < 0.35 && lu >= 21 && lu < 27 && lv >= 10 && lv < 15) return {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
      return hash(u, v, seed + 1) < 0.05 ? tree("tree", "grass") : g("grass");
    }
    case "marina": {
      if (onLand) {
        const lu = mod(u, 22), lv = mod(v, 22), pick = hash(Math.floor(u / 22), Math.floor(v / 22), seed);
        return lu < 3 || lv < 3 || pick > 0.55 ? g("road") : lu > 5 && lv > 5 && lu < 19 && lv < 18 ? g("roof", pick < 0.2 ? 6.5 : 3.5) : g("road");
      }
      // Pontoons across the basin, boats moored on both sides.
      const lu = mod(u, 26);
      if (lu < 2 || Math.abs(v) < 2) return g("road", 0.5);
      const berth = (lu >= 4 && lu < 8) || (lu >= 20 && lu < 24);
      return berth && mod(v, 12) < 8 && hash(Math.floor(u / 13), Math.floor(v / 12), seed) < 0.6 ? g("crate", 1.2) : null;
    }
    case "pier": {
      if (v < -30 || v > 300) return null;
      if (Math.abs(u) < 1 && Math.abs(v - 285) < 14) return g("pillar", 30);
      if (v >= 268 && Math.abs(u) < 18) return g("road", onLand ? 0 : 0.5);
      if (Math.abs(u) < 5) return g("road", onLand ? 0 : 0.5);
      if (Math.abs(u) < 10 && v > 20 && v < 256 && mod(v, 22) < 12) return g("roof", 3.5);
      return null;
    }
    case "port": {
      const lu = mod(u, 20), lv = mod(v, 9), pick = hash(Math.floor(u / 20), Math.floor(v / 9), seed);
      if (mod(u, 80) < 3 && mod(v, 110) < 3) return g("pillar", 33);
      if (mod(v, 54) < 9 || mod(u, 100) < 8) return g("road");
      if (lu < 15 && lv < 6 && pick < 0.72) return g("crate", 2.6 * (1 + Math.floor(pick * 4.1)));
      return g("road");
    }
    case "refinery": {
      if (d < 3) return g("pillar", 48);
      const lu = mod(u, 44), lv = mod(v, 44), pick = hash(Math.floor(u / 44), Math.floor(v / 44), seed), c = Math.hypot(lu - 24, lv - 24);
      if (pick < 0.45 && c < 13) return g("building", 12);
      if (pick >= 0.45 && pick < 0.72 && Math.abs(lu - 24) < 4 && Math.abs(lv - 24) < 4) return g("pillar", 24 + Math.floor(pick * 100) % 7 * 3);
      if ((lu === 3 && mod(lv, 11) > 3) || (lv === 3 && mod(lu, 11) > 3)) return g("wall", 3);
      return g("road");
    }
    case "zoo": {
      const lu = mod(u, 52), lv = mod(v, 52), pick = hash(Math.floor(u / 52), Math.floor(v / 52), seed);
      if (lu < 5 || lv < 5) return g("road");
      const edge = lu === 7 || lu === 49 || lv === 7 || lv === 49;
      if (edge) return Math.abs(lu - 28) < 3 && lv === 7 ? g("road") : g("wall", 3);
      const c = Math.hypot(lu - 28, lv - 28);
      if (pick < 0.3) return c < 9 ? {kind: "ford", height: -0.35, base: -0.35, ground: "ford"} : g("sand");
      if (pick < 0.55) return c < 8 ? g("rock", 3) : g("grass");
      return hash(u, v, seed + 2) < 0.12 ? tree("tree", "grass") : g("grass");
    }
    case "fair": {
      const angle = Math.atan2(v, u), e = Math.hypot(u / 140, v / 92) / (1 + 0.14 * Math.sin(4 * angle));
      if (Math.abs(e - 1) < 0.03) return g("pillar", step3(9 + (1 + Math.sin(5 * angle)) * 7.5));
      if (Math.hypot(u + 40, v - 10) < 12) return g("roof", 3.5);
      if (Math.abs(u - 50) < 1 && Math.abs(v + 20) < 16) return g("pillar", 33);
      if (e < 0.8 && mod(u, 16) > 4 && mod(v, 20) > 12 && hash(Math.floor(u / 16), Math.floor(v / 20), seed) < 0.6) return g("roof", 3.5);
      return e < 1.25 ? g("road") : lot(u, v, seed);
    }
    case "waterpark": {
      const ford: IslesWorldTileV1 = {kind: "ford", height: -0.35, base: -0.35, ground: "ford"};
      if (Math.abs(u - 60) < 4 && Math.abs(v + 20) < 4) return g("pillar", 18);
      if (Math.abs(v + 20) < 2 && u > 64 && u < 110) return g("wall", step3(18 - (u - 64) * 0.36));
      if (Math.hypot((u + 50) / 44, v / 30) < 1 || Math.abs(Math.hypot(u / 120, v / 80) - 1) < 0.07) return ford;
      if (Math.hypot(u, v) > R * 0.86) return lot(u, v, seed);
      return hash(u, v, seed) < 0.02 ? tree("palm", "sand") : g("sand");
    }
    case "parking":
      if (Math.abs(u) < 75 && Math.abs(v) < 48) return g("building", 15);
      if (Math.abs(u) < 130 && v > 60 && v < 110) { const lu = mod(u, 18); return lu > 3 && lu < 15 && v > 66 && v < 104 ? g("building", 7) : g("road"); }
      return lot(u, v, seed);
    case "mall":
      if (Math.abs(u) < 150 && Math.abs(v) < 66) return Math.abs(u) < 130 && Math.abs(v) < 6 ? g("building", 15) : g("building", 12);
      if (Math.abs(Math.abs(u) - 185) < 35 && Math.abs(v) < 52) return g("building", 15);
      if (Math.abs(d - R * 0.92) < 4) return g("road");
      return lot(u, v, seed);
    case "lighthouse":
      if (d < 3) return g("pillar", 33);
      if (u >= 8 && u < 17 && Math.abs(v) < 5) return g("roof", 3.5);
      return d < 22 ? g("rock") : null;
    case "prison": {
      if (Math.abs(u) > 90 || Math.abs(v) > 70) return null;
      if (Math.abs(u) > 86 && Math.abs(v) > 66) return g("pillar", 12);
      if (Math.abs(u) > 87 || Math.abs(v) > 67) return Math.abs(u) < 5 && v > 0 ? g("road") : g("wall", 6);
      if (Math.abs(Math.abs(u) - 42) < 22 && Math.abs(v) < 42) return g("building", 9);
      return g("road");
    }
    case "beach": {
      if (Math.abs(u) > 300) return null;
      if (v > -30) return hash(u, v, seed) < 0.015 ? tree("palm", "sand") : g("sand");
      if (v > -37) return g("road");
      if (v > -84 && v <= -42) { const lu = mod(u, 36); return lu < 27 ? g("building", 18 + 3 * Math.floor(hash(Math.floor(u / 36), 0, seed) * 10)) : g("road"); }
      return v > -90 ? g("road") : null;
    }
    case "construction": {
      if (d < 2) return g("pillar", 45);
      const lu = mod(u, 40), lv = mod(v, 40), pick = hash(Math.floor(u / 40), Math.floor(v / 40), seed);
      if (lu < 5 || lv < 5) return g("mud");
      if (pick < 0.5) {
        if (lu >= 8 && lv >= 8 && lu <= 36 && lv <= 36 && mod(lu, 7) === 1 && mod(lv, 7) === 1) return g("pillar", 6 + Math.floor(pick * 32) * 3);
        return (lu === 7 || lu === 37 || lv === 7 || lv === 37) && mod(lu + lv, 9) > 2 ? g("wall", 3) : g("mud");
      }
      if (pick < 0.78 && lu > 8 && lv > 8 && lu < 34 && lv < 32) return hash(u, v, seed + 3) < 0.2 ? g("mud") : g("ruin", pick < 0.6 ? 6.5 : 4);
      return g("mud");
    }
  }
}
