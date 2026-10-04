import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldInteriorsV64.ts', 'homeworldMonumentInteriorsV81.ts', 'homeworldMonumentInteriorCodexV81.ts', 'homeworldContextCodexV71.ts', 'homeworldFurnitureV72.ts', 'homeworldInteriorDecorV76.ts', 'homeworldCntlipPhysicalV77.ts', 'homeworldIdentityV72.ts']);
const rooms = api.HOMEWORLD_INTERIORS_V64.filter(room => room.monumentLayoutV81);
const body = { halfWidth: 28, halfDepth: 18 };
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
function footprints(room) {
  return [
    ...room.furniture.map(item => ({ id: item.id, ...api.homeworldFurnitureFootprintV72(item) })),
    ...room.props.map(item => ({ id: item.id, left: item.x - item.halfWidth, right: item.x + item.halfWidth, top: item.y - item.halfDepth * 2, bottom: item.y })),
    ...[...room.orientedDecorV76, ...room.monumentDecorV81].map(item => ({ id: item.id, ...api.homeworldInteriorDecorBoundsV76(item) })),
  ];
}
function reachable(room) {
  const queue = [room.spawn], visited = new Set([`${room.spawn.x},${room.spawn.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
      const next = { x: point.x + dx, y: point.y + dy }, key = `${next.x},${next.y}`;
      if (visited.has(key)) continue;
      let clear = true;
      for (let fraction = 1; fraction <= 8; fraction++) if (!api.isHomeworldInteriorWalkableV64(room, { x: point.x + dx * fraction / 8, y: point.y + dy * fraction / 8 }, body)) { clear = false; break; }
      if (clear) { visited.add(key); queue.push(next); }
    }
  }
  return queue;
}

test('two proportional public monument complexes preserve all 43 buildings and every story/service binding', () => {
  assert.equal(rooms.length, 2); assert.equal(api.HOMEWORLD_INTERIORS_V64.length, 43);
  for (const room of rooms) {
    assert.equal(room.width, room.monumentLayoutV81.exteriorEnvelope.width - 32);
    assert.equal(room.depth, room.monumentLayoutV81.exteriorEnvelope.depth - 32);
    assert.deepEqual(room.points.map(point => point.pointId), api.HOMEWORLD_INTERIOR_BINDINGS_V64[room.buildingId]);
    assert.equal(room.secondaryLayoutV74, undefined, 'obsolete small-room metadata is not presented as the monument layout');
    assert.equal(room.monumentLayoutV81.lore, 'original-public-complex-not-a-canonical-map');
    assert(room.monumentLayoutV81.unavailable.includes('private-residential-suites'));
    assert(api.isHomeworldInteriorWalkableV64(room, room.spawn, body));
    assert(api.isHomeworldInteriorWalkableV64(room, { ...room.exit, y: room.exit.y - 4 }, body), 'exit approach keeps the additional four-unit margin');
    assert.equal(api.nearestHomeworldInteriorTargetV64(room, room.spawn), null);
  }
  assert.equal(rooms.find(room => room.buildingId === 'throne-audience').zones.length, 5);
  assert.equal(rooms.find(room => room.buildingId === 'rite-sanctum').zones.length, 4);
  assert.equal(api.HOMEWORLD_INTERIORS_V64.reduce((count, room) => count + room.points.length, 0), 15);
});

for (const room of rooms) test(`${room.buildingId}: all rooms, service approaches, wide branches and exit connect with a whole body`, () => {
  const floor = reachable(room);
  assert(floor.length > 1500, 'a sizeable real floor is reachable, not only small scripted approach points');
  assert(floor.some(point => api.nearestHomeworldInteriorTargetV64(room, point)?.kind === 'exit'));
  for (const target of room.points) assert(floor.some(point => api.nearestHomeworldInteriorTargetV64(room, point)?.pointId === target.pointId), 'existing service unreachable: ' + target.pointId);
  for (const zone of room.zones) assert(floor.some(point => point.x - body.halfWidth >= zone.x && point.x + body.halfWidth <= zone.x + zone.width && point.y - body.halfDepth >= zone.y && point.y + body.halfDepth <= zone.y + zone.depth), 'whole-body zone unreachable: ' + zone.id);
  for (const passage of room.monumentLayoutV81.passages) {
    assert(passage.width >= 200); assert(api.isHomeworldInteriorWalkableV64(room, passage, body), passage.id);
    assert(floor.some(point => Math.hypot(point.x - passage.x, point.y - passage.y) < 7), passage.id + ' not reachable');
  }
  for (const fixture of footprints(room)) assert(floor.some(point => Math.hypot(Math.max(fixture.left - point.x, 0, point.x - fixture.right), Math.max(fixture.top - point.y, 0, point.y - fixture.bottom)) < 65), 'fixture has no reachable approach: ' + fixture.id);
});

for (const room of rooms) test(`${room.buildingId}: native furnishing supports do not overlap, cross partitions or block the ceremonial axis`, () => {
  const items = footprints(room);
  assert(items.length >= 15, 'the complex has functional furnishing groups, not a single chair');
  for (const [index, item] of items.entries()) {
    assert(item.left >= 10 && item.right <= room.width - 10 && item.top >= 10 && item.bottom <= room.depth - 10, 'support outside floor: ' + item.id);
    assert(!api.isHomeworldInteriorWalkableV64(room, { x: (item.left + item.right) / 2, y: (item.top + item.bottom) / 2 }), 'native furnishing is not solid: ' + item.id);
    for (const other of items.slice(index + 1)) assert(!overlaps(item, other), 'furnishing overlap: ' + item.id + ' / ' + other.id);
    for (const wall of room.partitions) assert(!overlaps(item, { left: wall.x, right: wall.x + wall.width, top: wall.y, bottom: wall.y + wall.depth }), 'support crosses partition: ' + item.id + ' / ' + wall.id);
    assert(!overlaps(item, room.monumentLayoutV81.protectedAxis), 'ceremonial circulation obstructed: ' + item.id);
  }
});

test('the existing court reception retains its exact table, host, approach and eligibility rules', () => {
  const room = rooms.find(room => room.buildingId === 'throne-audience');
  const host = api.homeworldCntlipHostV77(room);
  assert.equal(host.id, 'court-table-herald'); assert.deepEqual(host.approach, { x: 410, y: 183 });
  assert.deepEqual(room.furniture.find(item => item.id === host.tableId), { id: 'throne-audience-v77-cntlip-table', artId: 'meal-table', x: 410, y: 141, scale: .62 });
  assert(api.isHomeworldInteriorWalkableV64(room, host.approach, body));
  assert.equal(api.homeworldCntlipReachedV77(room, host.approach), host);
});

test('the actual interior surface mounts both complexes, partitions and independently oriented native decor', () => {
  const ssr = homeworldSceneSsrV78();
  for (const room of rooms) {
    const html = ssr.render('app/game/HomeworldInteriorSurface.tsx', { room, actorPosition: room.spawn, activePointId: null, trophies: [] });
    assert(html.includes(`data-homeworld-monument-interior-v81="${room.buildingId}"`));
    for (const item of room.monumentDecorV81) assert(html.includes(item.id));
    for (const wall of room.partitions) assert(html.includes(wall.id));
    assert(html.includes('data-decor-native-orientation="diagonal-left-front"'));
    assert(html.includes('data-homeworld-physical-exit'));
    for (const npc of room.monumentInhabitantsV81) {
      assert(html.includes(`data-homeworld-monument-inhabitant-v81="${npc.id}"`));
      assert(html.includes(`data-homeworld-civilian-v72="${npc.role}"`));
      assert(html.includes(api.homeworldCivilianArtV72(npc.role).src));
    }
    assert(html.includes('data-native-animation-status="preserved-native-idle-no-new-gesture-clip"'));
    assert(!html.includes('data-homeworld-civilian-motion-v74'), 'stationary presence does not advertise a new movement clip');
  }
});

test('five contextual natives remain solid, distinct and safely outside furniture, partitions and the ceremonial circulation', () => {
  const council = rooms.find(room => room.buildingId === 'rite-sanctum');
  const palace = rooms.find(room => room.buildingId === 'throne-audience');
  assert.deepEqual(council.monumentInhabitantsV81.map(npc => npc.role), ['archivist', 'herald', 'rite-keeper']);
  assert.deepEqual(palace.monumentInhabitantsV81.map(npc => npc.role), ['guard', 'guard']);
  for (const room of rooms) for (const npc of room.monumentInhabitantsV81) {
    const foot = { left: npc.x - 16, right: npc.x + 16, top: npc.y - 10, bottom: npc.y + 10 };
    assert.equal(npc.interactive, false); assert.equal(npc.motion, 'preserved-native-idle-no-new-gesture-clip');
    assert(!api.isHomeworldInteriorWalkableV64(room, npc, body), npc.id + ' cannot be walked through');
    for (const fixture of footprints(room)) assert(!overlaps(foot, fixture), npc.id + ' overlaps native furnishing ' + fixture.id);
    for (const wall of room.partitions) assert(!overlaps(foot, { left: wall.x, right: wall.x + wall.width, top: wall.y, bottom: wall.y + wall.depth }), npc.id + ' overlaps wall');
    assert(!overlaps(foot, room.monumentLayoutV81.protectedAxis), npc.id + ' blocks the circulation axis');
    for (const point of room.points) assert(Math.abs(npc.x - point.x) >= 16 + body.halfWidth || Math.abs(npc.y - point.y) >= 10 + body.halfDepth, 'no NPC traps an existing service approach');
    // A fixed contextual actor has a clear bypass on at least one side, using
    // the same collision model that already floods every zone and service.
    assert([[48, 0], [-48, 0], [0, 32], [0, -32]].some(([dx, dy]) => api.isHomeworldInteriorWalkableV64(room, { x: npc.x + dx, y: npc.y + dy }, body)), npc.id + ' has no whole-body bypass');
  }
});

test('the runtime codex links each monument, actual passage, native addition and stationary inhabitant without fabricated services', () => {
  const records = api.HOMEWORLD_MONUMENT_INTERIOR_CODEX_V81;
  assert.equal(new Set(records.map(record => record.id)).size, records.length);
  for (const room of rooms) {
    const assembly = api.HOMEWORLD_CONTEXT_CODEX_V71.find(record => record.id === 'assembly-v71:' + room.buildingId);
    for (const record of records.filter(record => record.spaceId === room.buildingId)) {
      assert.equal(record.lore, 'original-adaptation'); assert(record.constraints.length >= 3);
      assert(assembly.associatedElementIds.includes(record.id), 'missing assembly association: ' + record.id);
      assert(api.HOMEWORLD_CONTEXT_CODEX_V71.some(candidate => candidate.id === record.id), 'record absent from runtime consumer');
      assert.notEqual(record.category, 'service');
    }
    for (const npc of room.monumentInhabitantsV81) {
      const record = records.find(record => record.id === 'npc:' + npc.id);
      assert.equal(record.asset, api.homeworldCivilianArtV72(npc.role).src);
      assert.deepEqual(record.footprint, { left: npc.x - 16, right: npc.x + 16, top: npc.y - 10, bottom: npc.y + 10 });
    }
  }
});

test('the five other principal rooms retain their prior fields byte-for-byte', () => {
  const rooms = api.HOMEWORLD_INTERIORS_V64.filter(room => ['market-armory', 'deep-forge', 'training-hall', 'clan-lodge', 'memory-vault'].includes(room.buildingId));
  const prior = rooms.map(room => { const copy = { ...room, furniture: room.furniture.filter(item => !item.id.endsWith('-v77-cntlip-table')) }; delete copy.orientedDecorV76; return copy; });
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(prior)).digest('hex'), '1d20d34589a448688f93318a009dde68faa89841df057848804ee5564e6e3be5');
});
