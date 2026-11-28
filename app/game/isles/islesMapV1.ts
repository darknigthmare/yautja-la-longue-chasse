/** The Isles V1 · tile map read from data (scripts/build-isles-maps-v1.mjs).
 * A tile is 2 m (MODE_THE_ISLES section 4.2); each tile is a column whose top is `height` metres. */

export type IslesTileKindV1 =
  | "water" | "ford" | "sand" | "grass" | "jungle" | "mud" | "road" | "bush"
  | "crate" | "rock" | "tree" | "wall" | "roof" | "pillar" | "ruin"
  // Kinds of the full archipelago (islesArchipelagoGenV1.ts).
  | "snow" | "lava" | "savanna" | "pine" | "palm" | "building";

/** Tree kinds: a solid, climbable column drawn as a trunk and a crown. */
export function isTreeKindV1(kind: IslesTileKindV1): boolean { return kind === "tree" || kind === "pine" || kind === "palm"; }

export interface IslesLegendEntryV1 { kind: IslesTileKindV1; height: number }

/** Map as stored in app/game/data/islesMap*.json. */
export interface IslesMapSourceV1 {
  id: string;
  name: string;
  seed: number;
  legend: Record<string, IslesLegendEntryV1>;
  rows: string[];
  markers: Record<string, [number, number][]>;
}

/** Parsed map. `kinds[i]` and `heights[i]` use index `z * width + x`. */
export interface IslesMapV1 {
  id: string;
  name: string;
  width: number;
  depth: number;
  tileMeters: number;
  kinds: IslesTileKindV1[];
  heights: Float32Array;
  markers: Record<string, [number, number][]>;
  /** Large streamed worlds have no arrays: this returns a tile on demand (kinds and heights stay empty). */
  sample?: (tx: number, tz: number) => IslesLegendEntryV1;
}

const KINDS = new Set<IslesTileKindV1>(["water", "ford", "sand", "grass", "jungle", "mud", "road", "bush",
  "crate", "rock", "tree", "wall", "roof", "pillar", "ruin", "snow", "lava", "savanna", "pine", "palm", "building"]);

/** Validates and parses a map source. Throws on ragged rows, unknown characters or markers outside the map. */
export function parseIslesMapV1(source: IslesMapSourceV1, tileMeters = 2): IslesMapV1 {
  const depth = source.rows.length;
  const width = source.rows[0]?.length ?? 0;
  if (!depth || !width) throw new Error("Carte des Îles vide.");
  for (const [char, entry] of Object.entries(source.legend)) {
    if (char.length !== 1 || !KINDS.has(entry.kind) || !Number.isFinite(entry.height)) throw new Error("Légende invalide : " + char);
  }
  const kinds: IslesTileKindV1[] = new Array(width * depth);
  const heights = new Float32Array(width * depth);
  source.rows.forEach((row, z) => {
    if (row.length !== width) throw new Error("Ligne " + z + " de longueur différente.");
    for (let x = 0; x < width; x++) {
      const entry = source.legend[row[x]];
      if (!entry) throw new Error("Caractère inconnu « " + row[x] + " » en " + x + "," + z);
      kinds[z * width + x] = entry.kind;
      heights[z * width + x] = entry.height;
    }
  });
  for (const [name, points] of Object.entries(source.markers)) {
    for (const [x, z] of points) if (x < 0 || z < 0 || x >= width || z >= depth) throw new Error("Repère hors carte : " + name);
  }
  return {id: source.id, name: source.name, width, depth, tileMeters, kinds, heights, markers: source.markers};
}

/** Tile containing a world position (metres). */
export function tileAtV1(map: IslesMapV1, x: number, z: number): [number, number] {
  return [Math.floor(x / map.tileMeters), Math.floor(z / map.tileMeters)];
}

/** Kind of a tile; outside the map is open sea, closed by the ARGOS cordon. */
export function kindAtV1(map: IslesMapV1, tx: number, tz: number): IslesTileKindV1 {
  if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.depth) return "water";
  return map.sample ? map.sample(tx, tz).kind : map.kinds[tz * map.width + tx];
}

/** Top of the tile column in metres. */
export function heightAtV1(map: IslesMapV1, tx: number, tz: number): number {
  if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.depth) return -1.2;
  return map.sample ? map.sample(tx, tz).height : map.heights[tz * map.width + tx];
}

/** Water you swim in (a ford is waded, not swum). */
export function isDeepWaterV1(kind: IslesTileKindV1): boolean { return kind === "water"; }

/** Water that reveals the cloak (swimming or wading). */
export function isWetV1(kind: IslesTileKindV1): boolean { return kind === "water" || kind === "ford"; }

/** Ground a human on foot can cross without climbing. */
export function isWalkableV1(map: IslesMapV1, tx: number, tz: number, stepHeight = 0.6): boolean {
  const kind = kindAtV1(map, tx, tz);
  if (kind === "water") return false;
  return heightAtV1(map, tx, tz) <= stepHeight && tx >= 0 && tz >= 0 && tx < map.width && tz < map.depth;
}

/** World centre (metres) of a tile. */
export function tileCenterV1(map: IslesMapV1, tx: number, tz: number): {x: number; z: number} {
  return {x: (tx + 0.5) * map.tileMeters, z: (tz + 0.5) * map.tileMeters};
}

/** First position of a named marker, as a world point. */
export function markerV1(map: IslesMapV1, name: string, index = 0): {x: number; z: number} {
  const point = map.markers[name]?.[index];
  if (!point) throw new Error("Repère absent : " + name);
  return tileCenterV1(map, point[0], point[1]);
}
