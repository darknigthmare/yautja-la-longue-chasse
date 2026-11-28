/** The Isles V1 · free hunt on Verdant (MODE_THE_ISLES §11 and §12, production step 4).
 * Explore, hunt by the code, take trophies and bring them back to the lair; witnesses and
 * armed humans raise the alert marks 1 to 3. Rules are in app/game/data/islesFreeHuntV1.json.
 * The state advances in place, deterministically from its seed and the player's input. */
import {heightAtV1, isWalkableV1, kindAtV1, tileAtV1, tileCenterV1, type IslesMapV1} from "./islesMapV1";
import {createIslesActorV1, stepIslesActorV1, type IslesActorV1, type IslesCloakTuningV1, type IslesMoveInputV1, type IslesMovementTuningV1} from "./islesMovementV1";
import {findPathWindowV1, nearestWalkableV1} from "./islesPathV1";
import {islesReputationV1, type IslesProfileV1, type IslesTrophyV1} from "./islesSaveV1";
import type {IslesWorldSiteV1} from "./islesWorldGenV1";

interface HumanRules { label: string; model: string; armed: boolean; specialist?: boolean; health: number; damage?: number; range?: number; fireSeconds?: number; accuracy?: number; speed: number; thermal?: boolean; color: string }
interface AnimalRules { label: string; model: string; health: number; damage: number; speed: number; temper: "charge-when-hurt" | "hunter" | "ambush" | "tracker"; aggroRange: number }
interface ContractTemplate { id: string; target: string; condition: "blade" | "night" | "dawnDusk" | "unseen" | "any"; reward: number; text: string; count?: number }

/** Shape of islesFreeHuntV1.json. */
export interface FreeHuntRulesV1 {
  clock: {realSecondsPerHour: number; startHour: number; nightFrom: number; nightTo: number; dawn: [number, number]; dusk: [number, number]; moonlessEvery: number};
  reputation: number[];
  honor: {armedHuman: number; specialist: number; deliveredBonus: number; animals: Record<string, number>; bladeFactor: number; unseenFactor: number; fault: number};
  player: {health: number; regenPerSecond: number; regenDelay: number; strikeDamage: number; strikeRange: number; strikeArcDot: number; strikeSeconds: number;
    plasmaDamage: number; plasmaRange: number; plasmaConeDot: number; plasmaHeat: number; plasmaCoolPerSecond: number; plasmaOverheat: number; plasmaSeconds: number;
    interactRange: number; respawnSeconds: number};
  trophy: {seconds: number; range: number; dropSeconds: number};
  population: {cellTiles: number; activeRadius: number; despawnRadius: number; maxActive: number; minSpawnDistance: number; slotHours: number};
  humans: Record<string, HumanRules>;
  animals: Record<string, AnimalRules>;
  perception: {dayRange: number; nightRange: number; cloakedStill: number; cloakedMoving: number; revealed: number; coneDot: number; eyeHeight: number;
    bushCover: number; reportSeconds: number; hearPlasma: number; thermalCloaked: number; dogScent: number};
  alert: {searchRadius: number[]; decaySeconds: number; stillCloakedFactor: number; max: number; responders: Record<string, Record<string, number>>;
    helicopter: {orbit: number; speed: number; spotRadius: number}};
  spawns: Record<string, {radius?: number; always?: Record<string, number>; day?: Record<string, number>; night?: Record<string, number>;
    chance?: Record<string, number>; dawnDusk?: Record<string, number>; otherwise?: Record<string, number>}>;
  contracts: {perDay: number; templates: ContractTemplate[]};
  bounty: {id: string; name: string; type: string; health: number; damage: number; escorts: number; reward: number; color: string; radio: string[]};
  legendary: {id: string; name: string; species: string; health: number; damage: number; scale: number; reward: number; radius: number};
  trial: {id: string; ringRadius: number; minHeight: number; failBelow: number; medals: {name: string; seconds: number; honor: number}[]};
  fragments: {id: string; text: string}[];
  mission: {id: string; title: string; minReputation: number; reward: number; carcassBonus: number; brief: string; traces: string[]; radio: string;
    radioSeconds: number; radioRange: number; chief: {name: string; health: number; damage: number; color: string}; codex: string};
}

export type FreeNpcStateV1 = "idle" | "patrol" | "investigate" | "combat" | "flee" | "dead";

export interface FreeNpcV1 {
  id: string;
  type: string;
  role: "human" | "animal" | "helicopter";
  armed: boolean;
  specialist: boolean;
  unique?: "bounty" | "escort" | "legendary" | "chief" | "responder";
  name?: string;
  x: number; z: number; facing: number;
  health: number; maxHealth: number;
  state: FreeNpcStateV1;
  homeX: number; homeZ: number;
  goalX: number; goalZ: number;
  path: [number, number][];
  pathKey: string;
  timer: number;
  fireTimer: number;
  seeing: number;
  lastSawAt: number;
  lastSeen: {x: number; z: number} | null;
  reported: number;
  hurt: boolean;
  moving: boolean;
  running: boolean;
  cell: string | null;
  spawnKey: string | null;
  deadAt: number;
  killedBy: "blade" | "plasma" | "other" | null;
  honorValue: number;
  trophyTaken: boolean;
  scale?: number;
  waypoint?: number;
}

export interface FreeHuntInputV1 extends IslesMoveInputV1 { strike: boolean; plasma: boolean; trophyHeld: boolean; interact: boolean }

export interface FreeHuntStateV1 {
  seed: number;
  rng: number;
  time: number;
  worldStart: number;
  profile: IslesProfileV1;
  dirty: boolean;
  player: {actor: IslesActorV1; health: number; heat: number; overheated: boolean; strikeTimer: number; plasmaTimer: number; lastHurt: number;
    trophy: {npcId: string; progress: number} | null; dead: boolean; respawnAt: number; lair: string | null};
  npcs: FreeNpcV1[];
  nextId: number;
  spawnedCells: Set<string>;
  killedSpawns: Set<string>;
  alert: {level: number; x: number; z: number; quiet: number; lastReport: number};
  carried: IslesTrophyV1[];
  drops: {x: number; z: number; trophies: IslesTrophyV1[]; until: number}[];
  trial: {index: number; start: number} | null;
  mission: {stage: "none" | "camp" | "traces" | "radio" | "chief" | "contract"; traces: boolean[]; radio: number; chiefBlade: boolean; carcasses: boolean[]};
  contractsToday: ContractTemplate[];
  log: {at: number; text: string}[];
  prompt: string;
  popTimer: number;
}

export interface FreeHuntWorldV1 { map: IslesMapV1; sites: IslesWorldSiteV1[] }
export interface FreeHuntTuningV1 { movement: IslesMovementTuningV1; cloak: IslesCloakTuningV1 }

const dist = (a: {x: number; z: number}, b: {x: number; z: number}) => Math.hypot(a.x - b.x, a.z - b.z);
function random(state: {rng: number}): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
const say = (state: FreeHuntStateV1, text: string) => { state.log.push({at: state.time, text}); if (state.log.length > 80) state.log.shift(); };
const point = (map: IslesMapV1, name: string, index = 0) => {
  const p = map.markers[name]?.[index];
  if (!p) throw new Error("Repère absent : " + name);
  return tileCenterV1(map, p[0], p[1]);
};
const siteOf = (world: FreeHuntWorldV1, id: string) => world.sites.find(site => site.id === id)!;

/** Game clock: 1 real minute = 1 hour, a day lasts 24 minutes (section 4.2). */
export function freeHuntClockV1(state: FreeHuntStateV1, rules: FreeHuntRulesV1) {
  const total = rules.clock.startHour * rules.clock.realSecondsPerHour + state.worldStart + state.time;
  const dayLength = 24 * rules.clock.realSecondsPerHour;
  const day = Math.floor(total / dayLength);
  const hour = (total % dayLength) / rules.clock.realSecondsPerHour;
  const night = hour >= rules.clock.nightFrom || hour < rules.clock.nightTo;
  const dawnDusk = (hour >= rules.clock.dawn[0] && hour < rules.clock.dawn[1]) || (hour >= rules.clock.dusk[0] && hour < rules.clock.dusk[1]);
  const moonless = night && day % rules.clock.moonlessEvery === rules.clock.moonlessEvery - 1;
  return {day, hour, night, dawnDusk, moonless};
}

export function freeHuntReputationV1(state: FreeHuntStateV1, rules: FreeHuntRulesV1): number {
  return islesReputationV1(state.profile, rules.reputation);
}

/** Height in metres above an animal within which its bite still reaches the hunter. */
const MELEE_REACH_UP = 2.5;
/** Longest stretch in metres a patrol plans at once (the windowed path search covers about 320 m). */
const PATROL_STRIDE = 100;

function contractsForDay(seed: number, day: number, rules: FreeHuntRulesV1): ContractTemplate[] {
  const order = rules.contracts.templates.map(t => ({t, k: hashString(seed + ":" + day + ":" + t.id)})).sort((a, b) => a.k - b.k);
  return order.slice(0, rules.contracts.perDay).map(item => item.t);
}

/** Starts a session at the altar with the saved profile (which the session mutates; `dirty` asks the UI to save). */
export function createFreeHuntV1(world: FreeHuntWorldV1, rules: FreeHuntRulesV1, tuning: FreeHuntTuningV1, profile: IslesProfileV1, seed: number): FreeHuntStateV1 {
  const spawn = point(world.map, "spawn");
  const state: FreeHuntStateV1 = {
    seed, rng: seed >>> 0, time: 0, worldStart: profile.worldSeconds, profile, dirty: false,
    player: {actor: createIslesActorV1(world.map, spawn.x, spawn.z, tuning.cloak), health: rules.player.health, heat: 0, overheated: false,
      strikeTimer: 0, plasmaTimer: 0, lastHurt: -999, trophy: null, dead: false, respawnAt: 0, lair: profile.lairs.includes("verdant-chutes") ? "verdant-chutes" : null},
    npcs: [], nextId: 1, spawnedCells: new Set(), killedSpawns: new Set(),
    alert: {level: 0, x: spawn.x, z: spawn.z, quiet: 0, lastReport: -999},
    carried: [], drops: [], trial: null,
    mission: {stage: "none", traces: rules.mission.traces.map(() => false), radio: 0, chiefBlade: false, carcasses: (world.map.markers.carcassCircle ?? []).map(() => false)},
    contractsToday: [], log: [], prompt: "", popTimer: 0,
  };
  const {day} = freeHuntClockV1(state, rules);
  state.contractsToday = contractsForDay(seed, day, rules);
  // A resumed profile keeps the contracts it accepted today, whatever the seed of the new session draws.
  if (profile.contracts.day === day && profile.contracts.accepted.length) {
    const kept = profile.contracts.accepted.map(id => rules.contracts.templates.find(t => t.id === id)).filter((t): t is ContractTemplate => !!t);
    if (kept.length) state.contractsToday = kept;
  }
  say(state, "Le vaisseau se pose à l’autel de Verdant. Sœur-de-Pierre attend sur la pyramide.");
  spawnUniques(state, world, rules);
  return state;
}

function makeNpc(state: FreeHuntStateV1, rules: FreeHuntRulesV1, type: string, x: number, z: number, extra: Partial<FreeNpcV1> = {}): FreeNpcV1 {
  const human = rules.humans[type], animal = rules.animals[type];
  const health = extra.health ?? human?.health ?? animal?.health ?? 100;
  const npc: FreeNpcV1 = {
    id: "n" + state.nextId++, type, role: type === "helicoptere" ? "helicopter" : human ? "human" : "animal",
    armed: Boolean(human?.armed), specialist: Boolean(human?.specialist), x, z, facing: random(state) * 6.28,
    health, maxHealth: health, state: "patrol", homeX: x, homeZ: z, goalX: x, goalZ: z, path: [], pathKey: "", timer: 0, fireTimer: 0,
    seeing: 0, lastSawAt: -999, lastSeen: null, reported: -999, hurt: false, moving: false, running: false, cell: null, spawnKey: null,
    deadAt: -1, killedBy: null, honorValue: 0, trophyTaken: false, ...extra,
  };
  state.npcs.push(npc);
  return npc;
}

/** Named and unique characters: the bounty and his escorts while unclaimed. */
function spawnUniques(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1) {
  if (!state.profile.bountiesClaimed.includes(rules.bounty.id)) {
    const start = point(world.map, "bounty", 0);
    makeNpc(state, rules, rules.bounty.type, start.x, start.z, {unique: "bounty", name: rules.bounty.name, health: rules.bounty.health, waypoint: 0});
    for (let i = 0; i < rules.bounty.escorts; i++) makeNpc(state, rules, rules.bounty.type, start.x + 2 + i * 2, start.z + 2, {unique: "escort", waypoint: 0});
  }
}

/** Free spot on foot near a point, at least `away` metres from the player. */
function spotNear(state: FreeHuntStateV1, map: IslesMapV1, x: number, z: number, radius: number, away: number): {x: number; z: number} | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const a = random(state) * Math.PI * 2, r = Math.sqrt(random(state)) * radius;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const [tx, tz] = tileAtV1(map, px, pz);
    if (!isWalkableV1(map, tx, tz)) continue;
    const at = tileCenterV1(map, tx, tz);
    if (dist(at, state.player.actor) >= away) return at;
  }
  return null;
}

/** Population by cells of 64 tiles around the player, renewed every 6 game hours (§15.3 of the level design). */
function populate(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1) {
  const {map} = world, pop = rules.population, a = state.player.actor, clock = freeHuntClockV1(state, rules);
  const cellMeters = pop.cellTiles * map.tileMeters;
  const slot = clock.day * 24 / pop.slotHours + Math.floor(clock.hour / pop.slotHours);
  // Despawn the far ones (spawned population only).
  state.npcs = state.npcs.filter(npc => !(npc.cell && dist(npc, a) > pop.despawnRadius));
  const active = () => state.npcs.filter(npc => npc.cell && npc.state !== "dead").length;
  const reach = Math.ceil(pop.activeRadius / cellMeters);
  const ccx = Math.floor(a.x / cellMeters), ccz = Math.floor(a.z / cellMeters);
  for (let cz = ccz - reach; cz <= ccz + reach; cz++) for (let cx = ccx - reach; cx <= ccx + reach; cx++) {
    if (cx < 0 || cz < 0 || cx * pop.cellTiles >= map.width || cz * pop.cellTiles >= map.depth) continue;
    const center = {x: (cx + 0.5) * cellMeters, z: (cz + 0.5) * cellMeters};
    if (dist(center, a) > pop.activeRadius + cellMeters / 2) continue;
    const key = cx + ":" + cz + ":" + slot;
    if (state.spawnedCells.has(key)) continue;
    state.spawnedCells.add(key);
    const saved = state.rng;
    state.rng = hashString(state.seed + ":" + key);
    const wants: [string, number, {x: number; z: number}, number][] = [];
    const site = world.sites.find(s => rules.spawns[s.id] && dist(s, center) < cellMeters * 0.75);
    if (site) {
      const table = rules.spawns[site.id];
      const pick = {...(table.always ?? {}), ...(clock.night ? table.night ?? {} : table.day ?? {})};
      for (const [type, n] of Object.entries(pick)) wants.push([type, n, site, (table.radius ?? 40) / 2]);
    } else {
      let water = 0, land = 0;
      for (let i = 0; i < 40; i++) {
        const [tx, tz] = tileAtV1(map, center.x + (random(state) - 0.5) * cellMeters, center.z + (random(state) - 0.5) * cellMeters);
        const kind = kindAtV1(map, tx, tz);
        if (kind === "water" || kind === "ford") water++; else land++;
      }
      if (land < 8) { state.rng = saved; continue; }
      const table = water >= 3 && water <= 30 ? rules.spawns.river : rules.spawns.jungle;
      const chances = {...(table.chance ?? {}), ...(clock.dawnDusk ? table.dawnDusk ?? {} : table.otherwise ?? {})};
      if (table === rules.spawns.river) Object.assign(chances, rules.spawns.jungle.chance ?? {});
      for (const [type, chance] of Object.entries(chances)) if (random(state) < chance) wants.push([type, type === "braconnier" ? 2 : 1, center, cellMeters / 2]);
    }
    wants.forEach(([type, n, around, radius], w) => {
      for (let i = 0; i < n && active() < pop.maxActive; i++) {
        const spawnKey = key + ":" + w + ":" + i;
        if (state.killedSpawns.has(spawnKey)) continue;
        let spot = spotNear(state, map, around.x, around.z, radius, pop.minSpawnDistance);
        if (type === "crocodile" && spot) {
          // Crocodiles keep to the banks.
          const [tx, tz] = tileAtV1(map, spot.x, spot.z);
          let bank: [number, number] | null = null;
          for (let r = 1; r < 12 && !bank; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (kindAtV1(map, tx + dx, tz + dz) === "water") { bank = [tx + Math.sign(dx) * (r - 1), tz + Math.sign(dz) * (r - 1)]; break; }
          spot = bank && isWalkableV1(map, bank[0], bank[1]) ? tileCenterV1(map, bank[0], bank[1]) : null;
        }
        if (spot) makeNpc(state, rules, type, spot.x, spot.z, {cell: key, spawnKey});
      }
    });
    state.rng = saved;
  }
  // The legendary jaguar: a moonless night, alert 0, near its territory.
  const lair = point(map, "legendary");
  const legend = state.npcs.find(npc => npc.unique === "legendary");
  if (!legend && clock.moonless && state.alert.level === 0 && !state.profile.legendariesTaken.includes(rules.legendary.id) && dist(lair, a) < pop.activeRadius) {
    const spot = spotNear(state, map, lair.x, lair.z, rules.legendary.radius, pop.minSpawnDistance);
    if (spot) {
      makeNpc(state, rules, rules.legendary.species, spot.x, spot.z, {unique: "legendary", name: rules.legendary.name, health: rules.legendary.health, scale: rules.legendary.scale, homeX: lair.x, homeZ: lair.z});
      say(state, "Une nuit sans lune : le " + rules.legendary.name + " rôde au sud-ouest du fleuve.");
    }
  } else if (legend && legend.state !== "dead" && !clock.night) {
    state.npcs = state.npcs.filter(npc => npc !== legend);
  }
}

/** Perception of the hunter by one human. */
function canSee(state: FreeHuntStateV1, map: IslesMapV1, rules: FreeHuntRulesV1, npc: FreeNpcV1, night: boolean): boolean {
  const a = state.player.actor, p = rules.perception;
  if (state.player.dead) return false;
  const d = dist(npc, a);
  const moving = Math.hypot(a.vx, a.vz) > 0.6;
  let range = a.revealSeconds > 0 || a.swimming || a.wading ? p.revealed : a.cloaked ? (moving ? p.cloakedMoving : p.cloakedStill) : night ? p.nightRange : p.dayRange;
  if (a.cloaked && rules.humans[npc.type]?.thermal) range = Math.max(range, p.thermalCloaked);
  if (d > range) return false;
  const ahead = (Math.sin(npc.facing) * (a.x - npc.x) + Math.cos(npc.facing) * (a.z - npc.z)) / (d || 1);
  if (d > 3 && ahead < p.coneDot) return false;
  return lineOfSightFreeV1(map, {x: npc.x, y: p.eyeHeight, z: npc.z}, {x: a.x, y: a.y + 1.2, z: a.z}, p.bushCover);
}

/** Line of sight on the tile columns; bushes hide what is below their cover. */
export function lineOfSightFreeV1(map: IslesMapV1, from: {x: number; y: number; z: number}, to: {x: number; y: number; z: number}, bushCover: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.5));
  for (let i = 1; i < steps; i++) {
    const k = i / steps, x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k, z = from.z + (to.z - from.z) * k;
    const [tx, tz] = tileAtV1(map, x, z);
    const top = kindAtV1(map, tx, tz) === "bush" ? bushCover : heightAtV1(map, tx, tz);
    if (y < top) return false;
  }
  return true;
}

function raiseAlert(state: FreeHuntStateV1, rules: FreeHuntRulesV1, world: FreeHuntWorldV1, x: number, z: number, reason: string, force = false) {
  if (!force && state.time - state.alert.lastReport < 8) { state.alert.x = x; state.alert.z = z; state.alert.quiet = 0; return; }
  const before = state.alert.level;
  state.alert = {level: Math.min(rules.alert.max, before + 1), x, z, quiet: 0, lastReport: state.time};
  if (state.alert.level > before) {
    say(state, "Alerte " + state.alert.level + " : " + reason + ".");
    for (const [type, n] of Object.entries(rules.alert.responders[String(state.alert.level)] ?? {})) {
      for (let i = 0; i < n; i++) {
        if (type === "helicoptere") { makeNpc(state, rules, type, x + 60, z, {unique: "responder", health: 9999}); continue; }
        const spot = spotNear(state, world.map, x, z, 70, 45);
        if (spot) makeNpc(state, rules, type, spot.x, spot.z, {unique: "responder", homeX: x, homeZ: z, state: "investigate", goalX: x, goalZ: z});
      }
    }
  }
}

function lowerAlert(state: FreeHuntStateV1, toZero: boolean) {
  state.alert.level = toZero ? 0 : Math.max(0, state.alert.level - 1);
  state.alert.quiet = 0;
  if (state.alert.level === 0) state.npcs = state.npcs.filter(npc => npc.unique !== "responder" || npc.state === "dead");
  else if (state.alert.level < 2) state.npcs = state.npcs.filter(npc => npc.type !== "helicoptere");
  if (state.alert.level < 3) state.npcs = state.npcs.filter(npc => !(npc.unique === "responder" && (npc.type === "unite-tactique" || npc.type === "chien") && npc.state !== "dead"));
}

/** Somebody saw the hunter in the last two seconds. */
const watched = (state: FreeHuntStateV1) => state.npcs.some(npc => npc.role === "human" && npc.state !== "dead" && state.time - npc.lastSawAt < 2);

function onKill(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1, npc: FreeNpcV1, weapon: "blade" | "plasma" | "other") {
  npc.state = "dead"; npc.deadAt = state.time; npc.killedBy = weapon; npc.health = 0; npc.moving = false;
  if (npc.spawnKey) state.killedSpawns.add(npc.spawnKey);
  const clock = freeHuntClockV1(state, rules), seen = watched(state);
  const profile = state.profile;
  if (npc.role === "human" && !npc.armed) {
    profile.honor = Math.max(0, profile.honor + rules.honor.fault);
    profile.reputationPenalty = Math.min(9, profile.reputationPenalty + 1);
    profile.faults++;
    state.dirty = true;
    say(state, "Faute grave : un " + (rules.humans[npc.type]?.label ?? "non-combattant") + " désarmé. Honneur " + rules.honor.fault + ", réputation − 1.");
    raiseAlert(state, rules, world, npc.x, npc.z, "non-combattant tué", true);
    return;
  }
  let honor = npc.role === "human" ? (npc.specialist ? rules.honor.specialist : rules.honor.armedHuman) : rules.honor.animals[npc.type] ?? 0;
  if (weapon === "blade") honor *= rules.honor.bladeFactor;
  if (!seen) honor *= rules.honor.unseenFactor;
  npc.honorValue = Math.round(honor);
  profile.honor += npc.honorValue;
  state.dirty = true;
  const label = npc.name ?? rules.humans[npc.type]?.label ?? rules.animals[npc.type]?.label ?? npc.type;
  say(state, label + " abattu" + (npc.honorValue ? " · honneur + " + npc.honorValue : "") + ".");
  // Contracts of the altar.
  for (const contract of state.contractsToday) {
    if (!profile.contracts.accepted.includes(contract.id) || profile.contracts.done.includes(contract.id) || contract.target !== npc.type) continue;
    if (npc.unique === "legendary" && contract.target !== "jaguar") continue;
    const ok = contract.condition === "any" || (contract.condition === "blade" && weapon === "blade") || (contract.condition === "night" && clock.night) ||
      (contract.condition === "dawnDusk" && clock.dawnDusk) || (contract.condition === "unseen" && !seen);
    if (!ok) continue;
    const progress = (profile.contracts.progress[contract.id] ?? 0) + 1;
    profile.contracts.progress[contract.id] = progress;
    if (progress >= (contract.count ?? 1)) {
      profile.contracts.done.push(contract.id); profile.honor += contract.reward;
      say(state, "Contrat de l’autel rempli : " + contract.text + " Honneur + " + contract.reward + ".");
    }
  }
  if (npc.unique === "bounty") {
    profile.bountiesClaimed.push(rules.bounty.id); profile.honor += rules.bounty.reward;
    say(state, "Prime : " + rules.bounty.name + " est tombé. Honneur + " + rules.bounty.reward + ".");
  }
  if (npc.unique === "legendary") {
    profile.legendariesTaken.push(rules.legendary.id); profile.honor += rules.legendary.reward;
    say(state, "Légendaire : le " + rules.legendary.name + " est abattu. Honneur + " + rules.legendary.reward + ".");
  }
  if (npc.unique === "chief" && state.mission.stage === "chief") {
    state.mission.stage = "contract"; state.mission.chiefBlade = weapon === "blade";
    say(state, "Le chef du camp est mort. Fouillez son corps.");
  }
  // Witnesses of the kill.
  for (const other of state.npcs) {
    if (other === npc || other.role !== "human" || other.state === "dead" || dist(other, npc) > 22) continue;
    if (!lineOfSightFreeV1(world.map, {x: other.x, y: 1.6, z: other.z}, {x: npc.x, y: 1, z: npc.z}, rules.perception.bushCover)) continue;
    if (other.armed) { other.state = "investigate"; other.goalX = npc.x; other.goalZ = npc.z; other.pathKey = ""; }
    else if (other.state !== "flee") { other.state = "flee"; other.pathKey = ""; say(state, "Un témoin s’enfuit vers le village."); }
  }
}

function hurtNpc(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1, npc: FreeNpcV1, amount: number, weapon: "blade" | "plasma") {
  if (npc.state === "dead" || npc.role === "helicopter") return;
  npc.health -= amount; npc.hurt = true;
  npc.lastSeen = {x: state.player.actor.x, z: state.player.actor.z};
  if (npc.health <= 0) onKill(state, world, rules, npc, weapon);
  else if (npc.role === "human" && npc.armed) { npc.state = "combat"; npc.lastSawAt = state.time; }
  else if (npc.role === "human") { npc.state = "flee"; npc.pathKey = ""; }
}

function hurtPlayer(state: FreeHuntStateV1, amount: number, source: string) {
  const p = state.player;
  if (p.dead) return;
  p.health -= amount; p.lastHurt = state.time;
  if (p.health <= 0) {
    p.health = 0; p.dead = true; p.trophy = null;
    p.respawnAt = state.time;
    if (state.carried.length) {
      state.drops.push({x: p.actor.x, z: p.actor.z, trophies: state.carried, until: state.time});
      state.carried = [];
    }
    say(state, "Le chasseur tombe (" + source + "). Les trophées portés restent sur place.");
  }
}

function targetAhead(state: FreeHuntStateV1, range: number, coneDot: number, accept: (npc: FreeNpcV1) => boolean): FreeNpcV1 | null {
  const a = state.player.actor;
  let best: FreeNpcV1 | null = null, bestD = Infinity;
  for (const npc of state.npcs) {
    if (npc.state === "dead" || npc.role === "helicopter" || !accept(npc)) continue;
    const d = dist(npc, a);
    if (d > range) continue;
    const ahead = d < 0.6 ? 1 : (Math.sin(a.facing) * (npc.x - a.x) + Math.cos(a.facing) * (npc.z - a.z)) / d;
    if (ahead >= coneDot && d < bestD) { best = npc; bestD = d; }
  }
  return best;
}

function plan(map: IslesMapV1, npc: FreeNpcV1, goal: {x: number; z: number}, key: string) {
  if (npc.pathKey === key) return;
  npc.pathKey = key;
  const from = nearestWalkableV1(map, ...tileAtV1(map, npc.x, npc.z), 3), to = nearestWalkableV1(map, ...tileAtV1(map, goal.x, goal.z), 4);
  npc.path = from && to ? findPathWindowV1(map, from, to, 16, 160) ?? [] : [];
}

function walk(map: IslesMapV1, npc: FreeNpcV1, speed: number, dt: number, goal: {x: number; z: number}) {
  let budget = speed * dt;
  npc.moving = false;
  while (budget > 1e-6 && npc.path.length) {
    const next = tileCenterV1(map, npc.path[0][0], npc.path[0][1]);
    const d = dist(npc, next);
    if (d < 0.05) { npc.path.shift(); continue; }
    const k = Math.min(1, budget / d);
    npc.facing = Math.atan2(next.x - npc.x, next.z - npc.z);
    npc.x += (next.x - npc.x) * k; npc.z += (next.z - npc.z) * k; npc.moving = true;
    budget -= d * k;
    if (k >= 1) npc.path.shift();
  }
  if (!npc.path.length && budget > 1e-6) {
    const d = dist(npc, goal);
    if (d > 0.4 && d < 6) {
      const k = Math.min(1, budget / d), nx = npc.x + (goal.x - npc.x) * k, nz = npc.z + (goal.z - npc.z) * k;
      if (isWalkableV1(map, ...tileAtV1(map, nx, nz))) { npc.facing = Math.atan2(goal.x - npc.x, goal.z - npc.z); npc.x = nx; npc.z = nz; npc.moving = true; }
    }
  }
}

function stepNpcs(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1, dt: number) {
  const {map} = world, a = state.player.actor, clock = freeHuntClockV1(state, rules);
  const leader = state.npcs.find(npc => npc.unique === "bounty" && npc.state !== "dead");
  for (const npc of state.npcs) {
    if (npc.state === "dead") continue;
    npc.fireTimer = Math.max(0, npc.fireTimer - dt);
    npc.timer -= dt;
    npc.running = false;
    if (npc.role === "helicopter") {
      const h = rules.alert.helicopter, angle = state.time * h.speed / h.orbit;
      npc.x = state.alert.x + Math.cos(angle) * h.orbit; npc.z = state.alert.z + Math.sin(angle) * h.orbit; npc.facing = angle + Math.PI / 2; npc.moving = true;
      if (!state.player.dead && !a.cloaked && dist(npc, a) < h.spotRadius) { npc.lastSawAt = state.time; npc.seeing += dt; }
      else npc.seeing = 0;
      if (npc.seeing > rules.perception.reportSeconds && state.time - npc.reported > 8) { npc.reported = state.time; raiseAlert(state, rules, world, a.x, a.z, "le projecteur de l’hélicoptère"); }
      continue;
    }
    if (npc.role === "human") {
      const human = rules.humans[npc.type];
      const sees = canSee(state, map, rules, npc, clock.night);
      if (sees) { npc.seeing += dt; npc.lastSawAt = state.time; npc.lastSeen = {x: a.x, z: a.z}; } else npc.seeing = Math.max(0, npc.seeing - dt);
      if (!npc.armed) {
        if (sees && !a.cloaked && dist(npc, a) < 15 && npc.state !== "flee") { npc.state = "flee"; npc.pathKey = ""; say(state, "Un " + human.label + " vous a vu et s’enfuit."); }
        if (npc.state === "flee") {
          const refuge = point(map, "witnessRefuge");
          plan(map, npc, refuge, "refuge"); npc.running = true; walk(map, npc, human.speed * 1.3, dt, refuge);
          if (dist(npc, refuge) < 12 && state.time - npc.reported > 60) { npc.reported = state.time; raiseAlert(state, rules, world, a.x, a.z, "un témoin a prévenu le village", true); npc.state = "idle"; }
          continue;
        }
      } else {
        if (sees) {
          npc.state = "combat";
          if (npc.seeing > rules.perception.reportSeconds && state.time - npc.reported > 10) { npc.reported = state.time; raiseAlert(state, rules, world, a.x, a.z, "un " + human.label + " a donné l’alerte"); }
        } else if (npc.state === "combat") { npc.state = "investigate"; npc.goalX = npc.lastSeen?.x ?? npc.x; npc.goalZ = npc.lastSeen?.z ?? npc.z; npc.timer = 12; npc.pathKey = ""; }
        if (npc.state === "combat" && !state.player.dead) {
          const d = dist(npc, a);
          npc.facing = Math.atan2(a.x - npc.x, a.z - npc.z);
          const range = human.range ?? 20, damage = (npc.unique === "bounty" ? rules.bounty.damage : npc.unique === "chief" ? rules.mission.chief.damage : human.damage) ?? 10;
          if (d <= range && npc.fireTimer <= 0 && sees) {
            npc.fireTimer = human.fireSeconds ?? 1.2;
            const chance = (human.accuracy ?? 0.4) * (a.cloaked ? 0.35 : 1) * (1 - 0.5 * d / range);
            if (random(state) < chance) hurtPlayer(state, damage, (npc.name ?? human.label) + " tire");
          } else if (d > range * 0.8) { plan(map, npc, a, "chase:" + Math.round(a.x / 6) + ":" + Math.round(a.z / 6)); npc.running = true; walk(map, npc, human.speed * 1.2, dt, a); }
          else npc.moving = false;
          continue;
        }
      }
      // Patrol, investigation, the bounty's round and the responders' search.
      let goal = {x: npc.goalX, z: npc.goalZ}, key = "goal:" + Math.round(npc.goalX) + ":" + Math.round(npc.goalZ);
      if (npc.unique === "bounty" && npc.state !== "investigate") {
        const route = map.markers.bounty;
        // The waypoint advances first, so that the cached path and its destination always agree.
        const reached = tileCenterV1(map, route[npc.waypoint ?? 0][0], route[npc.waypoint ?? 0][1]);
        if (dist(npc, reached) < 4) npc.waypoint = ((npc.waypoint ?? 0) + 1) % route.length;
        // A leg of the round is longer than the path window: the bounty walks it in strides of about 100 m.
        const next = tileCenterV1(map, route[npc.waypoint ?? 0][0], route[npc.waypoint ?? 0][1]), far = dist(npc, next);
        goal = far > PATROL_STRIDE ? {x: npc.x + (next.x - npc.x) * PATROL_STRIDE / far, z: npc.z + (next.z - npc.z) * PATROL_STRIDE / far} : next;
        key = "bounty:" + npc.waypoint + ":" + Math.round(npc.x / (PATROL_STRIDE / 2)) + ":" + Math.round(npc.z / (PATROL_STRIDE / 2));
        if (dist(npc, a) < 40 && npc.timer <= 0) { npc.timer = 30; say(state, "Radio · " + rules.bounty.name + " : " + rules.bounty.radio[Math.floor(random(state) * rules.bounty.radio.length)]); }
      } else if (npc.unique === "escort" && leader) {
        goal = {x: leader.x + (npc.id.charCodeAt(npc.id.length - 1) % 2 ? 2.5 : -2.5), z: leader.z - 2}; key = "escort:" + Math.round(goal.x / 4) + ":" + Math.round(goal.z / 4);
      } else if (npc.state === "investigate") {
        if (npc.timer <= 0 || dist(npc, goal) < 2) { npc.state = "patrol"; npc.timer = 0; }
      } else if (npc.timer <= 0 || dist(npc, goal) < 1.5) {
        const center = npc.unique === "responder" ? {x: state.alert.x, z: state.alert.z} : {x: npc.homeX, z: npc.homeZ};
        const spot = spotNear(state, map, center.x, center.z, npc.unique === "responder" ? rules.alert.searchRadius[state.alert.level] / 2 : 22, 0);
        if (spot) { npc.goalX = spot.x; npc.goalZ = spot.z; goal = spot; key = "goal:" + Math.round(spot.x) + ":" + Math.round(spot.z); }
        npc.timer = 6 + random(state) * 8;
      }
      plan(map, npc, goal, key);
      walk(map, npc, human.speed * (npc.state === "investigate" ? 1.1 : 0.7), dt, goal);
      continue;
    }
    // Animals.
    const animal = rules.animals[npc.type];
    const d = dist(npc, a);
    const legendary = npc.unique === "legendary";
    const aggro = state.player.dead ? 0 : a.cloaked ? Math.min(animal.aggroRange, rules.perception.cloakedMoving) : animal.aggroRange;
    const hostile = animal.temper === "hunter" || animal.temper === "ambush" || animal.temper === "tracker" ? d < aggro : npc.hurt && d < 12;
    if (animal.temper === "tracker" && d < rules.perception.dogScent && !state.player.dead) {
      // Dogs follow the scent and give the hunter's position to their handlers.
      for (const other of state.npcs) if (other.unique === "responder" && other.role === "human") { other.state = "investigate"; other.goalX = a.x; other.goalZ = a.z; other.timer = 10; other.pathKey = ""; }
    }
    if (hostile) {
      npc.state = "combat"; npc.running = true;
      npc.facing = Math.atan2(a.x - npc.x, a.z - npc.z);
      // A bite needs reach: a hunter on a roof, a cliff or the canopy is out of it.
      const below = a.y - heightAtV1(map, ...tileAtV1(map, npc.x, npc.z));
      if (d < 1.6 && below > MELEE_REACH_UP) npc.moving = false;
      else if (d < 1.6) {
        npc.moving = false;
        if (npc.fireTimer <= 0) { npc.fireTimer = 1.2; hurtPlayer(state, legendary ? rules.legendary.damage : animal.damage, npc.name ?? animal.label); }
      } else {
        plan(map, npc, a, "hunt:" + Math.round(a.x / 4) + ":" + Math.round(a.z / 4));
        walk(map, npc, animal.speed, dt, a);
      }
      continue;
    }
    if (npc.hurt && animal.temper === "charge-when-hurt") {
      npc.state = "flee"; npc.running = true;
      const away = {x: npc.x + (npc.x - a.x), z: npc.z + (npc.z - a.z)};
      plan(map, npc, away, "flee:" + Math.round(away.x / 8) + ":" + Math.round(away.z / 8)); walk(map, npc, animal.speed, dt, away);
      continue;
    }
    npc.state = "patrol";
    if (animal.temper === "ambush") { npc.moving = false; continue; }
    if (npc.timer <= 0 || dist(npc, {x: npc.goalX, z: npc.goalZ}) < 1.5) {
      const spot = spotNear(state, map, npc.homeX, npc.homeZ, legendary ? rules.legendary.radius : 18, 0);
      if (spot) { npc.goalX = spot.x; npc.goalZ = spot.z; }
      npc.timer = 5 + random(state) * 10;
    }
    const goal = {x: npc.goalX, z: npc.goalZ};
    plan(map, npc, goal, "goal:" + Math.round(goal.x) + ":" + Math.round(goal.z));
    walk(map, npc, animal.speed * 0.4, dt, goal);
  }
}

/** Nearest thing the interact key acts on, with its label for the HUD. */
function interactable(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1): {kind: string; label: string; index?: number; npc?: FreeNpcV1} | null {
  const {map} = world, a = state.player.actor, r = rules.player.interactRange;
  const near = (p: {x: number; z: number}, range = r) => dist(p, a) < range;
  const altar = point(map, "altarFront");
  if (near(altar, 8)) {
    const missionOpen = state.mission.stage === "none" && !state.profile.missions[rules.mission.id] && freeHuntReputationV1(state, rules) >= rules.mission.minReputation;
    if (missionOpen) return {kind: "mission", label: "Écouter Sœur-de-Pierre : mission « " + rules.mission.title + " »"};
    if (state.profile.contracts.accepted.length === 0) return {kind: "contracts", label: "Lire les contrats gravés sur l’autel"};
  }
  for (let i = 0; i < rules.fragments.length; i++) {
    const p = map.markers.fragments?.[i];
    if (p && !state.profile.fragments.includes(rules.fragments[i].id) && near(tileCenterV1(map, p[0], p[1]))) return {kind: "fragment", label: "Relever le fragment gravé", index: i};
  }
  if (state.mission.stage === "traces") {
    for (let i = 0; i < state.mission.traces.length; i++) {
      const p = map.markers.traces[i];
      if (!state.mission.traces[i] && near(tileCenterV1(map, p[0], p[1]))) return {kind: "trace", label: "Lire la trace", index: i};
    }
  }
  if (state.mission.stage !== "none") {
    for (let i = 0; i < state.mission.carcasses.length; i++) {
      const p = map.markers.carcassCircle[i];
      if (!state.mission.carcasses[i] && near(tileCenterV1(map, p[0], p[1]))) return {kind: "carcass", label: "Éloigner la carcasse de l’autel", index: i};
    }
  }
  const chief = state.npcs.find(npc => npc.unique === "chief" && npc.state === "dead");
  if (state.mission.stage === "contract" && chief && near(chief)) return {kind: "chief-contract", label: "Fouiller le corps du chef", npc: chief};
  if (!state.trial && near(point(map, "site:epreuve"), 6)) return {kind: "trial", label: "Commencer l’épreuve de la canopée"};
  return null;
}

/** Advances the session by dt seconds. */
export function stepFreeHuntV1(state: FreeHuntStateV1, input: FreeHuntInputV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1,
  tuning: FreeHuntTuningV1, rawDt: number): FreeHuntStateV1 {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const {map} = world, P = rules.player, p = state.player;
  state.time += dt;
  state.profile.worldSeconds = state.worldStart + state.time;
  const clock = freeHuntClockV1(state, rules);
  if (state.profile.contracts.day !== clock.day) {
    state.profile.contracts = {day: clock.day, accepted: [], done: [], progress: {}};
    state.contractsToday = contractsForDay(state.seed, clock.day, rules);
    if (state.time > 1) say(state, "Un nouveau jour : de nouveaux contrats sont gravés sur l’autel.");
    state.dirty = true;
  }
  state.drops = state.drops.filter(drop => state.time - drop.until < rules.trophy.dropSeconds);

  if (p.dead) {
    if (state.time - p.respawnAt >= P.respawnSeconds) {
      const back = p.lair ? point(map, "repaireEntry") : point(map, "spawn");
      p.actor = createIslesActorV1(map, back.x, back.z, tuning.cloak);
      p.health = P.health; p.dead = false; p.heat = 0; p.overheated = false;
      lowerAlert(state, true);
      say(state, "Le chasseur se relève " + (p.lair ? "au repaire derrière les chutes." : "à l’autel."));
    }
  } else {
    p.strikeTimer = Math.max(0, p.strikeTimer - dt); p.plasmaTimer = Math.max(0, p.plasmaTimer - dt);
    p.heat = Math.max(0, p.heat - P.plasmaCoolPerSecond * dt);
    if (p.overheated && p.heat <= 0) p.overheated = false;
    if (state.time - p.lastHurt > P.regenDelay) p.health = Math.min(P.health, p.health + P.regenPerSecond * dt);
    const taking = p.trophy !== null;
    const move = taking ? {...input, moveX: 0, moveZ: 0, jump: false, cloak: false} : input;
    p.actor = stepIslesActorV1(p.actor, move, map, tuning.movement, tuning.cloak, dt).actor;
    if (taking && p.actor.cloaked) p.actor = {...p.actor, cloaked: false};
    const a = p.actor;

    // Strike and plasma.
    if (input.strike && p.strikeTimer <= 0 && !taking) {
      p.strikeTimer = P.strikeSeconds;
      const reach = (npc: FreeNpcV1) => npc.role === "animal" || npc.armed;
      const target = targetAhead(state, P.strikeRange, P.strikeArcDot, reach) ?? targetAhead(state, P.strikeRange, P.strikeArcDot, () => true);
      if (target) hurtNpc(state, world, rules, target, P.strikeDamage, "blade");
    }
    if (input.plasma && p.plasmaTimer <= 0 && !p.overheated && !taking) {
      p.plasmaTimer = P.plasmaSeconds; p.heat += P.plasmaHeat;
      if (p.heat >= P.plasmaOverheat) { p.overheated = true; say(state, "Le canon plasma surchauffe."); }
      const target = targetAhead(state, P.plasmaRange, P.plasmaConeDot, npc => npc.role === "animal" || npc.armed);
      if (target && lineOfSightFreeV1(map, {x: a.x, y: a.y + 1.8, z: a.z}, {x: target.x, y: 1, z: target.z}, 0)) hurtNpc(state, world, rules, target, P.plasmaDamage, "plasma");
      for (const npc of state.npcs) {
        if (npc.role === "human" && npc.armed && npc.state !== "dead" && npc.state !== "combat" && dist(npc, a) < rules.perception.hearPlasma) {
          npc.state = "investigate"; npc.goalX = a.x; npc.goalZ = a.z; npc.timer = 12; npc.pathKey = "";
        }
      }
    }
    // Trophy (cloak off while taking it).
    if (input.trophyHeld) {
      if (!p.trophy) {
        const body = state.npcs.find(npc => npc.state === "dead" && !npc.trophyTaken && (npc.role === "animal" || npc.armed) && dist(npc, a) < rules.trophy.range);
        if (body) { p.trophy = {npcId: body.id, progress: 0}; p.actor = {...p.actor, cloaked: false}; }
      }
      if (p.trophy) {
        const body = state.npcs.find(npc => npc.id === p.trophy!.npcId);
        if (!body || dist(body, a) > rules.trophy.range + 0.5) p.trophy = null;
        else if ((p.trophy.progress += dt) >= rules.trophy.seconds) {
          body.trophyTaken = true;
          const label = body.name ?? rules.humans[body.type]?.label ?? rules.animals[body.type]?.label ?? body.type;
          state.carried.push({id: state.seed + "-" + body.id + "-" + Math.round(state.time), kind: body.type, label, honor: body.honorValue,
            takenAtSeconds: Math.round(state.profile.worldSeconds), place: nearestSiteLabel(world, body), ...(body.name ? {named: body.name} : {})});
          say(state, "Trophée pris : " + label + ". Rapportez-le au repaire pour le garder.");
          p.trophy = null;
        }
      }
    } else p.trophy = null;
    // Dropped trophies are picked up on contact.
    for (const drop of state.drops) if (dist(drop, a) < 2) { state.carried.push(...drop.trophies); drop.trophies = []; say(state, "Trophées retrouvés."); }
    state.drops = state.drops.filter(drop => drop.trophies.length);

    // The lair behind the falls: discover, deliver trophies, clear the alert.
    const lair = point(map, "repaireEntry");
    if (dist(lair, a) < 6) {
      if (!state.profile.lairs.includes("verdant-chutes")) { state.profile.lairs.push("verdant-chutes"); say(state, "Repaire découvert : la grotte derrière les chutes."); state.dirty = true; }
      p.lair = "verdant-chutes";
      if (state.alert.level > 0) { lowerAlert(state, true); say(state, "Rentré vivant au repaire : les marques d’alerte s’effacent."); }
      if (state.carried.length) {
        const total = state.carried.reduce((sum, t) => sum + t.honor, 0), bonus = Math.round(total * rules.honor.deliveredBonus);
        state.profile.trophies.push(...state.carried); state.profile.honor += bonus; state.dirty = true;
        say(state, state.carried.length + " trophée(s) exposé(s) au repaire · honneur + " + bonus + ".");
        state.carried = [];
      }
    }

    // Interact.
    const target = interactable(state, world, rules);
    state.prompt = target?.label ?? (state.npcs.some(npc => npc.state === "dead" && !npc.trophyTaken && (npc.role === "animal" || npc.armed) && dist(npc, a) < rules.trophy.range) ? "Maintenir T : prendre le trophée" : "");
    if (input.interact && target) interact(state, world, rules, target);

    // Trial of the canopy.
    if (state.trial) {
      const rings = map.markers.trialRings;
      const ring = tileCenterV1(map, rings[state.trial.index][0], rings[state.trial.index][1]);
      if (dist(ring, a) < rules.trial.ringRadius && a.y >= rules.trial.minHeight) {
        if (state.trial.index === 0) state.trial.start = state.time;
        state.trial.index++;
        if (state.trial.index >= rings.length) finishTrial(state, rules);
      } else if (state.trial.index > 0 && a.grounded && a.y < rules.trial.failBelow) {
        say(state, "Épreuve manquée : le chasseur a touché le sol."); state.trial = null;
      }
    }
    // Mission I-MP-01: the camp, then the radio.
    const m = state.mission;
    if (m.stage === "camp" && dist(siteOf(world, "camp"), a) < 45) { m.stage = "traces"; say(state, "Le camp des braconniers. Lisez trois traces : caisses, papiers, empreintes."); }
    if (m.stage === "radio") {
      const radio = point(map, "radio");
      if (dist(radio, a) < rules.mission.radioRange && !watched(state)) {
        m.radio += dt;
        if (m.radio >= rules.mission.radioSeconds) {
          say(state, "Radio du camp : " + rules.mission.radio); m.stage = "chief";
          const chief = point(map, "chief");
          makeNpc(state, rules, "braconnier", chief.x, chief.z, {unique: "chief", name: rules.mission.chief.name, health: rules.mission.chief.health});
          say(state, "Le chef du camp sort de sa tente.");
        }
      }
    }
  }

  // Population, characters, alert.
  state.popTimer -= dt;
  if (state.popTimer <= 0) { state.popTimer = 0.5; populate(state, world, rules); }
  stepNpcs(state, world, rules, dt);
  const al = state.alert;
  if (al.level > 0 && !p.dead) {
    const outside = dist(p.actor, al) > rules.alert.searchRadius[al.level];
    if (!watched(state) && outside) {
      const still = p.actor.cloaked && Math.hypot(p.actor.vx, p.actor.vz) < 0.3;
      al.quiet += dt * (still ? rules.alert.stillCloakedFactor : 1);
      if (al.quiet >= rules.alert.decaySeconds) { lowerAlert(state, false); say(state, al.level ? "L’alerte retombe au niveau " + al.level + "." : "Plus personne ne vous cherche."); }
    } else if (watched(state)) al.quiet = 0;
  }
  return state;
}

function nearestSiteLabel(world: FreeHuntWorldV1, at: {x: number; z: number}): string {
  const site = [...world.sites].sort((a, b) => dist(a, at) - dist(b, at))[0];
  return site && dist(site, at) < 300 ? "Verdant · " + site.label : "Verdant";
}

function finishTrial(state: FreeHuntStateV1, rules: FreeHuntRulesV1) {
  const seconds = Math.round((state.time - state.trial!.start) * 10) / 10;
  state.trial = null;
  const medal = rules.trial.medals.find(item => seconds <= item.seconds);
  const profile = state.profile;
  if (profile.trialBestSeconds === null || seconds < profile.trialBestSeconds) profile.trialBestSeconds = seconds;
  let text = "Épreuve de la canopée : " + seconds + " s";
  if (medal && !profile.trialMedals.includes(medal.name)) {
    profile.trialMedals.push(medal.name); profile.honor += medal.honor;
    text += " · médaille d’" + medal.name + ", honneur + " + medal.honor;
  } else if (medal) text += " · médaille d’" + medal.name;
  else text += " · trop lent pour une médaille";
  say(state, text + "."); state.dirty = true;
}

function interact(state: FreeHuntStateV1, world: FreeHuntWorldV1, rules: FreeHuntRulesV1, target: {kind: string; index?: number; npc?: FreeNpcV1}) {
  const profile = state.profile, m = state.mission;
  if (target.kind === "contracts") {
    profile.contracts.accepted = state.contractsToday.map(c => c.id); state.dirty = true;
    say(state, "Contrats du jour : " + state.contractsToday.map(c => c.text + " (" + c.reward + ")").join(" · "));
  } else if (target.kind === "mission") {
    m.stage = "camp"; m.traces = m.traces.map(() => false); m.radio = 0; m.carcasses = m.carcasses.map(() => false);
    say(state, rules.mission.brief);
    say(state, "Des carcasses sont disposées en cercle autour de l’autel : une provocation.");
    if (profile.contracts.accepted.length === 0) { profile.contracts.accepted = state.contractsToday.map(c => c.id); state.dirty = true; }
  } else if (target.kind === "fragment") {
    const fragment = rules.fragments[target.index!];
    profile.fragments.push(fragment.id); profile.codex.push("Fragment " + fragment.id + " — " + fragment.text); state.dirty = true;
    say(state, "Fragment de l’autel (" + profile.fragments.length + "/" + rules.fragments.length + ") : " + fragment.text);
  } else if (target.kind === "trace") {
    m.traces[target.index!] = true; say(state, "Trace : " + rules.mission.traces[target.index!]);
    if (m.traces.every(Boolean)) { m.stage = "radio"; say(state, "Écoutez la radio du camp sans être vu."); }
  } else if (target.kind === "carcass") {
    m.carcasses[target.index!] = true; say(state, "Carcasse éloignée de l’autel (" + m.carcasses.filter(Boolean).length + "/" + m.carcasses.length + ").");
  } else if (target.kind === "chief-contract") {
    const allCleared = m.carcasses.every(Boolean);
    const reward = rules.mission.reward + (allCleared ? rules.mission.carcassBonus : 0);
    // Reputation + 1 over the level held before the reward: honor reaches at least the next threshold.
    const level = islesReputationV1(profile, rules.reputation) + profile.reputationPenalty;
    profile.honor += reward;
    const next = rules.reputation[Math.min(rules.reputation.length - 1, level)];
    if (next !== undefined && profile.honor < next) profile.honor = next;
    profile.missions[rules.mission.id] = "done"; profile.codex.push(rules.mission.codex); state.dirty = true;
    m.stage = "none";
    say(state, "Contrat signé « H. » trouvé. Mission « " + rules.mission.title + " » réussie · honneur + " + reward + (allCleared ? " (autel dégagé)" : "") +
      (m.chiefBlade ? " · chef à la lame" : "") + ". Réputation + 1.");
  } else if (target.kind === "trial") {
    state.trial = {index: 0, start: state.time};
    say(state, "Épreuve : passez par les neuf anneaux de la canopée sans toucher le sol.");
  }
}
