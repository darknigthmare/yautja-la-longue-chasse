import { GAME_RESERVE_EXPEDITION_V108_WORLD, GAME_RESERVE_EXPEDITION_V108_SECTORS, GAME_RESERVE_EXPEDITION_V108_PLATFORMS, GAME_RESERVE_EXPEDITION_V108_COVER, GAME_RESERVE_EXPEDITION_V108_PEOPLE, GAME_RESERVE_EXPEDITION_V108_SUPPLIES, GAME_RESERVE_EXPEDITION_V108_SHIPS, GAME_RESERVE_EXPEDITION_V108_SITES, type GameReserveV108RouteRecord, type GameReserveV108Behavior } from "./gameReserveExpeditionV108";
import { GAME_RESERVE_LOOKOUT_V104_WORLD, GAME_RESERVE_LOOKOUT_V104_SECTOR, GAME_RESERVE_LOOKOUT_V104_PLATFORMS, GAME_RESERVE_LOOKOUT_V104_COVER, GAME_RESERVE_LOOKOUT_V104_SURVEY, type GameReserveLookoutV104Record } from "./gameReserveLookoutV104";
import { GAME_RESERVE_EXPEDITION_V107_WORLD, GAME_RESERVE_EXPEDITION_V107_SECTORS, GAME_RESERVE_EXPEDITION_V107_PLATFORMS, GAME_RESERVE_EXPEDITION_V107_COVER, GAME_RESERVE_EXPEDITION_V107_PEOPLE, GAME_RESERVE_EXPEDITION_V107_SUPPLIES, GAME_RESERVE_EXPEDITION_V107_SHIPS, GAME_RESERVE_EXPEDITION_V107_SITES, type GameReserveV107RouteRecord, type GameReserveV107Tactics } from "./gameReserveExpeditionV107";
import {GAME_RESERVE_CATALOGUE_V109, gameReserveV109Definition, type GameReserveV109Behavior, type GameReserveV109Id, type GameReserveV109RouteRecord} from './gameReserveExpeditionV109';
export type {GameReserveChoiceV109, GameReserveV109Id} from './gameReserveExpeditionV109';

/** Vharuun is an original game reserve, not a canonical planet or a 100-player mode. */
export const GAME_RESERVE_V66_WORLD = { width: 4800, height: 540, ground: 438, returnX: 115 } as const;
export const GAME_RESERVE_V66_SECTORS = [
  { id: "parachutes", name: "Jungle des Parachutes", left: 0, right: 1600 },
  { id: "drill", name: "Lisière de la Foreuse", left: 1600, right: 3200 },
  { id: "camp", name: "Camp des Trophées", left: 3200, right: 4800 },
] as const;
export const GAME_RESERVE_V66_PLATFORMS = [
  { x: 350, y: 365, w: 220 }, { x: 600, y: 292, w: 350 }, { x: 1030, y: 338, w: 300 },
  { x: 1430, y: 365, w: 200 }, { x: 1770, y: 355, w: 280 }, { x: 2120, y: 280, w: 350 },
  { x: 2630, y: 344, w: 330 }, { x: 3140, y: 362, w: 260 }, { x: 3490, y: 285, w: 300 },
  { x: 3860, y: 351, w: 290 }, { x: 4290, y: 365, w: 260 },
] as const;
/** Dense vegetation breaks sight and fire. Routes remain walkable underneath/behind it. */
export const GAME_RESERVE_V66_COVER = [
  { x: 490, w: 75, top: 358 }, { x: 1240, w: 85, top: 345 }, { x: 1810, w: 70, top: 350 },
  { x: 2920, w: 90, top: 350 }, { x: 3480, w: 75, top: 342 }, { x: 4070, w: 80, top: 350 },
] as const;
export type GameReserveV66Role = "leader" | "technician" | "marksman" | "veteran";
export interface GameReserveV66Person { id: string; name: string; role: GameReserveV66Role; description: string; art: "raider" | "marine" | "sniper"; tactics?: GameReserveV107Tactics; behavior?: GameReserveV108Behavior | GameReserveV109Behavior; observationX?: number }
export const GAME_RESERVE_V66_PEOPLE = [
  { id: "reserve-veyra", name: "Veyra", role: "leader", description: "Ancienne cheffe d'escorte, adulte armée d'un fusil. Rassemble les témoins proches.", art: "raider" },
  { id: "reserve-marek", name: "Marek", role: "technician", description: "Sapeur vétéran adulte, fusil et outillage. Répare plus vite les moteurs.", art: "marine" },
  { id: "reserve-solen", name: "Solen", role: "marksman", description: "Tireuse adulte d'une unité de protection, fusil de précision. Couvre les récupérateurs.", art: "sniper" },
  { id: "reserve-oren", name: "Oren", role: "veteran", description: "Combattant adulte de raids frontaliers, fusil. Avance prudemment après un contact.", art: "raider" },
  { id: "reserve-nara", name: "Nara", role: "leader", description: "Commandante adulte d'une milice de frontière, fusil. Organise une seconde voie d'évasion.", art: "marine" },
  { id: "reserve-kess", name: "Kess", role: "technician", description: "Mécanicienne de combat adulte, fusil. Transporte elle-même les pièces.", art: "raider" },
  { id: "reserve-toren", name: "Toren", role: "marksman", description: "Sentinelle adulte d'une escorte, fusil de précision. Surveille les dernières positions vues.", art: "sniper" },
  { id: "reserve-ira", name: "Ira", role: "veteran", description: "Mercenaire adulte aguerrie, fusil. Peut terminer seule une réparation.", art: "marine" },
] as const satisfies readonly { id: string; name: string; role: GameReserveV66Role; description: string; art: string }[];
export const GAME_RESERVE_V66_SUPPLIES = [720, 1060, 1490, 1920, 2810, 3360, 3760, 4250] as const;
export const GAME_RESERVE_V99_RECOVERY_RANGE = 180;
export const GAME_RESERVE_V99_RECOVERY_TICKS = 90;
export const GAME_RESERVE_V66_SHIPS = [
  { id: "drill-transport", name: "Transport abandonné", x: 2360 },
  { id: "camp-shuttle", name: "Navette du camp", x: 4540 },
] as const;
export const GAME_RESERVE_V66_STATUSES = ["active", "returned", "incapacitated"] as const;
export type GameReserveV66Status = typeof GAME_RESERVE_V66_STATUSES[number];
type HumanStatus = "active" | "down" | "boarded" | "escaped";
export interface GameReserveV66Human {
  id: string; x: number; facing: -1 | 1; hp: number; status: HumanStatus; team: 0 | 1 | 2 | 3;
  carrying: boolean; targetSupply: number; work: number; lastSeenX: number | null; lastSeenY: number;
  alertUntil: number; shotCooldown: number; windup: number; moving: boolean; identified: boolean;
  scan: number; secured: boolean; downAt: number | null;
  /** A witnessed ramp exit is the only permitted reversal of boarding. Absent in legacy saves. */
  disembarkation?: { tick: number; ship: 0 | 1 | 2 | 3; launchTick: number };
  /** Local, interruptible work on a fallen carrier; never a remote inventory transfer. */
  recovering?: { bodyId: string; ticks: number };
}
interface GameReserveV66BaseState {
  seed: number; tick: number; status: GameReserveV66Status;
  player: { x: number; y: number; vy: number; facing: -1 | 1; hp: number; energy: number; cloak: boolean; cooldown: number; moving: boolean };
  humans: GameReserveV66Human[];
  ships: { parts: number; repair: number; launch: number | null; departedAt: number | null; sabotages: number;
    interception?: { tick: number; launchTick: number; hunterX: number } }[];
  supplies: number[];
  /** Physical cache lots neutralized by the hunter. Absent in untouched legacy expeditions. */
  deniedSupplies?: number[];
  tracks: { x: number; tick: number; direction: -1 | 1 }[];
  projectiles: { x: number; y: number; vx: number; vy: number; owner: "hunter" | "human"; life: number }[];
  channel: { kind: "none" | "trophy" | "sabotage" | "cache" | "return" | "survey"; target: number; ticks: number };
  visited: number[]; log: { tick: number; message: string }[]; terminalTick: number | null;
  inputArmed: boolean; previous: { jump: boolean; attack: boolean; melee: boolean; cloak: boolean };
}
export type GameReserveV66State = GameReserveV66BaseState & (
  { version: 1; reserveId: "vharuun-first-expedition" } |
  { version: 2; reserveId: "vharuun-lookout-expedition"; lookout: GameReserveLookoutV104Record } |
  { version: 3; reserveId: "vharuun-transect-expedition"; routeV107: GameReserveV107RouteRecord } |
  { version: 4; reserveId: "kesh-watch-expedition"; routeV108: GameReserveV108RouteRecord } |
  { version: 5; reserveId: GameReserveV109Id; routeV109: GameReserveV109RouteRecord }
);
type TerrainVersion = Pick<GameReserveV66State, "version"> & {reserveId?: string};
const LOOKOUT_SECTORS = [...GAME_RESERVE_V66_SECTORS, GAME_RESERVE_LOOKOUT_V104_SECTOR];
const LOOKOUT_PLATFORMS = [...GAME_RESERVE_V66_PLATFORMS, ...GAME_RESERVE_LOOKOUT_V104_PLATFORMS];
const LOOKOUT_COVER = [...GAME_RESERVE_V66_COVER, ...GAME_RESERVE_LOOKOUT_V104_COVER];
const EXPEDITION_SECTORS = [...LOOKOUT_SECTORS, ...GAME_RESERVE_EXPEDITION_V107_SECTORS];
const EXPEDITION_PLATFORMS = [...LOOKOUT_PLATFORMS, ...GAME_RESERVE_EXPEDITION_V107_PLATFORMS];
const EXPEDITION_COVER = [...LOOKOUT_COVER, ...GAME_RESERVE_EXPEDITION_V107_COVER];
const EXPEDITION_PEOPLE: readonly GameReserveV66Person[] = [...GAME_RESERVE_V66_PEOPLE, ...GAME_RESERVE_EXPEDITION_V107_PEOPLE];
const EXPEDITION_SHIPS = [...GAME_RESERVE_V66_SHIPS, ...GAME_RESERVE_EXPEDITION_V107_SHIPS];
const EXPEDITION_SUPPLIES = [...GAME_RESERVE_V66_SUPPLIES, ...GAME_RESERVE_EXPEDITION_V107_SUPPLIES];
export const gameReserveV66World = (state?: TerrainVersion) => gameReserveV109Definition(state)?.world ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_WORLD : state?.version === 3 ? GAME_RESERVE_EXPEDITION_V107_WORLD : state?.version === 2 ? GAME_RESERVE_LOOKOUT_V104_WORLD : GAME_RESERVE_V66_WORLD);
export const gameReserveV66Sectors = (state?: TerrainVersion) => gameReserveV109Definition(state)?.sectors ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_SECTORS : state?.version === 3 ? EXPEDITION_SECTORS : state?.version === 2 ? LOOKOUT_SECTORS : GAME_RESERVE_V66_SECTORS);
export const gameReserveV66Platforms = (state?: TerrainVersion) => gameReserveV109Definition(state)?.platforms ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_PLATFORMS : state?.version === 3 ? EXPEDITION_PLATFORMS : state?.version === 2 ? LOOKOUT_PLATFORMS : GAME_RESERVE_V66_PLATFORMS);
export const gameReserveV66Cover = (state?: TerrainVersion) => gameReserveV109Definition(state)?.cover ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_COVER : state?.version === 3 ? EXPEDITION_COVER : state?.version === 2 ? LOOKOUT_COVER : GAME_RESERVE_V66_COVER);
export const gameReserveV66People = (state?: TerrainVersion): readonly GameReserveV66Person[] => gameReserveV109Definition(state)?.people ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_PEOPLE : state?.version === 3 ? EXPEDITION_PEOPLE : GAME_RESERVE_V66_PEOPLE);
export const gameReserveV66Ships = (state?: TerrainVersion): readonly { id: string; name: string; x: number }[] => gameReserveV109Definition(state)?.ships ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_SHIPS : state?.version === 3 ? EXPEDITION_SHIPS : GAME_RESERVE_V66_SHIPS);
export const gameReserveV66Supplies = (state?: TerrainVersion): readonly number[] => gameReserveV109Definition(state)?.supplies ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_SUPPLIES : state?.version === 3 ? EXPEDITION_SUPPLIES : GAME_RESERVE_V66_SUPPLIES);
export const gameReserveV66Sites = (state?: TerrainVersion) => gameReserveV109Definition(state)?.sites ?? (state?.version === 4 ? GAME_RESERVE_EXPEDITION_V108_SITES : GAME_RESERVE_EXPEDITION_V107_SITES);
export const gameReserveV66Name = (state?: TerrainVersion) => gameReserveV109Definition(state)?.name ?? (state?.version === 4 ? 'Avar’Kesh' : 'Vharuun');
export interface GameReserveV66Input { move?: -1 | 0 | 1; jump?: boolean; attack?: boolean; melee?: boolean; cloak?: boolean; scan?: boolean; interact?: boolean }
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number): v is number => number(v, min, max) && Number.isSafeInteger(v);
const bool = (v: unknown) => typeof v === "boolean";
const facing = (v: unknown): v is -1 | 1 => v === -1 || v === 1;
const neutral = (i: GameReserveV66Input) => !i.move && !i.jump && !i.attack && !i.melee && !i.cloak && !i.scan && !i.interact;
function log(s: GameReserveV66State, message: string) { s.log.push({ tick: s.tick, message }); s.log = s.log.slice(-18); }
export function createGameReserveV66(seed: number): GameReserveV66State {
  const safeSeed = Number.isSafeInteger(seed) && seed >= 0 ? seed >>> 0 : 0;
  return { version: 1, reserveId: "vharuun-first-expedition", seed: safeSeed, tick: 0, status: "active",
    player: { x: 115, y: 438, vy: 0, facing: 1, hp: 100, energy: 100, cloak: false, cooldown: 0, moving: false },
    humans: GAME_RESERVE_V66_PEOPLE.map((p, n) => ({ id: p.id, x: 680 + n * 420 + (safeSeed + n * 37) % 90, facing: 1, hp: 70,
      status: "active", team: n < 4 ? 0 : 1, carrying: false, targetSupply: n, work: 0, lastSeenX: null, lastSeenY: 395,
      alertUntil: 0, shotCooldown: 50 + n * 17, windup: 0, moving: false, identified: false, scan: 0, secured: false, downAt: null })),
    ships: GAME_RESERVE_V66_SHIPS.map(() => ({ parts: 0, repair: 0, launch: null, departedAt: null, sabotages: 0 })),
    supplies: GAME_RESERVE_V66_SUPPLIES.map(() => 2), tracks: [], projectiles: [], channel: { kind: "none", target: -1, ticks: 0 },
    visited: [0], log: [{ tick: 0, message: "Deux groupes armés cherchent une issue. Les huit combattants et cette réserve sont des créations du jeu." }],
    terminalTick: null, inputArmed: false, previous: { jump: false, attack: false, melee: false, cloak: false } };
}
/** A separate, explicitly chosen expedition. No historical checkpoint is upgraded. */
export function createGameReserveV104(seed: number): GameReserveV66State {
  return { ...createGameReserveV66(seed), version: 2, reserveId: "vharuun-lookout-expedition",
    lookout: { recordedAt: null, hunterX: null, hunterY: null },
    log: [{ tick: 0, message: "Expédition des Balises : quatre secteurs originaux reliés. Rejoins le poste haut, relève ses repères puis retourne à l’extraction. Les huit combattants cherchent toujours une issue." }] };
}
/** Eight connected original sectors and four groups. Historical checkpoints are never upgraded. */
export function createGameReserveV107(seed: number): GameReserveV66State {
  const base = createGameReserveV66(seed), safeSeed = base.seed;
  return { ...base, version: 3, reserveId: "vharuun-transect-expedition",
    routeV107: { siteRecords: GAME_RESERVE_EXPEDITION_V107_SITES.map(() => ({ recordedAt: null, hunterX: null, hunterY: null })) },
    humans: EXPEDITION_PEOPLE.map((person, index) => ({ id: person.id, x: (index < 8 ? 680 + index * 420 : 6820 + (index - 8) * 660) + (safeSeed + index * 37) % 90,
      facing: 1, hp: 70, status: "active", team: Math.floor(index / 4) as 0 | 1 | 2 | 3, carrying: false, targetSupply: index, work: 0, lastSeenX: null,
      lastSeenY: 395, alertUntil: 0, shotCooldown: Math.min(200, 50 + index * 9), windup: 0, moving: false, identified: false, scan: 0, secured: false, downAt: null })),
    ships: EXPEDITION_SHIPS.map(() => ({ parts: 0, repair: 0, launch: null, departedAt: null, sabotages: 0 })),
    supplies: EXPEDITION_SUPPLIES.map(() => 2),
    log: [{ tick: 0, message: "Traversée de Vharuun : huit secteurs reliés, seize adultes armés et quatre groupes en fuite. Quatre relevés se rapportent physiquement à l’extraction. Nouveaux lieux et combattants originaux, atlas partagés." }] };
}
/** A separately selected second reserve; V1–V3 checkpoints retain their terrain. */
export function createGameReserveV108(seed: number): GameReserveV66State {
  const base = createGameReserveV66(seed), safeSeed = base.seed;
  return { ...base, version: 4, reserveId: "kesh-watch-expedition",
    routeV108: { siteRecords: GAME_RESERVE_EXPEDITION_V108_SITES.map(() => ({ recordedAt: null, hunterX: null, hunterY: null })) },
    humans: GAME_RESERVE_EXPEDITION_V108_PEOPLE.map((person, index) => ({ id: person.id,
      x: Math.floor(index / 4) * 3200 + 600 + index % 4 * 360 + (safeSeed + index * 37) % 70,
      facing: 1, hp: 70, status: "active", team: Math.floor(index / 4) as 0 | 1 | 2 | 3,
      carrying: false, targetSupply: index, work: 0, lastSeenX: null, lastSeenY: 395,
      alertUntil: 0, shotCooldown: 50 + index * 9, windup: 0, moving: false, identified: false, scan: 0, secured: false, downAt: null })),
    ships: GAME_RESERVE_EXPEDITION_V108_SHIPS.map(() => ({ parts: 0, repair: 0, launch: null, departedAt: null, sabotages: 0 })),
    supplies: GAME_RESERVE_EXPEDITION_V108_SUPPLIES.map(() => 2),
    log: [{ tick: 0, message: "Avar’Kesh : seconde réserve originale, huit secteurs, seize adultes armés et quatre appareils. Escortes, gardes de rampe et observateurs utilisent des décisions distinctes. Quatre relevés à rapporter ; atlas natifs partagés." }] };
}
/** Two independently selected biome expeditions; old checkpoints are never converted. */
export function createGameReserveV109(seed: number, reserveId: GameReserveV109Id): GameReserveV66State {
  const definition = GAME_RESERVE_CATALOGUE_V109.find(candidate => candidate.id === reserveId);
  if (!definition) throw new RangeError('Réserve V109 inconnue.');
  const base = createGameReserveV66(seed), safeSeed = base.seed;
  return {...base, version: 5, reserveId,
    routeV109: {siteRecords: definition.sites.map(() => ({recordedAt: null, hunterX: null, hunterY: null}))},
    humans: definition.people.map((person, index) => ({id: person.id,
      x: Math.floor(index / 4) * 3200 + 480 + index % 4 * 330 + (safeSeed + index * 41) % 65,
      facing: 1, hp: 70, status: 'active', team: Math.floor(index / 4) as 0 | 1 | 2 | 3,
      carrying: false, targetSupply: index, work: 0, lastSeenX: null, lastSeenY: 395,
      alertUntil: 0, shotCooldown: 55 + index * 8, windup: 0, moving: false, identified: false, scan: 0, secured: false, downAt: null})),
    ships: definition.ships.map(() => ({parts: 0, repair: 0, launch: null, departedAt: null, sabotages: 0})),
    supplies: definition.supplies.map(() => 2), log: [{tick: 0, message: definition.introduction}],
  };
}
/** Objectives are derived from physical events; no separate counter can grant success. */
export function gameReserveV109Objectives(state: GameReserveV66State) {
  const definition = gameReserveV109Definition(state); if (!definition) return null;
  const caches = definition.cacheObjectives.map(index => ({index, x: definition.supplies[index],
    sector: gameReserveV66Sector(definition.supplies[index], state).name, denied: state.deniedSupplies?.[index] ?? 0}));
  const mechanics = state.humans.filter((human, index) => human.identified && definition.people[index].role === 'technician').length;
  const interceptions = state.ships.filter(ship => ship.interception !== undefined).length;
  return {name: definition.name, caches, cacheGoal: caches.length, cachesCompleted: caches.filter(cache => cache.denied > 0).length,
    mechanics, mechanicGoal: definition.mechanicGoal, interceptions, interceptionGoal: definition.interceptionGoal,
    completed: caches.every(cache => cache.denied > 0) && mechanics >= definition.mechanicGoal && interceptions >= definition.interceptionGoal,
    returned: state.status === 'returned'};
}
/** V5 posts use known local resources and visible co-workers, never hidden hunter coordinates. */
export function gameReserveV109Behavior(state: GameReserveV66State, index: number): {kind: GameReserveV109Behavior; destination: number; partnerId?: string} | null {
  const definition = gameReserveV109Definition(state), human = state.humans[index], person = definition?.people[index];
  if (!definition || !human || !person || human.status !== 'active' || human.carrying || human.lastSeenX !== null && human.alertUntil > state.tick) return null;
  const ship = state.ships[human.team], shipX = definition.ships[human.team].x;
  if (ship.launch !== null || ship.departedAt !== null) return null;
  const allies = state.humans.filter(ally => ally !== human && ally.team === human.team && ally.status === 'active');
  if (!allies.length) return null;
  if (person.behavior === 'carrier-escort') {
    const carrier = allies.filter(ally => ally.carrying && Math.abs(ally.x - human.x) <= 520 && gameReserveV66LineClear(human.x, 387, ally.x, 387, state))
      .sort((a, b) => Math.abs(a.x - human.x) - Math.abs(b.x - human.x))[0];
    return carrier ? {kind: 'carrier-escort', destination: clamp(carrier.x - Math.sign(shipX - carrier.x || 1) * 75, 40, definition.world.width - 40), partnerId: carrier.id} : null;
  }
  if (person.behavior === 'cache-guard' && ship.parts < 3) {
    const cache = human.team * 4 + 2;
    const worker = allies.some(ally => !definition.people.find(candidate => candidate.id === ally.id)?.behavior || ally.carrying);
    return worker && state.supplies[cache] > 0 ? {kind: 'cache-guard', destination: definition.supplies[cache] - 85} : null;
  }
  if (person.behavior === 'repair-cover' && ship.parts >= 3 && ship.repair < 3600) {
    const mechanic = allies.find(ally => definition.people.find(candidate => candidate.id === ally.id)?.role === 'technician' && !ally.carrying &&
      Math.abs(ally.x - shipX) <= 30 && !(ally.lastSeenX !== null && ally.alertUntil > state.tick) && gameReserveV66LineClear(human.x, 387, ally.x, 387, state));
    return mechanic ? {kind: 'repair-cover', destination: shipX - 135, partnerId: mechanic.id} : null;
  }
  return null;
}
/** Work decisions use a nearby visible ally or a known own ramp, never hidden hunter coordinates. */
export function gameReserveV108Behavior(state: GameReserveV66State, index: number): { kind: GameReserveV108Behavior; destination: number; partnerId?: string } | null {
  if (state.version !== 4) return null;
  const human = state.humans[index], person = GAME_RESERVE_EXPEDITION_V108_PEOPLE[index];
  if (!human || !person || human.status !== "active" || human.carrying || human.lastSeenX !== null && human.alertUntil > state.tick) return null;
  const ship = state.ships[human.team], shipX = GAME_RESERVE_EXPEDITION_V108_SHIPS[human.team].x;
  if (ship.launch !== null || ship.departedAt !== null) return null;
  const allies = state.humans.filter(ally => ally !== human && ally.team === human.team && ally.status === "active");
  // A lone survivor always returns to collection and repair rather than guarding forever.
  if (!allies.length) return null;
  if ("behavior" in person && person.behavior === "carrier-escort") {
    const carrier = allies.filter(ally => ally.carrying && Math.abs(ally.x - human.x) <= 520 && gameReserveV66LineClear(human.x, 387, ally.x, 387, state))
      .sort((a, b) => Math.abs(a.x - human.x) - Math.abs(b.x - human.x))[0];
    return carrier ? { kind: "carrier-escort", destination: clamp(carrier.x - Math.sign(shipX - carrier.x || 1) * 75, 40, 12760), partnerId: carrier.id } : null;
  }
  // At least one colleague is available to collect/repair. Defenders release their post at launch.
  const worker = allies.some(ally => gameReserveV66People(state).find(definition => definition.id === ally.id)?.role === "technician" || ally.carrying);
  if (ship.parts < 1 || !worker) return null;
  if ("behavior" in person && person.behavior === "ramp-defender") return { kind: "ramp-defender", destination: shipX - 115 };
  if ("behavior" in person && person.behavior === "cover-observer") {
    // Reassigned survivors guard the remaining aircraft, never their departed hull.
    const post = GAME_RESERVE_EXPEDITION_V108_PEOPLE[human.team * 4 + 2];
    if ("observationX" in post) return { kind: "cover-observer", destination: post.observationX };
  }
  return null;
}
/** Reject unsupported and contradictory saves; no implicit reset and no free inventory or canonical rewards. */
export function normalizeGameReserveV66(value: unknown): GameReserveV66State | null {
  if (!record(value) || !(value.version === 1 && value.reserveId === "vharuun-first-expedition" || value.version === 2 && value.reserveId === "vharuun-lookout-expedition" || value.version === 3 && value.reserveId === "vharuun-transect-expedition" || value.version === 4 && value.reserveId === "kesh-watch-expedition" || value.version === 5 && GAME_RESERVE_CATALOGUE_V109.some(definition => definition.id === value.reserveId))) return null;
  if (value.version !== 2 && value.lookout !== undefined || value.version !== 3 && value.routeV107 !== undefined || value.version !== 4 && value.routeV108 !== undefined || value.version !== 5 && value.routeV109 !== undefined) return null;
  const extended = value.version === 2, expedition = value.version === 3 || value.version === 4 || value.version === 5;
  const terrain = { version: value.version as 1 | 2 | 3 | 4 | 5, reserveId: value.reserveId as string }, width = gameReserveV66World(terrain).width;
  const sites = gameReserveV66Sites(terrain);
  const people = gameReserveV66People(terrain), ships = gameReserveV66Ships(terrain), supplies = gameReserveV66Supplies(terrain);
  if (!integer(value.seed, 0, 4294967295) ||
    !integer(value.tick, 0, 100000000) || !GAME_RESERVE_V66_STATUSES.includes(value.status as GameReserveV66Status) || !record(value.player) ||
    !Array.isArray(value.humans) || value.humans.length !== people.length || !Array.isArray(value.ships) || value.ships.length !== ships.length ||
    !Array.isArray(value.supplies) || value.supplies.length !== supplies.length || !value.supplies.every(v => integer(v, 0, 2)) ||
    !Array.isArray(value.tracks) || value.tracks.length > 96 || !Array.isArray(value.projectiles) || value.projectiles.length > 40 ||
    !Array.isArray(value.visited) || !value.visited.includes(0) || new Set(value.visited).size !== value.visited.length || !value.visited.every(v => integer(v, 0, gameReserveV66Sectors(terrain).length - 1)) ||
    !Array.isArray(value.log) || value.log.length > 18 || !record(value.channel) || !record(value.previous) || !bool(value.inputArmed)) return null;
  const p = value.player;
  if (!number(p.x, 40, width - 40) || !number(p.y, value.version === 5 ? 0 : 120, 438) || !number(p.vy, -13, 18) || !facing(p.facing) || !number(p.hp, 0, 100) ||
    !number(p.energy, 0, 100) || !bool(p.cloak) || !integer(p.cooldown, 0, 60) || !bool(p.moving) ||
    !["jump", "attack", "melee", "cloak"].every(k => bool((value.previous as Record<string, unknown>)[k]))) return null;
  const tick = value.tick;
  if (expedition && (!Object.keys(value).every(key => ["version", "reserveId", "seed", "tick", "status", "player", "humans", "ships", "supplies", "deniedSupplies", "tracks", "projectiles", "channel", "visited", "log", "terminalTick", "inputArmed", "previous", value.version === 5 ? "routeV109" : value.version === 4 ? "routeV108" : "routeV107"].includes(key)) ||
    !Object.keys(p).every(key => ["x", "y", "vy", "facing", "hp", "energy", "cloak", "cooldown", "moving"].includes(key)))) return null;
  if (value.deniedSupplies !== undefined && (!Array.isArray(value.deniedSupplies) || value.deniedSupplies.length !== supplies.length ||
    !value.deniedSupplies.every((count, index) => integer(count, 0, 2) && count + (value.supplies as number[])[index] <= 2))) return null;
  if (value.version === 4 || value.version === 5) {
    const keys = (item: unknown, allowed: readonly string[]) => record(item) && Object.keys(item).every(key => allowed.includes(key));
    if (!keys(value.channel, ["kind", "target", "ticks"]) || !keys(value.previous, ["jump", "attack", "melee", "cloak"]) ||
      !value.tracks.every(item => keys(item, ["x", "tick", "direction"])) ||
      !value.projectiles.every(item => keys(item, ["x", "y", "vx", "vy", "owner", "life"])) ||
      !value.log.every(item => keys(item, ["tick", "message"])) ||
      !value.ships.every(item => record(item) && (item.interception === undefined || keys(item.interception, ["tick", "launchTick", "hunterX"]))) ||
      !value.humans.every(item => record(item) && (item.disembarkation === undefined || keys(item.disembarkation, ["tick", "ship", "launchTick"])) &&
        (item.recovering === undefined || keys(item.recovering, ["bodyId", "ticks"])))) return null;
  }
  const claimedBodies = new Set<string>();
  for (let n = 0; n < people.length; n++) {
    const h = value.humans[n];
    if (expedition && (!record(h) || !Object.keys(h).every(key => ["id", "x", "facing", "hp", "status", "team", "carrying", "targetSupply", "work", "lastSeenX", "lastSeenY", "alertUntil", "shotCooldown", "windup", "moving", "identified", "scan", "secured", "downAt", "disembarkation", "recovering"].includes(key)))) return null;
    if (!record(h) || h.id !== people[n].id || !number(h.x, 40, width - 40) || !facing(h.facing) || !number(h.hp, 0, 70) ||
      typeof h.status !== "string" || !["active", "down", "boarded", "escaped"].includes(h.status) || !integer(h.team, 0, ships.length - 1) || !bool(h.carrying) || !integer(h.targetSupply, 0, supplies.length - 1) ||
      !number(h.work, 0, 180) || h.lastSeenX !== null && !number(h.lastSeenX, 40, width - 40) || !number(h.lastSeenY, value.version === 5 ? 0 : 60, 438) ||
      !integer(h.alertUntil, 0, tick + 360) || !integer(h.shotCooldown, 0, 200) || !integer(h.windup, 0, 24) || !bool(h.moving) || !bool(h.identified) ||
      !integer(h.scan, 0, 90) || !bool(h.secured) || h.downAt !== null && !integer(h.downAt, 0, tick)) return null;
    if ((h.status === "down") !== (h.hp === 0) || (h.status === "down") !== (h.downAt !== null) || h.secured && h.status !== "down" ||
      h.identified !== (h.scan === 90)) return null;
    const ship = value.ships[h.team];
    if (!record(ship) || h.status === "escaped" && ship.departedAt === null || h.status === "boarded" && (ship.launch === null || ship.departedAt !== null) ||
      ["boarded", "escaped"].includes(h.status) && Math.abs(h.x - ships[h.team].x) > 26) return null;
    if (h.disembarkation !== undefined) {
      const exit = h.disembarkation;
      if (!record(exit) || !integer(exit.tick, 1, tick) || !integer(exit.ship, 0, ships.length - 1) || !integer(exit.launchTick, 0, exit.tick - 1) || exit.tick - exit.launchTick >= 900) return null;
      const interrupted = value.ships[exit.ship];
      if (!record(interrupted) || !record(interrupted.interception) || !integer(interrupted.interception.tick, exit.tick, tick) ||
        !integer(interrupted.interception.launchTick, exit.launchTick, tick)) return null;
    }
    if (h.recovering !== undefined) {
      const job = h.recovering;
      if (!record(job) || typeof job.bodyId !== "string" || !integer(job.ticks, 0, GAME_RESERVE_V99_RECOVERY_TICKS - 1) || h.status !== "active" || h.carrying ||
        h.lastSeenX !== null && h.alertUntil > tick || claimedBodies.has(job.bodyId)) return null;
      const body = value.humans.find(candidate => record(candidate) && candidate.id === job.bodyId);
      if (!record(body) || body === h || body.status !== "down" || body.carrying !== true || body.team !== h.team || !number(body.x, 40, width - 40) ||
        Math.abs(h.x - body.x) > GAME_RESERVE_V99_RECOVERY_RANGE || job.ticks > 0 && Math.abs(h.x - body.x) > 12 ||
        !gameReserveV66LineClear(h.x, 387, body.x, 410, terrain)) return null;
      claimedBodies.add(job.bodyId);
    }
  }
  for (const ship of value.ships) if (!record(ship) || !integer(ship.parts, 0, 4) || !number(ship.repair, 0, 3600) ||
    ship.launch !== null && !integer(ship.launch, 0, tick) || ship.departedAt !== null && !integer(ship.departedAt, 0, tick) ||
    !integer(ship.sabotages, 0, 100000) || ship.launch !== null && (ship.parts < 3 || ship.repair !== 3600) ||
    ship.departedAt !== null && (ship.launch === null || ship.departedAt < (ship.launch as number) + 900)) return null;
  if (expedition && value.ships.some(ship => !Object.keys(ship).every(key => ["parts", "repair", "launch", "departedAt", "sabotages", "interception"].includes(key)))) return null;
  for (const ship of value.ships) if (ship.interception !== undefined) {
    const stopped = ship.interception;
    if (!record(stopped) || !integer(stopped.tick, 1, tick) || !integer(stopped.launchTick, 0, stopped.tick) || stopped.tick - stopped.launchTick >= 900 ||
      !number(stopped.hunterX, 40, width - 40) || Math.abs(stopped.hunterX - ships[value.ships.indexOf(ship)].x) >= 75 ||
      ship.sabotages < 1 || ship.launch !== null && ship.launch <= stopped.tick) return null;
  }
  if (!value.tracks.every(t => record(t) && number(t.x, 40, width - 40) && integer(t.tick, 0, tick) && facing(t.direction)) ||
    !value.projectiles.every(b => record(b) && number(b.x, 0, width) && number(b.y, 0, 540) && number(b.vx, -14, 14) && number(b.vy, -14, 14) &&
      typeof b.owner === "string" && ["hunter", "human"].includes(b.owner) && integer(b.life, 1, 90)) ||
    !value.log.every(e => record(e) && integer(e.tick, 0, tick) && typeof e.message === "string" && e.message.length <= 250)) return null;
  const c = value.channel;
  if (typeof c.kind !== "string" || !["none", "trophy", "sabotage", "cache", "return", ...(extended || expedition ? ["survey"] : [])].includes(c.kind) || !integer(c.target, -1, people.length - 1) || !integer(c.ticks, 0, 179) ||
    c.kind === "none" && (c.target !== -1 || c.ticks !== 0) || c.kind === "sabotage" && !integer(c.target, 0, ships.length - 1) ||
    c.kind === "trophy" && !integer(c.target, 0, people.length - 1) || c.kind === "cache" && (!integer(c.target, 0, supplies.length - 1) || c.ticks >= 120) || c.kind === "return" && c.target !== -1 ||
    c.kind === "survey" && (!integer(c.target, 0, expedition ? sites.length - 1 : 0) || c.ticks >= GAME_RESERVE_LOOKOUT_V104_SURVEY.ticks)) return null;
  if (extended) {
    const observation = value.lookout, site = GAME_RESERVE_LOOKOUT_V104_SURVEY;
    if (!record(observation) || (observation.recordedAt === null
      ? observation.hunterX !== null || observation.hunterY !== null
      : !integer(observation.recordedAt, site.ticks, tick) || !number(observation.hunterX, site.x - site.range, site.x + site.range) || observation.hunterY !== site.y || !value.visited.includes(3))) return null;
    if (c.kind === "survey" && (observation.recordedAt !== null || Math.abs(p.x as number - site.x) > site.range || p.y !== site.y || p.vy !== 0)) return null;
  }
  if (expedition) {
    const route = value.version === 5 ? value.routeV109 : value.version === 4 ? value.routeV108 : value.routeV107;
    if (!record(route) || Object.keys(route).length !== 1 || !Array.isArray(route.siteRecords) || route.siteRecords.length !== sites.length) return null;
    for (let index = 0; index < route.siteRecords.length; index++) {
      const observation = route.siteRecords[index], site = sites[index];
      if (!record(observation) || Object.keys(observation).length !== 3 || (observation.recordedAt === null
        ? observation.hunterX !== null || observation.hunterY !== null
        : !integer(observation.recordedAt, site.ticks, tick) || !number(observation.hunterX, site.x - site.range, site.x + site.range) || observation.hunterY !== site.y || !value.visited.includes(site.sector))) return null;
      if (c.kind === "survey" && c.target === index && (observation.recordedAt !== null || Math.abs(p.x as number - site.x) > site.range || p.y !== site.y || p.vy !== 0)) return null;
    }
  }
  if (value.status === "active" ? value.terminalTick !== null || p.hp === 0 : !integer(value.terminalTick, 0, tick) ||
    value.status === "incapacitated" && p.hp !== 0 || value.status === "returned" && (p.hp === 0 || Math.abs(p.x - 115) > 55)) return null;
  if ((value.version === 4 || value.version === 5) && gameReserveV66MaterialTotal(value as unknown as GameReserveV66State) !== 32) return null;
  return structuredClone(value) as unknown as GameReserveV66State;
}
export const gameReserveV66Supported = (value: unknown) => value === undefined || value === null || normalizeGameReserveV66(value) !== null;
/** Legacy saves may already have fewer than sixteen lots; future steps must preserve their own total. */
export function gameReserveV66MaterialTotal(s: GameReserveV66State): number {
  return s.supplies.reduce((sum, count) => sum + count, 0) + s.humans.filter(human => human.carrying).length +
    s.ships.reduce((sum, ship) => sum + ship.parts, 0) + (s.deniedSupplies?.reduce((sum, count) => sum + count, 0) ?? 0);
}
/** The host uses this for periodic writes. Terminal events, prey outcomes and inspected identities cannot roll back. */
export function canAdvanceGameReserveV66(previous: unknown, next: unknown): boolean {
  const a = normalizeGameReserveV66(previous), b = normalizeGameReserveV66(next);
  if (!a || !b || a.version !== b.version || a.reserveId !== b.reserveId || a.seed !== b.seed || b.tick < a.tick || a.status !== "active" && JSON.stringify(a) !== JSON.stringify(b)) return false;
  if (a.version === 2 && b.version === 2 && (a.lookout.recordedAt !== null
    ? a.lookout.recordedAt !== b.lookout.recordedAt || a.lookout.hunterX !== b.lookout.hunterX || a.lookout.hunterY !== b.lookout.hunterY
    : b.lookout.recordedAt !== null && b.lookout.recordedAt <= a.tick)) return false;
  if (a.version === 3 && b.version === 3 && a.routeV107.siteRecords.some((before, index) => {
    const after = b.routeV107.siteRecords[index];
    return before.recordedAt !== null ? JSON.stringify(before) !== JSON.stringify(after) : after.recordedAt !== null && after.recordedAt <= a.tick;
  })) return false;
  if (a.version === 4 && b.version === 4 && a.routeV108.siteRecords.some((before, index) => {
    const after = b.routeV108.siteRecords[index];
    return before.recordedAt !== null ? JSON.stringify(before) !== JSON.stringify(after) : after.recordedAt !== null && after.recordedAt <= a.tick;
  })) return false;
  if (a.version === 5 && b.version === 5 && a.routeV109.siteRecords.some((before, index) => {
    const after = b.routeV109.siteRecords[index];
    return before.recordedAt !== null ? JSON.stringify(before) !== JSON.stringify(after) : after.recordedAt !== null && after.recordedAt <= a.tick;
  })) return false;
  if (!a.visited.every(v => b.visited.includes(v)) || b.player.hp > a.player.hp || a.supplies.some((count, i) => b.supplies[i] > count)) return false;
  if (gameReserveV66MaterialTotal(a) !== gameReserveV66MaterialTotal(b) || a.supplies.some((count, index) => {
    const deniedBefore = a.deniedSupplies?.[index] ?? 0, deniedAfter = b.deniedSupplies?.[index] ?? 0;
    return deniedAfter < deniedBefore || deniedAfter - deniedBefore > count - b.supplies[index];
  })) return false;
  return a.humans.every((h, i) => { const n = b.humans[i], exit = n.disembarkation;
    const rampExit = !!exit && exit.tick > a.tick && exit.ship === h.team && a.ships[h.team].launch !== null &&
      exit.launchTick >= a.ships[h.team].launch! && b.ships[h.team].sabotages > a.ships[h.team].sabotages;
    if (h.disembarkation && (!exit || exit.tick < h.disembarkation.tick || exit.tick === h.disembarkation.tick && (exit.ship !== h.disembarkation.ship || exit.launchTick !== h.disembarkation.launchTick))) return false;
    return !(h.identified && !n.identified || h.secured && !n.secured ||
    h.status === "down" && (n.status !== "down" || h.downAt !== n.downAt) || h.status === "escaped" && n.status !== "escaped" ||
    h.status === "boarded" && !["boarded", "escaped"].includes(n.status) && !rampExit || n.hp > h.hp); }) &&
    a.ships.every((s, i) => {
      const n = b.ships[i], interrupted = n.interception;
      if (s.interception && (!interrupted || interrupted.tick < s.interception.tick || interrupted.tick === s.interception.tick && (interrupted.launchTick !== s.interception.launchTick || interrupted.hunterX !== s.interception.hunterX))) return false;
      if (interrupted && interrupted.tick > a.tick && (n.sabotages <= s.sabotages || s.launch !== null && interrupted.launchTick < s.launch)) return false;
      if (s.launch !== null && (n.launch === null || n.launch !== s.launch) && !(interrupted && interrupted.tick > a.tick && interrupted.launchTick >= s.launch && n.sabotages > s.sabotages)) return false;
      return (s.departedAt === null || n.departedAt === s.departedAt) && n.sabotages >= s.sabotages && n.parts >= s.parts;
    });
}
export function gameReserveV66LineClear(x1: number, y1: number, x2: number, y2: number, state?: TerrainVersion): boolean {
  return !gameReserveV66Cover(state).some(c => {
    const min = Math.min(x1, x2), max = Math.max(x1, x2); if (max < c.x || min > c.x + c.w) return false;
    const x = clamp((c.x + c.w / 2), min, max), ratio = Math.abs(x2 - x1) < .01 ? 0 : (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * ratio > c.top;
  });
}
export function gameReserveV66Sector(x: number, state?: TerrainVersion) { const sectors = gameReserveV66Sectors(state); return sectors[Math.min(sectors.length - 1, Math.max(0, Math.floor(x / 1600)))]; }
export function gameReserveV66Summary(s: GameReserveV66State) {
  return { secured: s.humans.filter(h => h.secured).length, abandoned: s.humans.filter(h => h.status === "down" && !h.secured).length,
    escaped: s.humans.filter(h => h.status === "escaped").length, aboard: s.humans.filter(h => h.status === "boarded").length,
    remaining: s.humans.filter(h => h.status === "active").length, observed: s.humans.filter(h => h.identified).length, seconds: Math.floor(s.tick / 60) };
}
export function gameReserveV66Interaction(s: GameReserveV66State): GameReserveV66State["channel"] {
  if (s.version === 2 && s.lookout.recordedAt === null && Math.abs(s.player.x - GAME_RESERVE_LOOKOUT_V104_SURVEY.x) <= GAME_RESERVE_LOOKOUT_V104_SURVEY.range &&
    s.player.y === GAME_RESERVE_LOOKOUT_V104_SURVEY.y && s.player.vy === 0) return { kind: "survey", target: 0, ticks: 0 };
  if (s.version === 5) {
    const site = gameReserveV66Sites(s).findIndex((point, index) => s.routeV109.siteRecords[index].recordedAt === null &&
      Math.abs(s.player.x - point.x) <= point.range && s.player.y === point.y && s.player.vy === 0);
    if (site >= 0) return {kind: 'survey', target: site, ticks: 0};
  }
  if (s.version === 4) {
    const site = GAME_RESERVE_EXPEDITION_V108_SITES.findIndex((point, index) => s.routeV108.siteRecords[index].recordedAt === null &&
      Math.abs(s.player.x - point.x) <= point.range && s.player.y === point.y && s.player.vy === 0);
    if (site >= 0) return { kind: "survey", target: site, ticks: 0 };
  }
  if (s.version === 3) {
    const site = GAME_RESERVE_EXPEDITION_V107_SITES.findIndex((point, index) => s.routeV107.siteRecords[index].recordedAt === null &&
      Math.abs(s.player.x - point.x) <= point.range && s.player.y === point.y && s.player.vy === 0);
    if (site >= 0) return { kind: "survey", target: site, ticks: 0 };
  }
  const ships = gameReserveV66Ships(s), supplies = gameReserveV66Supplies(s);
  const p = s.player; if (p.y < 433) return { kind: "none", target: -1, ticks: 0 };
  if (Math.abs(p.x - 115) < 55) return { kind: "return", target: -1, ticks: 0 };
  // A body at the ramp must not mask the last opportunity to stop an active launch.
  const launching = s.ships.findIndex((a, n) => a.departedAt === null && a.launch !== null && Math.abs(ships[n].x - p.x) < 75);
  if (launching >= 0) return { kind: "sabotage", target: launching, ticks: 0 };
  const trophy = s.humans.findIndex(h => h.status === "down" && !h.secured && Math.abs(h.x - p.x) < 45);
  if (trophy >= 0) return { kind: "trophy", target: trophy, ticks: 0 };
  const ship = s.ships.findIndex((a, n) => a.departedAt === null && a.repair > 0 && Math.abs(ships[n].x - p.x) < 75);
  if (ship >= 0) return { kind: "sabotage", target: ship, ticks: 0 };
  const cache = supplies.findIndex((x, index) => s.supplies[index] > 0 && Math.abs(x - p.x) < 45);
  return cache >= 0 ? { kind: "cache", target: cache, ticks: 0 } : { kind: "none", target: -1, ticks: 0 };
}
export function gameReserveV66InteractionDuration(kind: GameReserveV66State["channel"]["kind"]): number {
  return kind === "return" ? 60 : kind === "trophy" ? 180 : kind === "sabotage" ? 90 : kind === "cache" || kind === "survey" ? 120 : 0;
}
function downHuman(s: GameReserveV66State, h: GameReserveV66Human) {
  delete h.recovering;
  h.hp = Math.max(0, h.hp); if (h.hp > 0) return;
  h.status = "down"; h.downAt = s.tick; h.windup = 0; h.moving = false;
  // A fallen carrier keeps its physical component at the body. Other caches contain spare parts;
  // nothing teleports back to a distant cache when the carrier dies.
  log(s, "Une proie armée est au sol. Le prélèvement demande de rester exposé à proximité.");
}
/** Fixed 60 Hz simulation. No wall clock, offscreen teleportation or enemy knowledge of the player without a witness. */
export function stepGameReserveV66(state: GameReserveV66State, input: GameReserveV66Input = {}, paused = false): GameReserveV66State {
  if (paused || state.status !== "active") return state;
  const s = structuredClone(state);
  if (!s.inputArmed) { if (neutral(input)) s.inputArmed = true; return s; }
  s.tick++; const p = s.player, move = input.move === -1 || input.move === 1 ? input.move : 0;
  const world = gameReserveV66World(s), platforms = gameReserveV66Platforms(s), people = gameReserveV66People(s), ships = gameReserveV66Ships(s), supplies = gameReserveV66Supplies(s);
  p.cooldown = Math.max(0, p.cooldown - 1); p.moving = move !== 0;
  if (input.cloak && !s.previous.cloak && p.energy >= 10) p.cloak = !p.cloak;
  p.energy = clamp(p.energy + (p.cloak ? -.085 : .08), 0, 100); if (p.energy === 0) p.cloak = false;
  if (move) p.facing = move;
  const speed = input.scan || input.interact ? 1.5 : 3.8;
  p.x = clamp(p.x + move * speed, 40, world.width - 40);
  const supported = p.y === 438 || platforms.some(a => Math.abs(p.y - a.y) < .001 && p.x > a.x - 10 && p.x < a.x + a.w + 10);
  if (input.jump && !s.previous.jump && supported) p.vy = -12.4;
  const previousY = p.y; p.vy = Math.min(18, p.vy + .56); p.y += p.vy;
  let floor = 438;
  if (p.vy >= 0) for (const a of platforms) if (p.x > a.x - 10 && p.x < a.x + a.w + 10 && previousY <= a.y && p.y >= a.y) floor = Math.min(floor, a.y);
  if (p.y >= floor && p.vy >= 0) { p.y = floor; p.vy = 0; }
  const sector = Math.floor(p.x / 1600); if (!s.visited.includes(sector)) { s.visited.push(sector); log(s, gameReserveV66Sector(p.x, s).name + " — secteur atteint par le terrain."); }
  if (input.attack && !s.previous.attack && p.cooldown === 0 && p.energy >= 16) {
    p.energy -= 16; p.cloak = false; p.cooldown = 40;
    const target = s.humans.filter(h => h.status === "active" && (h.x - p.x) * p.facing > 25 && Math.abs(h.x - p.x) < 500 &&
      gameReserveV66LineClear(p.x, p.y - 53, h.x, 390, s)).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const dx = target ? target.x - p.x : p.facing * 200, dy = target ? 390 - (p.y - 53) : 0, length = Math.hypot(dx, dy);
    s.projectiles.push({ x: p.x + p.facing * 25, y: p.y - 53, vx: dx / length * 12, vy: dy / length * 12, owner: "hunter", life: 70 });
    for (const h of s.humans) if (h.status === "active" && Math.abs(h.x - p.x) < 470 && gameReserveV66LineClear(h.x, 387, p.x, p.y - 53, s)) { h.lastSeenX = p.x; h.lastSeenY = p.y - 53; h.alertUntil = s.tick + 360; }
  }
  if (input.melee && !s.previous.melee && p.cooldown === 0) {
    p.cloak = false; p.cooldown = 28;
    const target = s.humans.find(h => h.status === "active" && Math.abs(h.x - p.x) < 75 && (h.x - p.x) * p.facing > -10 && p.y > 385);
    if (target) { target.hp -= 40; target.lastSeenX = p.x; target.lastSeenY = p.y - 53; target.alertUntil = s.tick + 360; downHuman(s, target); }
  }
  // Human goals use known resource caches and walk there. Detection is local; nearby allies only share actual sightings.
  for (let index = 0; index < s.humans.length; index++) {
    const h = s.humans[index], definition = people[index], role = definition.role, tactics = definition.tactics;
    if (h.status !== "active") continue;
    h.shotCooldown = Math.max(0, h.shotCooldown - 1); h.moving = false;
    const range = p.cloak ? p.moving ? 105 : 55 : tactics?.sight ?? (role === "marksman" ? 430 : 325);
    const visible = Math.abs(h.x - p.x) < range && (p.x - h.x) * h.facing > -75 && gameReserveV66LineClear(h.x, 387, p.x, p.y - 45, s);
    if (visible) { h.lastSeenX = p.x; h.lastSeenY = p.y - 45; h.alertUntil = s.tick + 300;
      for (const ally of s.humans) if (ally !== h && ally.status === "active" && Math.abs(ally.x - h.x) < (tactics?.witnessRange ?? 140)) { ally.lastSeenX = h.lastSeenX; ally.lastSeenY = h.lastSeenY; ally.alertUntil = Math.max(ally.alertUntil, s.tick + 240); }
    }
    if (input.scan && Math.abs(h.x - p.x) < 330 && gameReserveV66LineClear(p.x, p.y - 55, h.x, 385, s)) {
      h.scan = Math.min(90, h.scan + 1); if (h.scan === 90 && !h.identified) { h.identified = true; log(s, definition.name + " : " + definition.description); }
    } else if (!h.identified) h.scan = 0;
    if (h.lastSeenX !== null && h.alertUntil > s.tick) {
      delete h.recovering;
      const delta = h.lastSeenX - h.x; h.facing = delta >= 0 ? 1 : -1;
      if (h.disembarkation && s.tick - h.disembarkation.tick < 90 && Math.abs(delta) < 95) {
        // Leave a crowded ramp on foot before defending it; no stacked instant relocation.
        const retreat = delta === 0 ? index % 2 ? -1 : 1 : delta > 0 ? -1 : 1;
        h.x = clamp(h.x + retreat * .7, 40, world.width - 40); h.moving = true;
      } else if (Math.abs(delta) > 240) { h.x += h.facing * .7; h.moving = true; }
      if (h.windup === 0 && h.shotCooldown === 0 && Math.abs(delta) < 470 && gameReserveV66LineClear(h.x, 385, h.lastSeenX, h.lastSeenY, s)) h.windup = tactics?.windup ?? 24;
      if (h.windup > 0 && --h.windup === 0) {
        const dx = h.lastSeenX - h.x, dy = h.lastSeenY - 385, length = Math.max(1, Math.hypot(dx, dy));
        s.projectiles.push({ x: h.x + h.facing * 22, y: 385, vx: dx / length * 7, vy: dy / length * 7, owner: "human", life: 80 }); h.shotCooldown = tactics?.shotCooldown ?? (role === "marksman" ? 145 : 110);
      }
      continue;
    }
    h.windup = 0;
    let ship = s.ships[h.team];
    if (ship.departedAt !== null) {
      const other = s.version === 3 || s.version === 4 || s.version === 5 ? s.ships.map((candidate, index) => ({ candidate, index, distance: Math.abs(ships[index].x - h.x) }))
        .filter(item => item.candidate.departedAt === null).sort((a, b) => a.distance - b.distance)[0]?.index : h.team === 0 ? 1 : 0;
      delete h.recovering;
      if (other !== undefined && s.ships[other].departedAt === null) { h.team = other as 0 | 1 | 2 | 3; ship = s.ships[other]; } else continue;
    }
    const shipX = ships[h.team].x;
    const reachableBody = (body: GameReserveV66Human) => body !== h && body.status === "down" && body.carrying && body.team === h.team &&
      Math.abs(body.x - h.x) <= GAME_RESERVE_V99_RECOVERY_RANGE && gameReserveV66LineClear(h.x, 387, body.x, 410, s);
    let body = h.recovering ? s.humans.find(candidate => candidate.id === h.recovering!.bodyId && reachableBody(candidate)) : undefined;
    if (h.carrying || !body) delete h.recovering;
    if (!h.carrying && !h.recovering && ship.parts < 3) {
      body = s.humans.filter(candidate => reachableBody(candidate) && !s.humans.some(ally => ally.status === "active" && ally.recovering?.bodyId === candidate.id))
        .sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
      if (body) { h.recovering = { bodyId: body.id, ticks: 0 }; h.work = 0; }
    }
    if (h.recovering && body) {
      const delta = body.x - h.x;
      if (Math.abs(delta) > 12) { h.facing = delta >= 0 ? 1 : -1; h.x += h.facing * (tactics?.speed ?? (role === "veteran" ? .8 : .95)); h.moving = true; h.recovering.ticks = 0; }
      else h.recovering.ticks++;
      // Completion follows projectile resolution, so even a last-frame injury interrupts the work.
      if (h.moving && (s.tick + index * 17) % 90 === 0) s.tracks.push({ x: h.x, tick: s.tick, direction: h.facing });
      continue;
    }
    const assignment = gameReserveV109Behavior(s, index) ?? gameReserveV108Behavior(s, index);
    if (assignment) {
      const delta = assignment.destination - h.x;
      h.work = 0;
      if (Math.abs(delta) > 12) { h.facing = delta >= 0 ? 1 : -1; h.x += h.facing * (tactics?.speed ?? .9); h.moving = true; }
      if (h.moving && (s.tick + index * 17) % 90 === 0) s.tracks.push({ x: h.x, tick: s.tick, direction: h.facing });
      continue;
    }
    let destination: number = shipX;
    if (ship.parts < 3 && !h.carrying) {
      if (s.supplies[h.targetSupply] === 0) {
        const available = s.supplies.map((count, n) => ({ count, n, distance: Math.abs(supplies[n] - h.x) })).filter(a => a.count > 0).sort((a, b) => a.distance - b.distance)[0];
        if (available) h.targetSupply = available.n;
      }
      destination = supplies[h.targetSupply];
    }
    const delta = destination - h.x;
    if (Math.abs(delta) > 12) { h.facing = delta >= 0 ? 1 : -1; h.x += h.facing * (h.carrying ? tactics?.carryingSpeed ?? .65 : tactics?.speed ?? (role === "veteran" ? .8 : .95)); h.moving = true; h.work = 0; }
    else if (ship.parts < 3 && !h.carrying && s.supplies[h.targetSupply] > 0) { if (++h.work >= 150) { s.supplies[h.targetSupply]--; h.carrying = true; h.work = 0; } }
    else if (h.carrying && ship.parts < 4) { ship.parts++; h.carrying = false; h.work = 0; log(s, "Un composant a été apporté au " + ships[h.team].name.toLocaleLowerCase("fr") + "."); }
    else if (ship.parts >= 3 && ship.repair < 3600) ship.repair = Math.min(3600, ship.repair + (tactics?.repair ?? (role === "technician" ? 2 : .45)));
    else if (ship.launch !== null && Math.abs(h.x - shipX) < 26) { h.status = "boarded"; h.moving = false; log(s, "Un combattant embarque dans le " + ships[h.team].name.toLocaleLowerCase("fr") + "."); }
    if (h.moving && (s.tick + index * 17) % 90 === 0) s.tracks.push({ x: h.x, tick: s.tick, direction: h.facing });
  }
  s.tracks = s.tracks.filter(t => s.tick - t.tick < 2400).slice(-96);
  for (let n = 0; n < s.ships.length; n++) {
    const ship = s.ships[n];
    if (ship.repair === 3600 && ship.launch === null) { ship.launch = s.tick; log(s, ships[n].name + " : moteurs en marche. Décollage dans 15 secondes !"); }
    if (ship.launch !== null && ship.departedAt === null && s.tick - ship.launch >= 900) { ship.departedAt = s.tick; for (const h of s.humans) if (h.team === n && h.status === "boarded") h.status = "escaped"; log(s, ships[n].name + " a décollé avec les combattants réellement à bord."); }
  }
  const healthBefore = p.hp;
  s.projectiles = s.projectiles.filter(b => {
    const x = b.x, y = b.y; b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0 || b.x < 0 || b.x > world.width || b.y < 0 || b.y > 540 || !gameReserveV66LineClear(x, y, b.x, b.y, s)) return false;
    if (b.owner === "human" && Math.abs(b.x - p.x) < 20 && b.y > p.y - 100 && b.y < p.y) { p.hp = Math.max(0, p.hp - 8); p.cloak = false; return false; }
    if (b.owner === "hunter") { const hit = s.humans.find(h => h.status === "active" && Math.abs(b.x - h.x) < 22 && b.y > 345 && b.y < 438); if (hit) { hit.hp -= 36; downHuman(s, hit); return false; } }
    return true;
  }).slice(-40);
  for (const human of s.humans) if (human.recovering) {
    const body = s.humans.find(candidate => candidate.id === human.recovering!.bodyId);
    if (human.status !== "active" || human.carrying || human.lastSeenX !== null && human.alertUntil > s.tick || !body || body.status !== "down" ||
      !body.carrying || body.team !== human.team || Math.abs(body.x - human.x) > GAME_RESERVE_V99_RECOVERY_RANGE || !gameReserveV66LineClear(human.x, 387, body.x, 410, s)) delete human.recovering;
    else if (human.recovering.ticks >= GAME_RESERVE_V99_RECOVERY_TICKS) {
      body.carrying = false; human.carrying = true; human.work = 0;
      for (const ally of s.humans) if (ally.recovering?.bodyId === body.id) delete ally.recovering;
      log(s, "Un survivant a récupéré le composant d’un porteur abattu. Il doit encore le rapporter à son appareil.");
    }
  }
  const action = gameReserveV66Interaction(s);
  if (input.interact && !move && p.hp === healthBefore && action.kind !== "none") {
    p.cloak = false;
    s.channel = { ...action, ticks: s.channel.kind === action.kind && s.channel.target === action.target ? s.channel.ticks + 1 : 1 };
    if (s.channel.ticks >= gameReserveV66InteractionDuration(action.kind)) {
      if (action.kind === "trophy") { s.humans[action.target].secured = true; log(s, "Prise sécurisée. Elle reste au bilan de cette expédition, sans ajout automatique à la collection."); }
      if (action.kind === "sabotage") {
        const ship = s.ships[action.target], launchTick = ship.launch;
        ship.repair = Math.max(0, ship.repair - 2000); ship.sabotages++;
        if (launchTick !== null) {
          ship.interception = { tick: s.tick, launchTick, hunterX: p.x }; ship.launch = null;
          for (const human of s.humans) if (human.team === action.target && human.status === "boarded") {
            // Boarding happens at the ramp's ground coordinate. Exiting does not relocate or heal anyone.
            human.status = "active"; human.moving = false; human.work = 0;
            human.disembarkation = { tick: s.tick, ship: action.target as 0 | 1 | 2 | 3, launchTick };
            human.lastSeenX = p.x; human.lastSeenY = p.y - 45; human.alertUntil = s.tick + 300; human.shotCooldown = Math.max(45, human.shotCooldown);
          }
          log(s, "Décollage interrompu : les passagers ressortent à la rampe et défendent leur appareil. Le circuit reste réparable.");
        } else log(s, "Circuit endommagé. Les humains encore présents peuvent le réparer.");
      }
      if (action.kind === "cache") {
        s.supplies[action.target]--;
        s.deniedSupplies ??= supplies.map(() => 0);
        s.deniedSupplies[action.target]++;
        log(s, "Un lot de composants neutralisé au dépôt. Les pièces déjà emportées restent utilisables par les survivants.");
      }
      if (action.kind === "survey" && s.version === 2) {
        s.lookout = { recordedAt: s.tick, hunterX: p.x, hunterY: p.y };
        log(s, "Repères des Balises relevés depuis le poste haut. Le relevé reste au carnet ; rejoins physiquement l’extraction à l’ouest.");
      }
      if (action.kind === "survey" && s.version === 3) {
        s.routeV107.siteRecords[action.target] = { recordedAt: s.tick, hunterX: p.x, hunterY: p.y };
        log(s, GAME_RESERVE_EXPEDITION_V107_SITES[action.target].name + " : relevé consigné. Le terrain et les évasions continuent ; retourne à l’extraction pour le rapporter.");
      }
      if (action.kind === "survey" && s.version === 4) {
        s.routeV108.siteRecords[action.target] = { recordedAt: s.tick, hunterX: p.x, hunterY: p.y };
        log(s, GAME_RESERVE_EXPEDITION_V108_SITES[action.target].name + " : notes consignées. Le retour à l’extraction reste nécessaire.");
      }
      if (action.kind === 'survey' && s.version === 5) {
        s.routeV109.siteRecords[action.target] = {recordedAt: s.tick, hunterX: p.x, hunterY: p.y};
        log(s, gameReserveV66Sites(s)[action.target].name + ' : relevé consigné. Reviens physiquement à l’extraction pour le rapporter.');
      }
      if (action.kind === "return") { s.status = "returned"; s.terminalTick = s.tick; log(s, "Retour au point d'extraction. Fin de cette expédition."); }
      s.channel = { kind: "none", target: -1, ticks: 0 };
    }
  } else s.channel = { kind: "none", target: -1, ticks: 0 };
  if (p.hp === 0) { s.status = "incapacitated"; s.terminalTick = s.tick; s.channel = { kind: "none", target: -1, ticks: 0 }; log(s, "Chasseur hors combat. Aucun résultat n'est transformé en récompense de campagne."); }
  s.previous = { jump: !!input.jump, attack: !!input.attack, melee: !!input.melee, cloak: !!input.cloak };
  return s;
}
