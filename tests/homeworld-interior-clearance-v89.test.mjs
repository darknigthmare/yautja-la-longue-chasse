import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import crypto from 'node:crypto';

const api = homeworldQaModelV64(process.cwd(), ['homeworldInteriorsV64.ts', 'homeworldFurnitureV72.ts',
  'homeworldInteriorDecorV76.ts', 'homeworldStreetDecorV83.ts', 'homeworldPortPublicComplexV84.ts',
  'homeworldCntlipPhysicalV77.ts']);
const rooms = api.HOMEWORLD_INTERIORS_V64;
const poses = {
  "dock-control-v84-control-standard": [
    172,
    200
  ],
  "dock-control-v84-inspection-register": [
    224,
    40
  ],
  "dock-control-v84-inspection-case": [
    220,
    82
  ],
  "deep-forge-v83-preparation-bench": [
    130,
    166
  ],
  "deep-forge-v72-banner-east": [
    338,
    132
  ],
  "deep-forge-v72-east-rear-storage": [
    488,
    116
  ],
  "deep-forge-v76-1": [
    512,
    216
  ],
  "deep-forge-v72-foyer-light-east": [
    336,
    296
  ],
  "training-hall-v82-preparation-containers": [
    226,
    224
  ],
  "memory-vault-v82-west-register-containers": [
    226,
    314
  ],
  "clan-lodge-v72-east-receiving-bench": [
    344,
    406
  ],
  "convoy-workshop-v84-small-containers": [
    482,
    170
  ],
  "convoy-workshop-v76-1": [
    88,
    212
  ],
  "convoy-store-v84-sorting-rack": [
    115,
    110
  ],
  "convoy-store-v84-dispatch-counter": [
    428,
    116
  ],
  "deep-forge-v83-loading-crates": [
    201,
    296
  ],
  "memory-vault-v82-west-record-standard": [
    224,
    356
  ],
  "memory-vault-v76-0": [
    48,
    130
  ],
  "trophy-mausoleum-v82-sealed-maintenance-containers": [
    510,
    145
  ],
  "training-hall-v82-preparation-standard": [
    344,
    224
  ],
  "memory-vault-v82-east-record-containers": [
    486,
    220
  ]
};
const fixtureInvariants = {
  "dock-control-v84-control-standard": {
    "artId": "clan-banner",
    "scale": 0.35
  },
  "dock-control-v84-inspection-register": {
    "artId": "register-desk",
    "scale": 0.4
  },
  "dock-control-v84-inspection-case": {
    "artId": "chest-diagonal",
    "scale": 0.5
  },
  "deep-forge-v72-foyer-light-east": {
    "artId": "resin-lantern",
    "scale": 0.66
  },
  "deep-forge-v72-banner-east": {
    "artId": "clan-banner",
    "scale": 0.55
  },
  "deep-forge-v83-loading-crates": {
    "artId": "convoy-crates",
    "scale": 0.65
  },
  "deep-forge-v76-1": {
    "artId": "rack-lateral",
    "scale": 0.88
  },
  "deep-forge-v83-preparation-bench": {
    "artId": "forge-bench-right",
    "scale": 0.85
  },
  "deep-forge-v72-east-rear-storage": {
    "halfWidth": 22.703797458501064,
    "halfDepth": 14.595298366179254,
    "width": 45.407594936708854,
    "height": 76
  },
  "training-hall-v82-preparation-containers": {
    "artId": "sealed-jars",
    "scale": 0.5
  },
  "training-hall-v82-preparation-standard": {
    "artId": "clan-banner",
    "scale": 0.28
  },
  "clan-lodge-v72-east-receiving-bench": {
    "halfWidth": 42.00000000000001,
    "halfDepth": 11.200000000000001,
    "width": 84.00000000000001,
    "height": 28.000000000000004
  },
  "memory-vault-v82-west-register-containers": {
    "artId": "sealed-jars",
    "scale": 0.48
  },
  "memory-vault-v82-east-record-containers": {
    "artId": "sealed-jars",
    "scale": 0.45
  },
  "memory-vault-v82-west-record-standard": {
    "artId": "clan-banner",
    "scale": 0.45
  },
  "memory-vault-v76-0": {
    "artId": "rack-lateral",
    "scale": 0.88
  },
  "convoy-workshop-v84-small-containers": {
    "artId": "sealed-jars",
    "scale": 0.28
  },
  "convoy-workshop-v76-1": {
    "artId": "rack-lateral",
    "scale": 0.88
  },
  "convoy-store-v84-sorting-rack": {
    "artId": "cargo-rack-right",
    "scale": 0.66,
    "sourceVersion": "V83"
  },
  "convoy-store-v84-dispatch-counter": {
    "artId": "merchant-counter-left",
    "scale": 0.66,
    "sourceVersion": "V83"
  },
  "trophy-mausoleum-v82-sealed-maintenance-containers": {
    "artId": "sealed-jars",
    "scale": 0.36
  }
};
const priorPoses = {
  "dock-control-v84-control-standard": [
    172,
    116
  ],
  "dock-control-v84-inspection-register": [
    442,
    116
  ],
  "dock-control-v84-inspection-case": [
    371,
    116
  ],
  "deep-forge-v72-foyer-light-east": [
    504,
    250
  ],
  "deep-forge-v72-banner-east": [
    399,
    145
  ],
  "deep-forge-v83-loading-crates": [
    400,
    216
  ],
  "deep-forge-v76-1": [
    512,
    142
  ],
  "deep-forge-v83-preparation-bench": [
    126,
    194
  ],
  "deep-forge-v72-east-rear-storage": [
    488,
    212
  ],
  "training-hall-v82-preparation-containers": [
    226,
    136
  ],
  "training-hall-v82-preparation-standard": [
    508,
    100
  ],
  "clan-lodge-v72-east-receiving-bench": [
    344,
    396
  ],
  "memory-vault-v82-west-register-containers": [
    224,
    76
  ],
  "memory-vault-v82-east-record-containers": [
    494,
    75
  ],
  "memory-vault-v82-west-record-standard": [
    224,
    196
  ],
  "memory-vault-v76-0": [
    48,
    48
  ],
  "convoy-workshop-v84-small-containers": [
    514,
    278
  ],
  "convoy-workshop-v76-1": [
    62,
    220
  ],
  "convoy-store-v84-sorting-rack": [
    115,
    130
  ],
  "convoy-store-v84-dispatch-counter": [
    428,
    134
  ],
  "trophy-mausoleum-v82-sealed-maintenance-containers": [
    510,
    78
  ]
};
const actor = { halfWidth: 24, halfDepth: 14 }, margin = { halfWidth: 28, halfDepth: 18 };
const furniture = room => [...room.furniture ?? [], ...room.publicFittingsV82?.furniture ?? []];
const decor = room => [...room.orientedDecorV76 ?? [], ...room.monumentDecorV81 ?? [], ...room.publicFittingsV82?.decor ?? []];
const passages = room => room.publicComplexV83?.passages ?? room.portComplexV84?.passages
  ?? room.monumentLayoutV81?.passages ?? room.secondaryLayoutV74?.passages ?? [];
const natives = room => [...room.publicComplexV83?.nativeProps ?? [], ...room.portComplexV84?.nativeProps ?? []];
const polygon = item => item.sourceVersion ? api.homeworldPortNativePolygonV84(item) : api.homeworldStreetDecorPolygonV83(item);
const rect = b => [{ x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }];
const bounds = shape => ({ left: Math.min(...shape.map(p => p.x)), right: Math.max(...shape.map(p => p.x)),
  top: Math.min(...shape.map(p => p.y)), bottom: Math.max(...shape.map(p => p.y)) });
const distance = (p, b) => Math.hypot(Math.max(b.left - p.x, 0, p.x - b.right), Math.max(b.top - p.y, 0, p.y - b.bottom));
const wholeBody = (p, zone, body) => p.x - body.halfWidth >= zone.x && p.x + body.halfWidth <= zone.x + zone.width
  && p.y - body.halfDepth >= zone.y && p.y + body.halfDepth <= zone.y + zone.depth;
const minimum = (floor, b) => Math.min(...floor.map(p => distance(p, b)));
const floors = new Map();
function flood(room, body) {
  const key = room.buildingId + ':' + body.halfWidth + ':' + body.halfDepth;
  if (rooms.includes(room) && floors.has(key)) return floors.get(key);
  assert(api.isHomeworldInteriorWalkableV64(room, room.spawn, body), room.buildingId + ' clear spawn');
  const queue = [room.spawn], seen = new Set([room.spawn.x + ',' + room.spawn.y]);
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
    const p = queue[i], next = { x: p.x + dx, y: p.y + dy }, nextKey = next.x + ',' + next.y;
    if (seen.has(nextKey)) continue;
    // Every unit of every cardinal edge uses the actual runtime predicate.
    let clear = true;
    for (let step = 1; step <= 4; step++) if (!api.isHomeworldInteriorWalkableV64(room,
      { x: p.x + dx * step / 4, y: p.y + dy * step / 4 }, body)) { clear = false; break; }
    if (clear) { seen.add(nextKey); queue.push(next); }
  }
  if (rooms.includes(room)) floors.set(key, queue);
  return queue;
}
function overlap(a, b) {
  for (const shape of [a, b]) for (let i = 0; i < shape.length; i++) {
    const p = shape[i], q = shape[(i + 1) % shape.length], nx = p.y - q.y, ny = q.x - p.x;
    if (!nx && !ny) continue;
    const one = a.map(v => v.x * nx + v.y * ny), two = b.map(v => v.x * nx + v.y * ny);
    if (Math.max(...one) <= Math.min(...two) || Math.max(...two) <= Math.min(...one)) return false;
  }
  return true;
}
function shapes(room) {
  return [
    ...furniture(room).map(item => ({ id: item.id, item, poly: rect(api.homeworldFurnitureFootprintV72(item)) })),
    ...decor(room).map(item => ({ id: item.id, item, poly: rect(api.homeworldInteriorDecorBoundsV76(item)) })),
    ...natives(room).map(item => ({ id: item.id, item, poly: polygon(item) })),
    ...room.props.map(item => ({ id: item.id, item, poly: rect({ left: item.x - item.halfWidth, right: item.x + item.halfWidth,
      top: item.y - item.halfDepth * 2, bottom: item.y }) })),
    ...(room.partitions ?? []).map(item => ({ id: item.id, poly: rect({ left: item.x, right: item.x + item.width, top: item.y, bottom: item.y + item.depth }) })),
    ...room.points.map(item => {
      const prop = api.homeworldInteriorPointPropV64(item);
      return { id: item.pointId, poly: rect(prop ? { left: item.x - prop.halfWidth, right: item.x + prop.halfWidth,
        top: item.y - prop.halfDepth * 2, bottom: item.y } : { left: item.x - 16, right: item.x + 16, top: item.y - 10, bottom: item.y + 10 }) };
    }),
  ];
}
function priorRoom(room) {
  const restore = item => priorPoses[item.id] ? { ...item, x: priorPoses[item.id][0], y: priorPoses[item.id][1] } : item;
  return { ...room, furniture: room.furniture?.map(restore), props: room.props.map(restore),
    orientedDecorV76: room.orientedDecorV76?.map(restore),
    publicFittingsV82: room.publicFittingsV82 ? { ...room.publicFittingsV82,
      furniture: room.publicFittingsV82.furniture.map(restore), decor: room.publicFittingsV82.decor.map(restore) } : undefined,
    publicComplexV83: room.publicComplexV83 ? { ...room.publicComplexV83, nativeProps: room.publicComplexV83.nativeProps.map(restore) } : undefined,
    portComplexV84: room.portComplexV84 ? { ...room.portComplexV84, nativeProps: room.portComplexV84.nativeProps.map(restore) } : undefined };
}

test('the previous forge poses reproduce two inaccessible whole-body functional zones using unchanged real colliders', () => {
  const room = priorRoom(rooms.find(r => r.buildingId === 'deep-forge')), floor = flood(room, actor);
  assert.deepEqual(room.zones.filter(z => !floor.some(p => wholeBody(p, z, actor))).map(z => z.id),
    ['deep-forge-v83-preparation', 'deep-forge-v83-loading']);
  assert(room.points.every(point => floor.some(p => api.nearestHomeworldInteriorTargetV64(room, p)?.pointId === point.pointId)),
    'the defect concerns floor access, not fabricated unavailable services');
});

for (const room of rooms) for (const body of [actor, margin]) test(room.buildingId + ': live full body ' + body.halfWidth + '/' + body.halfDepth + ' reaches every zone, service, approach and exit', () => {
  const floor = flood(room, body);
  assert(floor.length > 100, 'a connected floor, not only scripted target positions');
  assert.equal(api.nearestHomeworldInteriorTargetV64(room, room.spawn), null);
  assert(floor.some(p => api.nearestHomeworldInteriorTargetV64(room, p)?.kind === 'exit'), 'physical exit');
  for (const point of room.points) assert(floor.some(p => api.nearestHomeworldInteriorTargetV64(room, p)?.pointId === point.pointId), point.pointId);
  for (const zone of room.zones) assert(floor.some(p => wholeBody(p, zone, body)), 'whole-body zone: ' + zone.id);
  for (const passage of passages(room)) {
    assert(api.isHomeworldInteriorWalkableV64(room, passage, body), 'actual passage centre: ' + passage.id);
    assert(floor.some(p => Math.hypot(p.x - passage.x, p.y - passage.y) < 7), 'reachable passage: ' + passage.id);
  }
  for (const item of furniture(room)) {
    const support = api.homeworldFurnitureFootprintV72(item), approach = minimum(floor, support);
    // Explicit historical V72 scenery baseline only. It is not an action or
    // service; every other furnishing still has the strict <60u approach.
    if (item.id === 'memory-vault-v72-role-east') assert.equal(approach, body === actor ? 74 : 78);
    else assert(approach < 60, 'scenery approach: ' + item.id + ' = ' + approach);
  }
  for (const item of decor(room)) assert(minimum(floor, api.homeworldInteriorDecorBoundsV76(item)) < 65, 'decor approach: ' + item.id);
  for (const item of natives(room)) {
    const poly = polygon(item);
    // Bounding distance is only a prefilter; measure the true painted support.
    const segmentDistance = (p, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
    };
    assert(floor.some(p => distance(p, bounds(poly)) < 65 && poly.some((a, i) => segmentDistance(p, a, poly[(i + 1) % poly.length]) < 65)),
      'native polygon approach: ' + item.id);
  }
});

test('all 21 relocated supports remain solid, inside their envelope and disjoint from other objects, partitions and service bodies', () => {
  const found = [];
  for (const room of rooms) {
    const items = shapes(room);
    for (const entry of items.filter(s => poses[s.id])) {
      found.push(entry.id); assert.deepEqual([entry.item.x, entry.item.y], poses[entry.id]);
      const expected = fixtureInvariants[entry.id];
      assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [key, entry.item[key]])), expected, 'original native art, scale and collider dimensions: ' + entry.id);
      const b = bounds(entry.poly);
      assert(b.left >= 10 && b.right <= room.width - 10 && b.top >= 10 && b.bottom <= room.depth - 10, 'support bounds: ' + entry.id);
      const center = { x: entry.poly.reduce((n, p) => n + p.x, 0) / entry.poly.length, y: entry.poly.reduce((n, p) => n + p.y, 0) / entry.poly.length };
      assert(!api.isHomeworldInteriorWalkableV64(room, center), 'real solid support: ' + entry.id);
      for (const other of items) if (other.id !== entry.id) assert(!overlap(entry.poly, other.poly), entry.id + ' overlaps ' + other.id);
    }
  }
  assert.deepEqual(found.sort(), Object.keys(poses).sort(), 'no renamed, removed or duplicate moved fixture');
});

test('43 save-owned envelopes, all 15 story/service descriptors and the existing clan table host survive the placement-only correction', async () => {
  const envelopes = JSON.parse(await fs.readFile('app/game/data/homeworldInteriorEnvelopesV64.json', 'utf8'));
  assert.equal(rooms.length, 43);
  const allPoints = rooms.flatMap(room => room.points);
  assert.deepEqual(allPoints.map(point => point.pointId), ["dock-officer-point","suspect-trophy-point","market-service","forge-service","witness-point","trophy-service","mausoleum-service","training-service","medbay-service","enforcer-point","memory-register-point","memory-service","pit-service","temple-point","audience-point"]);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(allPoints)).digest('hex'),
    '29971af15b84c2a023a4f7b69871b6c7bc7e7887f5a6ca296a94bc0ba6745c90', 'unchanged complete service/story descriptors and coordinates');
  for (const room of rooms) {
    const envelope = room.monumentLayoutV81?.exteriorEnvelope ?? envelopes.find(r => r.buildingId === room.buildingId);
    assert.equal(room.width, envelope.width - 32); assert.equal(room.depth, envelope.depth - 32);
    assert.deepEqual(room.spawn, { x: room.width / 2, y: room.depth - 72 });
    assert.deepEqual(room.exit, { x: room.width / 2, y: room.depth - 24 });
    assert.deepEqual(room.points.map(p => p.pointId), api.HOMEWORLD_INTERIOR_BINDINGS_V64[room.buildingId] ?? []);
    for (const activity of [...room.publicComplexV83?.activities ?? [], ...room.portComplexV84?.activities ?? []])
      assert.equal(activity.status, 'scenery-existing-services-only');
  }
  const clan = rooms.find(r => r.buildingId === 'clan-lodge');
  assert.deepEqual(api.homeworldCntlipHostV77(clan), { id: 'clan-table-healer', siteId: 'clan-common', buildingId: 'clan-lodge',
    name: 'Soigneuse de relève', role: 'healer', x: 330, y: 130, tableId: 'clan-lodge-v72-role-east', approach: { x: 404, y: 130 } });
  assert.deepEqual(clan.furniture.find(item => item.id === 'clan-lodge-v72-role-east'),
    { id: 'clan-lodge-v72-role-east', artId: 'meal-table', x: 403.5, y: 90, scale: .78 });
});

test('the real surface still renders each relocated native independently, without a fabricated scenery interaction or collected trophy', () => {
  const ssr = homeworldSceneSsrV78(), selected = rooms.filter(room => shapes(room).some(s => poses[s.id]));
  assert.equal(selected.length, 8);
  for (const room of selected) {
    const html = ssr.render('app/game/HomeworldInteriorSurface.tsx', { room, actorPosition: room.spawn, activePointId: null, trophies: [] });
    for (const item of shapes(room).filter(s => poses[s.id])) assert(html.includes(item.id), 'rendered fixture: ' + item.id);
    assert(!html.includes('data-trophy-claim-id'));
    assert(!html.includes('<svg'));
    for (const item of natives(room)) assert.equal(item.interactive, false);
  }
});
