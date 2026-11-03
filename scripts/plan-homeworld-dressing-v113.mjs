/** Authoring tool for app/game/data/homeworldDressingV113.json.
 *
 * Deterministic: it reads the current world and a zone plan (below), then
 * writes authored coordinates. Runtime never searches. Each candidate must:
 *  - stand entirely on supported public ground (the V84/V92 terrain test);
 *  - overlap no reserve of the V113 input (buildings, doors, resident routes,
 *    connectors, points, roads, landings, usage faces of every older prop);
 *  - keep the 12u solid margin of the V84 admission (motor collision);
 *  - keep 110u from interaction points and the threshold..approach+120u
 *    corridor (45u body) of every door;
 *  - leave either a framed gap (<= 40u) or a passable one (>= 110u) to the
 *    nearest solid and to the paving edge, never a sliver;
 *  - not be painted behind a building/facade that hides >= 25% of it (real
 *    alpha) and, for a facade, hide no prop or door already behind it.
 * Access, routes and pinned walks are verified afterwards (audits + tests).
 *
 * Usage: node --experimental-strip-types scripts/plan-homeworld-dressing-v113.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {collectHomeworldSolidsV113} from './audit-homeworld-overlaps-v113.mjs';
import {reduceHomeworldDressingV113} from './lib/reduce-homeworld-dressing-v113.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'app/game/data/homeworldDressingV113.json');
const DRY = process.argv.includes('--dry');

// Start from an empty layer so the plan is reproducible.
const blank = {version: 113, provenance: 'LORE_COMPATIBLE_ORIGINAL',
  method: 'Authored by scripts/plan-homeworld-dressing-v113.mjs from existing native sources; every instance keeps the V84 admission margins, reserves and door corridors and is checked by tests/homeworld-dressing-v113.test.mjs.',
  groups: [], fixtures: [], places: [], facades: []};
const previous = fs.readFileSync(OUT, 'utf8');
let completed = false;
// Every intermediate audit writes a tentative plan. Restore the exact prior
// bytes on failure or dry-run, even if an import or child test throws.
process.on('exit', () => {if (DRY || !completed) fs.writeFileSync(OUT, previous);});
process.once('SIGINT', () => process.exit(130));
process.once('SIGTERM', () => process.exit(143));
fs.writeFileSync(OUT, JSON.stringify(blank));
const qa = homeworldSceneSsrV78(ROOT);
const load = f => qa.load('app/game/systems/' + f + '.ts');
const world = load('homeworldWorldV77'), geo = load('homeworldGeometryV64'), city = load('homeworldCity');
const mount = load('homeworldDressingMountV113');
const court = load('homeworldCourtArtV80'), comp = load('homeworldStreetCompositionV92'), facadesV78 = load('homeworldUrbanFacadesV78');
const layout = load('homeworldUrbanLayoutV78');
const input = mount.HOMEWORLD_DRESSING_INPUT_V113, COURT = court.HOMEWORLD_COURT_ART_V80, STREET = comp.HOMEWORLD_STREET_COMPOSITION_ART_V92;
const C = 8;

const pip = (p, poly) => {let s = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const a = poly[i], b = poly[j];
  if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) s = !s;} return s;};
const bbox = poly => ({left: Math.min(...poly.map(p => p.x)), right: Math.max(...poly.map(p => p.x)), top: Math.min(...poly.map(p => p.y)), bottom: Math.max(...poly.map(p => p.y))});
const overlap = layout.homeworldUrbanOverlapV78;

const PUBLIC_LIFE = load('homeworldPublicLifeV112').HOMEWORLD_PUBLIC_LIFE_CANDIDATES_V112;
const URBAN_V78 = load('homeworldStreetModulesV78').HOMEWORLD_URBAN_PROPS_V78, USAGE = load('homeworldUsageEnvelopesV81').homeworldUsageEnvelopesV81;
const REGION_V72 = load('homeworldRegionConnectionsV72').HOMEWORLD_REGION_CONNECTIONS_V72;
const JOINTS = load('homeworldGroundJointsV112').HOMEWORLD_GROUND_JOINTS_V112;
const WALKERS = [...world.HOMEWORLD_RESIDENTS_V77, ...load('homeworldUrbanPopulationV78').HOMEWORLD_URBAN_EXTRAS_V78, ...PUBLIC_LIFE]
  .flatMap(r => r.path.flatMap((a, i) => {const b = r.path[(i + 1) % r.path.length], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 40));
    return Array.from({length: n}, (_, k) => ({id: r.id, levelId: r.levelId, x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n}));}));
// ---------------------------------------------------------------- current routes
const nav = load('homeworldNavigationV77');
const ROUTE_SEGMENTS = [];
{
  const from = {levelId: '0', point: world.HOMEWORLD_SPACEPORT_V77.spawn};
  const targets = [...world.HOMEWORLD_BUILDINGS_V77.map(b => ({levelId: b.levelId, point: geo.homeworldBuildingDoorwayV64(b).approach})),
    ...world.HOMEWORLD_POINTS_V77.filter(p => p.regionId).map(p => {const a = world.homeworldWorldArrivalV77(p.regionId); return {levelId: a.levelId, point: {x: a.actor.x, y: a.actor.y}};}),
    ...world.HOMEWORLD_CONNECTIONS_V77.map(c => ({levelId: c.levelId ?? '0', point: c.arrival})),
    ...world.HOMEWORLD_REGIONAL_DOCKS_V77.map(d => ({levelId: d.levelId, point: d.point})),
    ...world.HOMEWORLD_CONNECTORS_V77.map(c => c.to), ...world.HOMEWORLD_CONNECTORS_V77.map(c => c.from)];
  // Working faces of earlier street props and an observation side of every
  // civic prop are re-checked from the port by their own tests.
  const ctr = poly => ({x: poly.reduce((q, v) => q + v.x, 0) / poly.length, y: poly.reduce((q, v) => q + v.y, 0) / poly.length});
  const compMount = load('homeworldStreetCompositionMountV92'), pub = load('homeworldPublicPlacesV112'), d84 = load('homeworldStreetDecorV84');
  for (const item of compMount.HOMEWORLD_STREET_COMPOSITION_PROPS_V92) {const u = comp.homeworldStreetCompositionUsageV92(item); if (u) targets.push({levelId: item.levelId, point: ctr(u)});}
  for (const item of pub.HOMEWORLD_PUBLIC_PLACES_V112) {const u = pub.homeworldPublicPlaceUsageV112(item); if (u) targets.push({levelId: item.levelId, point: ctr(u)});}
  for (const item of d84.HOMEWORLD_STREET_DECOR_PROPS_V84 ?? []) {const u = d84.homeworldStreetDecorUsageV84(item); if (u) targets.push({levelId: item.levelId, point: ctr(u)});}
  const civicDecor = load('homeworldCivicDecorV80'), civicWorld = load('homeworldCivicWorldV80'), urbanNav = load('homeworldUrbanNavigationV78');
  for (const p of civicDecor.HOMEWORLD_CIVIC_PROPS_V80) {const poly = civicDecor.homeworldCivicPolygonV80(p), c = ctr(poly);
    const spots = [{x: c.x, y: Math.max(...poly.map(v => v.y)) + 60}, {x: c.x, y: Math.min(...poly.map(v => v.y)) - 60}, {x: Math.max(...poly.map(v => v.x)) + 70, y: c.y}, {x: Math.min(...poly.map(v => v.x)) - 70, y: c.y},
      ...[-120, 0, 120].flatMap(dx => [-100, 100].map(dy => ({x: c.x + dx, y: c.y + dy})))];
    for (const point of spots) {if (!civicWorld.homeworldCivicWalkableV80(p.levelId, point)) continue; const r = urbanNav.homeworldUrbanWorldRouteV78(from, {levelId: p.levelId, point});
      if (r.status === 'reachable') {for (const sg of r.segments) if (sg.points) ROUTE_SEGMENTS.push({levelId: sg.levelId, points: sg.points}); break;}}
  }
  for (const t of targets) {const r = nav.homeworldWorldRouteV77(from, t); if (r.status !== 'reachable') continue;
    for (const s of r.segments) if (s.points) ROUTE_SEGMENTS.push({levelId: s.levelId, points: s.points});}
}
// The cargo carry walk used by the pinned V113 detour test (port lot to the
// Council stair) also keeps its corridor, wide enough for the carried case.
{
  const {cargoRouteV108} = await import('../tests/helpers/cargo-v108-route.mjs');
  const f = cargoRouteV108('2026-10-29T12:00:00.000Z'), nav109 = f.qa.load('app/game/systems/homeworldNavigationV109.ts');
  const trail = [];
  f.start(); f.walkTo(f.b.lots[0].stand, s => trail.push({...s.actor})); f.action('take-wide');
  const council = world.HOMEWORLD_CONNECTORS_V77.find(c => c.id === 'council-stair');
  const {actor, ledger} = f.state(), route = nav109.homeworldWalkRouteV109('0', actor, {x: council.from.point.x, y: council.from.point.y + 60}, ledger);
  if (route.status === 'reachable') ROUTE_SEGMENTS.push({levelId: '0', points: route.points, width: 170});
  const sparse = trail.filter((p, i) => i % 20 === 0); if (sparse.length > 1) ROUTE_SEGMENTS.push({levelId: '0', points: sparse, width: 140});
}
// ---------------------------------------------------------------- per level grids
const solidsAll = collectHomeworldSolidsV113(ROOT);
for (const f of facadesV78.HOMEWORLD_URBAN_FACADES_V78) solidsAll.push({layer: 'facade-v78', id: f.id, levelId: f.levelId, polygon: geo.homeworldBuildingGroundFrameV76(f).polygon});
const grids = new Map();
function grid(level) {
  if (grids.has(level)) return grids.get(level);
  const G = world.HOMEWORLD_GROUND_V77.filter(g => g.levelId === level), xs = G.flatMap(g => g.polygon.map(p => p.x)), ys = G.flatMap(g => g.polygon.map(p => p.y));
  const X0 = Math.floor(Math.min(...xs) / C) * C - 64, Y0 = Math.floor(Math.min(...ys) / C) * C - 64;
  const W = Math.ceil((Math.max(...xs) - X0) / C) + 16, H = Math.ceil((Math.max(...ys) - Y0) / C) + 16;
  const at = (i, j) => ({x: X0 + (i + .5) * C, y: Y0 + (j + .5) * C});
  const paved = new Uint8Array(W * H), solid = new Uint8Array(W * H), blocked = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) paved[j * W + i] = input.terrain(level, at(i, j), {halfWidth: 0, halfDepth: 0}) ? 1 : 0;
  const stamp = (poly, arr, pad = 0) => {const b = bbox(poly);
    for (let j = Math.max(0, Math.floor((b.top - pad - Y0) / C)); j <= Math.min(H - 1, Math.ceil((b.bottom + pad - Y0) / C)); j++)
      for (let i = Math.max(0, Math.floor((b.left - pad - X0) / C)); i <= Math.min(W - 1, Math.ceil((b.right + pad - X0) / C)); i++) {
        const p = at(i, j); if (pip(p, poly) || (pad && overlap(poly, layout.homeworldUrbanRectV78(p.x - pad, p.y - pad, p.x + pad, p.y + pad)))) arr[j * W + i] = 1;}};
  for (const s of solidsAll.filter(s => s.levelId === level)) stamp(s.polygon, solid);
  for (const r of input.reserves.filter(r => r.levelId === level)) stamp(r.polygon, blocked);
  // Interaction points, connector ends, regional arrivals and docks: 110u.
  const pois = [...world.HOMEWORLD_POINTS_V77.filter(p => p.levelId === level),
    ...world.HOMEWORLD_CONNECTORS_V77.flatMap(c => [c.from, c.to]).filter(e => e.levelId === level).map(e => e.point),
    ...world.HOMEWORLD_CONNECTIONS_V77.filter(c => c.levelId === level).flatMap(c => [c.threshold, c.arrival]),
    ...world.HOMEWORLD_REGIONAL_DOCKS_V77.filter(d => d.levelId === level).map(d => d.point),
    ...(level === '0' ? [world.HOMEWORLD_SPACEPORT_V77.spawn] : [])];
  for (const p of pois) for (let j = Math.max(0, Math.floor((p.y - 110 - Y0) / C)); j <= Math.min(H - 1, Math.ceil((p.y + 110 - Y0) / C)); j++)
    for (let i = Math.max(0, Math.floor((p.x - 110 - X0) / C)); i <= Math.min(W - 1, Math.ceil((p.x + 110 - X0) / C)); i++) {const q = at(i, j); if (Math.hypot(q.x - p.x, q.y - p.y) < 110) blocked[j * W + i] = 1;}
  // Door corridors: threshold .. approach+120 with a 45u body (V76 contract).
  const doors = [];
  for (const b of [...world.HOMEWORLD_BUILDINGS_V77, ...facadesV78.HOMEWORLD_URBAN_FACADES_V78].filter(b => b.levelId === level)) {
    const d = geo.homeworldBuildingDoorwayV64(b); if (!d?.approach) continue;
    const dx = d.approach.x - d.threshold.x, dy = d.approach.y - d.threshold.y, len = Math.hypot(dx, dy) || 1;
    const far = {x: d.approach.x + dx / len * 120, y: d.approach.y + dy / len * 120};
    const poly = layout.homeworldUrbanCorridorV78(d.threshold, far, 90, 90); stamp(poly, blocked); doors.push({building: b.id, point: d.threshold});
  }
  // Current public routes (spawn -> every door, region arrival, dock and
  // connector) keep a 110u corridor: dressing never re-routes a guide.
  for (const seg of ROUTE_SEGMENTS.filter(r => r.levelId === level)) for (let i = 1; i < seg.points.length; i++)
    stamp(layout.homeworldUrbanCorridorV78(seg.points[i - 1], seg.points[i], seg.width ?? 110, seg.width ?? 110), blocked);
  // Walking circuits and repaired seams that later systems re-validate:
  // V112 public life (36x26 body), regional causeways (36x26 + 12), ground joints.
  for (const r of PUBLIC_LIFE.filter(r => r.levelId === level)) for (let i = 1; i < r.path.length; i++) stamp(layout.homeworldUrbanCorridorV78(r.path[i - 1], r.path[i], 120, 120), blocked);
  for (const c of world.HOMEWORLD_CONNECTIONS_V77.filter(c => (c.levelId ?? '0') === level)) {const nodes = [...(c.nodes ?? []), c.arrival, c.threshold].filter(Boolean);
    for (let i = 1; i < nodes.length; i++) stamp(layout.homeworldUrbanCorridorV78(nodes[i - 1], nodes[i], 130, 130), blocked);}
  for (const c of REGION_V72) {const lv = world.HOMEWORLD_CONNECTIONS_V77.find(x => x.regionId === c.regionId)?.levelId ?? '0'; if (lv !== level) continue;
    for (let i = 1; i < c.nodes.length; i++) stamp(layout.homeworldUrbanCorridorV78(c.nodes[i - 1], c.nodes[i], 130, 130), blocked);}
  // V78 court props re-check their contact box (10u body) and their usage
  // envelope against the live World collision: keep both free.
  for (const u of URBAN_V78.filter(u => u.levelId === level)) {const poly = court.homeworldCourtPolygonV80(u), b = bbox(poly);
    stamp(layout.homeworldUrbanRectV78(b.left - 14, b.top - 14, b.right + 14, b.bottom + 14), blocked);
    const use = USAGE(u.artId, poly).usage; if (use) stamp(layout.homeworldUrbanRectV78(use.left - 4, use.top - 4, use.right + 4, use.bottom + 4), blocked);}
  if (level === '0') {for (const j of JOINTS) stamp(j.polygon, blocked, 60); stamp(layout.homeworldUrbanRectV78(330, 1880, 510, 2170), blocked);}
  const g = {level, X0, Y0, W, H, at, paved, solid, blocked, doors, stamp};
  g.dtSolid = () => distance(g, k => g.solid[k]); g.dtEdge = () => distance(g, k => !g.paved[k]);
  g.dtS = g.dtSolid(); g.dtE = g.dtEdge();
  grids.set(level, g); return g;
}
function distance(g, seed) { // two-pass chamfer (3-4) in world units
  const {W, H} = g, d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = seed(k) ? 0 : 1e9;
  const a = C, b = C * Math.SQRT2;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {const k = j * W + i; let v = d[k];
    if (i) v = Math.min(v, d[k - 1] + a); if (j) v = Math.min(v, d[k - W] + a); if (i && j) v = Math.min(v, d[k - W - 1] + b); if (j && i < W - 1) v = Math.min(v, d[k - W + 1] + b); d[k] = v;}
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {const k = j * W + i; let v = d[k];
    if (i < W - 1) v = Math.min(v, d[k + 1] + a); if (j < H - 1) v = Math.min(v, d[k + W] + a); if (i < W - 1 && j < H - 1) v = Math.min(v, d[k + W + 1] + b); if (j < H - 1 && i) v = Math.min(v, d[k + W - 1] + b); d[k] = v;}
  return d;
}
const cellsOf = (g, poly) => {const b = bbox(poly), out = [];
  for (let j = Math.max(0, Math.floor((b.top - g.Y0) / C)); j <= Math.min(g.H - 1, Math.floor((b.bottom - g.Y0) / C)); j++)
    for (let i = Math.max(0, Math.floor((b.left - g.X0) / C)); i <= Math.min(g.W - 1, Math.floor((b.right - g.X0) / C)); i++) if (pip(g.at(i, j), poly)) out.push(j * g.W + i);
  if (!out.length) {const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2; out.push(Math.floor((cy - g.Y0) / C) * g.W + Math.floor((cx - g.X0) / C));}
  return out;};

// ---------------------------------------------------------------- occlusion
const alpha = new Map();
async function alphaOf(src) {if (!alpha.has(src)) alpha.set(src, sharp(path.join(ROOT, 'public', src)).ensureAlpha().raw().toBuffer({resolveWithObject: true})); return alpha.get(src);}
const newFacades = [];
const painters = level => [...world.HOMEWORLD_BUILDINGS_V77, ...facadesV78.HOMEWORLD_URBAN_FACADES_V78, ...newFacades].filter(b => b.levelId === level);
const spriteBox = (item, art, heightWorld) => {const p = geo.homeworldProjectGroundV64(item, world.homeworldLevelV77(item.levelId).elevation), s = heightWorld / art.alphaBounds.height;
  return {left: p.x + (art.alphaBounds.x - art.pivot.x) * s, top: p.y + (art.alphaBounds.y - art.pivot.y) * s, width: art.alphaBounds.width * s, height: art.alphaBounds.height * s};};
async function cover(item, box) {
  let worst = 0;
  for (const b of painters(item.levelId)) {
    if (!(item.y < city.homeworldBuildingRenderDepthV76(b, item))) continue;
    const place = geo.homeworldBuildingSpritePlacementV64(b), top = place.top - world.homeworldLevelV77(b.levelId).elevation;
    if (box.left > place.left + place.width || box.left + box.width < place.left || box.top > top + place.height || box.top + box.height < top) continue;
    const a = b.art, rect = a.sourceRect ?? {x: 0, y: 0, width: a.sourceWidth, height: a.sourceHeight}, s = place.width / rect.width, {data, info} = await alphaOf(a.src);
    let opaque = 0;
    for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 10; gx++) {
      const sx = box.left + (gx + .5) / 10 * box.width, sy = box.top + (gy + .5) / 10 * box.height;
      const px = Math.floor(rect.x + (sx - place.left) / s * (info.width / a.sourceWidth)), py = Math.floor(rect.y + (sy - top) / s * (info.height / a.sourceHeight));
      if (px >= 0 && py >= 0 && px < info.width && py < info.height && data[(py * info.width + px) * info.channels + 3] > 40) opaque++;
    }
    worst = Math.max(worst, opaque / 100);
  }
  return worst;
}
// Every prop sprite already in the scene (for facade hiding tests).
const sceneSprites = [];
{
  const propArt = load('homeworldArtV64').HOMEWORLD_PROP_ART_V64, furn = load('homeworldFurnitureV72').HOMEWORLD_FURNITURE_ART_V72, street = load('homeworldStreetModulesV78');
  const add = (item, art, h) => art?.alphaBounds && sceneSprites.push({id: item.id, levelId: item.levelId, y: item.y, box: spriteBox(item, art, h)});
  for (const p of world.HOMEWORLD_PROPS_V77) if (p.artId) add(p, propArt[p.artId], p.height);
  for (const p of [...world.HOMEWORLD_FRONTAGE_V77, ...world.HOMEWORLD_CONNECTION_FURNITURE_V77]) {const a = furn[p.artId]; if (a) add(p, a, a.heightWorld * (p.scale ?? 1));}
  for (const p of [...world.HOMEWORLD_EXTERIOR_V77, ...street.HOMEWORLD_URBAN_PROPS_V78]) {const a = COURT[p.artId]; if (a) add(p, a, a.heightWorld * p.scale);}
  for (const p of load('homeworldStreetCompositionMountV92').HOMEWORLD_STREET_COMPOSITION_PROPS_V92) add(p, STREET[p.artId], STREET[p.artId].heightWorld * p.scale);
  for (const p of load('homeworldPublicPlacesV112').HOMEWORLD_PUBLIC_PLACES_V112) add(p, STREET[p.artId], STREET[p.artId].heightWorld * p.scale);
  for (const p of world.HOMEWORLD_POINTS_V77) sceneSprites.push({id: 'point:' + p.id, levelId: p.levelId, y: p.y, box: (() => {const q = geo.homeworldProjectGroundV64(p, world.homeworldLevelV77(p.levelId).elevation); return {left: q.x - 60, top: q.y - 150, width: 120, height: 160};})()});
}

// ---------------------------------------------------------------- admission
const accepted = {fixtures: [], places: [], facades: []}, log = [];
const polygonOf = (kind, item) => kind === 'fixture' ? court.homeworldCourtPolygonV80(item) : kind === 'place' ? comp.homeworldStreetCompositionPolygonV92(item) : geo.homeworldBuildingGroundFrameV76(item).polygon;
const zonesOf = (kind, item) => kind === 'place' ? [comp.homeworldStreetCompositionPolygonV92(item), comp.homeworldStreetCompositionUsageV92(item), comp.homeworldStreetCompositionSafetyV92(item)].filter(Boolean) : [polygonOf(kind, item)];
const gapOk = v => v <= 40 || v >= 64; // a gap is either closed (no actor fits) or passable with margin
const tally = {}, RD = {}, removedForPocketList = [];
async function admit(kind, item, opts = {}) {const why = await admitInner(kind, item, opts); if (why) {const k = kind + ':' + why.split(':')[0] + (why.startsWith('reserve:') ? ':' + why.split(':')[1].replace(/-v?\d+$/, '').slice(0, 24) : ''); tally[k] = (tally[k] || 0) + 1;} return why;}
async function admitInner(kind, item, {pad = 0, framed = true} = {}) {
  const g = grid(item.levelId), poly = polygonOf(kind, item), zones = zonesOf(kind, item);
  // ground support, reserves, solids, door corridors, POIs (raster, + pad for facades)
  const probe = pad ? (() => {const b = bbox(poly); return layout.homeworldUrbanRectV78(b.left - pad, b.top - pad, b.right + pad, b.bottom + pad);})() : null;
  for (const z of [...zones, ...(probe ? [probe] : [])]) for (const k of cellsOf(g, z)) if (!g.paved[k] || g.blocked[k] || g.solid[k]) {if (process.env.MAP) {for (const lv of process.env.MAP.split(',')) {const g = grid(lv), img = Buffer.alloc(g.W * g.H * 3);
  for (let k = 0; k < g.W * g.H; k++) img.set(!g.paved[k] ? [15, 15, 20] : g.solid[k] ? [30, 60, 160] : g.blocked[k] ? [200, 40, 40] : [110, 105, 95], k * 3);
  await sharp(img, {raw: {width: g.W, height: g.H, channels: 3}}).png().toFile('outputs/qa-v113-dressing/grid-' + lv.replace('+', 'p') + '.png'); console.log(lv, g.X0, g.Y0, g.W, g.H);} process.exit(0);}
if (process.env.PROBE_ITEM) {const [kind, artId, lv, x, y] = process.env.PROBE_ITEM.split(',');
  const item = kind === 'place' ? {id: 'probe', compositionId: 'probe', artId, levelId: lv, districtId: 'x', buildingId: null, x: +x, y: +y, scale: 1, label: 'p', purpose: 'p', interactive: false, solid: true}
    : {id: 'probe', artId, x: +x, y: +y, scale: 1, levelId: lv, solid: true, groupId: 'p', districtId: 'x', function: 'p', label: 'p', associatedBuildingId: null};
  console.log('why', await admitInner(kind, item, {framed: true}), JSON.stringify(bbox(zonesOf(kind, item).flat()))); process.exit(0);}
if (process.env.PROBE) {const i = k % g.W, j = (k - i) / g.W; console.log('cell', JSON.stringify(g.at(i, j)), g.paved[k], g.blocked[k], g.solid[k]);} return 'raster';}
  for (const p of poly) if (!input.terrain(item.levelId, p, {halfWidth: 0, halfDepth: 0})) return 'unsupported';
  const b = bbox(poly);
  for (let x = b.left; x <= b.right; x += 12) for (let y = b.top; y <= b.bottom; y += 12) {const p = {x, y}; if (pip(p, poly) && input.collision(item.levelId, p, {halfWidth: 12, halfDepth: 12})) return 'solid-margin';}
  for (const z of zones) for (const r of input.reserves) if (r.levelId === item.levelId && overlap(z, r.polygon)) return 'reserve:' + r.id;
  for (const k of Object.keys(accepted)) for (const o of accepted[k]) if (o.levelId === item.levelId) {
    const okind = k === 'fixtures' ? 'fixture' : k === 'places' ? 'place' : 'facade';
    for (const z of zones) for (const oz of zonesOf(okind, o)) if (overlap(z, oz)) return 'new-overlap:' + o.id;
  }
  if (framed) {
    let gs = 1e9, ge = 1e9; for (const k of cellsOf(g, poly)) {gs = Math.min(gs, g.dtS[k]); ge = Math.min(ge, g.dtE[k]);}
    if (!gapOk(gs) || !gapOk(ge)) return 'sliver';
  }
  if (kind === 'facade') {
    const place = geo.homeworldBuildingSpritePlacementV64(item), top = place.top - world.homeworldLevelV77(item.levelId).elevation, depth = city.homeworldBuildingRenderDepthV76(item, item);
    const fb = {left: place.left, top, width: place.width, height: place.height};
    for (const s of [...sceneSprites, ...accepted.fixtures.map(f => ({id: f.id, levelId: f.levelId, y: f.y, box: spriteBox(f, COURT[f.artId], COURT[f.artId].heightWorld * f.scale)}))]) {
      if (s.levelId !== item.levelId || s.y >= depth) continue;
      const ix = Math.max(0, Math.min(fb.left + fb.width, s.box.left + s.box.width) - Math.max(fb.left, s.box.left)), iy = Math.max(0, Math.min(fb.top + fb.height, s.box.top + s.box.height) - Math.max(fb.top, s.box.top));
      if (ix * iy > .1 * s.box.width * s.box.height) return 'hides:' + s.id;
    }
    for (const w of WALKERS) {if (w.levelId !== item.levelId || w.y >= depth) continue; const q = geo.homeworldProjectGroundV64(w, world.homeworldLevelV77(item.levelId).elevation);
      if (q.x > fb.left + 20 && q.x < fb.left + fb.width - 20 && q.y - 60 > fb.top && q.y < fb.top + fb.height) return 'hides-walker:' + w.id;}
    for (const d of g.doors) {const q = geo.homeworldProjectGroundV64(d.point, world.homeworldLevelV77(item.levelId).elevation);
      if (d.point.y < depth && q.x > fb.left && q.x < fb.left + fb.width && q.y > fb.top && q.y < fb.top + fb.height) return 'hides-door:' + d.building;}
    for (const o of painters(item.levelId)) {if (o === item) continue; // never stack two volumes visually
      const p2 = geo.homeworldBuildingSpritePlacementV64(o), t2 = p2.top - world.homeworldLevelV77(o.levelId).elevation;
      const ix = Math.max(0, Math.min(fb.left + fb.width, p2.left + p2.width) - Math.max(fb.left, p2.left)), iy = Math.max(0, Math.min(fb.top + fb.height, t2 + p2.height) - Math.max(fb.top, t2));
      if (ix * iy > .3 * Math.min(fb.width * fb.height, p2.width * p2.height)) return 'stacks:' + o.id;}
  } else {
    const art = kind === 'fixture' ? COURT[item.artId] : STREET[item.artId];
    if (await cover(item, spriteBox(item, art, art.heightWorld * item.scale)) >= .25) return 'hidden';
  }
  if (kind === 'place') {const r = comp.compileHomeworldStreetCompositionV92(input, [item]); if (r.refusals.length) return 'v92:' + r.refusals[0].reason;}
  if (kind === 'place') { // the runtime V113 painter test (bbox > 20%) against the new facades too
    const art = STREET[item.artId], box = spriteBox(item, art, art.heightWorld * item.scale);
    for (const b of newFacades) {if (b.levelId !== item.levelId || city.homeworldBuildingRenderDepthV76(b, item) <= item.y) continue;
      const pl = geo.homeworldBuildingSpritePlacementV64(b), top = pl.top - world.homeworldLevelV77(b.levelId).elevation;
      const ix = Math.max(0, Math.min(box.left + box.width, pl.left + pl.width) - Math.max(box.left, pl.left)), iy = Math.max(0, Math.min(box.top + box.height, top + pl.height) - Math.max(box.top, top));
      if (ix * iy > box.width * box.height * .2) return 'painted-facade:' + b.id;}
  }
  // commit: becomes a solid for later candidates
  for (const z of [poly]) g.stamp(z, g.solid);
  for (const z of zones) g.stamp(z, g.blocked);
  if (kind === 'facade') {
    const pf = layout.homeworldUrbanRectV78(b.left - 60, b.top - 40, b.right + 60, b.bottom + 140); g.stamp(pf, g.blocked); // street in front, sides free
    newFacades.push(item);
  }
  g.dtS = g.dtSolid();
  accepted[kind === 'fixture' ? 'fixtures' : kind === 'place' ? 'places' : 'facades'].push(item);
  return null;
}

// ---------------------------------------------------------------- the plan
const groups = [];
const G = (id, label, detail) => {groups.push({id, label, detail}); return id;};
const fixture = (gid, artId, x, y, extra) => ({id: '', artId, x, y, scale: 1, groupId: gid, solid: true, associatedBuildingId: null, ...extra});
/** Recipes: offsets are in world units from the group anchor; the first
 * member is the anchor piece. Courts sources only unless `place: true`. */
const R = {
  rest: [{artId: 'court-native-v80:bench-left', dx: 0, dy: 0, fn: 'assise'}, {artId: 'court-native-v80:amber-lamp-post', dx: 110, dy: -10, fn: 'éclairage'}, {artId: 'mineral-planter-left', dx: -150, dy: -20, fn: 'végétation'}],
  shrine: [{artId: 'ritual-brazier-right', place: true, dx: 0, dy: 0, fn: 'feu rituel'}, {artId: 'court-native-v80:clan-banner-standard', dx: -110, dy: -10, fn: 'étendard'}, {artId: 'court-native-v80:clan-banner-standard', dx: 110, dy: -10, fn: 'étendard'}],
  memory: [{artId: 'court-native-v80:clan-lectern-right', dx: 0, dy: 0, fn: 'pupitre de mémoire'}, {artId: 'court-native-v80:mineral-basin-right', dx: 80, dy: 0, fn: 'vasque'}, {artId: 'resin-lantern', dx: -70, dy: 0, fn: 'éclairage'}],
  cargo: [{artId: 'logistics-container-rack', dx: 0, dy: 0, fn: 'rack de fret'}, {artId: 'convoy-crates', dx: 130, dy: 20, fn: 'charge'}, {artId: 'court-native-v80:sealed-cargo-case-left', dx: -120, dy: 20, fn: 'caisse scellée'}],
  depot: [{artId: 'cargo-rack-right', place: true, dx: 0, dy: 0, fn: 'rayonnage'}, {artId: 'convoy-crates', dx: -150, dy: 30, fn: 'charge'}],
  repair: [{artId: 'court-native-v80:maintenance-rack', dx: 0, dy: 0, fn: 'outils'}, {artId: 'artisan-bench', dx: 130, dy: 10, fn: 'établi'}, {artId: 'court-native-v80:sealed-cargo-case-left', dx: -110, dy: 10, fn: 'pièces'}],
  forge: [{artId: 'forge-bench-right', place: true, dx: 0, dy: 0, fn: 'établi de forge'}, {artId: 'court-native-v80:maintenance-rack', dx: -140, dy: -10, fn: 'outils'}],
  training: [{artId: 'training-rack-left', place: true, dx: 0, dy: 0, fn: 'râtelier d’entraînement'}, {artId: 'training-gong', dx: 170, dy: 0, fn: 'gong de rythme'}],
  market: [{artId: 'merchant-canopy-diagonal', dx: 0, dy: 0, fn: 'étal'}, {artId: 'sealed-jars', dx: 150, dy: 20, fn: 'réserves'}, {artId: 'clothing-rack', dx: -170, dy: 10, fn: 'parures'}],
  meal: [{artId: 'meal-table', dx: 0, dy: 0, fn: 'repas collectif'}, {artId: 'resin-lantern', dx: 120, dy: -10, fn: 'éclairage'}, {artId: 'sealed-jars', dx: -120, dy: 0, fn: 'réserves'}],
  care: [{artId: 'treatment-couch', dx: 0, dy: 0, fn: 'soins civils'}, {artId: 'care-cabinet-left', place: true, dx: -150, dy: -10, fn: 'armoire de soins'}],
  register: [{artId: 'register-desk', dx: 0, dy: 0, fn: 'registres'}, {artId: 'clan-waymarker-right', place: true, dx: 140, dy: -10, fn: 'repère'}],
  seat: [{artId: 'ceremonial-seat', dx: 0, dy: 0, fn: 'siège du représentant'}, {artId: 'court-native-v80:clan-banner-standard', dx: -100, dy: -10, fn: 'étendard'}, {artId: 'court-native-v80:clan-banner-standard', dx: 100, dy: -10, fn: 'étendard'}],
  terrace: [{artId: 'terrace-bench-right', dx: 0, dy: 0, fn: 'assise'}, {artId: 'court-native-v80:mineral-basin-right', dx: 120, dy: 10, fn: 'vasque'}],
  wall: [{artId: 'court-native-v80:corner-wall-left', dx: 0, dy: 0, fn: 'muret de cour'}, {artId: 'court-native-v80:bench-left', dx: 150, dy: 10, fn: 'assise abritée'}],
  lamp: [{artId: 'court-native-v80:amber-lamp-post', dx: 0, dy: 0, fn: 'éclairage'}],
  marker: [{artId: 'clan-waymarker-right', place: true, dx: 0, dy: 0, fn: 'repère d’orientation'}],
  planter: [{artId: 'basalt-planter-left', place: true, dx: 0, dy: 0, fn: 'végétation cultivée'}],
};
/** Zone plan, district by district. Facade sources are existing buildings
 * whose volume suits the district; labels are local descriptions, not canon. */
const ZONES = [
  {id: 'undercity-west', level: '-1A', district: null, box: [1430, 2830, 3000, 5230], label: 'Galeries occidentales',
    facades: [['residence-undercity-1', 'Logement des galeries'], ['residence-clans-1', 'Maison de clan des galeries'], ['residence-forges-2', 'Logement d’artisan'], ['convoy-store', 'Dépôt des galeries'],
      ['residence-undercity-2', 'Logement des relèves'], ['residence-port-2', 'Maison des passeurs'], ['residence-market-1', 'Petit logement des galeries'], ['residence-terraces-1', 'Maison de clan du bas'],
      ['convoy-workshop', 'Atelier des galeries'], ['residence-port-1', 'Logement des porteurs'], ['residence-esplanade-1', 'Petit logement du bas'], ['convoy-south-shelter', 'Abri des galeries'], ['residence-forges-1', 'Logement des fondeurs']],
    recipes: ['meal', 'care', 'rest', 'cargo', 'memory', 'repair', 'rest', 'shrine', 'market', 'meal', 'wall', 'terrace', 'lamp', 'lamp', 'lamp', 'planter', 'register', 'cargo']},
  {id: 'undercity-centre', level: '-1A', district: null, box: [3000, 2830, 5070, 5230], label: 'Galeries centrales',
    facades: [['residence-forges-1', 'Logement industriel'], ['residence-market-1', 'Petit logement de galerie'], ['residence-undercity-1', 'Abri des galeries']],
    recipes: ['rest', 'meal', 'lamp', 'lamp', 'planter', 'register', 'care', 'memory', 'lamp', 'rest', 'cargo']},
  {id: 'undercity-refuge', level: '-1B', district: 'undercity', box: [3490, 2610, 5210, 4310], label: 'Refuge bas',
    facades: [['residence-undercity-1', 'Abri du refuge'], ['residence-forges-2', 'Logement du refuge'], ['residence-market-1', 'Petit abri du refuge']],
    recipes: ['care', 'meal', 'rest', 'shrine', 'cargo', 'lamp', 'lamp', 'memory', 'rest', 'planter']},
  {id: 'convoy-yards', level: '-1C', district: 'convoy-works', box: [830, 3290, 3510, 5230], label: 'Cours des convois',
    facades: [['convoy-store', 'Entrepôt de convoi'], ['convoy-workshop', 'Atelier de convoi'], ['residence-convoy-works-1', 'Logement des convoyeurs'], ['convoy-south-shelter', 'Abri de convoi'],
      ['residence-convoy-works-2', 'Petit logement des cours'], ['residence-forges-1', 'Logement des mécaniciens']],
    recipes: ['cargo', 'depot', 'repair', 'forge', 'cargo', 'rest', 'meal', 'depot', 'repair', 'lamp', 'lamp', 'cargo', 'repair', 'lamp', 'marker', 'depot']},
  {id: 'enforcer-plaza', level: '+1', district: 'enforcers', box: [2810, 50, 6730, 3610], label: 'Esplanade des exécuteurs',
    facades: [['rampart-north-lodge', 'Caserne des exécuteurs'], ['residence-enforcers-1', 'Logement des exécuteurs'], ['rampart-south-lodge', 'Loge de garde'], ['residence-temple-2', 'Logement de veille'],
      ['residence-port-1', 'Maison de garde'], ['residence-temple-1', 'Logement du temple'], ['rampart-watch', 'Tour de veille des exécuteurs']],
    recipes: ['training', 'training', 'shrine', 'seat', 'rest', 'register', 'repair', 'rest', 'lamp', 'lamp', 'marker', 'training', 'shrine', 'memory', 'lamp', 'lamp', 'terrace', 'wall']},
  {id: 'citadel', level: '+2', district: 'citadel', box: [3750, 130, 5830, 1830], label: 'Parvis de la citadelle',
    facades: [['residence-citadel-1', 'Logement de la garde royale'], ['residence-temple-2', 'Logement des servants']], recipes: ['shrine', 'seat', 'memory', 'lamp', 'lamp', 'shrine', 'rest', 'lamp']},
  {id: 'port-east', level: '0', district: null, box: [6070, 1770, 7930, 5730], label: 'Quais orientaux',
    facades: [['residence-port-1', 'Maison des dockers'], ['residence-port-2', 'Logement du quai'], ['convoy-store', 'Hangar du quai']],
    recipes: ['cargo', 'depot', 'rest', 'register', 'lamp', 'lamp', 'marker', 'cargo', 'repair', 'meal', 'lamp', 'lamp', 'depot']},
  {id: 'city-core', level: '0', district: null, box: [30, 70, 6070, 2900], label: 'Ville haute',
    facades: [['residence-terraces-2', 'Logement des terrasses'], ['residence-memory-1', 'Logement de la mémoire']],
    recipes: ['rest', 'terrace', 'shrine', 'memory', 'wall', 'market', 'meal', 'training', 'lamp', 'lamp', 'lamp', 'planter', 'rest', 'terrace', 'planter', 'lamp', 'lamp', 'memory']},
  {id: 'southern-ways', level: '0', district: null, box: [2450, 2900, 7930, 5730], label: 'Voies du sud',
    facades: [], recipes: ['rest', 'lamp', 'lamp', 'lamp', 'marker', 'marker', 'rest', 'lamp', 'lamp', 'shrine', 'rest', 'planter', 'planter']},
];
const ART_LABEL = id => COURT[id]?.label || ({'ritual-brazier-right': 'Brasero rituel', 'training-rack-left': 'Râtelier d’entraînement', 'forge-bench-right': 'Établi de forge',
  'cargo-rack-right': 'Rayonnage de fret', 'clan-waymarker-right': 'Repère du clan', 'basalt-planter-left': 'Bac de basalte', 'care-cabinet-left': 'Armoire de soins',
  'maintenance-console-right': 'Console de maintenance', 'merchant-counter-left': 'Comptoir marchand'})[id] || ({'meal-table': 'Table de repas', 'treatment-couch': 'Couche de soins',
  'register-desk': 'Pupitre des registres', 'ceremonial-seat': 'Siège cérémoniel', 'training-gong': 'Gong d’entraînement', 'clothing-rack': 'Portant de parures',
  'sealed-jars': 'Jarres scellées', 'resin-lantern': 'Lanterne de résine', 'convoy-crates': 'Caisses de convoi', 'artisan-bench': 'Établi d’artisan', 'stone-bench': 'Banc de pierre', 'clan-banner': 'Bannière de clan'})[id] || id;
const RECIPE_LABEL = {rest: 'Halte', shrine: 'Foyer rituel', memory: 'Coin de mémoire', cargo: 'Dépôt de fret', depot: 'Rayonnage de fret', repair: 'Poste de réparation',
  forge: 'Poste de forge', training: 'Aire d’exercice', market: 'Étal de quartier', meal: 'Table commune', care: 'Poste de soins', register: 'Poste des registres',
  seat: 'Siège de représentant', terrace: 'Terrasse', wall: 'Cour abritée', lamp: 'Borne', marker: 'Repère', planter: 'Bac cultivé'};

const serials = {};
const nid = (zone, kind) => `pending:${zone}:${kind}`;
const finalId = (zone, kind) => {serials[zone] = (serials[zone] ?? 0) + 1; return `dressing-v113:${zone}:${kind}-${String(serials[zone]).padStart(2, '0')}`;};
const districtAt = (level, p) => {const inside = world.HOMEWORLD_DISTRICTS_V77.find(d => d.levelId === level && pip(p, d.polygon)); if (inside) return inside.id;
  let best = null, bd = 1e18; for (const d of world.HOMEWORLD_DISTRICTS_V77) {if (d.levelId !== level) continue; const cx = d.polygon.reduce((s, q) => s + q.x, 0) / d.polygon.length, cy = d.polygon.reduce((s, q) => s + q.y, 0) / d.polygon.length, v = (cx - p.x) ** 2 + (cy - p.y) ** 2; if (v < bd) {bd = v; best = d.id;}}
  return best ?? 'undercity';};
function candidates(zone, step) {
  const g = grid(zone.level), [l, t, r, b] = zone.box, out = [];
  for (let y = t; y <= b; y += step) for (let x = l; x <= r; x += step) {
    const i = Math.floor((x - g.X0) / C), j = Math.floor((y - g.Y0) / C); if (i < 0 || j < 0 || i >= g.W || j >= g.H) continue;
    const k = j * g.W + i; if (!g.paved[k] || g.blocked[k] || g.solid[k]) continue;
    out.push({x, y, k, s: g.dtS[k], e: g.dtE[k]});
  }
  return out;
}
const spread = (list, placed, min) => list.filter(c => placed.every(p => Math.hypot(p.x - c.x, p.y - c.y) >= min));

if (process.env.PROBE) {const [sid, lv, x, y] = process.env.PROBE.split(','); const src = world.HOMEWORLD_BUILDINGS_V77.find(b => b.id === sid);
  const built = {...src, id: 'probe', levelId: lv, x: +x, y: +y, interactive: false}; console.log('poly', JSON.stringify(bbox(geo.homeworldBuildingGroundFrameV76(built).polygon)), 'why', await admitInner('facade', built, {pad: 50, framed: false})); process.exit(0);}
// Phases: large groups first (they need open ground), then closed facades,
// then the small pieces that fit around them.
const BIG = new Set(['meal', 'care', 'market', 'shrine', 'training', 'forge', 'seat', 'depot', 'repair', 'cargo', 'wall']);
const placedGroupsByZone = new Map(), placedFacadesByZone = new Map();
let groupSerial = 0;
for (const phase of ['big', 'facades', 'small']) for (const zone of ZONES) {
  const g = grid(zone.level);
  // 1) closed facades: backs toward the paving edge or an existing volume
  if (!placedFacadesByZone.has(zone.id)) placedFacadesByZone.set(zone.id, []);
  const placedFacades = placedFacadesByZone.get(zone.id);
  for (const [sourceId, label] of phase === 'facades' ? zone.facades : []) {
    const source = world.HOMEWORLD_BUILDINGS_V77.find(b => b.id === sourceId);
    let list = candidates(zone, 20).filter(c => c.s >= 160);
    list.sort((a, b) => Math.min(a.e, a.s) - Math.min(b.e, b.s) || a.y - b.y || a.x - b.x);
    let done = false;
    for (const c of spread(list, placedFacades, 340)) {
      const plan = {id: zone.id + '-' + sourceId + '-' + (placedFacades.length + 1), label, sourceBuildingId: sourceId, levelId: zone.level, districtId: districtAt(zone.level, c),
        x: c.x, y: c.y, purpose: `Volume fermé, même source et même échelle que « ${source.id} », en bordure de ${zone.label.toLowerCase()} ; front et côtés laissés libres pour la rue.`};
      const built = {...source, id: 'dressing-v113:' + plan.id + ':facade', label, districtId: plan.districtId ?? source.districtId, levelId: zone.level, x: c.x, y: c.y,
        sourceBuildingId: source.id, interactive: false, placementPurpose: plan.purpose, provenance: 'LORE_COMPATIBLE_ORIGINAL', nativeStatus: 'EXISTING_NATIVE_VOLUME_REUSE_V113'};
      const why = await admit('facade', built, {pad: 30, framed: true});
      if (why) continue;
      placedFacades.push(c); blank.facades.push(plan); done = true;
      // front dressing at the facade's corners (lamp + one piece by district use)
      const fb = bbox(geo.homeworldBuildingGroundFrameV76(built).polygon);
      for (const [dx, artId] of [[-1, 'court-native-v80:amber-lamp-post'], [1, zone.level === '+1' || zone.level === '+2' ? 'court-native-v80:clan-banner-standard' : zone.id.startsWith('convoy') || zone.id === 'port-east' ? 'court-native-v80:sealed-cargo-case-left' : 'sealed-jars']]) {
        const it = {...fixture(null, artId, dx < 0 ? fb.left + 20 : fb.right - 40, fb.bottom + 28), id: nid(zone.id, 'front'), levelId: zone.level, districtId: built.districtId,
          groupId: 'facade-front', function: dx < 0 ? 'éclairage de façade' : 'abords de façade', label: ART_LABEL(artId), associatedBuildingId: built.id, purpose: `Abords de « ${label} », hors du seuil.`};
        if (!await admit('fixture', it, {framed: false})) {it.id = finalId(zone.id, 'front'); blank.fixtures.push(it);}
      }
      break;
    }
    log.push({zone: zone.id, facade: sourceId, placed: done});
  }
  // 2) groups: framed against something, spread through the zone
  if (!placedGroupsByZone.has(zone.id)) placedGroupsByZone.set(zone.id, []);
  const placedGroups = placedGroupsByZone.get(zone.id);
  const size = r => {const m = R[r][0], probe = m.place ? {id: 'r', compositionId: 'r', artId: m.artId, levelId: zone.level, x: 0, y: 0, scale: 1} : {id: 'r', artId: m.artId, x: 0, y: 0, scale: 1, levelId: zone.level, solid: true};
    const b = bbox(zonesOf(m.place ? 'place' : 'fixture', probe).flat()); return (b.right - b.left) * (b.bottom - b.top) * R[r].length;};
  for (const recipe of phase === 'facades' ? [] : [...zone.recipes].filter(r => (phase === 'big') === BIG.has(r)).sort((a, b) => size(b) - size(a))) {
    const members = R[recipe], gid = G(`${zone.id}:${recipe}-${String(++groupSerial).padStart(2, '0')}`, `${RECIPE_LABEL[recipe]} · ${zone.label}`,
      `Groupe ${RECIPE_LABEL[recipe].toLowerCase()} : ${members.map(m => m.fn).join(', ')} ; usage tourné vers l’espace public, passage conservé.`);
    // anchor radius from the first member's zones (contact + use + warm face)
    const m0 = members[0], probe0 = m0.place ? {id: 'r', compositionId: 'r', artId: m0.artId, levelId: zone.level, x: 0, y: 0, scale: 1} : {id: 'r', artId: m0.artId, x: 0, y: 0, scale: 1, levelId: zone.level, solid: true};
    const zb = bbox(zonesOf(m0.place ? 'place' : 'fixture', probe0).flat()), rad = Math.max(-zb.left, zb.right, -zb.top, zb.bottom);
    const dtB = distance(g, k => g.blocked[k] || g.solid[k] || !g.paved[k]);
    let list = candidates(zone, 24).filter(c => Math.min(c.s, c.e) >= rad + 12 && dtB[c.k] >= rad + 4);
    // prefer framed anchors: 12..40u from an edge or a volume, not on it
    list.sort((a, b) => (Math.abs(Math.min(a.s, a.e) - rad - 26) - Math.abs(Math.min(b.s, b.e) - rad - 26)) || a.y - b.y || a.x - b.x);
    let placed = false;
    const first = spread(list, placedGroups, recipe === 'lamp' || recipe === 'marker' ? 240 : 260), firstSet = new Set(first);
    for (const c of [...first, ...spread(list, placedGroups, 150).filter(c => !firstSet.has(c))]) {
      if (placed) break;
      const items = members.map(m => m.place
        ? {kind: 'place', item: {id: nid(zone.id, recipe), compositionId: gid, artId: m.artId, levelId: zone.level, districtId: districtAt(zone.level, c), buildingId: null,
            x: c.x + m.dx, y: c.y + m.dy, scale: 1, label: ART_LABEL(m.artId), purpose: `${m.fn[0].toUpperCase() + m.fn.slice(1)} du groupe « ${RECIPE_LABEL[recipe]} ».`, interactive: false, solid: true}}
        : {kind: 'fixture', item: {...fixture(gid, m.artId, c.x + m.dx, c.y + m.dy), id: nid(zone.id, recipe), levelId: zone.level, districtId: districtAt(zone.level, c),
            function: m.fn, label: ART_LABEL(m.artId), purpose: `${m.fn[0].toUpperCase() + m.fn.slice(1)} du groupe « ${RECIPE_LABEL[recipe]} ».`}});
      // all members or none
      const before = {f: accepted.fixtures.length, p: accepted.places.length}, gridsBefore = snapshot(g);
      let ok = true;
      for (const [n, {kind, item}] of items.entries()) {const why = await admit(kind, item, {framed: n === 0}); /* members: pockets are checked by the access audit below */ if (why) {ok = false; if (process.env.RDEBUG) {const k = recipe + '#' + n + ':' + why.split(':')[0]; RD[k] = (RD[k] || 0) + 1;} break;}}
      if (!ok) {accepted.fixtures.length = before.f; accepted.places.length = before.p; restore(g, gridsBefore); continue;}
      for (const {kind, item} of items) {item.id = finalId(zone.id, recipe); (kind === 'place' ? blank.places : blank.fixtures).push(item);}
      placedGroups.push(c); placed = true; break;
    }
    log.push({zone: zone.id, recipe, placed});
  }
}
// 3) edge rhythm: lamps and standards along the paving edge of long ways,
// on the outer side of the route corridors; one piece every ~360u.
const RHYTHM = [{level: '0', box: [2450, 2900, 7930, 5730], zone: 'southern-ways', label: 'Voies du sud'}, {level: '0', box: [5800, 1400, 7930, 3300], zone: 'port-east', label: 'Quais orientaux'},
  {level: '-1A', box: [1400, 2800, 5100, 5250], zone: 'undercity-west', label: 'Galeries'}, {level: '+1', box: [2760, -40, 6810, 3670], zone: 'enforcer-plaza', label: 'Esplanade des exécuteurs'},
  {level: '-1C', box: [780, 3170, 3540, 5260], zone: 'convoy-yards', label: 'Cours des convois'}, {level: '-1B', box: [3410, 2530, 5250, 4330], zone: 'undercity-refuge', label: 'Refuge bas'},
  {level: '+2', box: [3700, 100, 5860, 1850], zone: 'citadel', label: 'Parvis de la citadelle'}];
for (const r of RHYTHM) {
  const placed = [];
  const list = candidates({level: r.level, box: r.box}, 16).filter(c => c.e >= 16 && c.e <= 40 && c.s >= 90).sort((a, b) => a.y - b.y || a.x - b.x);
  let n = 0;
  for (const c of spread(list, [], 0)) {
    if (placed.some(p => Math.hypot(p.x - c.x, p.y - c.y) < 360)) continue;
    const artId = ['court-native-v80:amber-lamp-post', 'court-native-v80:clan-banner-standard', 'court-native-v80:amber-lamp-post', 'resin-lantern'][n % 4];
    const it = {...fixture('edge-rhythm:' + r.zone, artId, c.x, c.y), id: 'pending:rhythm', levelId: r.level, districtId: districtAt(r.level, c), function: artId.includes('banner') ? 'jalon d’étendard' : artId === 'resin-lantern' ? 'lanterne de halte' : 'éclairage de bord de voie',
      label: ART_LABEL(artId), purpose: `Rythme d’éclairage et d’étendards en bord de pavage, ${r.label.toLowerCase()} ; côté extérieur du trajet public.`};
    if (await admit('fixture', it, {framed: true})) continue;
    it.id = finalId(r.zone, 'rhythm'); blank.fixtures.push(it); placed.push(c); n++;
  }
  G('edge-rhythm:' + r.zone, 'Jalons de bord de voie · ' + r.label, 'Bornes ambrées et étendards espacés le long du bord du pavage ; centre de la voie et trajets publics laissés libres.');
  log.push({zone: r.zone, rhythm: n, placed: true});
}
function snapshot(g) {return {solid: g.solid.slice(), blocked: g.blocked.slice(), dtS: g.dtS.slice()};}
function restore(g, s) {g.solid.set(s.solid); g.blocked.set(s.blocked); g.dtS = s.dtS;}
blank.groups = [...new Map(groups.map(gr => [gr.id, gr])).values()].filter(gr => [...blank.fixtures, ...blank.places].some(i => (i.groupId ?? i.compositionId) === gr.id));
// Fixture JSON keeps only module fields.
blank.fixtures = blank.fixtures.map(({id, artId, x, y, scale, districtId, groupId, function: fn, label, associatedBuildingId, levelId, purpose}) => ({id, artId, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scale, levelId, districtId, groupId: groupId ?? 'facade-front', function: fn, label, associatedBuildingId, purpose}));
blank.places = blank.places.map(({id, compositionId, artId, levelId, districtId, buildingId, x, y, scale, label, purpose}) => ({id, compositionId, artId, levelId, districtId, buildingId, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scale, label, purpose}));
if (process.env.RDEBUG) console.log(JSON.stringify(Object.entries(RD).sort((a, b) => b[1] - a[1]).slice(0, 40)));
const removedForPocket = removedForPocketList;
// 3b) no new enclosed pocket: the access audit (real motor walkability,
// flood from the spawn and every connector) runs on the written layer; a
// pocket the bare map did not have is opened by dropping the nearest new solid.
if (!DRY) {
  const {execFileSync} = await import('node:child_process');
  const tmp = path.join(ROOT, 'outputs', 'plan-dressing-access-v113.json');
  fs.mkdirSync(path.dirname(tmp), {recursive: true});
  const pocketsFor = data => {fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
    execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/audit-homeworld-access-v113.mjs', '--step', '8', '--out', tmp], {cwd: ROOT, stdio: 'pipe'});
    return JSON.parse(fs.readFileSync(tmp, 'utf8')).enclosedPockets;};
  const same = (a, b) => a.levelId === b.levelId && Math.abs(a.box.left - b.box.left) < 24 && Math.abs(a.box.top - b.box.top) < 24;
  const base = pocketsFor({...blank, fixtures: [], places: [], facades: []});
  for (let guard = 0; guard < 30; guard++) {
    const fresh = pocketsFor(blank).filter(p => !base.some(b => same(p, b)));
    if (!fresh.length) break;
    const p = fresh[0], items = [...blank.fixtures.map(item => ({kind: 'fixture', item})), ...blank.places.map(item => ({kind: 'place', item})), ...accepted.facades.map(item => ({kind: 'facade', item}))];
    let best = null, bd = 1e9;
    for (const x of items.filter(x => x.item.levelId === p.levelId)) {const bb = bbox(polygonOf(x.kind, x.item));
      const d = Math.max(bb.left - p.box.right, p.box.left - bb.right, 0) + Math.max(bb.top - p.box.bottom, p.box.top - bb.bottom, 0); if (d < bd) {bd = d; best = x;}}
    if (!best || bd > 60) break;
    removedForPocket.push(best.item.id);
    if (best.kind === 'facade') {accepted.facades = accepted.facades.filter(f => f !== best.item); blank.facades = blank.facades.filter(q => 'dressing-v113:' + q.id + ':facade' !== best.item.id);
      blank.fixtures = blank.fixtures.filter(f => f.associatedBuildingId !== best.item.id);}
    else if (best.kind === 'place') blank.places = blank.places.filter(q => q !== best.item); else blank.fixtures = blank.fixtures.filter(q => q !== best.item);
  }
  if (pocketsFor(blank).some(p => !base.some(b => same(p, b)))) throw new Error('New enclosed pockets remain after bounded dressing reduction; retaining the original plan.');
  fs.rmSync(tmp, {force: true});
}
// 4) pinned walks: the V113 detour test replays a real carry with an exact
// tick count. A new solid that changes it is dropped (smallest culprit set).
const removed = [];
if (!DRY) {
  const {execFileSync} = await import('node:child_process');
  const write = data => fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  const passes = data => {write(data); try {execFileSync(process.execPath, ['--experimental-strip-types', '--test', '--test-name-pattern=1,394-step', 'tests/homeworld-connector-detour-v113.test.mjs'], {cwd: ROOT, stdio: 'pipe', timeout: 120000}); return true;} catch {return false;}};
  const reduced = reduceHomeworldDressingV113(blank, passes);
  removed.push(...reduced.removed); Object.assign(blank, reduced.result);
  blank.groups = [...new Map(groups.map(gr => [gr.id, gr])).values()].filter(gr => [...blank.fixtures, ...blank.places].some(i => (i.groupId ?? i.compositionId) === gr.id));
  write(blank);
} else fs.writeFileSync(OUT, previous);
const summary = {removedForPinnedWalk: removed, removedForPocket, tally: Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 25)), facades: blank.facades.length, fixtures: blank.fixtures.length, places: blank.places.length, groups: blank.groups.length,
  missed: log.filter(l => !l.placed)};
console.log(JSON.stringify(summary, null, 1));
completed = true;
