/** Experimental spatial bay. Its owner is /dev memory, never a campaign save.
 * These interactions test room access and a dry bench, not WARP-M030–M033.
 * No rite, recruitment, inventory, reward or transit is awarded here. */
export type WarpBayRoomId = 'bay' | 'synchronization';
export interface WarpBayPoint { x: number; y: number }
export interface WarpBayState {
  roomId: WarpBayRoomId;
  actor: WarpBayPoint & { facing: -1 | 1 };
  doorOpen: boolean;
  consoleRead: boolean;
  memoryRead: boolean;
  archivistHeard: boolean;
  benchTested: boolean;
  walked: number;
  visited: readonly WarpBayRoomId[];
}
export type WarpBayAction = 'console' | 'archive' | 'archivist' | 'door' | 'cross' | 'calibrate' | 'exit';
export interface WarpBayStation {
  id: WarpBayAction;
  label: string;
  point: WarpBayPoint;
  approach: WarpBayPoint;
}
interface Rect { x: number; y: number; width: number; height: number }
export const WARP_BAY_METRICS = Object.freeze({ width: 1000, height: 563, actorRadius: 12, speed: 230, reach: 48, maxFrameSeconds: 0.05 });
export const WARP_BAY_ART_ROOT = '/game/warp-universe/20261109/';
export const WARP_BAY_ROOMS = {
  bay: { label: 'Baie du prototype', background: '199_module_baie_warp_fond.png', doorX: 900 },
  synchronization: { label: 'Salle de synchronisation', background: '200_module_salle_avatar_fond.png', doorX: 100 },
} as const;
const finite = (v: number) => Number.isFinite(v);
const distance = (a: WarpBayPoint, b: WarpBayPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const floor: Rect = { x: 30, y: 430, width: 940, height: 90 };
function fixtures(room: WarpBayRoomId): readonly Rect[] {
  const doorX = WARP_BAY_ROOMS[room].doorX;
  const jambs = [{ x: doorX - 83, y: 395, width: 24, height: 77 }, { x: doorX + 59, y: 395, width: 24, height: 77 }];
  return room === 'bay' ? [...jambs,
    { x: 68, y: 410, width: 80, height: 36 },
    { x: 605, y: 425, width: 40, height: 39 },
    { x: 716, y: 430, width: 28, height: 30 },
  ] : jambs;
}
function closedDoor(room: WarpBayRoomId): Rect {
  return { x: WARP_BAY_ROOMS[room].doorX - 50, y: 420, width: 100, height: 52 };
}
function overlap(point: WarpBayPoint, rect: Rect, radius: number) {
  return point.x + radius > rect.x && point.x - radius < rect.x + rect.width &&
    point.y + radius > rect.y && point.y - radius < rect.y + rect.height;
}
export function warpBayWalkable(room: WarpBayRoomId, p: WarpBayPoint, doorOpen: boolean): boolean {
  const r = WARP_BAY_METRICS.actorRadius;
  return !!WARP_BAY_ROOMS[room] && finite(p.x) && finite(p.y) && p.x >= floor.x + r && p.x <= floor.x + floor.width - r &&
    p.y >= floor.y + r && p.y <= floor.y + floor.height - r &&
    !fixtures(room).some(rect => overlap(p, rect, r)) && (doorOpen || !overlap(p, closedDoor(room), r));
}
export function createWarpBayState(): WarpBayState {
  return { roomId: 'bay', actor: { x: 500, y: 490, facing: 1 }, doorOpen: false,
    consoleRead: false, memoryRead: false, archivistHeard: false, benchTested: false, walked: 0, visited: ['bay'] };
}
export function warpBayStations(room: WarpBayRoomId): readonly WarpBayStation[] {
  const doorX = WARP_BAY_ROOMS[room].doorX;
  const common: WarpBayStation[] = [
    { id: 'door', label: 'Commander le sas', point: { x: room === 'bay' ? 790 : 210, y: 490 }, approach: { x: room === 'bay' ? 790 : 210, y: 490 } },
    { id: 'cross', label: room === 'bay' ? 'Passer vers la synchronisation' : 'Revenir à la baie', point: { x: doorX, y: 450 }, approach: { x: doorX, y: 450 } },
  ];
  return room === 'bay' ? [
    { id: 'console', label: 'Lire la console de coordonnées', point: { x: 110, y: 445 }, approach: { x: 110, y: 480 } },
    { id: 'archive', label: 'Examiner la mémoire d’avatar', point: { x: 625, y: 460 }, approach: { x: 625, y: 490 } },
    { id: 'archivist', label: 'Écouter l’archiviste', point: { x: 730, y: 460 }, approach: { x: 730, y: 490 } },
    ...common,
    { id: 'exit', label: 'Quitter la baie', point: { x: 65, y: 490 }, approach: { x: 65, y: 490 } },
  ] : [
    { id: 'calibrate', label: 'Tester le banc de synchronisation', point: { x: 500, y: 470 }, approach: { x: 500, y: 490 } },
    ...common,
  ];
}
export function stepWarpBay(state: WarpBayState, input: WarpBayPoint, seconds: number): WarpBayState {
  if (!finite(seconds) || seconds <= 0 || !finite(input.x) || !finite(input.y) || !warpBayWalkable(state.roomId, state.actor, state.doorOpen)) return state;
  const magnitude = Math.hypot(input.x, input.y);
  if (!magnitude || !finite(magnitude)) return state;
  const dt = Math.min(seconds, WARP_BAY_METRICS.maxFrameSeconds), length = Math.max(1, magnitude);
  const dx = input.x / length * WARP_BAY_METRICS.speed * dt, dy = input.y / length * WARP_BAY_METRICS.speed * dt;
  let position: WarpBayPoint = { x: state.actor.x, y: state.actor.y };
  // Small substeps prevent crossing the narrow door/prop footprints at low FPS.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 0; i < steps; i++) {
    const nextX = { x: position.x + dx / steps, y: position.y };
    if (warpBayWalkable(state.roomId, nextX, state.doorOpen)) position = nextX;
    const nextY = { x: position.x, y: position.y + dy / steps };
    if (warpBayWalkable(state.roomId, nextY, state.doorOpen)) position = nextY;
  }
  const walked = distance(state.actor, position);
  return walked < 0.00001 ? state : { ...state, actor: { ...position, facing: dx > 0 ? 1 : dx < 0 ? -1 : state.actor.facing }, walked: state.walked + walked };
}
function clearLine(state: WarpBayState, a: WarpBayPoint, b: WarpBayPoint) {
  const count = Math.max(1, Math.ceil(distance(a, b) / 4));
  for (let i = 0; i <= count; i++) if (!warpBayWalkable(state.roomId, { x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count }, state.doorOpen)) return false;
  return true;
}
/** A small authored floor graph, with continuous endpoint and segment checks. */
export function planWarpBayPath(state: WarpBayState, target: WarpBayPoint): WarpBayPoint[] {
  if (!warpBayWalkable(state.roomId, state.actor, state.doorOpen) || !warpBayWalkable(state.roomId, target, state.doorOpen)) return [];
  if (clearLine(state, state.actor, target)) return [target];
  const nodes = new Map<string, WarpBayPoint>();
  const key = (p: WarpBayPoint) => p.x + ':' + p.y;
  for (let x = 50; x <= 950; x += 10) for (let y = 450; y <= 500; y += 10) {
    const p = { x, y }; if (warpBayWalkable(state.roomId, p, state.doorOpen)) nodes.set(key(p), p);
  }
  const parents = new Map<string, string | null>(), queue: string[] = [];
  for (const [k, p] of nodes) if (distance(state.actor, p) <= 20 && clearLine(state, state.actor, p)) { parents.set(k, null); queue.push(k); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const k = queue[cursor], p = nodes.get(k)!;
    if (distance(p, target) <= 20 && clearLine(state, p, target)) {
      const path = [target]; let current: string | null = k;
      while (current !== null) { path.push(nodes.get(current)!); current = parents.get(current)!; }
      return path.reverse();
    }
    for (const d of [{ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: -10 }]) {
      const next = { x: p.x + d.x, y: p.y + d.y }, nk = key(next);
      if (nodes.has(nk) && !parents.has(nk) && clearLine(state, p, next)) { parents.set(nk, k); queue.push(nk); }
    }
  }
  return [];
}
export function stepWarpBayPath(state: WarpBayState, waypoints: readonly WarpBayPoint[], seconds: number): { state: WarpBayState; remaining: WarpBayPoint[] } {
  const remaining = [...waypoints];
  while (remaining.length && distance(state.actor, remaining[0]) < 0.5) remaining.shift();
  if (!remaining.length || !finite(seconds) || seconds <= 0) return { state, remaining };
  const target = remaining[0], dx = target.x - state.actor.x, dy = target.y - state.actor.y;
  const time = Math.min(seconds, distance(state.actor, target) / WARP_BAY_METRICS.speed);
  return { state: stepWarpBay(state, { x: dx, y: dy }, time), remaining };
}
export function actWarpBay(state: WarpBayState, action: WarpBayAction): { accepted: boolean; state: WarpBayState; message: string; exit?: boolean } {
  const deny = (message: string) => ({ accepted: false, state, message });
  const station = warpBayStations(state.roomId).find(s => s.id === action);
  if (!station || !warpBayWalkable(state.roomId, state.actor, state.doorOpen)) return deny('Ce poste est indisponible dans cette salle.');
  const reach = action === 'cross' ? 18 : WARP_BAY_METRICS.reach;
  if (distance(state.actor, station.point) > reach) return deny('Approche du poste avant de l’utiliser.');
  switch (action) {
    case 'door':
      if (state.doorOpen && overlap(state.actor, closedDoor(state.roomId), WARP_BAY_METRICS.actorRadius)) return deny('Éloigne-toi du seuil avant de refermer le sas.');
      return { accepted: true, state: { ...state, doorOpen: !state.doorOpen }, message: state.doorOpen ? 'Sas fermé. Le seuil bloque le passage.' : 'Sas ouvert. Le passage est libre.' };
    case 'cross': {
      if (!state.doorOpen) return deny('Le sas est fermé. Utilise sa commande.');
      const nextRoom = state.roomId === 'bay' ? 'synchronization' : 'bay';
      return { accepted: true, state: { ...state, roomId: nextRoom, actor: { x: WARP_BAY_ROOMS[nextRoom].doorX, y: 490, facing: nextRoom === 'bay' ? -1 : 1 }, visited: state.visited.includes(nextRoom) ? state.visited : [...state.visited, nextRoom] }, message: nextRoom === 'bay' ? 'Retour dans la baie par le sas.' : 'Salle de synchronisation atteinte par le sas.' };
    }
    case 'console': return { accepted: true, state: { ...state, consoleRead: true }, message: 'Console consultée. Aucun départ n’est autorisé par ce banc d’essai.' };
    case 'archive': return { accepted: true, state: { ...state, memoryRead: true }, message: 'Mémoire identifiée. L’inventaire et l’avatar de campagne restent inchangés.' };
    case 'archivist': return { accepted: true, state: { ...state, archivistHeard: true }, message: 'Archiviste : « Le prototype ne donne ni rang ni allié. Le retour doit rester praticable. »' };
    case 'calibrate':
      if (!state.consoleRead || !state.memoryRead) return deny('Consulte d’abord la console et la mémoire dans la baie. Le trajet de retour reste ouvert.');
      return { accepted: true, state: { ...state, benchTested: true }, message: 'Alignement local vérifié. Aucun transit de campagne n’est lancé.' };
    case 'exit': return { accepted: true, state, message: 'Sortie de la baie.', exit: true };
  }
}
