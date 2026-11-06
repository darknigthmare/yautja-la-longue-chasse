import {
  HOMEWORLD_GEOMETRY_V64,
  homeworldProjectGroundV64,
  homeworldUnprojectGroundV64,
} from './homeworldGeometryV64';
import type { PhysicalShipStationId } from './shipLevelLayout';

/** Local ground coordinates, in the same 35-degree orthographic convention as
 * Homeworld. Neither a bitmap's alpha nor its CSS size defines a solid. This
 * authored gameplay layout is not a claim about a canonical ship floor plan. */
export const SHIP_INTERIOR_25D_METRICS = Object.freeze({
  width: 1200, depth: 800, floorInset: 24,
  actorHalfWidth: 24, actorHalfDepth: 14,
  speed: 260, interactionReach: 64, doorReach: 56, maxFrameSeconds: 0.05,
  depthScale: HOMEWORLD_GEOMETRY_V64.depthScale,
});

export type ShipInterior25dRoomId = PhysicalShipStationId;
export interface ShipInterior25dPoint { x: number; y: number }
export interface ShipInterior25dActor extends ShipInterior25dPoint { facing: -1 | 1 }
export interface ShipInterior25dFootprint extends ShipInterior25dPoint { width: number; depth: number }
export type ShipInterior25dArtKey = 'navigationConsole' | 'medbayBed' | 'armoryRack' | 'forgeStation' |
  'trophyPlinth' | 'trainingEmitter' | 'archiveTerminal';
export interface ShipInterior25dFixture extends ShipInterior25dPoint {
  id: string;
  artKey: ShipInterior25dArtKey;
  width: number;
  height: number;
  footprint: ShipInterior25dFootprint;
}
export interface ShipInterior25dStation extends ShipInterior25dPoint {
  id: PhysicalShipStationId;
  label: string;
  approach: ShipInterior25dPoint;
}
export interface ShipInterior25dDoor extends ShipInterior25dPoint {
  id: string;
  label: string;
  side: 'west' | 'east' | 'north';
  kind: 'bulkhead' | 'lift';
  targetRoomId: ShipInterior25dRoomId;
  targetDoorId: string;
  /** Paired arrival lies inside the room, outside the door's activation reach. */
  entry: ShipInterior25dPoint;
}
export interface ShipInterior25dRoom {
  id: ShipInterior25dRoomId;
  label: string;
  deck: 'upper' | 'lower';
  width: number;
  depth: number;
  accent: string;
  wallArt: 'observatory' | 'sanctum' | 'machinery';
  spawn: ShipInterior25dActor;
  station: ShipInterior25dStation;
  fixtures: readonly ShipInterior25dFixture[];
  doors: readonly ShipInterior25dDoor[];
}

export const SHIP_INTERIOR_25D_DEFAULT_ROOM: ShipInterior25dRoomId = 'galaxy-map';
export const SHIP_INTERIOR_25D_ROOM_ORDER: readonly ShipInterior25dRoomId[] = [
  'galaxy-map', 'wall-armory', 'clan-archives', 'appearance-forge',
  'trophy-hall', 'medical-bay', 'training-arena', 'launch-airlock',
];

const labels: Record<ShipInterior25dRoomId, string> = {
  'galaxy-map': 'Passerelle de navigation', 'wall-armory': 'Armurerie',
  'clan-archives': 'Archives du chasseur', 'appearance-forge': 'Forge des parures',
  'trophy-hall': 'Galerie des trophées', 'medical-bay': 'Baie médicale',
  'training-arena': 'Cercle d’entraînement', 'launch-airlock': 'Sas de chasse',
};

/** Explicit two-deck circuit. Each bulkhead has one return bulkhead; each lift
 * joins the corresponding fore/aft compartment of the other deck. */
const connections: Record<ShipInterior25dRoomId, readonly {
  side: ShipInterior25dDoor['side']; targetRoomId: ShipInterior25dRoomId;
  targetSide: ShipInterior25dDoor['side']; kind: ShipInterior25dDoor['kind']; x?: number;
}[]> = {
  'galaxy-map': [
    { side: 'east', targetRoomId: 'wall-armory', targetSide: 'west', kind: 'bulkhead' },
    { side: 'north', targetRoomId: 'trophy-hall', targetSide: 'north', kind: 'lift', x: 190 },
  ],
  'wall-armory': [
    { side: 'west', targetRoomId: 'galaxy-map', targetSide: 'east', kind: 'bulkhead' },
    { side: 'east', targetRoomId: 'clan-archives', targetSide: 'west', kind: 'bulkhead' },
  ],
  'clan-archives': [
    { side: 'west', targetRoomId: 'wall-armory', targetSide: 'east', kind: 'bulkhead' },
    { side: 'east', targetRoomId: 'appearance-forge', targetSide: 'west', kind: 'bulkhead' },
  ],
  'appearance-forge': [
    { side: 'west', targetRoomId: 'clan-archives', targetSide: 'east', kind: 'bulkhead' },
    { side: 'north', targetRoomId: 'launch-airlock', targetSide: 'north', kind: 'lift', x: 1010 },
  ],
  'trophy-hall': [
    { side: 'east', targetRoomId: 'medical-bay', targetSide: 'west', kind: 'bulkhead' },
    { side: 'north', targetRoomId: 'galaxy-map', targetSide: 'north', kind: 'lift', x: 190 },
  ],
  'medical-bay': [
    { side: 'west', targetRoomId: 'trophy-hall', targetSide: 'east', kind: 'bulkhead' },
    { side: 'east', targetRoomId: 'training-arena', targetSide: 'west', kind: 'bulkhead' },
  ],
  'training-arena': [
    { side: 'west', targetRoomId: 'medical-bay', targetSide: 'east', kind: 'bulkhead' },
    { side: 'east', targetRoomId: 'launch-airlock', targetSide: 'west', kind: 'bulkhead' },
  ],
  'launch-airlock': [
    { side: 'west', targetRoomId: 'training-arena', targetSide: 'east', kind: 'bulkhead' },
    { side: 'north', targetRoomId: 'appearance-forge', targetSide: 'north', kind: 'lift', x: 1010 },
  ],
};

function doorsFor(roomId: ShipInterior25dRoomId): ShipInterior25dDoor[] {
  return connections[roomId].map(connection => {
    const x = connection.side === 'west' ? 88 : connection.side === 'east' ? 1112 : connection.x!;
    const y = connection.side === 'north' ? 80 : 620;
    return {
      id: `${roomId}:${connection.side}`, label: labels[connection.targetRoomId],
      side: connection.side, kind: connection.kind, x, y,
      targetRoomId: connection.targetRoomId, targetDoorId: `${connection.targetRoomId}:${connection.targetSide}`,
      entry: { x: x + (connection.side === 'west' ? 82 : connection.side === 'east' ? -82 : 0),
        y: y + (connection.side === 'north' ? 82 : 0) },
    };
  });
}

function fixture(id: string, artKey: ShipInterior25dArtKey, x: number, y: number,
  width: number, height: number, footprintWidth: number, footprintDepth: number): ShipInterior25dFixture {
  return { id, artKey, x, y, width, height,
    footprint: { x: x - footprintWidth / 2, y: y - footprintDepth, width: footprintWidth, depth: footprintDepth } };
}

function room(id: ShipInterior25dRoomId, deck: ShipInterior25dRoom['deck'],
  wallArt: ShipInterior25dRoom['wallArt'], accent: string, fixtures: ShipInterior25dFixture[],
  approach: ShipInterior25dPoint): ShipInterior25dRoom {
  const main = fixtures[0];
  return { id, label: labels[id], deck, width: SHIP_INTERIOR_25D_METRICS.width,
    depth: SHIP_INTERIOR_25D_METRICS.depth, wallArt, accent,
    spawn: { x: 600, y: 660, facing: 1 },
    station: { id, label: labels[id], x: main.x, y: main.y, approach },
    fixtures, doors: doorsFor(id) };
}

/** Art pivots sit on the front edge of each physical footprint. Furniture is
 * calibrated against the upright hunter, with one scale per reused model.
 * All approaches are on free floor; rear and side lanes remain traversable. */
export const SHIP_INTERIOR_25D_ROOMS: Readonly<Record<ShipInterior25dRoomId, ShipInterior25dRoom>> = {
  'galaxy-map': room('galaxy-map', 'upper', 'observatory', '#8ce0ce', [
    fixture('navigation-console', 'navigationConsole', 600, 340, 250, 138, 220, 85),
    fixture('navigation-records', 'archiveTerminal', 940, 260, 125, 230, 80, 55),
  ], { x: 600, y: 395 }),
  'wall-armory': room('wall-armory', 'upper', 'machinery', '#e7b675', [
    fixture('armory-rack', 'armoryRack', 590, 300, 370, 196, 340, 65),
    fixture('armory-service-forge', 'forgeStation', 950, 500, 225, 280, 170, 95),
  ], { x: 590, y: 355 }),
  'clan-archives': room('clan-archives', 'upper', 'sanctum', '#91c7e5', [
    fixture('archive-terminal', 'archiveTerminal', 650, 300, 125, 230, 80, 55),
    fixture('archive-console', 'navigationConsole', 310, 430, 250, 138, 220, 85),
  ], { x: 650, y: 355 }),
  'appearance-forge': room('appearance-forge', 'upper', 'machinery', '#e7a276', [
    fixture('appearance-forge', 'forgeStation', 600, 330, 225, 280, 170, 95),
    fixture('parure-rack', 'armoryRack', 950, 420, 370, 196, 340, 65),
  ], { x: 600, y: 385 }),
  'trophy-hall': room('trophy-hall', 'lower', 'sanctum', '#dec186', [
    fixture('trophy-workbench', 'trophyPlinth', 600, 350, 190, 140, 160, 80),
    fixture('trophy-west-plinth', 'trophyPlinth', 310, 280, 190, 140, 160, 80),
    fixture('trophy-east-plinth', 'trophyPlinth', 890, 280, 190, 140, 160, 80),
  ], { x: 600, y: 405 }),
  'medical-bay': room('medical-bay', 'lower', 'machinery', '#91d5b6', [
    fixture('medical-bed', 'medbayBed', 600, 345, 225, 120, 205, 70),
    fixture('medical-terminal', 'archiveTerminal', 950, 280, 125, 230, 80, 55),
  ], { x: 600, y: 395 }),
  'training-arena': room('training-arena', 'lower', 'sanctum', '#d9bf86', [
    fixture('training-emitter', 'trainingEmitter', 950, 320, 170, 210, 100, 75),
    fixture('training-rack', 'armoryRack', 300, 260, 370, 196, 340, 65),
  ], { x: 950, y: 375 }),
  'launch-airlock': room('launch-airlock', 'lower', 'machinery', '#91d5d7', [
    fixture('airlock-console', 'navigationConsole', 850, 340, 250, 138, 220, 85),
    fixture('airlock-terminal', 'archiveTerminal', 300, 280, 125, 230, 80, 55),
  ], { x: 850, y: 395 }),
};

export const projectShipInterior25d = homeworldProjectGroundV64;
export const unprojectShipInterior25d = homeworldUnprojectGroundV64;

const finitePoint = (point: ShipInterior25dPoint): boolean => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const copyPoint = (point: ShipInterior25dPoint): ShipInterior25dPoint => ({ x: point.x, y: point.y });
const distance = (a: ShipInterior25dPoint, b: ShipInterior25dPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
export function isShipInterior25dRoomId(value: unknown): value is ShipInterior25dRoomId {
  return typeof value === 'string' && Object.hasOwn(SHIP_INTERIOR_25D_ROOMS, value);
}

function expanded(footprint: ShipInterior25dFootprint, clearance = 0): ShipInterior25dFootprint {
  const x = SHIP_INTERIOR_25D_METRICS.actorHalfWidth + clearance;
  const y = SHIP_INTERIOR_25D_METRICS.actorHalfDepth + clearance;
  return { x: footprint.x - x, y: footprint.y - y, width: footprint.width + 2 * x, depth: footprint.depth + 2 * y };
}

export function isShipInterior25dWalkable(roomId: ShipInterior25dRoomId, point: ShipInterior25dPoint): boolean {
  if (!isShipInterior25dRoomId(roomId) || !finitePoint(point)) return false;
  const room = SHIP_INTERIOR_25D_ROOMS[roomId];
  const { floorInset, actorHalfWidth, actorHalfDepth } = SHIP_INTERIOR_25D_METRICS;
  if (point.x < floorInset + actorHalfWidth || point.x > room.width - floorInset - actorHalfWidth ||
      point.y < floorInset + actorHalfDepth || point.y > room.depth - floorInset - actorHalfDepth) return false;
  return !room.fixtures.some(({ footprint }) => {
    const box = expanded(footprint);
    return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.depth;
  });
}

/** Slab intersection includes contact: neither paths nor diagonal motion may
 * cut a corner of a solid expanded by the actor's actual ground footprint. */
function segmentHitsRect(from: ShipInterior25dPoint, to: ShipInterior25dPoint, box: ShipInterior25dFootprint): boolean {
  let enter = 0, leave = 1;
  for (const axis of ['x', 'y'] as const) {
    const low = box[axis], high = low + (axis === 'x' ? box.width : box.depth);
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-9) {
      if (from[axis] < low || from[axis] > high) return false;
    } else {
      const one = (low - from[axis]) / delta, two = (high - from[axis]) / delta;
      enter = Math.max(enter, Math.min(one, two)); leave = Math.min(leave, Math.max(one, two));
      if (enter > leave) return false;
    }
  }
  return true;
}

export function isShipInterior25dSegmentWalkable(roomId: ShipInterior25dRoomId,
  from: ShipInterior25dPoint, to: ShipInterior25dPoint): boolean {
  return isShipInterior25dWalkable(roomId, from) && isShipInterior25dWalkable(roomId, to) &&
    !SHIP_INTERIOR_25D_ROOMS[roomId].fixtures.some(({ footprint }) => segmentHitsRect(from, to, expanded(footprint)));
}

export interface ShipInterior25dPath { points: ShipInterior25dPoint[]; distance: number }
/** A bounded visibility graph around the furniture, without grid snapping.
 * Returned paths include the current position and preserve the exact target. */
export function planShipInterior25dPath(roomId: ShipInterior25dRoomId,
  from: ShipInterior25dPoint, to: ShipInterior25dPoint): ShipInterior25dPath | null {
  if (!isShipInterior25dWalkable(roomId, from) || !isShipInterior25dWalkable(roomId, to)) return null;
  if (distance(from, to) < 0.001) return { points: [copyPoint(from)], distance: 0 };
  if (isShipInterior25dSegmentWalkable(roomId, from, to)) return { points: [copyPoint(from), copyPoint(to)], distance: distance(from, to) };
  const nodes = [copyPoint(from), copyPoint(to)];
  for (const { footprint } of SHIP_INTERIOR_25D_ROOMS[roomId].fixtures) {
    const box = expanded(footprint, 2);
    for (const x of [box.x, box.x + box.width]) for (const y of [box.y, box.y + box.depth]) {
      if (isShipInterior25dWalkable(roomId, { x, y })) nodes.push({ x, y });
    }
  }
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && Number.isFinite(costs[i]) && (current < 0 || costs[i] < costs[current])) current = i;
    }
    if (current < 0) return null;
    if (current === 1) break;
    visited.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next) || next === current || !isShipInterior25dSegmentWalkable(roomId, nodes[current], nodes[next])) continue;
      const cost = costs[current] + distance(nodes[current], nodes[next]);
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current; }
    }
  }
  if (!Number.isFinite(costs[1])) return null;
  const indices = [1];
  while (indices[0] !== 0) {
    const before = previous[indices[0]];
    if (before < 0) return null;
    indices.unshift(before);
  }
  return { points: indices.map(index => copyPoint(nodes[index])), distance: costs[1] };
}

/** Ground motion only. Reaching a door never changes room without an explicit
 * interaction. The frame cap, swept segments and substeps prevent tunnelling. */
export function stepShipInterior25dActor(roomId: ShipInterior25dRoomId, actor: ShipInterior25dActor,
  direction: ShipInterior25dPoint, elapsedSeconds: number, suspended = false): ShipInterior25dActor {
  if (suspended || !isShipInterior25dWalkable(roomId, actor) || !finitePoint(direction) ||
      !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return actor;
  const magnitude = Math.max(1, Math.hypot(direction.x, direction.y));
  const seconds = Math.min(SHIP_INTERIOR_25D_METRICS.maxFrameSeconds, elapsedSeconds);
  const dx = direction.x / magnitude * SHIP_INTERIOR_25D_METRICS.speed * seconds;
  const dy = direction.y / magnitude * SHIP_INTERIOR_25D_METRICS.speed * seconds;
  const count = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (SHIP_INTERIOR_25D_METRICS.actorHalfDepth / 2)));
  let point = copyPoint(actor);
  for (let i = 0; i < count; i++) {
    const both = { x: point.x + dx / count, y: point.y + dy / count };
    if (isShipInterior25dSegmentWalkable(roomId, point, both)) point = both;
    else {
      const horizontal = { x: point.x + dx / count, y: point.y };
      if (isShipInterior25dSegmentWalkable(roomId, point, horizontal)) point = horizontal;
      const vertical = { x: point.x, y: point.y + dy / count };
      if (isShipInterior25dSegmentWalkable(roomId, point, vertical)) point = vertical;
    }
  }
  if (distance(actor, point) < 1e-8) return actor;
  return { ...point, facing: Math.abs(point.x - actor.x) > 0.001 ? point.x < actor.x ? -1 : 1 : actor.facing };
}

export function stepShipInterior25dPath(roomId: ShipInterior25dRoomId, actor: ShipInterior25dActor,
  waypoints: readonly ShipInterior25dPoint[], elapsedSeconds: number, suspended = false):
  { actor: ShipInterior25dActor; remaining: ShipInterior25dPoint[]; arrived: boolean; blocked: boolean } {
  const remaining = waypoints.map(copyPoint);
  let nextActor = actor;
  let seconds = !suspended && Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(SHIP_INTERIOR_25D_METRICS.maxFrameSeconds, elapsedSeconds)) : 0;
  let blocked = !isShipInterior25dWalkable(roomId, actor);
  while (!blocked && remaining.length && seconds > 0) {
    const target = remaining[0];
    if (!finitePoint(target)) { blocked = true; break; }
    const span = distance(nextActor, target);
    if (span <= 0.05) { remaining.shift(); continue; }
    if (!isShipInterior25dSegmentWalkable(roomId, nextActor, target)) { blocked = true; break; }
    const time = Math.min(seconds, span / SHIP_INTERIOR_25D_METRICS.speed);
    const stepped = stepShipInterior25dActor(roomId, nextActor,
      { x: (target.x - nextActor.x) / span, y: (target.y - nextActor.y) / span }, time);
    if (distance(nextActor, stepped) <= 1e-8) { blocked = true; break; }
    nextActor = stepped; seconds -= time;
    if (distance(nextActor, target) <= 0.05) remaining.shift();
  }
  return { actor: nextActor, remaining, arrived: !blocked && remaining.length === 0, blocked };
}

export function shipInterior25dRoomRoute(from: ShipInterior25dRoomId, to: ShipInterior25dRoomId): ShipInterior25dRoomId[] {
  if (!isShipInterior25dRoomId(from) || !isShipInterior25dRoomId(to)) return [];
  const queue: ShipInterior25dRoomId[][] = [[from]], seen = new Set<ShipInterior25dRoomId>([from]);
  for (let head = 0; head < queue.length; head++) {
    const route = queue[head], roomId = route[route.length - 1];
    if (roomId === to) return route;
    for (const door of SHIP_INTERIOR_25D_ROOMS[roomId].doors) {
      if (!seen.has(door.targetRoomId)) { seen.add(door.targetRoomId); queue.push([...route, door.targetRoomId]); }
    }
  }
  return [];
}

export function shipInterior25dSpawn(roomId: ShipInterior25dRoomId, fromRoomId?: ShipInterior25dRoomId): ShipInterior25dActor {
  const room = SHIP_INTERIOR_25D_ROOMS[isShipInterior25dRoomId(roomId) ? roomId : SHIP_INTERIOR_25D_DEFAULT_ROOM];
  const door = room.doors.find(candidate => candidate.targetRoomId === fromRoomId);
  return door ? { ...door.entry, facing: door.side === 'east' ? -1 : 1 } : { ...room.spawn };
}

export function isNearShipInterior25dStation(roomId: ShipInterior25dRoomId, point: ShipInterior25dPoint,
  stationId: PhysicalShipStationId = roomId): boolean {
  if (!isShipInterior25dRoomId(roomId) || roomId !== stationId || !isShipInterior25dWalkable(roomId, point)) return false;
  const approach = SHIP_INTERIOR_25D_ROOMS[roomId].station.approach;
  return distance(approach, point) <= SHIP_INTERIOR_25D_METRICS.interactionReach &&
    isShipInterior25dSegmentWalkable(roomId, point, approach);
}

export type ShipInterior25dInteraction =
  { type: 'service'; station: ShipInterior25dStation; point: ShipInterior25dPoint } |
  { type: 'door'; door: ShipInterior25dDoor; point: ShipInterior25dDoor };
export function nearbyShipInterior25dInteraction(roomId: ShipInterior25dRoomId,
  point: ShipInterior25dPoint): ShipInterior25dInteraction | null {
  if (!isShipInterior25dWalkable(roomId, point)) return null;
  const room = SHIP_INTERIOR_25D_ROOMS[roomId];
  const candidates: ShipInterior25dInteraction[] = [];
  if (isNearShipInterior25dStation(roomId, point)) candidates.push({ type: 'service', station: room.station, point: room.station.approach });
  for (const door of room.doors) {
    if (distance(door, point) <= SHIP_INTERIOR_25D_METRICS.doorReach && isShipInterior25dSegmentWalkable(roomId, point, door)) {
      candidates.push({ type: 'door', door, point: door });
    }
  }
  candidates.sort((a, b) => distance(a.point, point) - distance(b.point, point));
  return candidates[0] ?? null;
}

export function canShipInterior25dTransition(from: ShipInterior25dRoomId, to: ShipInterior25dRoomId,
  point: ShipInterior25dPoint): boolean {
  if (!isShipInterior25dRoomId(to) || !isShipInterior25dWalkable(from, point)) return false;
  const door = SHIP_INTERIOR_25D_ROOMS[from].doors.find(candidate => candidate.targetRoomId === to);
  if (!door || distance(door, point) > SHIP_INTERIOR_25D_METRICS.doorReach || !isShipInterior25dSegmentWalkable(from, point, door)) return false;
  const reverse = SHIP_INTERIOR_25D_ROOMS[to].doors.find(candidate => candidate.id === door.targetDoorId);
  return !!reverse && reverse.targetRoomId === from && reverse.targetDoorId === door.id &&
    isShipInterior25dWalkable(to, reverse.entry);
}

/** Called by the explicit interaction command, never by a movement step. */
export function shipInterior25dTransition(roomId: ShipInterior25dRoomId, doorId: string,
  point: ShipInterior25dPoint): { roomId: ShipInterior25dRoomId; actor: ShipInterior25dActor } | null {
  if (!isShipInterior25dRoomId(roomId)) return null;
  const door = SHIP_INTERIOR_25D_ROOMS[roomId].doors.find(candidate => candidate.id === doorId);
  if (!door || !canShipInterior25dTransition(roomId, door.targetRoomId, point)) return null;
  return { roomId: door.targetRoomId, actor: shipInterior25dSpawn(door.targetRoomId, roomId) };
}

/** Optional camera in projected coordinates. The renderer adds its wall/scene
 * offset separately and uses the inverse ground projection for pointer input. */
export function shipInterior25dCamera({ roomId, actor, viewport }: {
  roomId: ShipInterior25dRoomId; actor: ShipInterior25dPoint; viewport: { width: number; height: number };
}) {
  const room = SHIP_INTERIOR_25D_ROOMS[isShipInterior25dRoomId(roomId) ? roomId : SHIP_INTERIOR_25D_DEFAULT_ROOM];
  const width = Number.isFinite(viewport.width) ? Math.max(1, viewport.width) : 1200;
  const height = Number.isFinite(viewport.height) ? Math.max(1, viewport.height) : 700;
  const projectedDepth = projectShipInterior25d({ x: 0, y: room.depth }).y;
  const fit = Math.min(1.35, width / (room.width + 96), height / (projectedDepth + 280));
  const zoom = Math.max(0.82, fit), viewWidth = width / zoom, viewHeight = height / zoom;
  const follow = fit < 0.82;
  const feet = projectShipInterior25d(finitePoint(actor) ? actor : room.spawn);
  const clampOrCentre = (value: number, low: number, high: number) => high < low ? (low + high) / 2 : Math.max(low, Math.min(high, value));
  return { zoom, viewWidth, viewHeight, mode: follow ? 'follow' as const : 'whole-room' as const,
    x: follow ? clampOrCentre(feet.x - viewWidth / 2, -48, room.width + 48 - viewWidth) : (room.width - viewWidth) / 2,
    y: follow ? clampOrCentre(feet.y - viewHeight * 0.62, -240, projectedDepth + 40 - viewHeight) : (projectedDepth - 200 - viewHeight) / 2 };
}
