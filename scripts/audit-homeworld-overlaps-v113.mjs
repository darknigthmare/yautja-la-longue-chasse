/** Level-design overlap audit of Homeworld exterior solids.
 *
 * Collects the ground polygons of every exterior solid provider the motor
 * reads (buildings, V75 frontage, V72 connection furniture, V77 legacy props,
 * V76 exterior decor, V78 courts and generated props, V80 civic props,
 * V83/V84 street decor, V92 street compositions, V112 public places),
 * rasterizes them at `step` units and reports every pair whose ground
 * footprints share area. Each provider's own polygon helper is used, so the
 * result is what the game itself considers occupied ground.
 *
 * Geometry evidence only: no sprite bounds, pixel or artistic judgement.
 * Usage: node scripts/audit-homeworld-overlaps-v113.mjs [--step 4] [--min-area 64] [--out file]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asPolygon = shape => Array.isArray(shape) ? shape : shape?.polygon ?? (shape && Number.isFinite(shape.left)
  ? [{x: shape.left, y: shape.top}, {x: shape.right, y: shape.top}, {x: shape.right, y: shape.bottom}, {x: shape.left, y: shape.bottom}] : null);

export function collectHomeworldSolidsV113(root = ROOT) {
  const qa = homeworldSceneSsrV78(root), load = file => qa.load('app/game/systems/' + file + '.ts');
  const world = load('homeworldWorldV77'), geometry = load('homeworldGeometryV64'), exterior = load('homeworldExteriorDecorV76');
  const furniture = load('homeworldFurnitureV72'), civic = load('homeworldCivicDecorV80'), street = load('homeworldStreetModulesV78');
  load('homeworldCivicWorldV80'); load('homeworldStreetDecorMountV84'); load('homeworldStreetCompositionMountV92'); load('homeworldPublicPlacesMountV112');
  const court = load('homeworldCourtArtV80'), native = load('homeworldCityNativePlacementV78');
  const d83 = load('homeworldStreetDecorV83'), d84 = load('homeworldStreetDecorV84'), places = load('homeworldPublicPlacesV112'), comp = load('homeworldStreetCompositionV92');
  const solids = [];
  const add = (layer, item, shape, label = item.label ?? item.artId ?? '') => {
    const polygon = asPolygon(shape);
    if (polygon && polygon.length >= 3) solids.push({layer, id: item.id, label, levelId: item.levelId, polygon});
  };
  for (const b of world.HOMEWORLD_BUILDINGS_V77) add('building', b, geometry.homeworldBuildingFootprintV64(b), b.label);
  for (const e of world.HOMEWORLD_EXTERIOR_V77.filter(item => item.solid)) add('exterior-v76', e, exterior.homeworldExteriorPolygonV76(e));
  for (const f of world.HOMEWORLD_FRONTAGE_V77) add('frontage-v75', f, furniture.homeworldFurnitureFootprintV72(f));
  for (const f of world.HOMEWORLD_CONNECTION_FURNITURE_V77) add('connection-v72', f, furniture.homeworldFurnitureFootprintV72(f));
  for (const p of world.HOMEWORLD_PROPS_V77.filter(p => p.footprint)) add('prop-v77', p, {left: p.x - p.footprint.halfWidth, right: p.x + p.footprint.halfWidth, top: p.y - p.footprint.halfDepth, bottom: p.y + p.footprint.halfDepth});
  for (const p of civic.HOMEWORLD_CIVIC_PROPS_V80) add('civic-v80', p, civic.homeworldCivicPolygonV80(p));
  for (const p of street.HOMEWORLD_URBAN_PROPS_V78) add('court-v78', p, court.homeworldCourtPolygonV80(p));
  for (const p of street.HOMEWORLD_CITY_GENERATED_PROPS_V78) add('generated-v78', p, native.homeworldCityNativePolygonV78(p));
  for (const p of d83.HOMEWORLD_STREET_DECOR_PROPS_V83 ?? []) add('street-v83', p, d83.homeworldStreetDecorPolygonV83(p));
  for (const p of d84.HOMEWORLD_STREET_DECOR_PROPS_V84 ?? []) add('street-v84', p, d84.homeworldStreetDecorPolygonV84(p));
  for (const p of comp.HOMEWORLD_STREET_COMPOSITION_PROPS_V92 ?? []) add('composition-v92', p, comp.homeworldStreetCompositionPolygonV92(p));
  for (const p of places.HOMEWORLD_PUBLIC_PLACES_V112 ?? []) add('public-place-v112', p, places.homeworldPublicPlacePolygonV112(p));
  return solids;
}

function rasterize(polygon, step) {
  const xs = polygon.map(p => p.x), ys = polygon.map(p => p.y), cells = [];
  const left = Math.floor(Math.min(...xs) / step), right = Math.ceil(Math.max(...xs) / step), top = Math.floor(Math.min(...ys) / step), bottom = Math.ceil(Math.max(...ys) / step);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const px = (x + .5) * step, py = (y + .5) * step; let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) cells.push(x + ',' + y);
  }
  return cells;
}

export function auditHomeworldOverlapsV113({root = ROOT, step = 4, minArea = 64} = {}) {
  const solids = collectHomeworldSolidsV113(root), owners = new Map(), pairs = new Map();
  solids.forEach((solid, index) => {
    for (const cell of rasterize(solid.polygon, step)) {
      const key = solid.levelId + '|' + cell, list = owners.get(key);
      if (!list) {owners.set(key, [index]); continue;}
      for (const other of list) {const k = other < index ? other + ':' + index : index + ':' + other; pairs.set(k, (pairs.get(k) ?? 0) + 1);}
      list.push(index);
    }
  });
  const overlaps = [...pairs].map(([k, n]) => {const [a, b] = k.split(':').map(Number); return {a: solids[a], b: solids[b], area: n * step * step};})
    .filter(o => o.area >= minArea)
    .map(({a, b, area}) => ({levelId: a.levelId, area, kind: a.layer === 'building' || b.layer === 'building' ? (a.layer === b.layer ? 'building-building' : 'prop-building') : 'prop-prop',
      a: {layer: a.layer, id: a.id, label: a.label}, b: {layer: b.layer, id: b.id, label: b.label}}))
    .sort((x, y) => y.area - x.area);
  const byLayer = {}; for (const s of solids) byLayer[s.layer] = (byLayer[s.layer] ?? 0) + 1;
  return {schemaVersion: 1, release: 'V113', step, minArea,
    method: 'Ground polygons from each provider\'s own helper, rasterized every ' + step + ' units per level; pairs sharing at least ' + minArea + ' square units are listed. Geometry evidence only.',
    solids: solids.length, byLayer, overlaps};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = name => {const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined;};
  const result = auditHomeworldOverlapsV113({step: Number(at('--step') ?? 4), minArea: Number(at('--min-area') ?? 64)});
  const out = at('--out');
  if (out) {fs.mkdirSync(path.dirname(out), {recursive: true}); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');}
  const kinds = {}; for (const o of result.overlaps) kinds[o.kind] = (kinds[o.kind] ?? 0) + 1;
  console.log(JSON.stringify({solids: result.solids, byLayer: result.byLayer, overlaps: result.overlaps.length, kinds}));
}
