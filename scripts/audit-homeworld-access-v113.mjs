/** Level-design access audit of the Homeworld exterior, on the actual motor geometry.
 *
 * Every sample asks the game's own outdoor predicate (homeworldCivicWalkableV80,
 * the static part of the Hub's cargo motor) whether the full native hunter body
 * fits there. A 4-neighbour flood fill from the spacecraft spawn, continued
 * through every connector whose two landings are reached, gives the reachable
 * ground. Each gameplay anchor is then checked against its real interaction
 * radius, and each blocked anchor names the collider that occupies it.
 *
 * Geometry evidence only: no rendering, pixel, browser or artistic judgement.
 * Usage: node scripts/audit-homeworld-access-v113.mjs [--step 8] [--out file]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Interaction radii read from the game code (nearestHomeworldDoorV77: 32,
 * nearestHomeworldPointV77: 145). Connector landings use the door radius. */
export const ACCESS_RADII_V113 = {door: 32, service: 145, connector: 32, spawn: 0, dock: 145};

export function auditHomeworldAccessV113({root = ROOT, step = 8} = {}) {
  const qa = homeworldSceneSsrV78(root), load = file => qa.load('app/game/systems/' + file + '.ts');
  const world = load('homeworldWorldV77'), civic = load('homeworldCivicWorldV80'), rooms = load('homeworldInteriorsV64');
  const legacy = load('homeworldGeometryV64');
  const {width, height} = world.HOMEWORLD_WORLD_V77, cols = Math.ceil(width / step), rows = Math.ceil(height / step);
  const levels = world.HOMEWORLD_LEVELS_V77.map(level => level.id);
  const cell = (x, y) => ({x: (x + .5) * step, y: (y + .5) * step});
  const index = p => {const x = Math.floor(p.x / step), y = Math.floor(p.y / step); return x >= 0 && y >= 0 && x < cols && y < rows ? y * cols + x : -1;};

  // 0 = blocked, 1 = walkable, 2 = reached
  const masks = Object.fromEntries(levels.map(level => {
    const mask = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (civic.homeworldCivicWalkableV80(level, cell(x, y))) mask[y * cols + x] = 1;
    return [level, mask];
  }));
  const fill = (level, seedPoint) => {
    const mask = masks[level]; let seed = index(seedPoint);
    if (seed < 0) return 0;
    if (mask[seed] !== 1) { // snap to the nearest walkable sample within one body length
      let best = -1, bestD = Infinity; const sx = seed % cols, sy = Math.floor(seed / cols), r = Math.ceil(48 / step);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = sx + dx, y = sy + dy, id = y * cols + x;
        if (x >= 0 && y >= 0 && x < cols && y < rows && mask[id] === 1 && dx * dx + dy * dy < bestD) {best = id; bestD = dx * dx + dy * dy;}
      }
      if (best < 0) return 0; seed = best;
    }
    const queue = [seed]; mask[seed] = 2;
    for (let n = 0; n < queue.length; n++) {
      const id = queue[n], x = id % cols, y = (id - x) / cols;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const next = ny * cols + nx;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && masks[level][next] === 1) {masks[level][next] = 2; queue.push(next);}
      }
    }
    return queue.length;
  };
  const reached = (level, point, radius) => {
    const mask = masks[level], r = Math.max(0, Math.ceil(radius / step)), cx = Math.floor(point.x / step), cy = Math.floor(point.y / step);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows || mask[y * cols + x] !== 2) continue;
      if (Math.hypot(cell(x, y).x - point.x, cell(x, y).y - point.y) <= Math.max(radius, step)) return true;
    }
    return false;
  };

  fill('0', world.HOMEWORLD_SPACEPORT_V77.spawn);
  const connectorsUsed = new Set();
  for (let changed = true; changed;) {
    changed = false;
    for (const c of world.HOMEWORLD_CONNECTORS_V77) {
      if (connectorsUsed.has(c.id)) continue;
      const a = reached(c.from.levelId, c.from.point, ACCESS_RADII_V113.connector), b = reached(c.to.levelId, c.to.point, ACCESS_RADII_V113.connector);
      if (a && !b) fill(c.to.levelId, c.to.point); else if (b && !a) fill(c.from.levelId, c.from.point);
      if (a || b) {connectorsUsed.add(c.id); changed = true;}
    }
  }

  const blockerAt = (level, point) => civic.homeworldCivicCollisionV80(level, point) ?? (civic.homeworldCivicWalkableV80(level, point) ? null : {kind: 'terrain', id: 'no-floor'});
  const anchors = [];
  const add = (kind, id, label, levelId, point, radius) => anchors.push({kind, id, label, levelId, point: {x: point.x, y: point.y}, radius});
  add('spawn', 'spacecraft-spawn', 'Arrivée de la navette', '0', world.HOMEWORLD_SPACEPORT_V77.spawn, ACCESS_RADII_V113.spawn);
  for (const b of world.HOMEWORLD_BUILDINGS_V77) {
    if (!rooms.homeworldInteriorForBuildingV64(b.id)) continue; // closed facades have no doorway to reach
    add('door', b.id, b.label, b.levelId, legacy.homeworldBuildingDoorwayV64(b).approach, ACCESS_RADII_V113.door);
  }
  for (const p of world.HOMEWORLD_POINTS_V77) if (!rooms.HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)) add('service', p.id, p.label, p.levelId, p, ACCESS_RADII_V113.service);
  for (const c of world.HOMEWORLD_CONNECTORS_V77) for (const end of ['from', 'to']) add('connector', c.id + ':' + end, c.name, c[end].levelId, c[end].point, ACCESS_RADII_V113.connector);
  for (const d of world.HOMEWORLD_REGIONAL_DOCKS_V77) add('dock', d.regionId, d.name, d.levelId, d.point, ACCESS_RADII_V113.dock);

  const findings = anchors.map(anchor => {
    const ok = reached(anchor.levelId, anchor.point, anchor.radius);
    const centre = civic.homeworldCivicWalkableV80(anchor.levelId, anchor.point);
    return {...anchor, reachable: ok, centreWalkable: centre, blocker: centre ? null : blockerAt(anchor.levelId, anchor.point)};
  });

  // Residents walk authored paths; a path vertex inside a solid means an NPC
  // visibly walks through scenery and a player can never stand beside them.
  const residents = world.HOMEWORLD_RESIDENTS_V77.flatMap(r => r.path.map((p, i) => ({id: r.id, role: r.role, levelId: r.levelId, vertex: i, point: p})))
    .filter(v => !civic.homeworldCivicWalkableV80(v.levelId, v.point))
    .map(v => ({...v, blocker: blockerAt(v.levelId, v.point)}));

  // Walkable pockets the player can never enter (floor enclosed by solids).
  const pockets = [];
  for (const level of levels) {
    const mask = masks[level];
    for (let id = 0; id < mask.length; id++) if (mask[id] === 1) {
      const queue = [id]; mask[id] = 3; let minX = cols, maxX = 0, minY = rows, maxY = 0;
      for (let n = 0; n < queue.length; n++) {
        const cur = queue[n], x = cur % cols, y = (cur - x) / cols;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          const next = ny * cols + nx;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && mask[next] === 1) {mask[next] = 3; queue.push(next);}
        }
      }
      const area = queue.length * step * step;
      if (area >= 64 * 64) pockets.push({levelId: level, area, box: {left: minX * step, top: minY * step, right: (maxX + 1) * step, bottom: (maxY + 1) * step}});
    }
  }
  pockets.sort((a, b) => b.area - a.area);
  const reachedArea = Object.fromEntries(levels.map(level => [level, masks[level].reduce((sum, v) => sum + (v === 2 ? 1 : 0), 0) * step * step]));

  return {
    schemaVersion: 1, release: 'V113', step,
    method: 'Actual homeworldCivicWalkableV80 with the native hunter body sampled every ' + step + ' units; 4-neighbour flood fill from the spacecraft spawn through connectors; anchors judged at their in-game interaction radius. Geometry evidence only.',
    connectorsReached: [...connectorsUsed].sort(),
    reachedArea,
    anchors: findings.length,
    unreachableAnchors: findings.filter(f => !f.reachable),
    blockedAnchorCentres: findings.filter(f => f.reachable && !f.centreWalkable && f.kind !== 'service'),
    residentVerticesInSolids: residents,
    enclosedPockets: pockets,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = name => {const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined;};
  const result = auditHomeworldAccessV113({step: Number(at('--step') ?? 8)});
  const out = at('--out');
  if (out) {fs.mkdirSync(path.dirname(out), {recursive: true}); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');}
  console.log(JSON.stringify({anchors: result.anchors, unreachable: result.unreachableAnchors.length, blockedCentres: result.blockedAnchorCentres.length,
    residentVerticesInSolids: result.residentVerticesInSolids.length, enclosedPockets: result.enclosedPockets.length, connectorsReached: result.connectorsReached.length}));
}
