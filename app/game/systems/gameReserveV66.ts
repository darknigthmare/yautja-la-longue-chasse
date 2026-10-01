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
export const GAME_RESERVE_V66_SHIPS = [
  { id: "drill-transport", name: "Transport abandonné", x: 2360 },
  { id: "camp-shuttle", name: "Navette du camp", x: 4540 },
] as const;
export const GAME_RESERVE_V66_STATUSES = ["active", "returned", "incapacitated"] as const;
export type GameReserveV66Status = typeof GAME_RESERVE_V66_STATUSES[number];
type HumanStatus = "active" | "down" | "boarded" | "escaped";
export interface GameReserveV66Human {
  id: string; x: number; facing: -1 | 1; hp: number; status: HumanStatus; team: 0 | 1;
  carrying: boolean; targetSupply: number; work: number; lastSeenX: number | null; lastSeenY: number;
  alertUntil: number; shotCooldown: number; windup: number; moving: boolean; identified: boolean;
  scan: number; secured: boolean; downAt: number | null;
}
export interface GameReserveV66State {
  version: 1; reserveId: "vharuun-first-expedition"; seed: number; tick: number; status: GameReserveV66Status;
  player: { x: number; y: number; vy: number; facing: -1 | 1; hp: number; energy: number; cloak: boolean; cooldown: number; moving: boolean };
  humans: GameReserveV66Human[];
  ships: { parts: number; repair: number; launch: number | null; departedAt: number | null; sabotages: number }[];
  supplies: number[]; tracks: { x: number; tick: number; direction: -1 | 1 }[];
  projectiles: { x: number; y: number; vx: number; vy: number; owner: "hunter" | "human"; life: number }[];
  channel: { kind: "none" | "trophy" | "sabotage" | "return"; target: number; ticks: number };
  visited: number[]; log: { tick: number; message: string }[]; terminalTick: number | null;
  inputArmed: boolean; previous: { jump: boolean; attack: boolean; melee: boolean; cloak: boolean };
}
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
/** Reject unsupported and contradictory saves; no implicit reset and no free inventory or canonical rewards. */
export function normalizeGameReserveV66(value: unknown): GameReserveV66State | null {
  if (!record(value) || value.version !== 1 || value.reserveId !== "vharuun-first-expedition" || !integer(value.seed, 0, 4294967295) ||
    !integer(value.tick, 0, 100000000) || !GAME_RESERVE_V66_STATUSES.includes(value.status as GameReserveV66Status) || !record(value.player) ||
    !Array.isArray(value.humans) || value.humans.length !== 8 || !Array.isArray(value.ships) || value.ships.length !== 2 ||
    !Array.isArray(value.supplies) || value.supplies.length !== 8 || !value.supplies.every(v => integer(v, 0, 2)) ||
    !Array.isArray(value.tracks) || value.tracks.length > 96 || !Array.isArray(value.projectiles) || value.projectiles.length > 40 ||
    !Array.isArray(value.visited) || !value.visited.includes(0) || new Set(value.visited).size !== value.visited.length || !value.visited.every(v => integer(v, 0, 2)) ||
    !Array.isArray(value.log) || value.log.length > 18 || !record(value.channel) || !record(value.previous) || !bool(value.inputArmed)) return null;
  const p = value.player;
  if (!number(p.x, 40, 4760) || !number(p.y, 120, 438) || !number(p.vy, -13, 18) || !facing(p.facing) || !number(p.hp, 0, 100) ||
    !number(p.energy, 0, 100) || !bool(p.cloak) || !integer(p.cooldown, 0, 60) || !bool(p.moving) ||
    !["jump", "attack", "melee", "cloak"].every(k => bool((value.previous as Record<string, unknown>)[k]))) return null;
  const tick = value.tick;
  for (let n = 0; n < 8; n++) {
    const h = value.humans[n];
    if (!record(h) || h.id !== GAME_RESERVE_V66_PEOPLE[n].id || !number(h.x, 40, 4760) || !facing(h.facing) || !number(h.hp, 0, 70) ||
      typeof h.status !== "string" || !["active", "down", "boarded", "escaped"].includes(h.status) || !integer(h.team, 0, 1) || !bool(h.carrying) || !integer(h.targetSupply, 0, 7) ||
      !number(h.work, 0, 180) || h.lastSeenX !== null && !number(h.lastSeenX, 40, 4760) || !number(h.lastSeenY, 60, 438) ||
      !integer(h.alertUntil, 0, tick + 360) || !integer(h.shotCooldown, 0, 200) || !integer(h.windup, 0, 24) || !bool(h.moving) || !bool(h.identified) ||
      !integer(h.scan, 0, 90) || !bool(h.secured) || h.downAt !== null && !integer(h.downAt, 0, tick)) return null;
    if ((h.status === "down") !== (h.hp === 0) || (h.status === "down") !== (h.downAt !== null) || h.secured && h.status !== "down" ||
      h.identified !== (h.scan === 90)) return null;
    const ship = value.ships[h.team];
    if (!record(ship) || h.status === "escaped" && ship.departedAt === null || h.status === "boarded" && (ship.launch === null || ship.departedAt !== null) ||
      ["boarded", "escaped"].includes(h.status) && Math.abs(h.x - GAME_RESERVE_V66_SHIPS[h.team].x) > 26) return null;
  }
  for (const ship of value.ships) if (!record(ship) || !integer(ship.parts, 0, 4) || !number(ship.repair, 0, 3600) ||
    ship.launch !== null && !integer(ship.launch, 0, tick) || ship.departedAt !== null && !integer(ship.departedAt, 0, tick) ||
    !integer(ship.sabotages, 0, 100000) || ship.launch !== null && (ship.parts < 3 || ship.repair !== 3600) ||
    ship.departedAt !== null && (ship.launch === null || ship.departedAt < (ship.launch as number) + 900)) return null;
  if (!value.tracks.every(t => record(t) && number(t.x, 40, 4760) && integer(t.tick, 0, tick) && facing(t.direction)) ||
    !value.projectiles.every(b => record(b) && number(b.x, 0, 4800) && number(b.y, 0, 540) && number(b.vx, -14, 14) && number(b.vy, -14, 14) &&
      typeof b.owner === "string" && ["hunter", "human"].includes(b.owner) && integer(b.life, 1, 90)) ||
    !value.log.every(e => record(e) && integer(e.tick, 0, tick) && typeof e.message === "string" && e.message.length <= 250)) return null;
  const c = value.channel;
  if (typeof c.kind !== "string" || !["none", "trophy", "sabotage", "return"].includes(c.kind) || !integer(c.target, -1, 7) || !integer(c.ticks, 0, 179) ||
    c.kind === "none" && (c.target !== -1 || c.ticks !== 0) || c.kind === "sabotage" && !integer(c.target, 0, 1) ||
    c.kind === "trophy" && !integer(c.target, 0, 7) || c.kind === "return" && c.target !== -1) return null;
  if (value.status === "active" ? value.terminalTick !== null || p.hp === 0 : !integer(value.terminalTick, 0, tick) ||
    value.status === "incapacitated" && p.hp !== 0 || value.status === "returned" && (p.hp === 0 || Math.abs(p.x - 115) > 55)) return null;
  return structuredClone(value) as unknown as GameReserveV66State;
}
export const gameReserveV66Supported = (value: unknown) => value === undefined || value === null || normalizeGameReserveV66(value) !== null;
/** The host uses this for periodic writes. Terminal events, prey outcomes and inspected identities cannot roll back. */
export function canAdvanceGameReserveV66(previous: unknown, next: unknown): boolean {
  const a = normalizeGameReserveV66(previous), b = normalizeGameReserveV66(next);
  if (!a || !b || a.seed !== b.seed || b.tick < a.tick || a.status !== "active" && JSON.stringify(a) !== JSON.stringify(b)) return false;
  if (!a.visited.every(v => b.visited.includes(v)) || b.player.hp > a.player.hp || a.supplies.some((count, i) => b.supplies[i] > count)) return false;
  return a.humans.every((h, i) => { const n = b.humans[i]; return !(h.identified && !n.identified || h.secured && !n.secured ||
    h.status === "down" && (n.status !== "down" || h.downAt !== n.downAt) || h.status === "escaped" && n.status !== "escaped" ||
    h.status === "boarded" && !["boarded", "escaped"].includes(n.status) || n.hp > h.hp); }) &&
    a.ships.every((s, i) => (s.departedAt === null || b.ships[i].departedAt === s.departedAt) && b.ships[i].sabotages >= s.sabotages && b.ships[i].parts >= s.parts);
}
export function gameReserveV66LineClear(x1: number, y1: number, x2: number, y2: number): boolean {
  return !GAME_RESERVE_V66_COVER.some(c => {
    const min = Math.min(x1, x2), max = Math.max(x1, x2); if (max < c.x || min > c.x + c.w) return false;
    const x = clamp((c.x + c.w / 2), min, max), ratio = Math.abs(x2 - x1) < .01 ? 0 : (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * ratio > c.top;
  });
}
export function gameReserveV66Sector(x: number) { return GAME_RESERVE_V66_SECTORS[Math.min(2, Math.max(0, Math.floor(x / 1600)))]; }
export function gameReserveV66Summary(s: GameReserveV66State) {
  return { secured: s.humans.filter(h => h.secured).length, abandoned: s.humans.filter(h => h.status === "down" && !h.secured).length,
    escaped: s.humans.filter(h => h.status === "escaped").length, aboard: s.humans.filter(h => h.status === "boarded").length,
    remaining: s.humans.filter(h => h.status === "active").length, observed: s.humans.filter(h => h.identified).length, seconds: Math.floor(s.tick / 60) };
}
export function gameReserveV66Interaction(s: GameReserveV66State): GameReserveV66State["channel"] {
  const p = s.player; if (p.y < 433) return { kind: "none", target: -1, ticks: 0 };
  if (Math.abs(p.x - 115) < 55) return { kind: "return", target: -1, ticks: 0 };
  const trophy = s.humans.findIndex(h => h.status === "down" && !h.secured && Math.abs(h.x - p.x) < 45);
  if (trophy >= 0) return { kind: "trophy", target: trophy, ticks: 0 };
  const ship = s.ships.findIndex((a, n) => a.departedAt === null && a.launch === null && a.repair > 0 && Math.abs(GAME_RESERVE_V66_SHIPS[n].x - p.x) < 75);
  return ship >= 0 ? { kind: "sabotage", target: ship, ticks: 0 } : { kind: "none", target: -1, ticks: 0 };
}
function downHuman(s: GameReserveV66State, h: GameReserveV66Human) {
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
  p.cooldown = Math.max(0, p.cooldown - 1); p.moving = move !== 0;
  if (input.cloak && !s.previous.cloak && p.energy >= 10) p.cloak = !p.cloak;
  p.energy = clamp(p.energy + (p.cloak ? -.085 : .08), 0, 100); if (p.energy === 0) p.cloak = false;
  if (move) p.facing = move;
  const speed = input.scan || input.interact ? 1.5 : 3.8;
  p.x = clamp(p.x + move * speed, 40, 4760);
  const supported = p.y === 438 || GAME_RESERVE_V66_PLATFORMS.some(a => Math.abs(p.y - a.y) < .001 && p.x > a.x - 10 && p.x < a.x + a.w + 10);
  if (input.jump && !s.previous.jump && supported) p.vy = -12.4;
  const previousY = p.y; p.vy = Math.min(18, p.vy + .56); p.y += p.vy;
  let floor = 438;
  if (p.vy >= 0) for (const a of GAME_RESERVE_V66_PLATFORMS) if (p.x > a.x - 10 && p.x < a.x + a.w + 10 && previousY <= a.y && p.y >= a.y) floor = Math.min(floor, a.y);
  if (p.y >= floor && p.vy >= 0) { p.y = floor; p.vy = 0; }
  const sector = Math.floor(p.x / 1600); if (!s.visited.includes(sector)) { s.visited.push(sector); log(s, gameReserveV66Sector(p.x).name + " — secteur atteint par le terrain."); }
  if (input.attack && !s.previous.attack && p.cooldown === 0 && p.energy >= 16) {
    p.energy -= 16; p.cloak = false; p.cooldown = 40;
    const target = s.humans.filter(h => h.status === "active" && (h.x - p.x) * p.facing > 25 && Math.abs(h.x - p.x) < 500 &&
      gameReserveV66LineClear(p.x, p.y - 53, h.x, 390)).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const dx = target ? target.x - p.x : p.facing * 200, dy = target ? 390 - (p.y - 53) : 0, length = Math.hypot(dx, dy);
    s.projectiles.push({ x: p.x + p.facing * 25, y: p.y - 53, vx: dx / length * 12, vy: dy / length * 12, owner: "hunter", life: 70 });
    for (const h of s.humans) if (h.status === "active" && Math.abs(h.x - p.x) < 470 && gameReserveV66LineClear(h.x, 387, p.x, p.y - 53)) { h.lastSeenX = p.x; h.lastSeenY = p.y - 53; h.alertUntil = s.tick + 360; }
  }
  if (input.melee && !s.previous.melee && p.cooldown === 0) {
    p.cloak = false; p.cooldown = 28;
    const target = s.humans.find(h => h.status === "active" && Math.abs(h.x - p.x) < 75 && (h.x - p.x) * p.facing > -10 && p.y > 385);
    if (target) { target.hp -= 40; target.lastSeenX = p.x; target.lastSeenY = p.y - 53; target.alertUntil = s.tick + 360; downHuman(s, target); }
  }
  // Human goals use known resource caches and walk there. Detection is local; nearby allies only share actual sightings.
  for (let index = 0; index < s.humans.length; index++) {
    const h = s.humans[index], role = GAME_RESERVE_V66_PEOPLE[index].role;
    if (h.status !== "active") continue;
    h.shotCooldown = Math.max(0, h.shotCooldown - 1); h.moving = false;
    const range = p.cloak ? p.moving ? 105 : 55 : role === "marksman" ? 430 : 325;
    const visible = Math.abs(h.x - p.x) < range && (p.x - h.x) * h.facing > -75 && gameReserveV66LineClear(h.x, 387, p.x, p.y - 45);
    if (visible) { h.lastSeenX = p.x; h.lastSeenY = p.y - 45; h.alertUntil = s.tick + 300;
      for (const ally of s.humans) if (ally !== h && ally.status === "active" && Math.abs(ally.x - h.x) < 140) { ally.lastSeenX = h.lastSeenX; ally.lastSeenY = h.lastSeenY; ally.alertUntil = Math.max(ally.alertUntil, s.tick + 240); }
    }
    if (input.scan && Math.abs(h.x - p.x) < 330 && gameReserveV66LineClear(p.x, p.y - 55, h.x, 385)) {
      h.scan = Math.min(90, h.scan + 1); if (h.scan === 90 && !h.identified) { h.identified = true; log(s, GAME_RESERVE_V66_PEOPLE[index].name + " : " + GAME_RESERVE_V66_PEOPLE[index].description); }
    } else if (!h.identified) h.scan = 0;
    if (h.lastSeenX !== null && h.alertUntil > s.tick) {
      const delta = h.lastSeenX - h.x; h.facing = delta >= 0 ? 1 : -1;
      if (Math.abs(delta) > 240) { h.x += h.facing * .7; h.moving = true; }
      if (h.windup === 0 && h.shotCooldown === 0 && Math.abs(delta) < 470 && gameReserveV66LineClear(h.x, 385, h.lastSeenX, h.lastSeenY)) h.windup = 24;
      if (h.windup > 0 && --h.windup === 0) {
        const dx = h.lastSeenX - h.x, dy = h.lastSeenY - 385, length = Math.max(1, Math.hypot(dx, dy));
        s.projectiles.push({ x: h.x + h.facing * 22, y: 385, vx: dx / length * 7, vy: dy / length * 7, owner: "human", life: 80 }); h.shotCooldown = role === "marksman" ? 145 : 110;
      }
      continue;
    }
    h.windup = 0;
    let ship = s.ships[h.team];
    if (ship.departedAt !== null) { const other = h.team === 0 ? 1 : 0; if (s.ships[other].departedAt === null) { h.team = other; ship = s.ships[other]; } else continue; }
    const shipX = GAME_RESERVE_V66_SHIPS[h.team].x;
    let destination: number = shipX;
    if (ship.parts < 3 && !h.carrying) {
      if (s.supplies[h.targetSupply] === 0) {
        const available = s.supplies.map((count, n) => ({ count, n, distance: Math.abs(GAME_RESERVE_V66_SUPPLIES[n] - h.x) })).filter(a => a.count > 0).sort((a, b) => a.distance - b.distance)[0];
        if (available) h.targetSupply = available.n;
      }
      destination = GAME_RESERVE_V66_SUPPLIES[h.targetSupply];
    }
    const delta = destination - h.x;
    if (Math.abs(delta) > 12) { h.facing = delta >= 0 ? 1 : -1; h.x += h.facing * (h.carrying ? .65 : role === "veteran" ? .8 : .95); h.moving = true; h.work = 0; }
    else if (ship.parts < 3 && !h.carrying && s.supplies[h.targetSupply] > 0) { if (++h.work >= 150) { s.supplies[h.targetSupply]--; h.carrying = true; h.work = 0; } }
    else if (h.carrying) { ship.parts = Math.min(4, ship.parts + 1); h.carrying = false; h.work = 0; log(s, "Un composant a été apporté au " + GAME_RESERVE_V66_SHIPS[h.team].name.toLocaleLowerCase("fr") + "."); }
    else if (ship.parts >= 3 && ship.repair < 3600) ship.repair = Math.min(3600, ship.repair + (role === "technician" ? 2 : .45));
    else if (ship.launch !== null && Math.abs(h.x - shipX) < 26) { h.status = "boarded"; h.moving = false; log(s, "Un combattant embarque dans le " + GAME_RESERVE_V66_SHIPS[h.team].name.toLocaleLowerCase("fr") + "."); }
    if (h.moving && (s.tick + index * 17) % 90 === 0) s.tracks.push({ x: h.x, tick: s.tick, direction: h.facing });
  }
  s.tracks = s.tracks.filter(t => s.tick - t.tick < 2400).slice(-96);
  for (let n = 0; n < s.ships.length; n++) {
    const ship = s.ships[n];
    if (ship.repair === 3600 && ship.launch === null) { ship.launch = s.tick; log(s, GAME_RESERVE_V66_SHIPS[n].name + " : moteurs en marche. Décollage dans 15 secondes !"); }
    if (ship.launch !== null && ship.departedAt === null && s.tick - ship.launch >= 900) { ship.departedAt = s.tick; for (const h of s.humans) if (h.team === n && h.status === "boarded") h.status = "escaped"; log(s, GAME_RESERVE_V66_SHIPS[n].name + " a décollé avec les combattants réellement à bord."); }
  }
  const healthBefore = p.hp;
  s.projectiles = s.projectiles.filter(b => {
    const x = b.x, y = b.y; b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0 || b.x < 0 || b.x > 4800 || b.y < 0 || b.y > 540 || !gameReserveV66LineClear(x, y, b.x, b.y)) return false;
    if (b.owner === "human" && Math.abs(b.x - p.x) < 20 && b.y > p.y - 100 && b.y < p.y) { p.hp = Math.max(0, p.hp - 8); p.cloak = false; return false; }
    if (b.owner === "hunter") { const hit = s.humans.find(h => h.status === "active" && Math.abs(b.x - h.x) < 22 && b.y > 345 && b.y < 438); if (hit) { hit.hp -= 36; downHuman(s, hit); return false; } }
    return true;
  }).slice(-40);
  const action = gameReserveV66Interaction(s);
  if (input.interact && !move && p.hp === healthBefore && action.kind !== "none") {
    p.cloak = false;
    s.channel = { ...action, ticks: s.channel.kind === action.kind && s.channel.target === action.target ? s.channel.ticks + 1 : 1 };
    if (s.channel.ticks >= (action.kind === "return" ? 60 : action.kind === "sabotage" ? 90 : 180)) {
      if (action.kind === "trophy") { s.humans[action.target].secured = true; log(s, "Prise sécurisée. Elle reste au bilan de cette expédition, sans ajout automatique à la collection."); }
      if (action.kind === "sabotage") { const ship = s.ships[action.target]; ship.repair = Math.max(0, ship.repair - 2000); ship.sabotages++; log(s, "Circuit endommagé. Les humains encore présents peuvent le réparer."); }
      if (action.kind === "return") { s.status = "returned"; s.terminalTick = s.tick; log(s, "Retour au point d'extraction. Fin de cette expédition."); }
      s.channel = { kind: "none", target: -1, ticks: 0 };
    }
  } else s.channel = { kind: "none", target: -1, ticks: 0 };
  if (p.hp === 0) { s.status = "incapacitated"; s.terminalTick = s.tick; s.channel = { kind: "none", target: -1, ticks: 0 }; log(s, "Chasseur hors combat. Aucun résultat n'est transformé en récompense de campagne."); }
  s.previous = { jump: !!input.jump, attack: !!input.attack, melee: !!input.melee, cloak: !!input.cloak };
  return s;
}
