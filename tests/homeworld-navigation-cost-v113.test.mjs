import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

test('V113 a cold lift-to-steward request joins the coarse streets without a global fine-grid search', t => {
  const qa = homeworldSceneSsrV78();
  qa.load('app/game/systems/homeworldWayfindingV111.ts');
  const nav = qa.load('app/game/systems/homeworldNavigationV99.ts');
  const fine = qa.load('app/game/systems/homeworldNavigationV77.ts');
  const world = qa.load('app/game/systems/homeworldWorldV77.ts');
  const {HOMEWORLD_CARGO_V108: cargo} = qa.load('app/game/systems/homeworldCargoDefinitionV108.ts');
  const from = {...world.HOMEWORLD_CONNECTORS_V77.find(c => c.id === 'clan-lift').from.point};
  const to = {x: cargo.host.x, y: cargo.host.y + 55};
  const original = fine.homeworldWalkRouteV77, calls = [], endpoints = structuredClone({from, to});
  fine.homeworldWalkRouteV77 = (...args) => { calls.push(args); return original(...args); };
  try {
    const started = performance.now();
    const route = nav.homeworldWalkRouteV99('0', from, to);
    t.diagnostic(JSON.stringify({coldMs: performance.now() - started, globalFineCalls: calls.length, distance: route.distance, points: route.points.length}));
    assert.equal(route.status, 'reachable');
    assert.equal(calls.length, 0, 'a local connector exit must not restart the fine search across the whole city');
    assert.deepEqual(route.points[0], from); assert.deepEqual(route.points.at(-1), to);
    let measured = 0;
    for (let n = 1; n < route.points.length; n++) {
      assert(fine.homeworldRouteSegmentV77('0', route.points[n - 1], route.points[n]), 'every reconstructed edge keeps the native full-body sampler and clearance');
      measured += Math.hypot(route.points[n].x - route.points[n - 1].x, route.points[n].y - route.points[n - 1].y);
    }
    assert(Math.abs(route.distance - measured) < 1e-7);
    const expected = structuredClone(route);
    route.points[0].x = -9999; route.points.push({x: 0, y: 0});
    assert.deepEqual(nav.homeworldWalkRouteV99('0', from, to), expected);
    assert.deepEqual({from, to}, endpoints);
    assert.equal(calls.length, 0, 'cached copies do not introduce a hidden global retry');
  } finally {
    fine.homeworldWalkRouteV77 = original;
  }
});
