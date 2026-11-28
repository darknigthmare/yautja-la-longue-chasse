/** The Isles V1 · public and freight transport (app/game/data/islesLivingWorldV1.json: `transports`, `lines`).
 * Nothing is simulated: the position of every metro, train, bus, lorry, ferry, ship, plane, helicopter and
 * cable car is a pure function of the game time, so the streamed world stays coherent without any memory.
 * A line is a polyline through its stops; a vehicle leaves the first stop at a fixed headway, waits at each
 * stop, loops for ever or goes there and back. Same data and same time, same vehicles, to the millimetre.
 * Yaw follows islesMovementV1 (`atan2(dx, dz)`: 0 faces south, π/2 faces east). */
import type {IslesArchipelagoSourceV1} from "./islesArchipelagoGenV1";

/** Family of a transport type: it decides the altitude and whether the body turns round at a terminus. */
export type IslesTransportClassV1 = "rail" | "route" | "mer" | "air" | "câble";

/** One transport type of the data file (speed in m/s, sizes in metres). */
export interface IslesTransportSpecV1 {
  class: string; speed: number; length: number; width: number; height: number; stopSeconds: number;
  cruiseAltitude?: number; label?: string; rideOn?: string; model?: string;
}

/** One line of the data file. A stop is a zone id ("4.1"), `sea:<rig id>` or `islet:<islet id>`. */
export interface IslesTransportLineSourceV1 { id: string; kind: string; name: string; loop: boolean; everyMinutes: number; stops: string[] }

/** The part of islesLivingWorldV1.json this module reads. */
export interface IslesLivingTransportV1 { transports: Record<string, IslesTransportSpecV1>; lines: IslesTransportLineSourceV1[] }

/** The part of islesArchipelagoV1.json this module reads. */
export type IslesTransportSourceV1 = Pick<IslesArchipelagoSourceV1, "scale" | "islands" | "chain" | "islets" | "seaZone">;

/** Tile column at a world position (metres): its kind and its top; `base`, when given, is the ground under a tree. */
export type IslesTransportGroundV1 = (x: number, z: number) => {kind: string; height: number; base?: number};

/** Values the data file does not carry yet; pass overrides as the last argument of `createIslesTransportNetworkV1`. */
export interface IslesTransportTuningV1 {
  /** Shortest distance (m) over which a vehicle reaches its cruise speed, and brakes. */
  rampMeters: number;
  /** Hardest acceleration and braking (m/s²): a fast vehicle gets a longer ramp to stay under it. */
  maxAcceleration: number;
  /** Most vehicles in service on one line. */
  maxVehiclesPerLine: number;
  /** Share of an air leg spent climbing, and descending. */
  climbShare: number;
  /** Height (m) of a cable car above the line drawn between its two stations. */
  cableClearance: number;
  /** How far (m) street level is looked for around a stop that falls on a building. */
  groundSearchMeters: number;
}

/** Default tuning: 30 m ramps, 6 m/s², 6 vehicles per line, 15 % climb, 12 m under the cable, street level within 600 m. */
export const ISLES_TRANSPORT_TUNING_V1: IslesTransportTuningV1 = {rampMeters: 30, maxAcceleration: 6, maxVehiclesPerLine: 6, climbShare: 0.15, cableClearance: 12,
  groundSearchMeters: 600};

/** Point of a line path: world metres, and `s`, the distance travelled from the first point. */
export interface IslesPathPointV1 { x: number; y: number; z: number; s: number }

/** One run between two stops, then the wait at the stop reached. Times are seconds within the round. */
export interface IslesTransportLegV1 {
  /** Indices in `stopIds`. */
  from: number; to: number;
  /** Distances along the path at departure and arrival (`s1 < s0` on the way back). */
  s0: number; s1: number;
  /** Second of the round at which the vehicle leaves `from`. */
  depart: number;
  /** Seconds on the move, then seconds waiting at `to`. */
  travel: number; dwell: number;
  /** Distance (m) to reach `peak` (m/s), and to brake from it. */
  ramp: number; peak: number;
  /** The body runs backwards (a train or a cabin coming back does not turn round). */
  reverse: boolean;
}

/** A line with its path and its timetable. `path` is replaceable: see `withIslesLinePathV1`. */
export interface IslesTransportLineV1 {
  id: string; kind: string; name: string; cls: IslesTransportClassV1; loop: boolean;
  /** Length of the path in metres (one way for a line that goes there and back, the closed loop otherwise). */
  length: number;
  /** Seconds between two departures of the same vehicle from the first stop (the round, wait at the terminus included). */
  roundSeconds: number;
  /** Seconds between two departures from the first stop. */
  headwaySeconds: number;
  /** Vehicles in service. */
  vehicles: number;
  /** Headway asked for by the data (minutes); `headwaySeconds` is longer when the line is saturated. */
  everyMinutes: number;
  stopIds: string[];
  /** Height the vehicle stands at, at each stop: street level, or the top of the column for aircraft. */
  stopY: number[];
  /** Distance along `path` of each stop, in the order of `stopIds`. */
  stopAt: number[];
  /** Polyline of the line; a loop ends on its first point again. */
  path: IslesPathPointV1[];
  legs: IslesTransportLegV1[];
  spec: IslesTransportSpecV1;
}

/** A stop, shared by every line that serves it. `y` is street level there; `top` is the top of the tile column
 * (a roof, the deck of a rig), where aircraft land. */
export interface IslesTransportStopV1 { id: string; label: string; x: number; y: number; z: number; top: number; lines: string[] }

/** The whole network: lines and stops for the map and the interface, and what is needed to rebuild a line. */
export interface IslesTransportNetworkV1 {
  lines: IslesTransportLineV1[];
  stops: IslesTransportStopV1[];
  tuning: IslesTransportTuningV1;
  ground: IslesTransportGroundV1 | null;
}

/** A vehicle at one instant. `(x, y, z)` is the centre of its floor; `yaw` is the heading of its body, which is
 * the direction of travel unless `reverse` is true (then it travels towards `yaw + π`). */
export interface IslesVehicleV1 {
  /** Stable: line id, "#", number from 1. */
  id: string; lineId: string; kind: string; cls: IslesTransportClassV1;
  x: number; y: number; z: number; yaw: number;
  /** Instant speed along the path (m/s), 0 at a stop. */
  speed: number;
  stopped: boolean;
  /** The stop it waits at, or null on the move. */
  stopId: string | null;
  /** The stop it is heading to, or will leave for. */
  nextStopId: string;
  length: number; width: number; height: number;
  reverse: boolean;
}

/** Next passage of a line at a stop. */
export interface IslesDepartureV1 {
  lineId: string; kind: string; name: string;
  /** The stop the vehicle goes to next. */
  towards: string;
  /** Seconds until a vehicle is at the stop (0 when one is waiting there). */
  waitSeconds: number;
  /** Seconds until that vehicle leaves the stop. */
  departsInSeconds: number;
}

const CLASSES: readonly string[] = ["rail", "route", "mer", "air", "câble"];
const TAU = Math.PI * 2;
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Angle brought back to ]-π, π]. */
const wrapAngle = (a: number) => { const r = mod(a + Math.PI, TAU) - Math.PI; return r === -Math.PI ? Math.PI : r; };

/** Kinds a wheel or a rail can run on; anything else (building, wall, pillar, crate…) is something standing there. */
const OPEN_GROUND: readonly string[] = ["sand", "grass", "jungle", "mud", "road", "rail", "bush", "snow", "lava", "savanna", "reed", "crop"];
const SEARCH_DIRECTIONS = 24;

/** Street level of a tile, or null when a structure stands on it. Water counts as sea level. */
function openLevel(tile: {kind: string; height: number; base?: number}): number | null {
  if (tile.kind === "water" || tile.kind === "ford") return 0;
  if (OPEN_GROUND.includes(tile.kind)) return Math.max(0, tile.height);
  return tile.base !== undefined && tile.base < tile.height ? Math.max(0, tile.base) : null;
}

/** Top of the tile column at a point, never under the sea (0 without a ground sampler). */
function topLevel(ground: IslesTransportGroundV1 | null, x: number, z: number): number {
  return ground ? Math.max(0, ground(x, z).height) : 0;
}

/** Street level at a point. On a building, the nearest open ground within `reach` metres gives it (rings that
 * widen by a quarter each time); failing that the vehicle stands on what is there. */
function streetLevel(ground: IslesTransportGroundV1 | null, x: number, z: number, reach: number): number {
  if (!ground) return 0;
  const here = openLevel(ground(x, z));
  if (here !== null) return here;
  for (let radius = 4; radius <= reach; radius *= 1.25) {
    for (let step = 0; step < SEARCH_DIRECTIONS; step++) {
      const angle = step * TAU / SEARCH_DIRECTIONS, level = openLevel(ground(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius));
      if (level !== null) return level;
    }
  }
  return topLevel(ground, x, z);
}

/** Position on a path at distance `s` (wrapped on a loop, clamped otherwise). */
function pointAt(path: IslesPathPointV1[], s: number, loop: boolean): {x: number; y: number; z: number} {
  const total = path[path.length - 1].s;
  const at = loop && total > 0 ? mod(s, total) : Math.min(total, Math.max(0, s));
  let lo = 0, hi = path.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (path[mid].s <= at) lo = mid; else hi = mid; }
  const a = path[lo], b = path[hi], span = b.s - a.s, t = span > 0 ? (at - a.s) / span : 0;
  return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t};
}

/** Turns bare points into a path with heights and cumulated distances; a loop is closed on its first point. */
function buildPath(points: {x: number; z: number; y?: number}[], loop: boolean, cls: IslesTransportClassV1, ground: IslesTransportGroundV1 | null, reach: number): IslesPathPointV1[] {
  const list = points.slice();
  const first = list[0], last = list[list.length - 1];
  if (loop && (first.x !== last.x || first.z !== last.z)) list.push(first);
  const path: IslesPathPointV1[] = [];
  let s = 0;
  list.forEach((point, index) => {
    if (index > 0) s += Math.hypot(point.x - list[index - 1].x, point.z - list[index - 1].z);
    const y = cls === "mer" ? 0 : point.y ?? streetLevel(ground, point.x, point.z, reach);
    path.push({x: point.x, y, z: point.z, s});
  });
  return path;
}

/** Distance along the path of the point nearest to (x, z), not before `from`. */
function projectOnPath(path: IslesPathPointV1[], x: number, z: number, from: number): number {
  let best = Infinity, bestS = from;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (b.s < from) continue;
    const dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
    let t = len ? Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / len)) : 0;
    if (a.s + (b.s - a.s) * t < from) t = (from - a.s) / (b.s - a.s);
    const d = Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
    if (d < best) { best = d; bestS = a.s + (b.s - a.s) * t; }
  }
  return bestS;
}

/** Timetable of a line on a given path: legs, round, headway and vehicles in service. */
function buildLine(source: IslesTransportLineSourceV1, spec: IslesTransportSpecV1, path: IslesPathPointV1[], stopAt: number[], stopY: number[],
  tuning: IslesTransportTuningV1): IslesTransportLineV1 {
  const cls = spec.class as IslesTransportClassV1, count = source.stops.length, length = path[path.length - 1].s;
  const turnsRound = cls !== "rail" && cls !== "câble";
  const runs: {from: number; to: number; s0: number; s1: number; back: boolean}[] = [];
  if (source.loop) {
    for (let i = 0; i < count; i++) runs.push({from: i, to: (i + 1) % count, s0: stopAt[i], s1: i + 1 < count ? stopAt[i + 1] : stopAt[0] + length, back: false});
  } else {
    for (let i = 0; i + 1 < count; i++) runs.push({from: i, to: i + 1, s0: stopAt[i], s1: stopAt[i + 1], back: false});
    for (let i = count - 1; i > 0; i--) runs.push({from: i, to: i - 1, s0: stopAt[i], s1: stopAt[i - 1], back: true});
  }
  // Speed follows a smoothstep in time, whose hardest acceleration is 0.75 v² / ramp: the ramp grows with the
  // speed to stay under the limit, and a leg too short for two ramps is run slower.
  const wanted = Math.max(tuning.rampMeters, 0.75 * spec.speed * spec.speed / tuning.maxAcceleration);
  let clock = 0;
  const legs: IslesTransportLegV1[] = runs.map(run => {
    const distance = Math.abs(run.s1 - run.s0), ramp = Math.min(wanted, distance / 2);
    const peak = Math.min(spec.speed, Math.sqrt(ramp * tuning.maxAcceleration / 0.75));
    const travel = peak > 0 ? 4 * ramp / peak + (distance - 2 * ramp) / peak : 0;
    const leg = {from: run.from, to: run.to, s0: run.s0, s1: run.s1, depart: clock, travel, dwell: spec.stopSeconds, ramp, peak, reverse: run.back && !turnsRound};
    clock += travel + spec.stopSeconds;
    return leg;
  });
  // The round is stretched to a whole number of headways: the vehicle waits the difference at the first stop.
  const every = source.everyMinutes * 60;
  const vehicles = Math.min(tuning.maxVehiclesPerLine, Math.max(1, Math.ceil(clock / every - 1e-9)));
  const roundSeconds = Math.max(clock, vehicles * every);
  legs[legs.length - 1].dwell += roundSeconds - clock;
  return {id: source.id, kind: source.kind, name: source.name, cls, loop: source.loop, length, roundSeconds, headwaySeconds: roundSeconds / vehicles, vehicles,
    everyMinutes: source.everyMinutes, stopIds: source.stops.slice(), stopAt, stopY, path, legs, spec};
}

/** Builds the network: every stop resolved to world metres, a straight path from stop to stop for each line, and
 * its timetable. `ground` gives the heights (0 everywhere without it); `tuning` overrides the defaults. */
export function createIslesTransportNetworkV1(living: IslesLivingTransportV1, source: IslesTransportSourceV1, ground?: IslesTransportGroundV1,
  tuning?: Partial<IslesTransportTuningV1>): IslesTransportNetworkV1 {
  const values = {...ISLES_TRANSPORT_TUNING_V1, ...tuning}, sampler = ground ?? null, metres = source.scale * 1000;
  const places = new Map<string, {label: string; at: [number, number]}>();
  const zones = [...source.islands.flatMap(island => island.zones), ...source.chain.zones, ...source.islets.flatMap(islet => islet.zones ?? [])];
  for (const zone of zones) places.set(zone.id, {label: zone.name, at: zone.at});
  for (const rig of source.seaZone.rigs) places.set("sea:" + rig.id, {label: rig.name, at: rig.center});
  for (const islet of source.islets) places.set("islet:" + islet.id, {label: islet.name, at: islet.center});

  const stops = new Map<string, IslesTransportStopV1>();
  const lines = living.lines.map(line => {
    const spec = living.transports[line.kind];
    if (!spec) throw new Error("Type de transport inconnu : " + line.kind + " (ligne " + line.id + ")");
    if (!CLASSES.includes(spec.class)) throw new Error("Classe de transport inconnue : " + spec.class + " (" + line.kind + ")");
    if (line.stops.length < 2) throw new Error("Ligne sans trajet : " + line.id);
    if (!(line.everyMinutes > 0) || !(spec.speed > 0)) throw new Error("Fréquence ou vitesse nulle : " + line.id);
    const points = line.stops.map(id => {
      const place = places.get(id);
      if (!place) throw new Error("Arrêt introuvable : " + id + " (ligne " + line.id + ")");
      let stop = stops.get(id);
      if (!stop) {
        const x = place.at[0] * metres, z = place.at[1] * metres;
        stop = {id, label: place.label, x, y: streetLevel(sampler, x, z, values.groundSearchMeters), z, top: topLevel(sampler, x, z), lines: []};
        stops.set(id, stop);
      }
      if (!stop.lines.includes(line.id)) stop.lines.push(line.id);
      return {x: stop.x, y: spec.class === "air" ? stop.top : stop.y, z: stop.z};
    });
    const path = buildPath(points, line.loop, spec.class as IslesTransportClassV1, sampler, values.groundSearchMeters);
    return buildLine(line, spec, path, points.map((_, index) => path[index].s), points.map(point => point.y), values);
  });
  return {lines, stops: [...stops.values()], tuning: values, ground: sampler};
}

/** Same network with the path of one line replaced (a real road or track instead of the straight segments).
 * `points` are world metres in the order of the stops, `y` optional (the ground is sampled otherwise); a loop is
 * closed automatically. Each stop moves to the nearest point of the new path, in order, and the timetable is rebuilt. */
export function withIslesLinePathV1(network: IslesTransportNetworkV1, lineId: string, points: {x: number; z: number; y?: number}[]): IslesTransportNetworkV1 {
  const line = network.lines.find(item => item.id === lineId);
  if (!line) throw new Error("Ligne inconnue : " + lineId);
  if (points.length < 2) throw new Error("Tracé trop court : " + lineId);
  const path = buildPath(points, line.loop, line.cls, network.ground, network.tuning.groundSearchMeters);
  let from = 0;
  const stopAt = line.stopIds.map(id => {
    const stop = network.stops.find(item => item.id === id)!;
    from = projectOnPath(path, stop.x, stop.z, from);
    return from;
  });
  const source = {id: line.id, kind: line.kind, name: line.name, loop: line.loop, everyMinutes: line.everyMinutes, stops: line.stopIds};
  const rebuilt = buildLine(source, line.spec, path, stopAt, line.stopY, network.tuning);
  return {...network, lines: network.lines.map(item => item === line ? rebuilt : item)};
}

/** Heading of travel on a leg at distance `s`: the chord between the two ends of the vehicle, kept inside the leg. */
function travelYaw(line: IslesTransportLineV1, leg: IslesTransportLegV1, s: number): number {
  const lo = Math.min(leg.s0, leg.s1), hi = Math.max(leg.s0, leg.s1), half = Math.max(0.5, line.spec.length / 2);
  const a = pointAt(line.path, Math.max(lo, s - half), line.loop), b = pointAt(line.path, Math.min(hi, s + half), line.loop);
  const sign = leg.s1 >= leg.s0 ? 1 : -1;
  return Math.atan2((b.x - a.x) * sign, (b.z - a.z) * sign);
}
const bodyYaw = (line: IslesTransportLineV1, leg: IslesTransportLegV1, s: number) => travelYaw(line, leg, s) + (leg.reverse ? Math.PI : 0);

/** Height of the vehicle floor on a leg, `done` metres after the departure. */
function floorHeight(tuning: IslesTransportTuningV1, line: IslesTransportLineV1, leg: IslesTransportLegV1, done: number, onPath: number): number {
  if (line.cls === "mer") return 0;
  if (line.cls !== "air" && line.cls !== "câble") return onPath;
  const distance = Math.abs(leg.s1 - leg.s0), f = distance > 0 ? done / distance : 1;
  const between = line.stopY[leg.from] + (line.stopY[leg.to] - line.stopY[leg.from]) * f;
  if (line.cls === "câble") return between + tuning.cableClearance;
  const lift = smooth(Math.min(f, 1 - f) / tuning.climbShare);
  return between * (1 - lift) + (line.spec.cruiseAltitude ?? 0) * lift;
}

/** One vehicle of a line, `seconds` after it left the first stop (wrapped on the round). */
function vehicleOnLine(tuning: IslesTransportTuningV1, line: IslesTransportLineV1, number: number, seconds: number, halted: boolean): IslesVehicleV1 {
  const {legs, spec} = line;
  const local = mod(seconds, line.roundSeconds);
  let index = legs.length - 1;
  while (index > 0 && legs[index].depart > local) index--;
  const leg = legs[index], next = legs[(index + 1) % legs.length];
  // Weather: a vehicle on the move is held at the stop it left, as it was at the second of leaving.
  const elapsed = halted ? Math.max(local - leg.depart, leg.travel) : local - leg.depart;
  const held = halted && local - leg.depart < leg.travel;
  const distance = Math.abs(leg.s1 - leg.s0), sign = leg.s1 >= leg.s0 ? 1 : -1;
  let done = held ? 0 : distance, speed = 0, yaw: number;
  const moving = !held && elapsed < leg.travel;
  if (moving) {
    const rampSeconds = 2 * leg.ramp / leg.peak;
    const ramped = (t: number) => { const u = t / rampSeconds; return leg.peak * rampSeconds * (u * u * u - u * u * u * u / 2); };
    if (elapsed < rampSeconds) { done = ramped(elapsed); speed = leg.peak * smooth(elapsed / rampSeconds); }
    else if (elapsed > leg.travel - rampSeconds) { done = distance - ramped(leg.travel - elapsed); speed = leg.peak * smooth((leg.travel - elapsed) / rampSeconds); }
    else { done = leg.ramp + leg.peak * (elapsed - rampSeconds); speed = leg.peak; }
  }
  const s = leg.s0 + sign * done, point = pointAt(line.path, s, line.loop);
  if (moving || held) yaw = bodyYaw(line, leg, s);
  else {
    // At a stop the body turns from the heading it arrived with to the one it leaves with.
    const arrived = bodyYaw(line, leg, leg.s1), turn = wrapAngle(bodyYaw(line, next, next.s0) - arrived);
    yaw = arrived + turn * smooth(leg.dwell > 0 ? (elapsed - leg.travel) / leg.dwell : 1);
  }
  const at = held ? leg.from : leg.to;
  return {id: line.id + "#" + (number + 1), lineId: line.id, kind: line.kind, cls: line.cls,
    x: point.x, y: floorHeight(tuning, line, leg, done, point.y), z: point.z, yaw: wrapAngle(yaw), speed,
    stopped: !moving, stopId: moving ? null : line.stopIds[at], nextStopId: line.stopIds[moving || held ? leg.to : next.to],
    length: spec.length, width: spec.width, height: spec.height, reverse: leg.reverse && moving};
}

/** Every vehicle in service at a game time (seconds), or only those whose centre is within `around.radius` metres.
 * `options.stopped(kind)` holds a transport type because of the weather: its vehicles stay at the last stop they
 * reached, without vanishing, and start again from the timetable when it clears. */
export function islesVehiclesAtV1(network: IslesTransportNetworkV1, timeSeconds: number, around?: {x: number; z: number; radius: number},
  options?: {stopped?: (kind: string) => boolean}): IslesVehicleV1[] {
  const found: IslesVehicleV1[] = [];
  for (const line of network.lines) {
    const halted = options?.stopped?.(line.kind) ?? false;
    for (let number = 0; number < line.vehicles; number++) {
      const vehicle = vehicleOnLine(network.tuning, line, number, timeSeconds - number * line.headwaySeconds, halted);
      if (!around || Math.hypot(vehicle.x - around.x, vehicle.z - around.z) <= around.radius) found.push(vehicle);
    }
  }
  return found;
}

/** Coordinates of a point in the frame of a vehicle: `along` its length (forwards), `across` its width (to its right). */
function localOf(vehicle: {x: number; z: number; yaw: number}, x: number, z: number): {along: number; across: number} {
  const dx = x - vehicle.x, dz = z - vehicle.z, sin = Math.sin(vehicle.yaw), cos = Math.cos(vehicle.yaw);
  return {along: dx * sin + dz * cos, across: dx * cos - dz * sin};
}

/** Whether (x, z) is over the vehicle (its oriented length × width rectangle), and the height of its roof or deck. */
export function islesVehicleDeckV1(vehicle: IslesVehicleV1, x: number, z: number): {inside: boolean; deckY: number} {
  const {along, across} = localOf(vehicle, x, z);
  return {inside: Math.abs(along) <= vehicle.length / 2 && Math.abs(across) <= vehicle.width / 2, deckY: vehicle.y + vehicle.height};
}

/** Carries a rider with a vehicle between two instants: the rider keeps the same place on it (translation, rise
 * and yaw rotation), which is what lets a hunter stand on a roof that moves and turns. */
export function islesRideStepV1(vehicleBefore: IslesVehicleV1, vehicleAfter: IslesVehicleV1, rider: {x: number; y: number; z: number}): {x: number; y: number; z: number} {
  const {along, across} = localOf(vehicleBefore, rider.x, rider.z), sin = Math.sin(vehicleAfter.yaw), cos = Math.cos(vehicleAfter.yaw);
  return {x: vehicleAfter.x + along * sin + across * cos, y: rider.y + vehicleAfter.y - vehicleBefore.y, z: vehicleAfter.z + along * cos - across * sin};
}

/** Next passage of each line serving a stop at a game time, soonest first (weather is not taken into account). */
export function islesNextDeparturesV1(network: IslesTransportNetworkV1, stopId: string, timeSeconds: number): IslesDepartureV1[] {
  const departures: IslesDepartureV1[] = [];
  for (const line of network.lines) {
    let best: IslesDepartureV1 | null = null;
    for (let index = 0; index < line.legs.length; index++) {
      const leg = line.legs[index];
      if (line.stopIds[leg.to] !== stopId) continue;
      const arrives = leg.depart + leg.travel, towards = line.stopIds[line.legs[(index + 1) % line.legs.length].to];
      for (let number = 0; number < line.vehicles; number++) {
        const local = mod(timeSeconds - number * line.headwaySeconds, line.roundSeconds);
        const here = local >= arrives && local < arrives + leg.dwell;
        const waitSeconds = here ? 0 : mod(arrives - local, line.roundSeconds);
        const departsInSeconds = here ? arrives + leg.dwell - local : waitSeconds + leg.dwell;
        if (!best || waitSeconds < best.waitSeconds || (waitSeconds === best.waitSeconds && departsInSeconds < best.departsInSeconds)) {
          best = {lineId: line.id, kind: line.kind, name: line.name, towards, waitSeconds, departsInSeconds};
        }
      }
    }
    if (best) departures.push(best);
  }
  return departures.sort((a, b) => a.waitSeconds - b.waitSeconds || a.departsInSeconds - b.departsInSeconds);
}

/** The stop nearest to a world position, its distance in metres, and the next passage of each of its lines at
 * `timeSeconds`; null on a network without stops. */
export function islesNearestStopV1(network: IslesTransportNetworkV1, x: number, z: number, timeSeconds = 0):
  {stop: IslesTransportStopV1; distance: number; departures: IslesDepartureV1[]} | null {
  let nearest: IslesTransportStopV1 | null = null, distance = Infinity;
  for (const stop of network.stops) {
    const d = Math.hypot(stop.x - x, stop.z - z);
    if (d < distance) { distance = d; nearest = stop; }
  }
  return nearest ? {stop: nearest, distance, departures: islesNextDeparturesV1(network, nearest.id, timeSeconds)} : null;
}
