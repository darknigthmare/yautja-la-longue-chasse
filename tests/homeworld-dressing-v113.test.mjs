import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78(), load = name => qa.load('app/game/systems/' + name + '.ts');
const world = load('homeworldWorldV77'), civic = load('homeworldCivicWorldV80'), geo = load('homeworldGeometryV64'), city = load('homeworldCity');
const mount = load('homeworldDressingMountV113'), dressing = load('homeworldDressingV113');
const court = load('homeworldCourtArtV80'), comp = load('homeworldStreetCompositionV92'), layout = load('homeworldUrbanLayoutV78');
const facadesV78 = load('homeworldUrbanFacadesV78').HOMEWORLD_URBAN_FACADES_V78;
const authored = JSON.parse(fs.readFileSync('app/game/data/homeworldDressingV113.json', 'utf8'));
const input = mount.HOMEWORLD_DRESSING_INPUT_V113;
const fixtures = dressing.HOMEWORLD_DRESSING_FIXTURES_V113, places = dressing.HOMEWORLD_DRESSING_PLACES_V113, facades = dressing.HOMEWORLD_DRESSING_FACADES_V113;
const solids = [
  ...fixtures.map(item => ({kind: 'fixture', item, polygon: dressing.homeworldDressingFixturePolygonV113(item)})),
  ...places.map(item => ({kind: 'place', item, polygon: dressing.homeworldDressingPlacePolygonV113(item)})),
  ...facades.map(item => ({kind: 'facade', item, polygon: dressing.homeworldDressingFacadePolygonV113(item)})),
];
const center = polygon => ({x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length, y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length});
const inside = (p, poly) => {let s = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const a = poly[i], b = poly[j];
  if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) s = !s;} return s;};

test('V113 dressing reuses existing sources only, with unique ids, a group and a stated use for every instance', () => {
  assert(fixtures.length >= 150 && places.length >= 10 && facades.length >= 8, 'a substantial pass, not a token one');
  const ids = new Set([...fixtures, ...places, ...facades].map(item => item.id));
  assert.equal(ids.size, fixtures.length + places.length + facades.length);
  for (const id of ids) assert(id.startsWith('dressing-v113:'), id);
  const groups = new Set(authored.groups.map(g => g.id));
  for (const item of fixtures) {
    assert(court.HOMEWORLD_COURT_ART_V80[item.artId], item.id + ' court source exists');
    assert(item.groupId === 'facade-front' || groups.has(item.groupId), item.id + ' belongs to an authored group');
    assert(item.purpose && item.label && item.function, item.id + ' states its use');
    assert.equal(item.provenance, 'LORE_COMPATIBLE_ORIGINAL');
  }
  for (const item of places) {
    assert(comp.HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId], item.id + ' V92 source exists');
    assert(groups.has(item.compositionId), item.id + ' belongs to an authored group');
  }
  for (const facade of facades) {
    const source = world.HOMEWORLD_BUILDINGS_V77.find(b => b.id === facade.sourceBuildingId);
    assert(source, facade.id + ' source building');
    assert.equal(facade.art, source.art, 'same native drawing');
    assert.deepEqual(facade.footprint, source.footprint, 'same footprint: no shrunken copy');
    assert.equal(facade.width, source.width); assert.equal(facade.wallHeight, source.wallHeight);
    assert.equal(facade.interactive, false);
    assert(!world.HOMEWORLD_BUILDINGS_V77.some(b => b.id === facade.id), 'a closed facade is not a visitable building');
  }
  assert.equal(world.HOMEWORLD_BUILDINGS_V77.length, 43, 'no visitable building, room or service is added');
});

test('every V92-art place is admitted by the unchanged V92 compiler, and recompiling is stable', () => {
  assert.deepEqual(dressing.HOMEWORLD_DRESSING_PLACE_REFUSALS_V113, []);
  assert.equal(places.length, dressing.HOMEWORLD_DRESSING_PLACE_CANDIDATES_V113.length);
  const repeat = comp.compileHomeworldStreetCompositionV92(input, dressing.HOMEWORLD_DRESSING_PLACE_CANDIDATES_V113);
  assert.deepEqual(repeat.accepted.map(i => i.id), places.map(i => i.id));
});

test('every contact stands on supported ground, outside every reserve and older solid, without overlapping another', () => {
  for (const {item, polygon} of solids) {
    for (const p of polygon) assert(input.terrain(item.levelId, p, {halfWidth: 0, halfDepth: 0}), item.id + ' supported vertex');
    for (const r of input.reserves) if (r.levelId === item.levelId && !r.id.startsWith('dressing-v113-')) assert(!layout.homeworldUrbanOverlapV78(polygon, r.polygon), item.id + ' overlaps reserve ' + r.id);
    const b = {l: Math.min(...polygon.map(p => p.x)), r: Math.max(...polygon.map(p => p.x)), t: Math.min(...polygon.map(p => p.y)), u: Math.max(...polygon.map(p => p.y))};
    for (let x = b.l; x <= b.r; x += 12) for (let y = b.t; y <= b.u; y += 12) if (inside({x, y}, polygon))
      assert.equal(input.collision(item.levelId, {x, y}, {halfWidth: 12, halfDepth: 12}), null, item.id + ' keeps the 12u admission margin');
  }
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++)
    if (solids[i].item.levelId === solids[j].item.levelId) assert(!layout.homeworldUrbanOverlapV78(solids[i].polygon, solids[j].polygon), solids[i].item.id + ' overlaps ' + solids[j].item.id);
});

test('dressing is solid for the real motor on its own floor only, and a closed facade cannot be entered', () => {
  for (const {kind, item, polygon} of solids) {
    const at = center(polygon), hit = world.homeworldCollisionV77(item.levelId, at, {halfWidth: 0, halfDepth: 0});
    assert.equal(hit?.id, item.id, item.id + ' collides');
    assert.equal(hit.kind, kind === 'facade' ? 'building' : 'prop');
    assert.equal(civic.homeworldCivicWalkableV80(item.levelId, at), false);
    for (const level of world.HOMEWORLD_LEVELS_V77) if (level.id !== item.levelId) assert.notEqual(dressing.homeworldDressingCollisionV113(level.id, at)?.id, item.id);
  }
  for (const facade of facades) {
    const door = geo.homeworldBuildingDoorwayV64(facade);
    assert(dressing.homeworldDressingCollisionV113(facade.levelId, {x: door.threshold.x, y: door.threshold.y - 30}), facade.id + ' painted door stays closed');
  }
});

test('door corridors, interaction points and connector ends keep their clearance', () => {
  const doors = [...world.HOMEWORLD_BUILDINGS_V77, ...facadesV78];
  for (const {item} of solids) {
    const touches = p => dressing.homeworldDressingCollisionV113(item.levelId, p, {halfWidth: 45, halfDepth: 45})?.id === item.id;
    for (const b of doors.filter(b => b.levelId === item.levelId)) {
      const d = geo.homeworldBuildingDoorwayV64(b), dx = d.approach.x - d.threshold.x, dy = d.approach.y - d.threshold.y, len = Math.hypot(dx, dy) || 1;
      const far = {x: d.approach.x + dx / len * 120, y: d.approach.y + dy / len * 120}, n = Math.ceil(Math.hypot(far.x - d.threshold.x, far.y - d.threshold.y) / 4);
      for (let k = 0; k <= n; k++) assert(!touches({x: d.threshold.x + (far.x - d.threshold.x) * k / n, y: d.threshold.y + (far.y - d.threshold.y) * k / n}), item.id + ' occupies door approach ' + b.id);
    }
    const ends = [...world.HOMEWORLD_POINTS_V77.filter(p => p.levelId === item.levelId), ...world.HOMEWORLD_CONNECTORS_V77.flatMap(c => [c.from, c.to]).filter(e => e.levelId === item.levelId).map(e => e.point)];
    for (const p of ends) assert(!dressing.homeworldDressingCollisionV113(item.levelId, p, {halfWidth: 60, halfDepth: 60}), item.id + ' crowds ' + JSON.stringify(p));
  }
});

test('the public guide still reaches every door, region and connector from the port spawn', () => {
  const nav = load('homeworldNavigationV77'), from = {levelId: '0', point: world.HOMEWORLD_SPACEPORT_V77.spawn};
  const targets = [...world.HOMEWORLD_BUILDINGS_V77.map(b => ({id: b.id, levelId: b.levelId, point: geo.homeworldBuildingDoorwayV64(b).approach})),
    ...world.HOMEWORLD_POINTS_V77.filter(p => p.regionId).map(p => {const a = world.homeworldWorldArrivalV77(p.regionId); return {id: p.regionId, levelId: a.levelId, point: {x: a.actor.x, y: a.actor.y}};}),
    ...world.HOMEWORLD_CONNECTORS_V77.map(c => ({id: c.id, ...c.to}))];
  for (const item of places) {const usage = comp.homeworldStreetCompositionUsageV92(item); if (usage) targets.push({id: item.id + ':work-face', levelId: item.levelId, point: center(usage)});}
  const unreachable = targets.filter(t => nav.homeworldWorldRouteV77(from, t).status !== 'reachable').map(t => t.id);
  assert.deepEqual(unreachable, []);
});

test('no dressing sprite is hidden by a building or closed facade painted after it', async () => {
  const alpha = new Map(), alphaOf = src => {if (!alpha.has(src)) alpha.set(src, sharp('public' + src).ensureAlpha().raw().toBuffer({resolveWithObject: true})); return alpha.get(src);};
  const painters = [...world.HOMEWORLD_BUILDINGS_V77, ...facadesV78, ...facades];
  for (const [item, art] of [...fixtures.map(f => [f, court.HOMEWORLD_COURT_ART_V80[f.artId]]), ...places.map(p => [p, comp.HOMEWORLD_STREET_COMPOSITION_ART_V92[p.artId]])]) {
    const p = geo.homeworldProjectGroundV64(item, world.homeworldLevelV77(item.levelId).elevation), s = art.heightWorld * item.scale / art.alphaBounds.height;
    const box = {left: p.x + (art.alphaBounds.x - art.pivot.x) * s, top: p.y + (art.alphaBounds.y - art.pivot.y) * s, width: art.alphaBounds.width * s, height: art.alphaBounds.height * s};
    for (const b of painters) {
      if (b.levelId !== item.levelId || !(item.y < city.homeworldBuildingRenderDepthV76(b, item))) continue;
      const place = geo.homeworldBuildingSpritePlacementV64(b), top = place.top - world.homeworldLevelV77(b.levelId).elevation;
      if (box.left > place.left + place.width || box.left + box.width < place.left || box.top > top + place.height || box.top + box.height < top) continue;
      const a = b.art, rect = a.sourceRect ?? {x: 0, y: 0, width: a.sourceWidth, height: a.sourceHeight}, scale = place.width / rect.width, {data, info} = await alphaOf(a.src);
      let opaque = 0;
      for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 10; gx++) {
        const sx = box.left + (gx + .5) / 10 * box.width, sy = box.top + (gy + .5) / 10 * box.height;
        const px = Math.floor(rect.x + (sx - place.left) / scale * (info.width / a.sourceWidth)), py = Math.floor(rect.y + (sy - top) / scale * (info.height / a.sourceHeight));
        if (px >= 0 && py >= 0 && px < info.width && py < info.height && data[(py * info.width + px) * info.channels + 3] > 40) opaque++;
      }
      assert(opaque < 25, item.id + ' hidden behind ' + b.id + ' (' + opaque + '%)');
    }
  }
});

test('the World scene paints every dressing instance and facade on its own floor', () => {
  for (const level of world.HOMEWORLD_LEVELS_V77) {
    const html = qa.render('app/game/HomeworldWorldSceneV77.tsx', {actor: {x: -9999, y: -9999}, levelId: level.id, camera: {x: -4000, y: -4000, viewWidth: 20000, viewHeight: 20000},
      seconds: 0, activeDoorId: null, activePointId: null, reducedMotion: true});
    for (const item of [...fixtures, ...places].filter(i => i.levelId === level.id)) assert(html.includes('data-homeworld-prop-id="' + item.id + '"'), item.id + ' painted on ' + level.id);
    for (const facade of facades.filter(f => f.levelId === level.id)) {
      const tag = html.match(new RegExp('<div[^>]*data-building-id="' + facade.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>'))?.[0];
      assert(tag, facade.id + ' painted'); assert(tag.includes('data-building-decoration-v113="CLOSED_SCENERY_FACADE"') && !tag.includes('data-building-decoration-v78='));
    }
  }
});
