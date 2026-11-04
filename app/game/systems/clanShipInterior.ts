import type { ClanShipRoomId } from './clanShipDocking';

/** Authored AVP clan-deck adaptation. Geometry belongs to this module, never to
 * a painted backdrop. World units are independent of CSS scale and camera. */
export const CLAN_SHIP_INTERIOR_METRICS = Object.freeze({
  width: 1440,
  height: 800,
  actorRadius: 18,
  speed: 300,
  interactionReach: 64,
  maxFrameSeconds: 0.05,
  floor: Object.freeze({ x: 64, y: 490, width: 1312, height: 218 }),
});

export interface ClanShipInteriorPoint { x: number; y: number }
export interface ClanShipInteriorRect extends ClanShipInteriorPoint { width: number; height: number }
export interface ClanShipInteriorActor extends ClanShipInteriorPoint { facing: -1 | 1 }
export type ClanShipInteriorArt = 'console' | 'rack' | 'bed' | 'terminal' | 'forge';
export interface ClanShipInteriorFixture {
  id: string;
  art: ClanShipInteriorArt;
  x: number;
  y: number;
  width: number;
  height: number;
  footprint: ClanShipInteriorRect;
}
export interface ClanShipInteriorDoor extends ClanShipInteriorPoint {
  targetRoomId: ClanShipRoomId;
  side: 'left' | 'right';
}
export interface ClanShipInteriorRoom {
  id: ClanShipRoomId;
  label: string;
  subtitle: string;
  serviceLabel: string;
  accent: string;
  servicePoint: ClanShipInteriorPoint;
  doors: readonly ClanShipInteriorDoor[];
  fixtures: readonly ClanShipInteriorFixture[];
}

export const CLAN_SHIP_INTERIOR_ROOM_ORDER: readonly ClanShipRoomId[] = [
  'hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins',
];
function doorsFor(id: ClanShipRoomId): readonly ClanShipInteriorDoor[] {
  const index = CLAN_SHIP_INTERIOR_ROOM_ORDER.indexOf(id);
  return [
    { targetRoomId: CLAN_SHIP_INTERIOR_ROOM_ORDER[(index + CLAN_SHIP_INTERIOR_ROOM_ORDER.length - 1) % CLAN_SHIP_INTERIOR_ROOM_ORDER.length], side: 'left', x: 128, y: 635 },
    { targetRoomId: CLAN_SHIP_INTERIOR_ROOM_ORDER[(index + 1) % CLAN_SHIP_INTERIOR_ROOM_ORDER.length], side: 'right', x: 1312, y: 635 },
  ];
}

/** Collision footprints and art sockets are authored together. A 100+ unit
 * foreground lane remains open in every room; fixture approaches stay free. */
export const CLAN_SHIP_INTERIOR_ROOMS: Readonly<Record<ClanShipRoomId, ClanShipInteriorRoom>> = {
  hangar: {
    id: 'hangar', label: 'Hangar du clan', subtitle: 'Baie d’amarrage · vaisseau personnel à quai',
    serviceLabel: 'Rejoindre le vaisseau personnel', accent: '#83e3cd', servicePoint: { x: 820, y: 650 }, doors: doorsFor('hangar'),
    fixtures: [
      { id: 'berth-console', art: 'console', x: 625, y: 575, width: 275, height: 165, footprint: { x: 515, y: 530, width: 220, height: 45 } },
      { id: 'berth-terminal', art: 'terminal', x: 1060, y: 560, width: 110, height: 210, footprint: { x: 1020, y: 525, width: 80, height: 35 } },
    ],
  },
  armurerie: {
    id: 'armurerie', label: 'Armurerie', subtitle: 'Râteliers · préparation de l’équipement',
    serviceLabel: 'Préparer l’équipement', accent: '#edba7c', servicePoint: { x: 700, y: 635 }, doors: doorsFor('armurerie'),
    fixtures: [
      { id: 'armory-rack', art: 'rack', x: 665, y: 555, width: 390, height: 215, footprint: { x: 500, y: 520, width: 330, height: 35 } },
      { id: 'armory-forge', art: 'forge', x: 1010, y: 580, width: 165, height: 245, footprint: { x: 950, y: 540, width: 120, height: 40 } },
    ],
  },
  entrainement: {
    id: 'entrainement', label: 'Cercle d’entraînement', subtitle: 'Espace de pratique · épreuves du chasseur',
    serviceLabel: 'Ouvrir l’entraînement', accent: '#e1bd81', servicePoint: { x: 1010, y: 650 }, doors: doorsFor('entrainement'),
    fixtures: [
      { id: 'training-rack', art: 'rack', x: 410, y: 565, width: 300, height: 170, footprint: { x: 280, y: 535, width: 260, height: 30 } },
      { id: 'training-station', art: 'forge', x: 1000, y: 575, width: 165, height: 245, footprint: { x: 940, y: 535, width: 120, height: 40 } },
    ],
  },
  conseil: {
    id: 'conseil', label: 'Salle du conseil', subtitle: 'Table stratégique · campagnes du clan',
    serviceLabel: 'Rejoindre le conseil', accent: '#b9dc8b', servicePoint: { x: 740, y: 650 }, doors: doorsFor('conseil'),
    fixtures: [
      { id: 'council-table', art: 'console', x: 730, y: 580, width: 325, height: 195, footprint: { x: 590, y: 535, width: 280, height: 45 } },
      { id: 'council-terminal', art: 'terminal', x: 350, y: 550, width: 105, height: 205, footprint: { x: 310, y: 520, width: 80, height: 30 } },
    ],
  },
  archives: {
    id: 'archives', label: 'Archives du clan', subtitle: 'Mémoire · codex et chroniques',
    serviceLabel: 'Consulter les archives', accent: '#94ccec', servicePoint: { x: 790, y: 645 }, doors: doorsFor('archives'),
    fixtures: [
      { id: 'archive-terminal', art: 'terminal', x: 790, y: 575, width: 135, height: 265, footprint: { x: 740, y: 530, width: 100, height: 45 } },
      { id: 'archive-console', art: 'console', x: 390, y: 555, width: 265, height: 160, footprint: { x: 280, y: 520, width: 220, height: 35 } },
    ],
  },
  trophees: {
    id: 'trophees', label: 'Galerie des trophées', subtitle: 'Mémoire des chasses · atelier rituel',
    serviceLabel: 'Ouvrir l’atelier des trophées', accent: '#dcc387', servicePoint: { x: 830, y: 650 }, doors: doorsFor('trophees'),
    fixtures: [
      { id: 'trophy-workbench', art: 'console', x: 820, y: 580, width: 295, height: 175, footprint: { x: 700, y: 535, width: 240, height: 45 } },
      { id: 'trophy-catalogue', art: 'terminal', x: 400, y: 565, width: 115, height: 225, footprint: { x: 355, y: 530, width: 90, height: 35 } },
    ],
  },
  soins: {
    id: 'soins', label: 'Baie médicale', subtitle: 'Soins · récupération entre les chasses',
    serviceLabel: 'Accéder aux soins', accent: '#8ce5bd', servicePoint: { x: 740, y: 655 }, doors: doorsFor('soins'),
    fixtures: [
      { id: 'medical-bed', art: 'bed', x: 730, y: 585, width: 315, height: 175, footprint: { x: 590, y: 530, width: 280, height: 55 } },
      { id: 'medical-terminal', art: 'terminal', x: 1030, y: 550, width: 105, height: 205, footprint: { x: 990, y: 520, width: 80, height: 30 } },
    ],
  },
};

const finitePoint = (point: ClanShipInteriorPoint): boolean => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const validRoom = (roomId: ClanShipRoomId): boolean => Object.prototype.hasOwnProperty.call(CLAN_SHIP_INTERIOR_ROOMS, roomId);
const distance = (a: ClanShipInteriorPoint, b: ClanShipInteriorPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
const copyPoint = (point: ClanShipInteriorPoint): ClanShipInteriorPoint => ({ x: point.x, y: point.y });

function expanded(box: ClanShipInteriorRect, margin: number = CLAN_SHIP_INTERIOR_METRICS.actorRadius): ClanShipInteriorRect {
  return { x: box.x - margin, y: box.y - margin, width: box.width + margin * 2, height: box.height + margin * 2 };
}

/** The feet have a conservative square footprint. This same contract is used
 * for manual movement, click paths, door access and browser route assertions. */
export function isClanShipInteriorWalkable(roomId: ClanShipRoomId, point: ClanShipInteriorPoint): boolean {
  if (!validRoom(roomId) || !finitePoint(point)) return false;
  const { floor, actorRadius } = CLAN_SHIP_INTERIOR_METRICS;
  if (point.x < floor.x + actorRadius || point.x > floor.x + floor.width - actorRadius ||
      point.y < floor.y + actorRadius || point.y > floor.y + floor.height - actorRadius) return false;
  return !CLAN_SHIP_INTERIOR_ROOMS[roomId].fixtures.some(({ footprint }) => {
    const box = expanded(footprint);
    return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
  });
}

function segmentHitsRect(from: ClanShipInteriorPoint, to: ClanShipInteriorPoint, box: ClanShipInteriorRect): boolean {
  let enter = 0;
  let leave = 1;
  for (const axis of ['x', 'y'] as const) {
    const low = box[axis];
    const high = low + (axis === 'x' ? box.width : box.height);
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-9) {
      if (from[axis] < low || from[axis] > high) return false;
    } else {
      const one = (low - from[axis]) / delta;
      const two = (high - from[axis]) / delta;
      enter = Math.max(enter, Math.min(one, two));
      leave = Math.min(leave, Math.max(one, two));
      if (enter > leave) return false;
    }
  }
  return true;
}

export function isClanShipInteriorSegmentWalkable(roomId: ClanShipRoomId, from: ClanShipInteriorPoint, to: ClanShipInteriorPoint): boolean {
  return isClanShipInteriorWalkable(roomId, from) && isClanShipInteriorWalkable(roomId, to) &&
    !CLAN_SHIP_INTERIOR_ROOMS[roomId].fixtures.some(({ footprint }) => segmentHitsRect(from, to, expanded(footprint)));
}

export interface ClanShipInteriorPath { points: ClanShipInteriorPoint[]; distance: number }

/** Small visibility graph around expanded fixtures. No snapping into an
 * obstacle, fixed grid corner-cutting or unbounded search. */
export function planClanShipInteriorPath(roomId: ClanShipRoomId, from: ClanShipInteriorPoint, to: ClanShipInteriorPoint): ClanShipInteriorPath | null {
  if (!isClanShipInteriorWalkable(roomId, from) || !isClanShipInteriorWalkable(roomId, to)) return null;
  if (distance(from, to) < 0.001) return { points: [copyPoint(from)], distance: 0 };
  if (isClanShipInteriorSegmentWalkable(roomId, from, to)) return { points: [copyPoint(from), copyPoint(to)], distance: distance(from, to) };
  const nodes = [copyPoint(from), copyPoint(to)];
  for (const { footprint } of CLAN_SHIP_INTERIOR_ROOMS[roomId].fixtures) {
    const box = expanded(footprint, CLAN_SHIP_INTERIOR_METRICS.actorRadius + 2);
    for (const x of [box.x, box.x + box.width]) for (const y of [box.y, box.y + box.height]) {
      if (isClanShipInteriorWalkable(roomId, { x, y })) nodes.push({ x, y });
    }
  }
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
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
      if (visited.has(next) || next === current || !isClanShipInteriorSegmentWalkable(roomId, nodes[current], nodes[next])) continue;
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

/** Bounded, sub-stepped controller with wall sliding and normalized diagonals.
 * A resumed/background frame can never fling the actor through a fixture. */
export function stepClanShipInteriorActor(
  roomId: ClanShipRoomId, actor: ClanShipInteriorActor, direction: ClanShipInteriorPoint, elapsedSeconds: number,
): ClanShipInteriorActor {
  if (!isClanShipInteriorWalkable(roomId, actor) || !finitePoint(direction) || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return actor;
  const magnitude = Math.max(1, Math.hypot(direction.x, direction.y));
  const seconds = Math.min(CLAN_SHIP_INTERIOR_METRICS.maxFrameSeconds, elapsedSeconds);
  const dx = direction.x / magnitude * CLAN_SHIP_INTERIOR_METRICS.speed * seconds;
  const dy = direction.y / magnitude * CLAN_SHIP_INTERIOR_METRICS.speed * seconds;
  const count = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (CLAN_SHIP_INTERIOR_METRICS.actorRadius / 2)));
  let point = { x: actor.x, y: actor.y };
  for (let i = 0; i < count; i++) {
    const both = { x: point.x + dx / count, y: point.y + dy / count };
    if (isClanShipInteriorSegmentWalkable(roomId, point, both)) point = both;
    else {
      const horizontal = { x: point.x + dx / count, y: point.y };
      if (isClanShipInteriorSegmentWalkable(roomId, point, horizontal)) point = horizontal;
      const vertical = { x: point.x, y: point.y + dy / count };
      if (isClanShipInteriorSegmentWalkable(roomId, point, vertical)) point = vertical;
    }
  }
  if (distance(actor, point) < 1e-8) return actor;
  return { ...point, facing: Math.abs(point.x - actor.x) > 0.001 ? point.x < actor.x ? -1 : 1 : actor.facing };
}

export function stepClanShipInteriorPath(
  roomId: ClanShipRoomId, actor: ClanShipInteriorActor, waypoints: readonly ClanShipInteriorPoint[], elapsedSeconds: number,
): { actor: ClanShipInteriorActor; remaining: ClanShipInteriorPoint[]; arrived: boolean; blocked: boolean } {
  const remaining = waypoints.map(copyPoint);
  let nextActor = actor;
  let seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(CLAN_SHIP_INTERIOR_METRICS.maxFrameSeconds, elapsedSeconds)) : 0;
  let blocked = !isClanShipInteriorWalkable(roomId, actor);
  while (!blocked && remaining.length && seconds > 0) {
    const target = remaining[0];
    const span = distance(nextActor, target);
    if (span <= 0.05) { remaining.shift(); continue; }
    if (!isClanShipInteriorSegmentWalkable(roomId, nextActor, target)) { blocked = true; break; }
    const time = Math.min(seconds, span / CLAN_SHIP_INTERIOR_METRICS.speed);
    const stepped = stepClanShipInteriorActor(roomId, nextActor, { x: (target.x - nextActor.x) / span, y: (target.y - nextActor.y) / span }, time);
    if (distance(nextActor, stepped) <= 1e-8) { blocked = true; break; }
    nextActor = stepped;
    seconds -= time;
    if (distance(nextActor, target) <= 0.05) remaining.shift();
  }
  return { actor: nextActor, remaining, arrived: !blocked && remaining.length === 0, blocked };
}

export function clanShipInteriorRoomRoute(from: ClanShipRoomId, to: ClanShipRoomId): ClanShipRoomId[] {
  if (!validRoom(from) || !validRoom(to)) return [];
  const queue: ClanShipRoomId[][] = [[from]];
  const seen = new Set<ClanShipRoomId>([from]);
  for (let head = 0; head < queue.length; head++) {
    const route = queue[head];
    const room = route[route.length - 1];
    if (room === to) return route;
    for (const door of CLAN_SHIP_INTERIOR_ROOMS[room].doors) {
      if (!seen.has(door.targetRoomId)) { seen.add(door.targetRoomId); queue.push([...route, door.targetRoomId]); }
    }
  }
  return [];
}

export function clanShipInteriorSpawn(roomId: ClanShipRoomId, from?: ClanShipRoomId): ClanShipInteriorActor {
  const door = validRoom(roomId) ? CLAN_SHIP_INTERIOR_ROOMS[roomId].doors.find(candidate => candidate.targetRoomId === from) : undefined;
  return { x: door?.side === 'right' ? 1200 : 240, y: 645, facing: door?.side === 'right' ? -1 : 1 };
}

export type ClanShipInteriorInteraction = { type: 'service'; point: ClanShipInteriorPoint } | { type: 'door'; point: ClanShipInteriorDoor };
export function nearbyClanShipInteriorInteraction(roomId: ClanShipRoomId, point: ClanShipInteriorPoint): ClanShipInteriorInteraction | null {
  if (!isClanShipInteriorWalkable(roomId, point)) return null;
  const room = CLAN_SHIP_INTERIOR_ROOMS[roomId];
  const candidates: ClanShipInteriorInteraction[] = [
    { type: 'service', point: room.servicePoint }, ...room.doors.map(door => ({ type: 'door' as const, point: door })),
  ];
  const nearby = candidates.filter(candidate => distance(candidate.point, point) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach);
  nearby.sort((a, b) => distance(a.point, point) - distance(b.point, point));
  return nearby[0] ?? null;
}

export function canClanShipInteriorTransition(from: ClanShipRoomId, to: ClanShipRoomId, point: ClanShipInteriorPoint): boolean {
  if (!isClanShipInteriorWalkable(from, point) || !validRoom(to)) return false;
  const door = CLAN_SHIP_INTERIOR_ROOMS[from].doors.find(candidate => candidate.targetRoomId === to);
  return !!door && distance(door, point) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach;
}

export interface ClanShipInteriorPadState { identity: string; ready: boolean; confirm: boolean; back: boolean; start: boolean }
export interface ClanShipInteriorPadSample {
  identity: string; x: number; y: number; confirm: boolean; back: boolean; start: boolean;
}
export const freshClanShipInteriorPad = (): ClanShipInteriorPadState => ({ identity: '', ready: false, confirm: false, back: false, start: false });

/** A held pad cannot leak across boarding, doors, services or settings. Every
 * newly-owned input context first observes a complete neutral sample. */
export function stepClanShipInteriorPad(before: ClanShipInteriorPadState, sample: ClanShipInteriorPadSample | null) {
  const idle = { x: 0, y: 0, interact: false, back: false, settings: false };
  if (!sample?.identity || !finitePoint(sample)) return { state: freshClanShipInteriorPad(), ...idle };
  const state = before.identity === sample.identity ? before : { ...freshClanShipInteriorPad(), identity: sample.identity };
  const neutral = Math.abs(sample.x) <= 0.2 && Math.abs(sample.y) <= 0.2 && !sample.confirm && !sample.back && !sample.start;
  const next = { identity: sample.identity, ready: state.ready || neutral, confirm: sample.confirm, back: sample.back, start: sample.start };
  if (!state.ready) return { state: next, ...idle };
  const settings = sample.start && !state.start;
  const back = !settings && sample.back && !state.back;
  const axis = (value: number) => Math.abs(value) <= 0.2 ? 0 : Math.sign(value) * Math.min(1, (Math.abs(value) - 0.2) / 0.8);
  return { state: next, x: axis(sample.x), y: axis(sample.y), settings, back, interact: !settings && !back && sample.confirm && !state.confirm };
}
