/** Nearest coherent AND visible position for Homeworld exterior props (read-only).
 *
 * Covers the four layers that HOMEWORLD_LEGACY_*_PLACEMENTS tables can move:
 * V77 props and V72 connection furniture (HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81),
 * V75 frontage (HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82) and V76 exterior decor
 * (HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82). A candidate anchor is kept only if:
 *  - its whole ground box is on paved V77/urban floor (10x8 corner margin),
 *  - it touches no building masonry and shares no ground with another solid
 *    (12u clearance), keeps resident paths and door entrance corridors free,
 *  - it keeps 56u clear of every door approach point and seals no new
 *    walkable pocket (local flood fill on the motor's own walkability),
 *  - it respects the V76 exterior spacing contracts asserted by
 *    tests/homeworld-exterior-decor-v76.test.mjs (exterior +28u from other
 *    exterior solids, +18u from frontage, +26u from facade frames, door
 *    corridor threshold..approach+120 with a 45u body, pad/lane reserves),
 *  - it stays in its district, and
 *  - no building painted after it covers its sprite (real alpha, < 25%).
 * Candidates are ranked by distance from the current anchor. Nothing is written.
 * Usage: node scripts/solve-homeworld-visible-placement-v113.mjs <id> [<id>...] [--radius 260] [--limit 5]
 */
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {collectHomeworldSolidsV113, legacyPropBoxV113} from './audit-homeworld-overlaps-v113.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const images = new Map();
const alphaOf = (root, src) => {
  if (!images.has(src)) images.set(src, sharp(path.join(root, 'public', src)).ensureAlpha().raw().toBuffer({resolveWithObject: true}));
  return images.get(src);
};
const boxOf = polygon => ({left: Math.min(...polygon.map(p => p.x)), right: Math.max(...polygon.map(p => p.x)), top: Math.min(...polygon.map(p => p.y)), bottom: Math.max(...polygon.map(p => p.y))});
function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export async function solveVisiblePlacementsV113(ids, {root = ROOT, radius = 260, step = 5, limit = 5} = {}) {
  const qa = homeworldSceneSsrV78(root), load = file => qa.load('app/game/systems/' + file + '.ts');
  const civic = load('homeworldCivicWorldV80');
  const world = load('homeworldWorldV77'), city = load('homeworldCity'), geo = load('homeworldGeometryV64'), street = load('homeworldStreetModulesV78');
  const furniture = load('homeworldFurnitureV72'), exterior = load('homeworldExteriorDecorV76');
  const hull = load('homeworldCivicDecorV80').homeworldCivicContactHullV80, overlap = load('homeworldUrbanLayoutV78').homeworldUrbanOverlapV78;
  const expand = (polygon, m) => hull(polygon.flatMap(q => [-1, 1].flatMap(x => [-1, 1].map(y => ({x: q.x + x * m, y: q.y + y * m})))));
  const rect = b => [{x: b.left, y: b.top}, {x: b.right, y: b.top}, {x: b.right, y: b.bottom}, {x: b.left, y: b.bottom}];
  const port = world.HOMEWORLD_SPACEPORT_V77, padBox = {left: port.pad.x - port.pad.width / 2, right: port.pad.x + port.pad.width / 2, top: port.pad.y - port.pad.depth, bottom: port.pad.y};
  const lane = load('homeworldCity').HOMEWORLD_SPACEPORT_V64?.pedestrian, laneOff = world.HOMEWORLD_PORT_TRANSLATION_V77?.x ?? 0;
  const laneBox = lane ? {left: lane.left + laneOff, right: lane.right + laneOff, top: lane.top, bottom: lane.bottom} : null;
  const exteriorSolids = world.HOMEWORLD_EXTERIOR_V77.filter(e => e.solid);
  // V76 exterior spacing contracts (see the test file named above).
  const contractsOk = (spec, cand) => {
    const level = cand.levelId;
    if (spec.layer === 'exterior-v76') {
      const poly = exterior.homeworldExteriorPolygonV76(cand);
      if (level === '0' && (overlap(expand(poly, 40), rect(padBox)) || (laneBox && overlap(expand(poly, 30), rect(laneBox))))) return false;
      for (const o of exteriorSolids) if (o.id !== cand.id && o.levelId === level && (overlap(expand(poly, 28), exterior.homeworldExteriorPolygonV76(o)) || overlap(expand(exterior.homeworldExteriorPolygonV76(o), 28), poly))) return false;
      for (const f of world.HOMEWORLD_FRONTAGE_V77) if (f.levelId === level && overlap(expand(poly, 18), rect(furniture.homeworldFurnitureFootprintV72(f)))) return false;
      for (const b of world.HOMEWORLD_BUILDINGS_V77) {
        if (b.levelId !== level) continue;
        if (overlap(expand(poly, 26), geo.homeworldBuildingGroundFrameV76(b).polygon)) return false;
        const d = geo.homeworldBuildingDoorwayV64(b), dx = d.approach.x - d.threshold.x, dy = d.approach.y - d.threshold.y, len = Math.hypot(dx, dy) || 1;
        const far = {x: d.approach.x + dx / len * 120, y: d.approach.y + dy / len * 120}, n = Math.max(1, Math.ceil(Math.hypot(far.x - d.threshold.x, far.y - d.threshold.y) / 4));
        for (let k = 0; k <= n; k++) if (exterior.homeworldExteriorTouchesV76(cand, {x: d.threshold.x + (far.x - d.threshold.x) * k / n, y: d.threshold.y + (far.y - d.threshold.y) * k / n}, {halfWidth: 45, halfDepth: 45})) return false;
      }
    }
    if (spec.layer === 'frontage-v75') {
      const fp = rect(furniture.homeworldFurnitureFootprintV72(cand));
      for (const o of exteriorSolids) if (o.levelId === level && overlap(expand(exterior.homeworldExteriorPolygonV76(o), 18), fp)) return false;
    }
    return true;
  };
  const propArt = load('homeworldArtV64').HOMEWORLD_PROP_ART_V64, furnitureArt = furniture.HOMEWORLD_FURNITURE_ART_V72, courtArt = load('homeworldCourtArtV80').HOMEWORLD_COURT_ART_V80;
  const solids = collectHomeworldSolidsV113(root).map(s => ({...s, box: boxOf(s.polygon)}));
  const layerOf = id => {
    const prop = world.HOMEWORLD_PROPS_V77.find(p => p.id === id);
    if (prop) return {layer: 'prop-v77', table: 'HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81', item: prop, art: propArt[prop.artId], height: () => prop.height,
      ground: p => legacyPropBoxV113(p)};
    const conn = world.HOMEWORLD_CONNECTION_FURNITURE_V77.find(p => p.id === id), front = world.HOMEWORLD_FRONTAGE_V77.find(p => p.id === id);
    const f = conn ?? front;
    if (f) return {layer: conn ? 'connection-v72' : 'frontage-v75', table: conn ? 'HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81' : 'HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82',
      item: f, art: furnitureArt[f.artId], height: () => furnitureArt[f.artId].heightWorld * (f.scale ?? 1), ground: p => furniture.homeworldFurnitureFootprintV72(p)};
    const e = world.HOMEWORLD_EXTERIOR_V77.find(p => p.id === id);
    if (e) return {layer: 'exterior-v76', table: 'HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82', item: e, art: courtArt[e.artId], height: () => courtArt[e.artId].heightWorld * e.scale,
      ground: p => exterior.homeworldExteriorFootprintV76(p)};
    throw new Error('Unknown movable exterior prop: ' + id);
  };
  const results = [];
  for (const id of ids) {
    const spec = layerOf(id), item = spec.item, level = item.levelId;
    const district = world.HOMEWORLD_DISTRICTS_V77.find(d => d.id === (item.districtId ?? null));
    const buildings = world.HOMEWORLD_BUILDINGS_V77.filter(b => b.levelId === level);
    const others = solids.filter(s => s.levelId === level && s.id !== id);
    const residents = world.HOMEWORLD_RESIDENTS_V77.filter(r => r.levelId === level).flatMap(r => r.path.length < 2 ? r.path : r.path.flatMap((a, i) => {
      const b = r.path[(i + 1) % r.path.length], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
      return Array.from({length: n + 1}, (_, k) => ({x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n}));
    }));
    const doorways = buildings.map(b => geo.homeworldBuildingDoorwayV64(b)).filter(Boolean);
    const approaches = doorways.map(d => d.approach).filter(Boolean), doors = doorways.filter(d => d.threshold && d.normal);
    // Local walkability window for pocket detection (8u cells, +-320u). The
    // civic motor reads the live prop records, so the item is moved in place
    // (away for the base, onto the candidate for the test) and restored.
    const W = 80, cell = 8, L = item.x - 320, T = item.y - 320, at = (x, y) => ({x: L + (x + .5) * cell, y: T + (y + .5) * cell});
    const enclosed = mask => {
      const seen = new Uint8Array(mask.length); let n = 0;
      for (let i = 0; i < mask.length; i++) if (mask[i] && !seen[i]) {
        const q = [i]; seen[i] = 1; let edge = false;
        for (let k = 0; k < q.length; k++) {const j = q[k], x = j % W, y = (j - x) / W; if (!x || !y || x === W - 1 || y === W - 1) edge = true;
          for (const [a, c] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {const m = c * W + a; if (a >= 0 && c >= 0 && a < W && c < W && mask[m] && !seen[m]) {seen[m] = 1; q.push(m);}}}
        if (!edge && q.length * cell * cell >= 1024) n++;
      }
      return n;
    };
    // Pockets are measured with a body 6u wider on each side than the actor,
    // so a passage only a few units wider than the player counts as closed.
    const probe = {halfWidth: 30, halfDepth: 20}, home = {x: item.x, y: item.y}, live = spec.layer === 'prop-v77';
    const walkMaskAt = pos => {
      item.x = pos.x; item.y = pos.y;
      try {
        const m = new Uint8Array(W * W);
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) m[y * W + x] = civic.homeworldCivicWalkableV80(level, at(x, y), probe) ? 1 : 0;
        return m;
      } finally {item.x = home.x; item.y = home.y;}
    };
    // V77 props are read live by the motor; other layers use precomputed
    // bounds, so their candidate box is stamped onto the current mask.
    const baseMask = walkMaskAt(live ? {x: -1e6, y: -1e6} : home), basePockets = enclosed(baseMask);
    const sealsPocket = cand => {
      if (Math.abs(cand.x - home.x) > 240 || Math.abs(cand.y - home.y) > 240) return false;
      if (live) return enclosed(walkMaskAt(cand)) > basePockets;
      const g = spec.ground({...item, x: cand.x, y: cand.y}), box = g.polygon ? boxOf(g.polygon) : g, m = baseMask.slice();
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {const p = at(x, y); if (p.x + probe.halfWidth > box.left && p.x - probe.halfWidth < box.right && p.y + probe.halfDepth > box.top && p.y - probe.halfDepth < box.bottom) m[y * W + x] = 0;}
      return enclosed(m) > basePockets;
    };
    const occluded = async cand => {
      const art = spec.art; if (!art?.alphaBounds) return 0;
      const p = geo.homeworldProjectGroundV64(cand, world.homeworldLevelV77(level).elevation), scale = spec.height() / art.alphaBounds.height;
      const box = {left: p.x + (art.alphaBounds.x - art.pivot.x) * scale, top: p.y + (art.alphaBounds.y - art.pivot.y) * scale, width: art.alphaBounds.width * scale, height: art.alphaBounds.height * scale};
      let worst = 0;
      for (const b of buildings) {
        if (!(cand.y < city.homeworldBuildingRenderDepthV76(b, cand))) continue;
        const v = city.homeworldBuildingVisibleBoundsV72(b);
        if (box.left > v.left + v.width || box.left + box.width < v.left || box.top > v.top + v.height || box.top + box.height < v.top) continue;
        const place = geo.homeworldBuildingSpritePlacementV64(b), a = b.art, rect = a.sourceRect ?? {x: 0, y: 0, width: a.sourceWidth, height: a.sourceHeight};
        const s = place.width / rect.width, {data, info} = await alphaOf(root, a.src);
        let opaque = 0;
        for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 10; gx++) {
          const sx = box.left + (gx + .5) / 10 * box.width, sy = box.top + (gy + .5) / 10 * box.height;
          const px = Math.floor(rect.x + (sx - place.left) / s * (info.width / a.sourceWidth)), py = Math.floor(rect.y + (sy - place.top) / s * (info.height / a.sourceHeight));
          if (px >= 0 && py >= 0 && px < info.width && py < info.height && data[(py * info.width + px) * info.channels + 3] > 40) opaque++;
        }
        worst = Math.max(worst, opaque / 100);
      }
      return worst;
    };
    const candidates = [];
    for (let dx = -radius; dx <= radius; dx += step) for (let dy = -radius; dy <= radius; dy += step) {
      if (Math.hypot(dx, dy) > radius) continue;
      const cand = {...item, x: item.x + dx, y: item.y + dy}, g = spec.ground(cand), box = g.polygon ? boxOf(g.polygon) : g;
      const corners = [{x: box.left, y: box.top}, {x: box.right, y: box.top}, {x: box.right, y: box.bottom}, {x: box.left, y: box.bottom}];
      if (!corners.every(c => street.homeworldUrbanTerrainV78(level, c, {halfWidth: 10, halfDepth: 8}))) continue;
      const centre = {x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2}, half = {halfWidth: (box.right - box.left) / 2, halfDepth: (box.bottom - box.top) / 2};
      if (!world.homeworldTerrainV77(level, centre, half)) continue;
      if (district && !pointInPolygon(cand, district.polygon)) continue;
      if (buildings.some(b => geo.homeworldBuildingTouchesV76(b, centre, {halfWidth: half.halfWidth + 8, halfDepth: half.halfDepth + 8}))) continue;
      const pad = {left: box.left - 12, right: box.right + 12, top: box.top - 12, bottom: box.bottom + 12};
      let clash = false;
      for (const s of others) {
        if (pad.left >= s.box.right || pad.right <= s.box.left || pad.top >= s.box.bottom || pad.bottom <= s.box.top) continue;
        for (let sx = pad.left; sx <= pad.right && !clash; sx += 4) for (let sy = pad.top; sy <= pad.bottom; sy += 4) if (pointInPolygon({x: sx, y: sy}, s.polygon)) {clash = true; break;}
        if (clash) break;
      }
      if (clash) continue;
      if (residents.some(q => q.x + 24 > box.left && q.x - 24 < box.right && q.y + 14 > box.top && q.y - 14 < box.bottom)) continue;
      if (approaches.some(a => Math.max(box.left - a.x, a.x - box.right, 0) ** 2 + Math.max(box.top - a.y, a.y - box.bottom, 0) ** 2 < 56 * 56)) continue;
      if (doors.some(d => corners.concat([centre]).some(c => {const ax = c.x - d.threshold.x, ay = c.y - d.threshold.y, along = ax * d.normal.x + ay * d.normal.y; return along > -20 && along < 200 && Math.abs(-ax * d.normal.y + ay * d.normal.x) < 90;}))) continue;
      candidates.push({x: Math.round(cand.x * 10) / 10, y: Math.round(cand.y * 10) / 10, shift: Math.round(Math.hypot(dx, dy))});
    }
    candidates.sort((a, b) => a.shift - b.shift);
    const visible = [];
    for (const c of candidates) {
      if (visible.length >= limit) break;
      if (!contractsOk(spec, {...item, x: c.x, y: c.y})) continue;
      const cover = await occluded({...item, x: c.x, y: c.y}); if (cover >= .25) continue;
      if (sealsPocket(c)) continue;
      visible.push({...c, cover});
    }
    results.push({id, layer: spec.layer, table: spec.table, levelId: level, districtId: item.districtId ?? null, current: {x: item.x, y: item.y},
      currentCover: await occluded(item), candidates: visible});
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), opt = name => {const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : undefined;};
  const radius = opt('--radius') ?? 260, limit = opt('--limit') ?? 5;
  const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  for (const row of await solveVisiblePlacementsV113(ids, {radius, limit})) console.log(JSON.stringify(row));
}
