/** The Isles V1 · minimal network room for the test island (production step 2: 2 then 6 players).
 * Server-side and transport-free: the WebSocket service (scripts/serve-isles-room-v1.mjs) feeds it
 * messages and broadcasts its snapshots. Movement is predicted by each client and checked here
 * (speed, height, bounds); a kill is validated and attributed once (MODE_THE_ISLES section 15.3). */
import {heightAtV1, isWalkableV1, markerV1, tileAtV1, tileCenterV1, type IslesMapV1} from "./islesMapV1";

export const ISLES_PROTOCOL_V1 = 1;

export interface IslesNetTuningV1 {
  maxPlayers: number; snapshotHz: number; inputHz: number; speedTolerance: number; verticalTolerance: number;
  strikeRange: number; strikeCooldownSeconds: number; preyHealth: number; preyRespawnSeconds: number; preySpeed: number;
  interpolationMs: number; idleTimeoutSeconds: number;
}

export interface IslesNetPlayerV1 { id: string; name: string; x: number; y: number; z: number; facing: number; cloaked: boolean; kills: number }
export interface IslesNetPreyV1 { id: string; x: number; z: number; facing: number; health: number; alive: boolean; killedBy: string | null }

export type IslesClientMessageV1 =
  | {t: "hello"; name: string; protocol: number}
  | {t: "input"; seq: number; x: number; y: number; z: number; facing: number; cloaked: boolean}
  | {t: "strike"; seq: number; target: string};

export type IslesServerMessageV1 =
  | {t: "welcome"; id: string; protocol: number; spawn: {x: number; z: number}; maxPlayers: number; snapshotHz: number}
  | {t: "full"; maxPlayers: number}
  | {t: "refused"; reason: string}
  | {t: "snapshot"; tick: number; time: number; players: IslesNetPlayerV1[]; prey: IslesNetPreyV1}
  | {t: "correction"; seq: number; x: number; y: number; z: number}
  | {t: "strike-result"; seq: number; ok: boolean; reason?: string; health?: number}
  | {t: "kill"; prey: string; by: string; name: string}
  | {t: "left"; id: string};

interface Seat extends IslesNetPlayerV1 { lastInputAt: number; lastSeq: number; lastStrikeAt: number; spawnIndex: number }

export interface IslesRoomOptionsV1 {
  map: IslesMapV1;
  net: IslesNetTuningV1;
  runSpeed: number;
  /** Prey start (world metres); defaults to the map's `prey` marker. */
  preyStart?: {x: number; z: number};
  preyWanders?: boolean;
  seed?: number;
}

const finite = (...values: unknown[]) => values.every(value => typeof value === "number" && Number.isFinite(value));

/** Parses and validates a client message; returns null for anything malformed. */
export function parseIslesClientMessageV1(text: string): IslesClientMessageV1 | null {
  if (typeof text !== "string" || text.length > 2048) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (m.t === "hello" && typeof m.name === "string" && m.protocol === ISLES_PROTOCOL_V1) {
    const name = m.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 20);
    return name ? {t: "hello", name, protocol: ISLES_PROTOCOL_V1} : null;
  }
  if (m.t === "input" && Number.isSafeInteger(m.seq) && finite(m.x, m.y, m.z, m.facing) && typeof m.cloaked === "boolean") {
    return {t: "input", seq: m.seq as number, x: m.x as number, y: m.y as number, z: m.z as number, facing: m.facing as number, cloaked: m.cloaked};
  }
  if (m.t === "strike" && Number.isSafeInteger(m.seq) && typeof m.target === "string" && m.target.length < 40) {
    return {t: "strike", seq: m.seq as number, target: m.target};
  }
  return null;
}

/** Room state machine. Times are server seconds. */
export function createIslesRoomV1(options: IslesRoomOptionsV1) {
  const {map, net} = options;
  const seats = new Map<string, Seat>();
  const spawns = (map.markers.netSpawns ?? map.markers.spawn).map(([x, z]) => tileCenterV1(map, x, z));
  const preyHome = options.preyStart ?? markerV1(map, "prey");
  const prey: IslesNetPreyV1 & {respawnAt: number; goalX: number; goalZ: number} = {
    id: "prey-1", x: preyHome.x, z: preyHome.z, facing: 0, health: net.preyHealth, alive: true, killedBy: null,
    respawnAt: 0, goalX: preyHome.x, goalZ: preyHome.z,
  };
  let nextId = 1, tick = 0, rng = (options.seed ?? 1) >>> 0;
  const random = () => {
    let t = (rng = (rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const worldWidth = map.width * map.tileMeters, worldDepth = map.depth * map.tileMeters;
  let maxTop = 0;
  for (let i = 0; i < map.heights.length; i++) maxTop = Math.max(maxTop, map.heights[i]);

  const publicPlayer = (seat: Seat): IslesNetPlayerV1 => ({id: seat.id, name: seat.name, x: seat.x, y: seat.y, z: seat.z, facing: seat.facing, cloaked: seat.cloaked, kills: seat.kills});
  const publicPrey = (): IslesNetPreyV1 => ({id: prey.id, x: prey.x, z: prey.z, facing: prey.facing, health: prey.health, alive: prey.alive, killedBy: prey.killedBy});

  return {
    /** Seats a player, or refuses when the session already holds maxPlayers (8). */
    join(name: string, now: number): {id: string; reply: IslesServerMessageV1} | {id: null; reply: IslesServerMessageV1} {
      if (seats.size >= net.maxPlayers) return {id: null, reply: {t: "full", maxPlayers: net.maxPlayers}};
      const used = new Set([...seats.values()].map(seat => seat.spawnIndex));
      const spawnIndex = spawns.findIndex((_, i) => !used.has(i));
      const spawn = spawns[Math.max(0, spawnIndex)];
      const id = "p" + nextId++;
      const [tx, tz] = tileAtV1(map, spawn.x, spawn.z);
      seats.set(id, {id, name, x: spawn.x, y: Math.max(0, heightAtV1(map, tx, tz)), z: spawn.z, facing: 0, cloaked: false, kills: 0,
        lastInputAt: now, lastSeq: -1, lastStrikeAt: -Infinity, spawnIndex});
      return {id, reply: {t: "welcome", id, protocol: ISLES_PROTOCOL_V1, spawn, maxPlayers: net.maxPlayers, snapshotHz: net.snapshotHz}};
    },
    leave(id: string): IslesServerMessageV1 | null {
      return seats.delete(id) ? {t: "left", id} : null;
    },
    /** Accepts a predicted position when it is reachable since the last accepted one; else a correction. */
    input(id: string, message: Extract<IslesClientMessageV1, {t: "input"}>, now: number): IslesServerMessageV1 | null {
      const seat = seats.get(id);
      if (!seat || message.seq <= seat.lastSeq) return null;
      const elapsed = Math.max(now - seat.lastInputAt, 1 / net.inputHz);
      const reach = options.runSpeed * elapsed * net.speedTolerance + 0.5;
      const inside = message.x >= 0 && message.z >= 0 && message.x <= worldWidth && message.z <= worldDepth;
      const height = message.y >= -2 && message.y <= maxTop + 1 && Math.abs(message.y - seat.y) <= net.verticalTolerance;
      seat.lastSeq = message.seq;
      seat.lastInputAt = now;
      if (!inside || !height || Math.hypot(message.x - seat.x, message.z - seat.z) > reach) {
        return {t: "correction", seq: message.seq, x: seat.x, y: seat.y, z: seat.z};
      }
      Object.assign(seat, {x: message.x, y: message.y, z: message.z, facing: message.facing, cloaked: message.cloaked});
      return null;
    },
    /** Validates a strike on the prey. The blow that empties its health wins the kill, once. */
    strike(id: string, message: Extract<IslesClientMessageV1, {t: "strike"}>, now: number): {reply: IslesServerMessageV1; broadcast?: IslesServerMessageV1} {
      const seat = seats.get(id);
      if (!seat) return {reply: {t: "strike-result", seq: message.seq, ok: false, reason: "inconnu"}};
      if (message.target !== prey.id) return {reply: {t: "strike-result", seq: message.seq, ok: false, reason: "cible inconnue"}};
      if (!prey.alive) return {reply: {t: "strike-result", seq: message.seq, ok: false, reason: "déjà attribuée"}};
      if (now - seat.lastStrikeAt < net.strikeCooldownSeconds) return {reply: {t: "strike-result", seq: message.seq, ok: false, reason: "trop tôt"}};
      if (Math.hypot(seat.x - prey.x, seat.z - prey.z) > net.strikeRange) return {reply: {t: "strike-result", seq: message.seq, ok: false, reason: "hors de portée"}};
      seat.lastStrikeAt = now;
      prey.health -= 1;
      if (prey.health > 0) return {reply: {t: "strike-result", seq: message.seq, ok: true, health: prey.health}};
      prey.alive = false; prey.killedBy = seat.id; prey.respawnAt = now + net.preyRespawnSeconds;
      seat.kills += 1;
      return {reply: {t: "strike-result", seq: message.seq, ok: true, health: 0}, broadcast: {t: "kill", prey: prey.id, by: seat.id, name: seat.name}};
    },
    /** Advances the prey and builds the snapshot sent to every player. Returns idle players to drop. */
    tick(now: number, dt: number): {snapshot: IslesServerMessageV1; idle: string[]} {
      tick++;
      if (!prey.alive && now >= prey.respawnAt) {
        Object.assign(prey, {alive: true, health: net.preyHealth, killedBy: null, x: preyHome.x, z: preyHome.z});
      }
      if (prey.alive && options.preyWanders !== false) {
        const d = Math.hypot(prey.goalX - prey.x, prey.goalZ - prey.z);
        if (d < 0.5) {
          prey.goalX = Math.min(worldWidth - 2, Math.max(2, preyHome.x + (random() - 0.5) * 16));
          prey.goalZ = Math.min(worldDepth - 2, Math.max(2, preyHome.z + (random() - 0.5) * 16));
        } else {
          const step = Math.min(d, net.preySpeed * dt);
          const nx = prey.x + (prey.goalX - prey.x) / d * step, nz = prey.z + (prey.goalZ - prey.z) / d * step;
          if (isWalkableV1(map, ...tileAtV1(map, nx, nz))) { prey.x = nx; prey.z = nz; prey.facing = Math.atan2(prey.goalX - prey.x, prey.goalZ - prey.z); }
          else { prey.goalX = prey.x; prey.goalZ = prey.z; }
        }
      }
      const idle = [...seats.values()].filter(seat => now - seat.lastInputAt > net.idleTimeoutSeconds).map(seat => seat.id);
      return {snapshot: {t: "snapshot", tick, time: now, players: [...seats.values()].map(publicPlayer), prey: publicPrey()}, idle};
    },
    size: () => seats.size,
    player: (id: string) => { const seat = seats.get(id); return seat ? publicPlayer(seat) : null; },
    prey: publicPrey,
  };
}

export type IslesRoomV1 = ReturnType<typeof createIslesRoomV1>;

/** Remote player position between the two snapshots around `renderTime` (seconds, server clock). */
export function interpolatePlayerV1(buffer: {time: number; players: IslesNetPlayerV1[]}[], id: string, renderTime: number): IslesNetPlayerV1 | null {
  let before: IslesNetPlayerV1 | null = null, after: IslesNetPlayerV1 | null = null, t0 = 0, t1 = 0;
  for (const snapshot of buffer) {
    const player = snapshot.players.find(item => item.id === id);
    if (!player) continue;
    if (snapshot.time <= renderTime) { before = player; t0 = snapshot.time; }
    else { after = player; t1 = snapshot.time; break; }
  }
  if (!before) return after;
  if (!after || t1 <= t0) return before;
  const k = (renderTime - t0) / (t1 - t0);
  let turn = after.facing - before.facing;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  return {...after, x: before.x + (after.x - before.x) * k, y: before.y + (after.y - before.y) * k, z: before.z + (after.z - before.z) * k, facing: before.facing + turn * k};
}
