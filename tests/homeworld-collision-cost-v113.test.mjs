import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78(), load = name => qa.load('app/game/systems/' + name + '.ts');
load('homeworldWayfindingV111');
const court = load('homeworldCourtArtV80'), civic = load('homeworldCivicDecorV80');
const urban = load('homeworldStreetModulesV78'), layout = load('homeworldUrbanLayoutV78');
const city = load('homeworldCity'), geometry = load('homeworldGeometryV64');
const nativeItem = urban.HOMEWORLD_URBAN_PROPS_V78.find(p => p.artId.startsWith('court-native-v80:'));
const legacyItem = urban.HOMEWORLD_URBAN_PROPS_V78.find(p => !p.artId.startsWith('court-native-v80:'));
const center = polygon => ({x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length});

// The pre-optimization predicates consume the public, currently visible polygon.
// Comparing against them tests cache ownership/invalidation, including boundaries;
// it does not substitute a simpler collider for the production narrow phase.
function referenceTouches(kind, polygon, p, body) {
  const left = Math.min(...polygon.map(v => v.x)), right = Math.max(...polygon.map(v => v.x));
  const top = Math.min(...polygon.map(v => v.y)), bottom = Math.max(...polygon.map(v => v.y));
  if (p.x + body.halfWidth < left || p.x - body.halfWidth > right || p.y + body.halfDepth < top || p.y - body.halfDepth > bottom) return false;
  if (body.halfWidth === 0 && body.halfDepth === 0) {
    if (kind === 'civic') return city.pointInHomeworldPolygon(p, polygon);
    const sides = polygon.map((a, i) => { const b = polygon[(i + 1) % polygon.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); });
    return sides.every(v => v >= -1e-8) || sides.every(v => v <= 1e-8);
  }
  return layout.homeworldUrbanOverlapV78(polygon, layout.homeworldUrbanRectV78(p.x - body.halfWidth, p.y - body.halfDepth, p.x + body.halfWidth, p.y + body.halfDepth));
}

function compareCurrent(kind, item, label = item.id) {
  const polygon = kind === 'court' ? court.homeworldCourtPolygonV80(item) : civic.homeworldCivicPolygonV80(item);
  const touches = kind === 'court' ? court.homeworldCourtTouchesV80 : civic.homeworldCivicTouchesV80;
  const middle = center(polygon);
  const bodies = [{halfWidth: 0, halfDepth: 0}, {halfWidth: 24, halfDepth: 14}, {halfWidth: 36, halfDepth: 26}, {halfWidth: 24.375, halfDepth: 14.25}, {halfWidth: 0, halfDepth: 14}, {halfWidth: 24, halfDepth: 0}];
  for (const body of bodies) {
    const points = [middle, {x: middle.x + 2000, y: middle.y - 2000}, {x: NaN, y: middle.y}, {x: Infinity, y: middle.y}];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      points.push(a, {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
      for (const delta of [-1e-7, 0, 1e-7]) points.push({x: a.x - body.halfWidth + delta, y: a.y}, {x: a.x + body.halfWidth + delta, y: a.y}, {x: a.x, y: a.y - body.halfDepth + delta}, {x: a.x, y: a.y + body.halfDepth + delta});
    }
    for (const p of points) assert.equal(touches(item, p, body), referenceTouches(kind, polygon, p, body), label + ' ' + JSON.stringify({p, body}));
  }
}

test('V113 native court collision reuses its private shape without repeating support projection', t => {
  assert(nativeItem);
  const item = {...nativeItem}, support = court.HOMEWORLD_COURT_ART_V80[item.artId].nativeGroundSupport;
  const originalMap = support.map, descriptor = Object.getOwnPropertyDescriptor(support, 'map');
  let projections = 0;
  Object.defineProperty(support, 'map', {configurable: true, value(...args) { projections++; return originalMap.apply(this, args); }});
  try {
    const p = {x: item.x + 2000, y: item.y + 2000};
    assert.equal(court.homeworldCourtTouchesV80(item, p), false);
    const prepared = projections;
    for (let n = 0; n < 100; n++) assert.equal(court.homeworldCourtTouchesV80(item, p), false);
    t.diagnostic(JSON.stringify({repeatedCourtQueries: 100, supportMapsAfterPreparation: projections - prepared}));
    assert.equal(projections - prepared, 0, 'unchanged native support is not projected again for every collision query');
    const first = court.homeworldCourtPolygonV80(item), second = court.homeworldCourtPolygonV80(item), expected = structuredClone(second);
    assert.notEqual(first, second); assert.deepEqual(first, second);
    first[0].x = -9999;
    assert.deepEqual(court.homeworldCourtPolygonV80(item), expected, 'public native polygon copies do not expose the collision cache');
    compareCurrent('court', item);
  } finally {
    if (descriptor) Object.defineProperty(support, 'map', descriptor); else delete support.map;
  }
});

test('V113 civic collision reuses bounds of its existing polygon without repeating four array maps', t => {
  const item = {...civic.HOMEWORLD_CIVIC_PROPS_V80[0]}, polygon = civic.homeworldCivicPolygonV80(item);
  const originalMap = polygon.map, descriptor = Object.getOwnPropertyDescriptor(polygon, 'map');
  let maps = 0;
  Object.defineProperty(polygon, 'map', {configurable: true, value(...args) { maps++; return originalMap.apply(this, args); }});
  try {
    const p = {x: item.x + 2000, y: item.y + 2000};
    assert.equal(civic.homeworldCivicTouchesV80(item, p), false);
    const prepared = maps;
    for (let n = 0; n < 100; n++) assert.equal(civic.homeworldCivicTouchesV80(item, p), false);
    t.diagnostic(JSON.stringify({repeatedCivicQueries: 100, polygonMapsAfterPreparation: maps - prepared}));
    assert.equal(maps - prepared, 0, 'unchanged public polygon does not rebuild its four coordinate arrays');
    assert.equal(civic.homeworldCivicPolygonV80(item), polygon, 'existing civic polygon identity is preserved');
  } finally {
    if (descriptor) Object.defineProperty(polygon, 'map', descriptor); else delete polygon.map;
  }
});

test('V113 cached collision agrees with the native predicates for every mounted court and civic hull', () => {
  assert(urban.HOMEWORLD_URBAN_PROPS_V78.length); assert(civic.HOMEWORLD_CIVIC_PROPS_V80.length);
  for (const item of urban.HOMEWORLD_URBAN_PROPS_V78) compareCurrent('court', item);
  for (const item of civic.HOMEWORLD_CIVIC_PROPS_V80) compareCurrent('civic', item);
});

test('V113 court collision refreshes placement, art and in-place native geometry without changing public polygons', () => {
  const item = {...nativeItem}, ids = Object.keys(court.HOMEWORLD_COURT_ART_V80).filter(id => id.startsWith('court-native-v80:'));
  compareCurrent('court', item, 'initial');
  item.x += 700.375; compareCurrent('court', item, 'x');
  item.y -= 500.25; compareCurrent('court', item, 'y');
  item.scale *= .75; compareCurrent('court', item, 'scale');
  item.artId = ids.find(id => id !== item.artId); compareCurrent('court', item, 'artId');
  const originalArt = court.HOMEWORLD_COURT_ART_V80[item.artId], originalDepth = geometry.HOMEWORLD_GEOMETRY_V64.depthScale;
  const edited = {...originalArt, pivot: {...originalArt.pivot}, nativeGroundSupport: originalArt.nativeGroundSupport.map(p => ({...p}))};
  try {
    court.HOMEWORLD_COURT_ART_V80[item.artId] = edited;
    edited.pivot.x += 300; compareCurrent('court', item, 'replaced art');
    edited.pivot.y -= 150; compareCurrent('court', item, 'pivot value');
    edited.scaleWorldPerPixel *= 1.3; compareCurrent('court', item, 'pixel scale');
    edited.nativeGroundSupport = edited.nativeGroundSupport.map(p => ({x: p.x + 400, y: p.y - 200}));
    compareCurrent('court', item, 'replaced support');
    edited.nativeGroundSupport[0].x += 250; compareCurrent('court', item, 'edited support vertex');
    edited.nativeGroundSupport.push({x: edited.nativeGroundSupport[0].x + 30, y: edited.nativeGroundSupport[0].y + 20});
    compareCurrent('court', item, 'support length');
    geometry.HOMEWORLD_GEOMETRY_V64.depthScale *= .9; compareCurrent('court', item, 'projection scale');
  } finally {
    court.HOMEWORLD_COURT_ART_V80[item.artId] = originalArt;
    geometry.HOMEWORLD_GEOMETRY_V64.depthScale = originalDepth;
  }
});

test('V113 bounds follow edits to exposed legacy and civic polygons while retaining their existing cache semantics', () => {
  assert(legacyItem);
  for (const [kind, source] of [['court', legacyItem], ['civic', civic.HOMEWORLD_CIVIC_PROPS_V80[0]]]) {
    const item = {...source}, get = kind === 'court' ? court.homeworldCourtPolygonV80 : civic.homeworldCivicPolygonV80;
    const polygon = get(item), original = polygon.map(p => ({...p}));
    compareCurrent(kind, item, kind + ' initial');
    try {
      for (const p of polygon) { p.x += 900; p.y -= 650; }
      compareCurrent(kind, item, kind + ' exposed vertex edits');
      polygon.push({x: polygon[0].x + 100, y: polygon[0].y - 50});
      compareCurrent(kind, item, kind + ' exposed length edit');
      item.x += 2000;
      assert.equal(get(item), polygon, 'do not change the pre-existing public polygon cache contract');
      compareCurrent(kind, item, kind + ' same public cached polygon');
    } finally {
      polygon.splice(0, polygon.length, ...original);
    }
    compareCurrent(kind, item, kind + ' restored polygon');
  }
});
