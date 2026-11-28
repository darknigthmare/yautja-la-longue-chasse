/** The Isles V1 · wildlife of the whole archipelago (species and island lists of app/game/data/islesLivingWorldV1.json).
 * The 48 × 49 km world cannot keep a list of its animals: it is cut into cells of 128 m, and the groups
 * of a cell are a pure function of the cell, the seed and the world. Only the cells around the hunter
 * come alive; what was killed is remembered for twenty game minutes, everything else is forgotten.
 * Pure and deterministic: no engine, no clock of the machine, no Math.random. Same state, same input, same result. */
import {heightAtV1, kindAtV1, type IslesMapV1} from "./islesMapV1";

/** One species, as written in the data (`temper` and `active` are read as plain strings: an unknown value is harmless). */
export interface IslesFaunaSpeciesV1 {
  label: string; class: string; honor: number; health: number; damage: number;
  /** Metres per second at full speed. */
  speed: number;
  /** "hunter" | "pack" | "ambush" | "charge-when-hurt" | "flee" | "tracker". */
  temper: string;
  /** Group size, [min, max]. */
  group: number[];
  /** "jour" | "nuit" | "jour et nuit" | "aube et crépuscule". */
  active: string;
  note?: string;
}

/** Every number of the module. The defaults are ISLES_FAUNA_TUNING_V1; data may override any of them (`rules.faunaTuning`). */
export interface IslesFaunaTuningV1 {
  /** Side of a population cell, in metres. */
  cellMeters: number;
  /** Mean number of groups per cell, shared between `cellSlots` independent draws. */
  groupsPerCell: number;
  cellSlots: number;
  /** Tiles tried in a cell before a species gives up its place to the next of the list. */
  spawnTries: number;
  /** Draw weight of a species by class (`default` for the others): one apex for many grazers. */
  classWeights: Record<string, number>;
  /** Share of built tiles above which a cell is a town: no wild animal there. */
  settledShare: number;
  /** Livestock keeps within this distance of a named place. */
  livestockSiteMeters: number;
  /** "Near the water" for bank species, "on the shore" for seals, "near a coast" for sharks. */
  bankMeters: number; shoreMeters: number; coastMeters: number;
  /** Ground level from which a tile counts as relief for mountain species. */
  mountainBase: number;
  spawnRadius: number; despawnRadius: number; maxActive: number;
  /** Game minutes during which a killed animal stays dead for its cell, and how far the hunter must be for it to return. */
  respawnMinutes: number; respawnClearMeters: number;
  /** Seconds between two looks at the cells around the hunter, and how many new cells one look may compute (the rest waits for the next step). */
  scanSeconds: number; cellsPerScan: number;
  /** Beyond this distance an animal on the ground is not animated. */
  liveRadius: number;
  sightDay: number; sightNight: number; restSightFactor: number; cloakStillFactor: number; cloakMovingFactor: number;
  /** A tracker follows the trail of a cloaked hunter within this distance. */
  trackerCloakMeters: number;
  walkFactor: number;
  /** Highest step between two neighbouring tiles (the relief is terraced). */
  stepMeters: number;
  contactMeters: number; ambushMeters: number; attackSeconds: number;
  /** Largest height difference at which a bite still lands (a hunter in a tree is out of reach). */
  reachHeight: number;
  packMin: number;
  /** A fleeing animal calms down this far from the hunter. */
  fleeMeters: number;
  /** Seconds an animal keeps the hunter in mind after losing sight of it, after a noise or a wound, and how far it then follows. */
  forgetSeconds: number; alarmSeconds: number; chaseMeters: number;
  wanderMeters: number;
  flightMin: number; flightMax: number; flightSeconds: number;
  /** Height of a swimming body on a deep-water tile. */
  swimY: number;
}

/** Default numbers (design request of 28 November 2026). */
export const ISLES_FAUNA_TUNING_V1: IslesFaunaTuningV1 = {
  cellMeters: 128, groupsPerCell: 1 / 3, cellSlots: 2, spawnTries: 20,
  classWeights: {apex: 1, "prédateur": 2, venimeux: 2, default: 4},
  settledShare: 0.15, livestockSiteMeters: 900, bankMeters: 20, shoreMeters: 12, coastMeters: 60, mountainBase: 30,
  spawnRadius: 260, despawnRadius: 380, maxActive: 40, respawnMinutes: 20, respawnClearMeters: 60, scanSeconds: 1, cellsPerScan: 3, liveRadius: 180,
  sightDay: 26, sightNight: 14, restSightFactor: 0.5, cloakStillFactor: 0.5, cloakMovingFactor: 0.6, trackerCloakMeters: 14,
  walkFactor: 0.35, stepMeters: 1, contactMeters: 1.8, ambushMeters: 4, attackSeconds: 1.5, reachHeight: 2.5, packMin: 3,
  fleeMeters: 48, forgetSeconds: 6, alarmSeconds: 20, chaseMeters: 70, wanderMeters: 14,
  flightMin: 6, flightMax: 12, flightSeconds: 5, swimY: -0.4,
};

/** The part of the living-world data this module reads, plus the flags of the running game. */
export interface IslesFaunaRulesV1 {
  species: Record<string, IslesFaunaSpeciesV1>;
  islands: Record<string, {fauna: string[]}>;
  /** An enclosure of the Eastbank zoo was opened: its escaped big cat may now appear there. */
  zooOpen?: boolean;
  faunaTuning?: Partial<IslesFaunaTuningV1>;
}

/** What the module asks of the world; the result of createArchipelagoWorldV1 fits as it is. */
export interface IslesFaunaWorldV1 {
  map: IslesMapV1;
  sites: {x: number; z: number}[];
  placeAt(x: number, z: number): {islandId: string} | null;
  tileAt(tx: number, tz: number): {kind: string; height: number; base: number};
}

/** Game time: `hour` in 0..24; `day` lets the twenty minutes of a kill span midnight and long skips. */
export interface IslesFaunaClockV1 { hour: number; day?: number }
/** `humanSight` scales how far eyes carry (animals included); `noiseCover` (0..1) is the share of a noise the weather drowns. */
export interface IslesFaunaWeatherV1 { humanSight: number; noiseCover: number }
/** The hunter as the animals perceive it. `noise` is the reach in metres of a sound made during this step (a plasma shot). */
export interface IslesFaunaPlayerV1 { x: number; y: number; z: number; cloaked: boolean; moving: boolean; noise?: number }

/** Where a species lives. */
export type IslesFaunaHabitatV1 = "sea" | "bank" | "shore" | "anywhere" | "mountain" | "livestock" | "settled" | "land";

/** How a species uses the tiles. */
export interface IslesFaunaProfileV1 {
  habitat: IslesFaunaHabitatV1;
  /** Crosses deep water. */
  swims: boolean;
  /** Never leaves deep water. */
  waterOnly: boolean;
  /** Bird: perches on any column and takes off when disturbed. */
  flies: boolean;
  /** Vermin, birds and trained animals: at home on built tiles and in towns. */
  tolerated: boolean;
}

/** One group of a cell at its starting place. `resting` is the only field that depends on the clock. */
export interface IslesFaunaGroupV1 {
  /** `cellX:cellZ:index`. */
  key: string;
  cellX: number; cellZ: number; index: number;
  species: string; islandId: string;
  resting: boolean;
  /** Starting position of each member, in metres (y is the ground). */
  members: {x: number; y: number; z: number}[];
}

/** What an animal is doing; `rest` is an animal outside its hours. */
export type IslesFaunaMoodV1 = "rest" | "idle" | "wander" | "alert" | "flee" | "hunt" | "charge" | "fly" | "dead";

/** A living (or freshly killed) animal near the hunter. Position is the feet, in metres; y is up. */
export interface IslesFaunaAnimalV1 {
  /** `cellX:cellZ:groupIndex:memberIndex`: the same animal keeps the same id whenever its cell is loaded. */
  id: string;
  group: string;
  species: string; label: string; honor: number; damage: number; speed: number; temper: string; active: string;
  swims: boolean; waterOnly: boolean; flies: boolean;
  x: number; y: number; z: number; yaw: number;
  homeX: number; homeZ: number; goalX: number; goalZ: number;
  health: number; maxHealth: number;
  state: IslesFaunaMoodV1;
  airborne: boolean;
  /** Height above the ground while airborne. */
  altitude: number;
  hurt: boolean;
  /** Set by damageIslesFaunaV1, turned into an alarm by the next step. */
  struck: boolean;
  dead: boolean;
  /** Seconds left in the current pause, walk or flight. */
  timer: number;
  /** Seconds during which the animal still has the hunter in mind. */
  alarm: number;
  attackTimer: number;
  /** Side tried first when the way is blocked. */
  turn: number;
}

/** Everything the fauna remembers. Plain data: it can be saved or sent as it is. */
export interface IslesFaunaStateV1 {
  seed: number;
  /** Seeded generator of the live behaviour (wandering, flights). */
  rng: number;
  /** Game minutes elapsed since the first step. */
  minutes: number;
  lastClock: number | null;
  scanTimer: number;
  scanCell: string;
  /** Groups of the cells around the hunter, kept only while they are near. */
  cells: Record<string, IslesFaunaGroupV1[]>;
  /** Animal id → game minute of its death. */
  killed: Record<string, number>;
  animals: IslesFaunaAnimalV1[];
}

export type IslesFaunaEventV1 =
  | {type: "attack"; animalId: string; damage: number}
  /** Birds taking off: a signal seen from far away. */
  | {type: "flushed"; species: string; x: number; z: number}
  | {type: "spooked"; species: string};

/** One animal as the renderer needs it. `model` is the species id. */
export interface IslesFaunaViewV1 {
  id: string; species: string; label: string; model: string;
  x: number; y: number; z: number; yaw: number;
  state: IslesFaunaMoodV1; airborne: boolean; dead: boolean; health01: number;
}

/** The escaped big cat of the zoo: never drawn unless `rules.zooOpen`, and only on its island. */
const ZOO_SPECIES = "fauve-du-zoo", ZOO_ISLAND = "eastbank";
/** Habitat by species id, then by class; everything else lives on open land. */
const HABITAT_BY_ID: Record<string, IslesFaunaHabitatV1> = {
  requin: "sea", crocodile: "bank", alligator: "bank", anaconda: "bank", heron: "bank", tortue: "bank",
  phoque: "shore", morse: "shore", mouflon: "mountain", "chevre-sauvage": "mountain", aigle: "mountain",
};
const HABITAT_BY_CLASS: Record<string, IslesFaunaHabitatV1> = {oiseau: "anywhere", "bétail": "livestock", nuisible: "settled", "dressé": "settled"};
const SWIMMERS = new Set(["requin", "crocodile", "alligator", "anaconda", "tortue", "phoque", "morse"]);
const TOLERATED_CLASSES = new Set(["nuisible", "oiseau", "dressé"]);
/** Tiles an animal walks on (reeds and crops stand like bushes). Any kind absent from GROUND and PERCH (lava, kinds added later) is an obstacle. */
const GROUND = new Set(["sand", "grass", "jungle", "mud", "road", "rail", "bush", "reed", "crop", "snow", "savanna", "rock", "ford"]);
/** Columns a bird perches on. */
const PERCH = new Set(["tree", "pine", "palm", "cactus", "deadtree", "roof", "building", "wall", "crate", "ruin", "pillar"]);
/** Built tiles: no wild animal starts there. */
const BUILT = new Set(["road", "rail", "building", "roof", "wall", "pillar", "crate"]);
const DEEP = "water", SHALLOW = "ford";
/** Two tiles with a waterline between them: [dry x, dry z, wet x, wet z]. */
type Edge = [number, number, number, number];
const RING: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function hashInt(a: number, b: number, c: number, d: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519) ^ Math.imul(d | 0, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Next value in [0, 1) of the generator kept in `holder.rng` (mulberry32). */
function draw(holder: {rng: number}): number {
  holder.rng = (holder.rng + 0x6D2B79F5) | 0;
  let v = Math.imul(holder.rng ^ (holder.rng >>> 15), 1 | holder.rng);
  v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
  return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
}

const tuningOf = (rules: IslesFaunaRulesV1): IslesFaunaTuningV1 => rules.faunaTuning ? {...ISLES_FAUNA_TUNING_V1, ...rules.faunaTuning} : ISLES_FAUNA_TUNING_V1;
const isNight = (hour: number) => { const h = ((hour % 24) + 24) % 24; return h >= 20 || h < 5; };

/** Habitat and way of moving of a species, from its id and its class. */
export function islesFaunaProfileV1(id: string, species: IslesFaunaSpeciesV1): IslesFaunaProfileV1 {
  const habitat = HABITAT_BY_ID[id] ?? HABITAT_BY_CLASS[species.class] ?? "land";
  return {habitat, swims: SWIMMERS.has(id), waterOnly: habitat === "sea", flies: species.class === "oiseau", tolerated: TOLERATED_CLASSES.has(species.class)};
}

/** Whether a species is in its hours: night is 20 h – 5 h, dawn and dusk are 5 – 8 h and 17 – 20 h. */
export function islesFaunaActiveV1(active: string, hour: number): boolean {
  const h = ((hour % 24) + 24) % 24, night = isNight(h);
  if (active === "nuit") return night;
  if (active === "jour") return !night;
  if (active === "aube et crépuscule") return (h >= 5 && h < 8) || (h >= 17 && h < 20);
  return true;
}

/** Distance in metres at which an animal perceives the hunter: 26 m in its own light and 14 m otherwise,
 * scaled by the weather, halved at rest, reduced by the cloak (more when the hunter stands still).
 * A tracker keeps the trail of a cloaked hunter within 14 m. */
export function islesFaunaSightV1(animal: {active: string; temper: string}, clock: IslesFaunaClockV1, weather: IslesFaunaWeatherV1,
  player: {cloaked: boolean; moving: boolean}, resting: boolean, tuning: IslesFaunaTuningV1 = ISLES_FAUNA_TUNING_V1): number {
  const ownLight = isNight(clock.hour) === (animal.active === "nuit");
  let range = (ownLight ? tuning.sightDay : tuning.sightNight) * weather.humanSight;
  if (player.cloaked) range *= player.moving ? tuning.cloakMovingFactor : tuning.cloakStillFactor;
  if (resting) range *= tuning.restSightFactor;
  else if (animal.temper === "tracker" && player.cloaked) range = Math.max(range, tuning.trackerCloakMeters);
  return range;
}

/** Whether a body of this profile can be on a tile of this kind. */
function stands(profile: {swims: boolean; waterOnly: boolean; flies: boolean}, kind: string): boolean {
  if (profile.waterOnly) return kind === DEEP;
  if (kind === DEEP) return profile.swims;
  return GROUND.has(kind) || (profile.flies && PERCH.has(kind));
}

/** Whether a tile matching `test` lies within `radius` tiles, looked for along eight directions. */
function tileNear(world: IslesFaunaWorldV1, tx: number, tz: number, radius: number, test: (kind: string) => boolean): boolean {
  for (let r = 1; r <= radius; r += r < 3 ? 1 : 2) for (const [dx, dz] of RING) if (test(world.tileAt(tx + dx * r, tz + dz * r).kind)) return true;
  return false;
}

/** Groups of one cell of 128 m: the species is drawn in the list of the island under the centre of the cell,
 * the size in its `group` range, and every member starts on a tile its species can live on.
 * Deterministic and without memory; the clock only decides `resting`. A cell centred on the sea holds aquatic species only
 * (sharks in the water, seals or turtles on the shore it may contain). */
export function islesFaunaCellV1(rules: IslesFaunaRulesV1, world: IslesFaunaWorldV1, cellX: number, cellZ: number, seed: number, clock: IslesFaunaClockV1): IslesFaunaGroupV1[] {
  const t = tuningOf(rules), tile = world.map.tileMeters, span = Math.max(1, Math.round(t.cellMeters / tile)), x0 = cellX * span, z0 = cellZ * span;
  const centerX = (x0 + span / 2) * tile, centerZ = (z0 + span / 2) * tile;
  let islandId = world.placeAt(centerX, centerZ)?.islandId ?? null;
  const marine = islandId === null;
  // Survey of the cell on a 6 × 6 grid: how much of it is sea, shore, town, and between which points a shore or a bank runs.
  const isDeep = (kind: string) => kind === DEEP, isWet = (kind: string) => kind === DEEP || kind === SHALLOW;
  const at = (i: number) => Math.floor((i + 0.5) * span / 6), seen: string[] = [];
  const shores: Edge[] = [], banks: Edge[] = [];
  let land = 0, deep = 0, wet = 0, built = 0, settled = 0;
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
    const tx = x0 + at(i), tz = z0 + at(j), kind = world.tileAt(tx, tz).kind;
    seen.push(kind);
    for (const [pi, pj] of [[i - 1, j], [i, j - 1]]) {
      if (pi < 0 || pj < 0) continue;
      const other = seen[pj * 6 + pi], ox = x0 + at(pi), oz = z0 + at(pj);
      if (isDeep(kind) !== isDeep(other)) shores.push(isDeep(kind) ? [ox, oz, tx, tz] : [tx, tz, ox, oz]);
      if (isWet(kind) !== isWet(other)) banks.push(isWet(kind) ? [ox, oz, tx, tz] : [tx, tz, ox, oz]);
    }
    if (kind === DEEP) { deep++; wet++; continue; }
    land++;
    if (kind === SHALLOW) wet++;
    if (BUILT.has(kind)) built++;
    if (BUILT.has(kind) || kind === "ruin") settled++;
    if (islandId === null) islandId = world.placeAt((tx + 0.5) * tile, (tz + 0.5) * tile)?.islandId ?? null;
  }
  const list = islandId === null ? undefined : rules.islands[islandId]?.fauna;
  if (islandId === null || !list) return [];
  const island = islandId;
  const pool = list.filter(id => rules.species[id] && (id !== ZOO_SPECIES || (rules.zooOpen === true && island === ZOO_ISLAND))
    && (!marine || islesFaunaProfileV1(id, rules.species[id]).swims));
  if (!pool.length) return [];
  const town = land > 0 && built / land > t.settledShare;
  const nearSite = world.sites.some(site => Math.hypot(site.x - centerX, site.z - centerZ) <= t.livestockSiteMeters);
  const holder = {rng: hashInt(cellX, cellZ, seed, 977)}, random = () => draw(holder);
  const weightOf = (id: string) => t.classWeights[rules.species[id].class] ?? t.classWeights.default ?? 1;

  /** Whether the cell as a whole suits the species (cheap, before any tile is tried). */
  const cellSuits = (profile: IslesFaunaProfileV1) => {
    if (!profile.tolerated && town) return false;
    switch (profile.habitat) {
      case "sea": return deep > 0;
      case "bank": return wet > 0;
      case "shore": return deep > 0 && land > 0;
      case "livestock": return nearSite;
      case "settled": return settled > 0;
      default: return true;
    }
  };
  /** Whether a member of the species may start on this tile. */
  const tileSuits = (profile: IslesFaunaProfileV1, tx: number, tz: number, anchor: boolean) => {
    const here = world.tileAt(tx, tz), kind = here.kind;
    if (!stands(profile, kind)) return false;
    if (profile.habitat === "sea") return !anchor || tileNear(world, tx, tz, Math.round(t.coastMeters / tile), other => other !== DEEP);
    if (kind === DEEP) return false;
    if (!profile.tolerated && BUILT.has(kind)) return false;
    if (!anchor) return true;
    if (profile.habitat === "bank" && kind !== SHALLOW && !tileNear(world, tx, tz, Math.round(t.bankMeters / tile), other => other === DEEP || other === SHALLOW)) return false;
    if (profile.habitat === "shore" && !tileNear(world, tx, tz, Math.round(t.shoreMeters / tile), other => other === DEEP)) return false;
    // Not an isolated block: at least one neighbour can be walked to.
    return profile.flies || RING.slice(0, 4).some(([dx, dz]) => { const next = world.tileAt(tx + dx, tz + dz); return stands(profile, next.kind) && Math.abs(next.height - here.height) <= t.stepMeters; });
  };
  /** Follows one surveyed edge down to the two neighbouring tiles where the dry side meets the water. */
  const waterline = (edges: Edge[], water: (kind: string) => boolean): Edge => {
    let [dryX, dryZ, wetX, wetZ] = edges[Math.floor(random() * edges.length)];
    while (Math.max(Math.abs(wetX - dryX), Math.abs(wetZ - dryZ)) > 1) {
      const midX = Math.round((dryX + wetX) / 2), midZ = Math.round((dryZ + wetZ) / 2);
      if (water(world.tileAt(midX, midZ).kind)) { wetX = midX; wetZ = midZ; } else { dryX = midX; dryZ = midZ; }
    }
    return [dryX, dryZ, wetX, wetZ];
  };
  const anchorFor = (profile: IslesFaunaProfileV1): [number, number] | null => {
    // Species of the water's edge go straight to it; the others try tiles of the cell at random.
    const edges = profile.habitat === "bank" ? banks : profile.habitat === "sea" || profile.habitat === "shore" ? shores : null;
    for (let i = 0; edges && edges.length && i < 4; i++) {
      const [dryX, dryZ, wetX, wetZ] = waterline(edges, profile.habitat === "bank" ? isWet : isDeep);
      const [tx, tz] = profile.habitat === "sea" ? [wetX, wetZ] : [dryX, dryZ];
      if (tileSuits(profile, tx, tz, true)) return [tx, tz];
    }
    let fallback: [number, number] | null = null;
    for (let i = 0; i < (edges ? t.spawnTries / 4 : t.spawnTries); i++) {
      const tx = x0 + Math.floor(random() * span), tz = z0 + Math.floor(random() * span);
      if (!tileSuits(profile, tx, tz, true)) continue;
      if (profile.habitat !== "mountain" || world.tileAt(tx, tz).base >= t.mountainBase) return [tx, tz];
      fallback ??= [tx, tz];
    }
    return fallback;
  };

  const groups: IslesFaunaGroupV1[] = [];
  for (let slot = 0; slot < t.cellSlots; slot++) {
    if (random() >= t.groupsPerCell / t.cellSlots) continue;
    // Weighted draw in the list of the island; a species without a place in this cell is set aside and the draw is made again.
    const left = pool.filter(id => cellSuits(islesFaunaProfileV1(id, rules.species[id])));
    while (left.length) {
      let roll = random() * left.reduce((sum, id) => sum + weightOf(id), 0), pick = 0;
      while (pick < left.length - 1 && (roll -= weightOf(left[pick])) >= 0) pick++;
      const id = left[pick], species = rules.species[id], profile = islesFaunaProfileV1(id, species);
      const anchor = anchorFor(profile);
      if (!anchor) { left.splice(pick, 1); continue; }
      const least = Math.max(1, Math.round(species.group[0] ?? 1)), most = Math.max(least, Math.round(species.group[1] ?? least));
      const size = least + Math.floor(random() * (most - least + 1)), spread = 3 + Math.ceil(size / 2);
      const members: IslesFaunaGroupV1["members"] = [];
      for (let m = 0; m < size; m++) {
        let [tx, tz] = anchor;
        for (let tries = 0; m > 0 && tries < 6; tries++) {
          const nx = anchor[0] + Math.round((random() * 2 - 1) * spread), nz = anchor[1] + Math.round((random() * 2 - 1) * spread);
          if (tileSuits(profile, nx, nz, false)) { tx = nx; tz = nz; break; }
        }
        const here = world.tileAt(tx, tz);
        members.push({x: (tx + 0.2 + random() * 0.6) * tile, y: here.kind === DEEP ? t.swimY : here.height, z: (tz + 0.2 + random() * 0.6) * tile});
      }
      groups.push({key: cellX + ":" + cellZ + ":" + slot, cellX, cellZ, index: slot, species: id, islandId: island, resting: !islesFaunaActiveV1(species.active, clock.hour), members});
      break;
    }
  }
  return groups;
}

/** Empty fauna: the first step fills it around the hunter. */
export function createIslesFaunaV1(seed: number): IslesFaunaStateV1 {
  return {seed, rng: hashInt(seed, 31, 7, 2026), minutes: 0, lastClock: null, scanTimer: 0, scanCell: "", cells: {}, killed: {}, animals: []};
}

interface StepContext {
  t: IslesFaunaTuningV1; map: IslesMapV1; player: IslesFaunaPlayerV1; clock: IslesFaunaClockV1; weather: IslesFaunaWeatherV1; dt: number;
  random: () => number; events: IslesFaunaEventV1[];
  animals: IslesFaunaAnimalV1[];
  /** Living members per group. */
  alive: Map<string, number>;
  /** Groups that already sent a `flushed` or `spooked` event during this step. */
  told: Set<string>;
}

/** Height of a body on a tile. */
function surface(map: IslesMapV1, tx: number, tz: number, swimY: number): number {
  return kindAtV1(map, tx, tz) === DEEP ? swimY : heightAtV1(map, tx, tz);
}

/** Whether the animal can pass from one tile to a neighbour: no obstacle, no deep water unless it swims, a step of 1 m at most. */
function passable(c: StepContext, a: IslesFaunaAnimalV1, fromX: number, fromZ: number, toX: number, toZ: number): boolean {
  if (fromX === toX && fromZ === toZ) return true;
  const to: string = kindAtV1(c.map, toX, toZ);
  if (!stands(a, to)) return false;
  if (to === DEEP || kindAtV1(c.map, fromX, fromZ) === DEEP) return true;
  return Math.abs(heightAtV1(c.map, toX, toZ) - heightAtV1(c.map, fromX, fromZ)) <= c.t.stepMeters;
}

/** Moves on the ground toward a direction, turning aside when the way is blocked. Returns false when nothing was possible. */
function walk(c: StepContext, a: IslesFaunaAnimalV1, dirX: number, dirZ: number, speed: number): boolean {
  const length = Math.hypot(dirX, dirZ), distance = speed * c.dt;
  if (length < 1e-6 || distance <= 0) return false;
  const tile = c.map.tileMeters, steps = Math.max(1, Math.ceil(distance / (tile / 2))), hop = distance / steps, heading = Math.atan2(dirX, dirZ);
  let moved = false;
  for (let s = 0; s < steps; s++) {
    const fromX = Math.floor(a.x / tile), fromZ = Math.floor(a.z / tile);
    let done = false;
    for (const offset of [0, 0.7 * a.turn, -0.7 * a.turn, 1.4 * a.turn, -1.4 * a.turn]) {
      const yaw = heading + offset, nx = a.x + Math.sin(yaw) * hop, nz = a.z + Math.cos(yaw) * hop;
      if (!passable(c, a, fromX, fromZ, Math.floor(nx / tile), Math.floor(nz / tile))) continue;
      a.x = nx; a.z = nz; a.yaw = yaw;
      if (offset !== 0) a.turn = Math.sign(offset);
      done = moved = true;
      break;
    }
    if (!done) { a.turn = -a.turn; break; }
  }
  a.y = surface(c.map, Math.floor(a.x / tile), Math.floor(a.z / tile), c.t.swimY);
  return moved;
}

/** Bird in the air: away from the hunter, then down on the first tile it can perch on; after a while over the sea it turns back to where it came from. */
function fly(c: StepContext, a: IslesFaunaAnimalV1, dx: number, dz: number, d: number): void {
  const tile = c.map.tileMeters;
  a.timer -= c.dt;
  let tx = Math.floor(a.x / tile), tz = Math.floor(a.z / tile);
  if (a.timer <= 0) {
    const home = Math.hypot(a.homeX - a.x, a.homeZ - a.z);
    if (stands(a, kindAtV1(c.map, tx, tz)) || home < 1.5 || a.timer < -40) {
      a.airborne = false; a.altitude = 0; a.state = "idle"; a.alarm = 0; a.timer = 2 + c.random() * 4;
      a.homeX = a.x; a.homeZ = a.z; a.y = surface(c.map, tx, tz, c.t.swimY);
      return;
    }
    if (a.timer < -8) a.yaw = Math.atan2(a.homeX - a.x, a.homeZ - a.z);
  } else if (d > 0.5) a.yaw = Math.atan2(-dx, -dz);
  a.x += Math.sin(a.yaw) * a.speed * c.dt; a.z += Math.cos(a.yaw) * a.speed * c.dt;
  tx = Math.floor(a.x / tile); tz = Math.floor(a.z / tile);
  a.y = Math.max(0, heightAtV1(c.map, tx, tz)) + a.altitude;
}

/** Quiet life: asleep outside its hours, otherwise short walks around its home. Birds stay where they landed. */
function graze(c: StepContext, a: IslesFaunaAnimalV1, resting: boolean): void {
  if (resting) { a.state = "rest"; return; }
  if (a.state === "wander") {
    const gx = a.goalX - a.x, gz = a.goalZ - a.z;
    a.timer -= c.dt;
    if (Math.hypot(gx, gz) < 1 || a.timer <= 0 || !walk(c, a, gx, gz, a.speed * c.t.walkFactor)) { a.state = "idle"; a.timer = 2 + c.random() * 5; }
    return;
  }
  if (a.state !== "idle") { a.state = "idle"; a.timer = 1 + c.random() * 4; }
  a.timer -= c.dt;
  if (a.timer > 0 || a.flies) return;
  const angle = c.random() * Math.PI * 2, reach = (0.3 + 0.7 * c.random()) * c.t.wanderMeters;
  a.goalX = a.homeX + Math.sin(angle) * reach; a.goalZ = a.homeZ + Math.cos(angle) * reach;
  a.state = "wander"; a.timer = 12;
}

/** Warns the rest of the group: a herd bolts together, a pack hunts together. */
function warnGroup(c: StepContext, a: IslesFaunaAnimalV1): void {
  for (const mate of c.animals) if (mate.group === a.group && mate !== a && !mate.dead) mate.alarm = Math.max(mate.alarm, c.t.forgetSeconds);
}

/** Runs from the hunter; a bird takes off instead. Calms down once far enough. */
function flee(c: StepContext, a: IslesFaunaAnimalV1, dx: number, dz: number, d: number, perceived: boolean, safe: number): void {
  if (a.state !== "flee") {
    if (perceived) warnGroup(c, a);
    if (a.flies) {
      a.airborne = true; a.state = "fly"; a.altitude = c.t.flightMin + c.random() * (c.t.flightMax - c.t.flightMin); a.timer = c.t.flightSeconds * (0.8 + 0.4 * c.random());
      if (!c.told.has(a.group)) { c.told.add(a.group); c.events.push({type: "flushed", species: a.species, x: a.x, z: a.z}); }
      fly(c, a, dx, dz, d);
      return;
    }
    a.state = "flee";
    if (!c.told.has(a.group)) { c.told.add(a.group); c.events.push({type: "spooked", species: a.species}); }
  }
  if (d >= safe) { a.state = "idle"; a.alarm = 0; a.timer = 2 + c.random() * 4; a.homeX = a.x; a.homeZ = a.z; return; }
  if (d > 0.01) walk(c, a, -dx, -dz, a.speed); else walk(c, a, Math.sin(a.yaw), Math.cos(a.yaw), a.speed);
}

/** Bites when the cooldown allows, the hunter is within `range` and at about the same height. */
function strike(c: StepContext, a: IslesFaunaAnimalV1, d: number, range: number): boolean {
  if (d > range || Math.abs(c.player.y - a.y) > c.t.reachHeight) return false;
  if (a.attackTimer <= 0) { a.attackTimer = c.t.attackSeconds; c.events.push({type: "attack", animalId: a.id, damage: a.damage}); }
  return true;
}

/** Runs at the hunter and bites at contact. */
function chase(c: StepContext, a: IslesFaunaAnimalV1, dx: number, dz: number, d: number, mood: IslesFaunaMoodV1): void {
  a.state = mood;
  if (strike(c, a, d, c.t.contactMeters)) { a.yaw = Math.atan2(dx, dz); return; }
  if (d > c.t.contactMeters * 0.8) walk(c, a, dx, dz, a.speed); else a.yaw = Math.atan2(dx, dz);
}

/** One animal, one step: perception, then the behaviour of its temper. */
function think(c: StepContext, a: IslesFaunaAnimalV1): void {
  const {t, player} = c, dx = player.x - a.x, dz = player.z - a.z, d = Math.hypot(dx, dz);
  a.attackTimer = Math.max(0, a.attackTimer - c.dt);
  a.alarm = Math.max(0, a.alarm - c.dt);
  if (a.struck) { a.struck = false; a.alarm = t.alarmSeconds; }
  if (a.airborne) { fly(c, a, dx, dz, d); return; }
  const heard = (player.noise ?? 0) * (1 - Math.min(1, Math.max(0, c.weather.noiseCover)));
  if (heard > 0 && d <= heard) a.alarm = t.alarmSeconds;
  const resting = !islesFaunaActiveV1(a.active, c.clock.hour) && a.alarm <= 0;
  const sight = islesFaunaSightV1(a, c.clock, c.weather, player, resting, t), sees = d <= sight;
  if (sees) a.alarm = Math.max(a.alarm, t.forgetSeconds);
  const aware = sees || (a.alarm > 0 && d <= t.chaseMeters);
  const pack = a.temper === "pack" && (c.alive.get(a.group) ?? 0) >= t.packMin;
  const temper = a.temper === "pack" ? (pack ? "hunter" : "flee") : a.temper === "tracker" ? "hunter" : a.temper;

  if (temper === "flee" || a.damage <= 0) {
    // Far enough is safe: an alarm heard from there does not start a flight.
    const safe = Math.max(t.fleeMeters, sight * 1.5);
    if ((aware && d < safe) || a.state === "flee") flee(c, a, dx, dz, d, sees, safe); else graze(c, a, resting);
  } else if (temper === "hunter") {
    if (aware) { if (sees && a.state !== "hunt" && a.temper === "pack") warnGroup(c, a); chase(c, a, dx, dz, d, "hunt"); }
    else graze(c, a, resting);
  } else if (temper === "charge-when-hurt") {
    if (a.hurt && aware) chase(c, a, dx, dz, d, "charge");
    else if (sees) { a.state = "alert"; a.yaw = Math.atan2(dx, dz); }
    else graze(c, a, resting);
  } else if (temper === "ambush") {
    // Never moves: it waits for the hunter to come within reach.
    a.state = resting ? "rest" : aware ? "alert" : "idle";
    if (aware) { a.yaw = Math.atan2(dx, dz); strike(c, a, d, t.ambushMeters); }
  } else graze(c, a, resting);
}

/** Loads the groups of the cells within reach (the nearest first, a few per call), drops what is far, and lets the nearest
 * missing animals appear. Returns true while cells are still waiting to be computed. */
function populate(state: IslesFaunaStateV1, rules: IslesFaunaRulesV1, world: IslesFaunaWorldV1, player: IslesFaunaPlayerV1, clock: IslesFaunaClockV1, t: IslesFaunaTuningV1): boolean {
  const size = t.cellMeters, reach = Math.ceil(t.spawnRadius / size), pcx = Math.floor(player.x / size), pcz = Math.floor(player.z / size);
  const cells: Record<string, IslesFaunaGroupV1[]> = {}, missing: {key: string; cx: number; cz: number; gap: number}[] = [];
  for (let cz = pcz - reach; cz <= pcz + reach; cz++) for (let cx = pcx - reach; cx <= pcx + reach; cx++) {
    const gapX = Math.max(cx * size - player.x, 0, player.x - (cx + 1) * size), gapZ = Math.max(cz * size - player.z, 0, player.z - (cz + 1) * size);
    const gap = Math.hypot(gapX, gapZ), key = cx + ":" + cz;
    if (gap > t.spawnRadius) continue;
    if (state.cells[key]) cells[key] = state.cells[key]; else missing.push({key, cx, cz, gap});
  }
  missing.sort((a, b) => a.gap - b.gap || (a.key < b.key ? -1 : 1));
  for (const {key, cx, cz} of missing.slice(0, Math.max(1, t.cellsPerScan))) cells[key] = islesFaunaCellV1(rules, world, cx, cz, state.seed, clock);
  state.cells = cells;
  const expired = (id: string) => state.minutes - (state.killed[id] ?? -Infinity) >= t.respawnMinutes;
  state.animals = state.animals.filter(a => Math.hypot(a.x - player.x, a.z - player.z) <= t.despawnRadius && !(a.dead && expired(a.id)));
  const present = new Set(state.animals.map(a => a.id)), held = new Set<string>();
  const wanted: {id: string; d: number; group: IslesFaunaGroupV1; index: number}[] = [];
  for (const groups of Object.values(cells)) for (const group of groups) group.members.forEach((member, index) => {
    const id = group.key + ":" + index, d = Math.hypot(member.x - player.x, member.z - player.z);
    if (present.has(id) || d > t.spawnRadius) return;
    // A killed animal returns after its twenty minutes, and never under the eyes of the hunter.
    if (id in state.killed && (!expired(id) || d < t.respawnClearMeters)) { held.add(id); return; }
    wanted.push({id, d, group, index});
  });
  wanted.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  for (const {id, group, index} of wanted) {
    if (state.animals.length >= t.maxActive) break;
    const species = rules.species[group.species], profile = islesFaunaProfileV1(group.species, species), at = group.members[index];
    state.animals.push({id, group: group.key, species: group.species, label: species.label, honor: species.honor, damage: species.damage, speed: species.speed,
      temper: species.temper, active: species.active, swims: profile.swims, waterOnly: profile.waterOnly, flies: profile.flies,
      x: at.x, y: at.y, z: at.z, yaw: hashInt(group.cellX, group.cellZ, group.index, index) / 4294967296 * Math.PI * 2,
      homeX: at.x, homeZ: at.z, goalX: at.x, goalZ: at.z, health: species.health, maxHealth: species.health,
      state: "idle", airborne: false, altitude: 0, hurt: false, struck: false, dead: false, timer: 0, alarm: 0, attackTimer: 0, turn: index % 2 ? 1 : -1});
  }
  const killed: Record<string, number> = {};
  for (const [id, at] of Object.entries(state.killed)) if (!expired(id) || held.has(id) || present.has(id)) killed[id] = at;
  state.killed = killed;
  return missing.length > Math.max(1, t.cellsPerScan);
}

/** One step of the fauna around the hunter. Groups of the cells within 260 m appear (the nearest first, 40 animals at most),
 * those beyond 380 m are forgotten, and every animal within 180 m follows its temper: flee, charge when hurt, hunt,
 * hunt as a pack, ambush or track. The given state is left untouched. */
export function stepIslesFaunaV1(state: IslesFaunaStateV1, rules: IslesFaunaRulesV1, world: IslesFaunaWorldV1, player: IslesFaunaPlayerV1,
  clock: IslesFaunaClockV1, weather: IslesFaunaWeatherV1, dt: number): {state: IslesFaunaStateV1; events: IslesFaunaEventV1[]} {
  const t = tuningOf(rules), seconds = Math.min(0.25, Math.max(0, Number.isFinite(dt) ? dt : 0));
  const next: IslesFaunaStateV1 = {...state, animals: state.animals.map(animal => ({...animal}))};
  // Game time: the clock may come without a day, so a step back is read as midnight passing.
  const now = ((clock.day ?? 0) * 24 + clock.hour) * 60;
  let elapsed = next.lastClock === null ? 0 : now - next.lastClock;
  if (elapsed < 0) elapsed += 1440 * Math.ceil(-elapsed / 1440);
  next.minutes += elapsed; next.lastClock = now;

  const cell = Math.floor(player.x / t.cellMeters) + ":" + Math.floor(player.z / t.cellMeters);
  next.scanTimer -= seconds;
  if (next.scanTimer <= 0 || cell !== next.scanCell) { next.scanCell = cell; next.scanTimer = populate(next, rules, world, player, clock, t) ? 0 : t.scanSeconds; }

  const holder = {rng: next.rng}, events: IslesFaunaEventV1[] = [], alive = new Map<string, number>();
  for (const animal of next.animals) if (!animal.dead) alive.set(animal.group, (alive.get(animal.group) ?? 0) + 1);
  const context: StepContext = {t, map: world.map, player, clock, weather, dt: seconds, random: () => draw(holder), events, animals: next.animals, alive, told: new Set()};
  const tile = world.map.tileMeters;
  for (const animal of next.animals) {
    if (!animal.dead) {
      if (animal.airborne || Math.hypot(animal.x - player.x, animal.z - player.z) <= t.liveRadius) think(context, animal);
      continue;
    }
    // A bird killed in flight comes down.
    if (animal.altitude > 0) { animal.altitude = 0; animal.y = surface(world.map, Math.floor(animal.x / tile), Math.floor(animal.z / tile), t.swimY); }
  }
  next.rng = holder.rng;
  return {state: next, events};
}

/** Wounds an animal. A kill gives the honour of its species (0 for a protected one) and is remembered for its cell;
 * a wounded animal knows where the blow came from. Unknown or already dead: nothing changes and `killed` is false. */
export function damageIslesFaunaV1(state: IslesFaunaStateV1, animalId: string, amount: number): {state: IslesFaunaStateV1; killed: boolean; honor: number; species: string | null} {
  const target = state.animals.find(animal => animal.id === animalId);
  if (!target || target.dead) return {state, killed: false, honor: 0, species: target?.species ?? null};
  const health = Math.max(0, target.health - Math.max(0, amount)), killed = health <= 0;
  const hit: IslesFaunaAnimalV1 = killed
    ? {...target, health, hurt: true, dead: true, state: "dead", airborne: false, alarm: 0}
    : {...target, health, hurt: true, struck: true};
  return {
    state: {...state, animals: state.animals.map(animal => animal === target ? hit : animal), killed: killed ? {...state.killed, [animalId]: state.minutes} : state.killed},
    killed, honor: killed ? target.honor : 0, species: target.species,
  };
}

/** Animals for the renderer, the map and the thermal view. */
export function islesFaunaViewV1(state: IslesFaunaStateV1): IslesFaunaViewV1[] {
  return state.animals.map(a => ({id: a.id, species: a.species, label: a.label, model: a.species, x: a.x, y: a.y, z: a.z, yaw: a.yaw,
    state: a.state, airborne: a.airborne, dead: a.dead, health01: a.maxHealth > 0 ? Math.max(0, Math.min(1, a.health / a.maxHealth)) : 0}));
}
