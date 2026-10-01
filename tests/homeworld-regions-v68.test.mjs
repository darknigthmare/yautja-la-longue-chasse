import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { access, readFile } from 'node:fs/promises';
import { regionGroundRouteV68 } from '../scripts/homeworld-region-navigation-v68.mjs';

const bundle = await build({ entryPoints: ['app/game/systems/homeworldRegionsV68.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const alive = { homeworld: { expeditions: { 'glass-desert': null } } };
function advanceTo(state, target) {
  let n = 0;
  for (; n < 25000 && Math.hypot(state.actor.x - target.x, state.actor.y - target.y) > 4; n++) {
    const dx = target.x - state.actor.x, dy = target.y - state.actor.y, vector = Math.hypot(dx / 330, dy / 260);
    state = api.stepHomeworldRegionV68(state, { x: dx / 330 / vector, y: dy / 260 / vector });
    if (state.pendingFieldEvent) { assert(api.normalizeRegionFieldEventV68(state.pendingFieldEvent)); assert(api.normalizeHomeworldRegionV68(state)); state = api.acknowledgeHomeworldRegionEventV68(state); }
  }
  assert(n < 25000, `Actual walking reaches the planned point: ${state.regionId} ${JSON.stringify(state.actor)} -> ${JSON.stringify(target)}`); return state;
}
function walk(state, target) {
  const points = regionGroundRouteV68(api, state.regionId, state.zone, state.actor, target, state.tick, state.buildingId);
  for (const point of points.slice(1)) state = advanceTo(state, point);
  assert(api.normalizeHomeworldRegionV68(state), 'Readback preserves walked state'); return state;
}
function action(state) {
  state = api.stepHomeworldRegionV68(state, { interact: true });
  if (state.pendingFieldEvent) { assert(api.normalizeRegionFieldEventV68(state.pendingFieldEvent)); assert(api.normalizeHomeworldRegionV68(state)); state = api.acknowledgeHomeworldRegionEventV68(state); }
  assert(api.normalizeHomeworldRegionV68(state)); return state;
}
function getSurvey(id) {
  let state = api.createHomeworldRegionV68(id, 'physical-qa', true), guide = api.HOMEWORLD_REGIONS_V68[id].residents[0];
  state = action(walk(state, { x: guide.x, y: guide.y + 95 })); assert(state.greeted.includes('guide'));
  for (const trace of api.HOMEWORLD_REGION_TRACES_V68) state = action(walk(state, trace));
  assert.equal(state.traces.length, 3); return state;
}
test('civilian routes preserve Blooded autonomy and reserve investigation restriction', () => {
  for (const id of api.HOMEWORLD_REGION_IDS_V68) assert.equal(api.canEnterHomeworldRegionV68(alive, id).allowed, id !== 'forbidden-reserve');
  assert.equal(api.canEnterHomeworldRegionV68({ ...alive, prologue: { chronicle: null } }, 'pillar-jungle').allowed, false);
  assert.equal(api.canEnterHomeworldRegionV68({ homeworld: { expeditions: { 'glass-desert': {} } } }, 'forbidden-reserve').allowed, true);
});
for (const id of api.HOMEWORLD_REGION_IDS_V68) test(`${id}: continuous returnable route, distinct inhabited village and twelve real doors`, async () => {
  const definition = api.HOMEWORLD_REGIONS_V68[id]; await access('public' + definition.panorama);
  let state = api.createHomeworldRegionV68(id, 'route-qa');
  for (const node of definition.route.slice(1)) state = walk(state, node);
  assert.equal(state.routeVisited.length, definition.route.length); assert(state.tick > 3300); assert(api.homeworldRegionRouteMetresV68(id) > 410);
  state = action(state); assert.equal(state.zone, 'village');
  for (const b of definition.buildings) {
    state = walk(state, { x: b.x, y: b.y + 70 }); assert.equal(api.homeworldRegionInteractionV68(state)?.id, b.id);
    state = action(state); assert.equal(state.zone, 'interior'); assert.equal(state.buildingId, b.id);
    for (const furniture of api.homeworldRegionInteriorPropsV68(b.id)) {
      assert.equal(api.isHomeworldRegionWalkableV68(id, 'interior', { x: furniture.x, y: furniture.y - 10 }, state.tick, b.id), false, `${b.id}: painted ${furniture.artId} cannot be crossed`);
    }
    state = walk(state, { x: 380, y: 310 }); assert.equal(api.homeworldRegionInteractionV68(state)?.kind, 'service');
    state = action(state); assert(api.regionInteractionDialogueV68(state, { kind: 'service', id: b.id, label: b.label }).length > 60);
    state = walk(state, api.HOMEWORLD_REGION_INTERIOR_V68.entry);
    state = action(state); assert.equal(state.zone, 'village');
  }
  assert.equal(state.visitedBuildings.length, 12); assert.equal(definition.residents.length, 12);
  state = action(walk(state, { x: 520, y: 2800 })); assert.equal(state.direction, 'return');
  for (const node of definition.route.slice(0, -1).reverse()) state = walk(state, node);
  state = action(state); assert.equal(state.status, 'at-city'); assert(api.normalizeHomeworldRegionV68(state));
});
test('layouts differ by physical plan, all native fauna sheets have complete living frames', async () => {
  const plans = new Set(api.HOMEWORLD_REGION_IDS_V68.map(id => JSON.stringify(api.HOMEWORLD_REGIONS_V68[id].buildings.map(b => [b.x, b.y])))); assert(plans.size >= 4);
  for (const art of Object.values(api.REGION_FAUNA_ART_V68)) { const p = await readFile('public' + art.src); assert.equal(p.readUInt32BE(16), 1536); assert.equal(p.readUInt32BE(20), 192); }
});
test('maintenance survey and repeated reports are generated only by walking to the guide and physical evidence', () => {
  let state = getSurvey('thermal-caves'); assert(state.eventReceipts.includes('survey'));
  const guide = api.HOMEWORLD_REGIONS_V68[state.regionId].residents[0]; state = action(walk(state, { x: guide.x, y: guide.y + 95 })); assert(state.reported); const firstTick = state.tick;
  state = action(state); assert(state.tick > firstTick); assert.equal(state.eventReceipts.filter(n => n === 'report').length, 1);
});
test('track observation is timed at safe range after three real traces; the original animal remains alive', () => {
  let state = getSurvey('ash-marches'); assert(!state.eventReceipts.includes('track'));
  state = walk(state, { x: 7100, y: 2050 });
  for (let i = 0; i < 100; i++) state = api.stepHomeworldRegionV68(state);
  assert(state.observedTicks >= 90); state = action(state); assert(state.eventReceipts.includes('track')); assert.equal(state.fauna.phase, 'quiet');
});
for (const id of api.REGION_CHALLENGE_IDS_V68) test(`${id}: three living charge/recovery cycles require real dodges and three distinct touches`, () => {
  let state = getSurvey(id); state = walk(state, { x: 7100, y: 2050 });
  for (let i = 0; i < 100; i++) state = api.stepHomeworldRegionV68(state);
  state = action(state); assert(state.eventReceipts.includes('track'));
  state = action(state); assert.equal(state.fauna.phase, 'warning');
  for (let round = 0; round < 3; round++) {
    const safeY = state.fauna.targetY > 2200 ? state.fauna.targetY - 220 : state.fauna.targetY + 220;
    state = walk(state, { x: 7100, y: safeY });
    for (let i = 0; state.fauna.phase !== 'recovery' && i < 350; i++) state = api.stepHomeworldRegionV68(state);
    assert.equal(state.fauna.phase, 'recovery'); assert(state.fauna.evaded >= round + 1);
    state = action(walk(state, { x: 6950, y: Math.min(2520, state.fauna.y + 100) }));
    assert.equal(state.fauna.touches, round + 1);
    if (round < 2) {
      state = action(state); assert.equal(state.fauna.touches, round + 1, 'Repeated input cannot claim a second touch in the same recovery');
      for (let i = 0; state.fauna.phase === 'recovery' && i < 180; i++) state = api.stepHomeworldRegionV68(state);
    }
  }
  assert.equal(state.fauna.phase, 'retreated'); assert(state.eventReceipts.includes('challenge')); assert(api.normalizeHomeworldRegionV68(state));
});
for (const id of api.REGION_WARD_IDS_V68) test(`${id}: two distinct physical beacons are fixed during warnings and a danger must be evaded`, () => {
  let state = getSurvey(id); state = walk(state, { x: 7100, y: 2050 });
  for (let i = 0; i < 100; i++) state = api.stepHomeworldRegionV68(state); state = action(state);
  for (const post of api.REGION_WARD_POSTS_V68) {
    state = walk(state, { x: post.x, y: post.y + 90 });
    for (let i = 0; api.regionHazardPhaseV68(state.tick) !== 'warning' && i < 360; i++) state = api.stepHomeworldRegionV68(state);
    state = action(state); assert(state.protectedPosts.includes(post.id));
  }
  state = walk(state, { x: 7500, y: 2160 });
  for (let i = 0; state.tick % 360 > 2 && i < 360; i++) state = api.stepHomeworldRegionV68(state);
  state = api.stepHomeworldRegionV68(state); assert(state.hazardArmed);
  state = walk(state, { x: 7410, y: 2530 });
  for (let i = 0; state.evaded < 1 && i < 200; i++) state = api.stepHomeworldRegionV68(state);
  if (state.pendingFieldEvent) state = action(state);
  assert.equal(state.protectedPosts.length, 2); assert(state.evaded >= 1); assert(state.eventReceipts.includes('ward')); assert(api.normalizeHomeworldRegionV68(state));
});
for (const id of ['thermal-caves', 'cold-crown', 'first-city-ruins', 'forbidden-reserve']) test(`${id}: physical cache recovery requires an observed danger, safe exit and a calm window`, () => {
  let state = getSurvey(id);
  if (id === 'cold-crown') { state = walk(state, { x: 7100, y: 2050 }); for (let i = 0; i < 100; i++) state = api.stepHomeworldRegionV68(state); state = action(state); }
  state = walk(state, { x: 7500, y: 2160 });
  for (let i = 0; state.tick % 360 > 2 && i < 360; i++) state = api.stepHomeworldRegionV68(state);
  state = api.stepHomeworldRegionV68(state); assert(state.hazardArmed);
  state = walk(state, { x: 7410, y: 2530 });
  for (let i = 0; state.evaded < 1 && i < 200; i++) state = api.stepHomeworldRegionV68(state);
  state = walk(state, { x: 7720, y: 2220 });
  for (let i = 0; api.regionHazardPhaseV68(state.tick) !== 'calm' && i < 360; i++) state = api.stepHomeworldRegionV68(state);
  state = action(state); assert(state.recovered, JSON.stringify({ id, interaction: api.homeworldRegionInteractionV68(state), evaded: state.evaded, receipts: state.eventReceipts, phase: api.regionHazardPhaseV68(state.tick), tick: state.tick })); assert(state.eventReceipts.includes('recover'));
});
test('malformed future, off-floor, false counts and mismatched receipt coordinates are rejected without reset', () => {
  const s = api.createHomeworldRegionV68('pillar-jungle');
  for (const bad of [{ ...s, version: 2 }, { ...s, tick: NaN }, { ...s, actor: { ...s.actor, x: 90000 } }, { ...s, traces: ['trail-3'] }, { ...s, observedTicks: 90 }, { ...s, reported: true }, { ...s, fauna: { ...s.fauna, touches: 3 } }]) assert.equal(api.normalizeHomeworldRegionV68(bad), null);
  assert.equal(api.canAdvanceHomeworldRegionV68(s, { ...s, tick: 1, walked: 900 }), false);
  assert.deepEqual(api.stepHomeworldRegionV68(s, { x: 1 }, true), s);
});
