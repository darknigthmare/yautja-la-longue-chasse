import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworldVillageActivitiesV70';export * from './app/game/systems/homeworldVillageRoutesV70';export * from './app/game/systems/homeworldRegionsV68';export * from './app/game/systems/homeworldGeometryV64';export * from './app/game/systems/homeworldArtV64';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function advance(state, target) {
  for (let count = 0; count < 18000; count++) {
    const dx = target.x - state.actor.x, dy = target.y - state.actor.y;
    if (Math.hypot(dx, dy) < 4) return state;
    const length = Math.hypot(dx / 330, dy / 260);
    state = api.stepHomeworldRegionV68(state, { x: dx / 330 / length, y: dy / 260 / length });
  }
  throw Error('Physical walking cannot reach ' + JSON.stringify(target));
}
function walk(state, target) {
  const route = api.villageGroundRouteV70(state.regionId, state.actor, target);
  assert(route, 'The actual local atlas finds a supported route');
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 20));
    for (let n = 1; n <= count; n++) {
      const p = { x: a.x + (b.x - a.x) * n / count, y: a.y + (b.y - a.y) * n / count };
      assert(api.isHomeworldRegionWalkableV68(state.regionId, 'village', p, state.tick), 'Every atlas segment has whole-body support');
      state = advance(state, p);
    }
  }
  assert(api.normalizeHomeworldRegionV68(state), 'The real walk still produces a V68 checkpoint');
  return { state, route };
}

for (const id of api.HOMEWORLD_REGION_IDS_V68) {
  test(`${id}: all four local gestures require a physical approach and leave field proof unchanged`, () => {
    let state = api.createHomeworldRegionV68(id, 'v70-local-' + id, true), session = api.createVillageActivitySessionV70(state.runId);
    const activities = api.HOMEWORLD_VILLAGE_ACTIVITIES_V70[id];
    assert.equal(activities.length, 4); assert.equal(new Set(activities.map(a => a.kind)).size, 4);
    for (const a of activities) {
      state = walk(state, a.approach).state;
      assert.equal(api.homeworldRegionInteractionV68(state), null, 'A station never steals an old doorway, witness or field interaction');
      assert.equal(api.nearestVillageActivityV70(id, state.actor)?.id, a.id);
      const untouched = structuredClone(state), before = structuredClone(session);
      assert.strictEqual(api.stepVillageActivityV70(session, state, a.id, a.sequence[0], false), session, 'Suspend, quota failure or unavailable art blocks a local action');
      assert.strictEqual(api.stepVillageActivityV70({ ...session, runId: 'old-run' }, state, a.id, a.sequence[0], true).progress, session.progress, 'A different run cannot reuse local preparation');
      const wrong = (a.sequence[0] + 1) % 3;
      session = api.stepVillageActivityV70(session, state, a.id, wrong, true);
      assert.equal(session.progress[a.id], before.progress[a.id] ?? 0, 'Wrong choice does not advance');
      for (const choice of a.sequence) session = api.stepVillageActivityV70(session, state, a.id, choice, true);
      assert.equal(session.progress[a.id], 3);
      assert.strictEqual(api.stepVillageActivityV70(session, state, a.id, a.sequence[0], true), session, 'Repeat is idempotent');
      assert.deepEqual(state, untouched, 'Local gestures cannot alter the checkpoint, rank, inventory or proof');
      const far = { ...state, actor: { ...state.actor, x: state.actor.x + 400 } };
      assert.strictEqual(api.stepVillageActivityV70(api.createVillageActivitySessionV70(state.runId), far, a.id, a.sequence[0], true).progress[a.id], undefined, 'Remote clicking grants no activity progress');
      const pending = { ...state, pendingFieldEvent: { action: 'survey' } };
      assert.strictEqual(api.stepVillageActivityV70(session, pending, a.id, 0, true), session, 'Pending durable field proof is never bypassed');
      const phase = api.villageActivitySceneV70(a, 300, 1);
      assert.deepEqual(api.villageActivitySceneV70(a, 300, 1), phase, 'Frozen tick freezes scene signals');
      assert.notEqual(api.villageActivitySceneV70(a, 450, 1).phase, phase.phase, 'Live tick actually changes the reused scene signal');
    }
    assert.deepEqual(state.eventReceipts, []); assert.deepEqual(state.traces, []); assert.deepEqual(state.greeted, []);
    assert.deepEqual(api.normalizeHomeworldRegionV68(state), state, 'No V70 session field leaks into a checkpoint');
    assert.deepEqual(api.createVillageActivitySessionV70(state.runId).progress, {}, 'Cold reload starts a new civilian practice session');
  });
  test(`${id}: eighteen atlas destinations preserve all twelve usable doors and original paths`, () => {
    let state = api.createHomeworldRegionV68(id, 'v70-atlas-' + id, true);
    const destinations = api.villageDestinationsV70(id);
    assert.equal(destinations.length, 18); assert.equal(new Set(destinations.map(d => d.id)).size, 18);
    for (const target of destinations) {
      const result = walk(state, target); state = result.state;
      const remaining = api.villageRouteRemainingV70(result.route, state.actor);
      assert(remaining.arrived); assert(remaining.metres <= 1);
      if (target.kind === 'door') assert.equal(api.homeworldRegionInteractionV68(state)?.id, target.id.slice(5), 'Manual atlas guidance reaches the original native door');
    }
    assert.deepEqual(state.eventReceipts, []); assert.deepEqual(state.visitedBuildings, [], 'Atlas guidance cannot itself open a door');
  });
}

test('native coffrets share a measured tabletop, uniform scale and existing solid footprint', () => {
  for (const id of api.HOMEWORLD_REGION_IDS_V68) for (const activity of api.HOMEWORLD_VILLAGE_ACTIVITIES_V70[id]) for (const progress of [0, 1, 2, 3]) {
    const loads = api.villageActivityLoadsV70(activity, progress);
    assert.equal(loads.length, activity.kind === 'sort' ? 3 : 0);
    for (const p of loads) {
      const table = api.HOMEWORLD_PROP_ART_V64.table;
      assert(p.x - p.footprint.width / 2 >= activity.station.x - table.footprintWorld.width / 2);
      assert(p.x + p.footprint.width / 2 <= activity.station.x + table.footprintWorld.width / 2);
      assert(p.y - p.footprint.depth >= activity.station.y - table.footprintWorld.depth && p.y <= activity.station.y);
      assert.equal(p.altitude, table.physicalHeightWorldEstimate); assert.equal(p.depth, activity.station.y + 1);
      assert.equal(p.heightWorld, 12); assert.equal(p.supportId, 'place-table');
    }
  }
});
test('the atlas returns a refusal for unsupported targets rather than moving through a wall', () => {
  const b = api.HOMEWORLD_REGIONS_V68['ash-marches'].buildings[0], start = api.createHomeworldRegionV68('ash-marches', 'v70-refusal', true).actor;
  assert.equal(api.villageGroundRouteV70('ash-marches', start, { x: b.x, y: b.y - 70 }), null);
  assert.equal(api.villageGroundRouteV70('ash-marches', start, { x: -500, y: 900 }), null);
});
test('runtime local services preserve youth rendering and never call the contract acknowledgement callback', async () => {
  const source = await readFile('app/game/HomeworldRegionV68.tsx', 'utf8');
  assert.match(source, /youthWelcome \? HOMEWORLD_YOUTH_PLATE_V69 : homeworldHeroPlate/);
  assert.match(source, /youthWelcome \? HOMEWORLD_YOUTH_PLATE_V69\.physicalHeight : 100/);
  assert.match(source, /contractsValue\?: unknown/); assert.match(source, /contractRegionNarrativesV70\(props\.contractsValue/);
  assert.match(source, /interact: !activity && !villageResident/);
  const choices = source.slice(source.indexOf('data-village-activity-choice-v70'), source.indexOf('data-village-service-route-v70'));
  assert.match(choices, /stepVillageActivityV70/); assert.doesNotMatch(choices, /onFieldEvent|onCheckpoint|greeted|eventReceipts/);
});
