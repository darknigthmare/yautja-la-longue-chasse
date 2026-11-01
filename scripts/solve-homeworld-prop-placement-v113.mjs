/** Nearest coherent position for a legacy V77 prop (read-only proposal).
 *
 * Candidate anchors around the current one are accepted only when the prop's
 * own ground box (its authored footprint) stays on real public floor with the
 * project's 10x8 margin, shares no ground with any other exterior solid (same
 * polygons as audit-homeworld-overlaps-v113), stays in its district, and keeps
 * a body-wide clearance from other solids so it does not seal a passage.
 * Prints the closest candidates; nothing is written.
 * Usage: node scripts/solve-homeworld-prop-placement-v113.mjs <prop-id> [--radius 220] [--clearance 0]
 */
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {collectHomeworldSolidsV113} from './audit-homeworld-overlaps-v113.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const boxOf = polygon => ({left: Math.min(...polygon.map(p => p.x)), right: Math.max(...polygon.map(p => p.x)), top: Math.min(...polygon.map(p => p.y)), bottom: Math.max(...polygon.map(p => p.y))});
function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function solveLegacyPropV113(id, {root = ROOT, radius = 220, step = 5, clearance = 0} = {}) {
  const qa = homeworldSceneSsrV78(root), world = qa.load('app/game/systems/homeworldWorldV77.ts'), street = qa.load('app/game/systems/homeworldStreetModulesV78.ts');
  const prop = world.HOMEWORLD_PROPS_V77.find(p => p.id === id);
  if (!prop?.footprint) throw new Error('Not a V77 prop with a footprint: ' + id);
  const others = collectHomeworldSolidsV113(root).filter(s => s.levelId === prop.levelId && s.id !== id).map(s => ({...s, box: boxOf(s.polygon)}));
  const district = world.HOMEWORLD_DISTRICTS_V77.find(d => d.id === prop.districtId);
  const {halfWidth: hw, halfDepth: hd} = prop.footprint, results = [];
  for (let dx = -radius; dx <= radius; dx += step) for (let dy = -radius; dy <= radius; dy += step) {
    const x = prop.x + dx, y = prop.y + dy, box = {left: x - hw, right: x + hw, top: y - hd, bottom: y + hd};
    const corners = [{x: box.left, y: box.top}, {x: box.right, y: box.top}, {x: box.right, y: box.bottom}, {x: box.left, y: box.bottom}];
    if (!corners.every(c => street.homeworldUrbanTerrainV78(prop.levelId, c, {halfWidth: 10, halfDepth: 8}))) continue;
    if (district && !pointInPolygon({x, y}, district.polygon)) continue;
    const padded = {left: box.left - clearance, right: box.right + clearance, top: box.top - clearance, bottom: box.bottom + clearance};
    let clash = false;
    for (const s of others) {
      if (!intersects(padded, s.box)) continue;
      // exact test: any sampled point of the padded box inside the other polygon
      for (let sx = padded.left; sx <= padded.right && !clash; sx += 4) for (let sy = padded.top; sy <= padded.bottom; sy += 4) if (pointInPolygon({x: sx, y: sy}, s.polygon)) {clash = true; break;}
      if (clash) break;
    }
    if (!clash) results.push({x, y, shift: Math.round(Math.hypot(dx, dy))});
  }
  return {id, levelId: prop.levelId, districtId: prop.districtId, current: {x: prop.x, y: prop.y}, footprint: prop.footprint,
    candidates: results.sort((a, b) => a.shift - b.shift).slice(0, 12)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [id, ...rest] = process.argv.slice(2), at = name => {const i = rest.indexOf(name); return i >= 0 ? Number(rest[i + 1]) : undefined;};
  console.log(JSON.stringify(solveLegacyPropV113(id, {radius: at('--radius') ?? 220, clearance: at('--clearance') ?? 0})));
}
