import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ stdin: { contents: `
  export * from './app/game/systems/homeworldVillageOcclusionV70';
  export * from './app/game/systems/homeworldRegionsV68';
  export * from './app/game/systems/homeworldVillageLifeV69';
  export * from './app/game/systems/homeworldGeometryV64';
  export {defaultSave} from './app/game/save';
  export {default as Region} from './app/game/HomeworldRegionV68';
  export {default as Life} from './app/game/HomeworldVillageLifeV69';
`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' }, outfile: 'village-occlusion-v70-test.cjs', logLevel: 'silent' });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles.find(f => f.path.endsWith('.cjs')).text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const api = evaluated.exports;

test('painted roof occlusion respects rear depth, side openings, hero height and front ledges', () => {
  for (const id of api.HOMEWORLD_REGION_IDS_V68) {
    const b = api.HOMEWORLD_REGIONS_V68[id].buildings.at(-1), paint = api.villageBuildingPaintV70(b), d = api.HOMEWORLD_GEOMETRY_V64.depthScale;
    const actor = { x: b.x, y: Math.min(b.y - 150, (paint.top + paint.bottom) / 2 / d) };
    assert(api.villageFacadeFadedV70(b, actor, 82)); assert(api.villageFacadeFadedV70(b, actor, 100));
    assert(api.villagePaintOccludedV70([b], actor, actor), id + ': rear NPC support really lies in the painted roof');
    assert(!api.villagePaintOccludedV70([b], actor, actor, { isHero: true }), 'Hunter always remains visible');
    assert(!api.villagePaintOccludedV70([b], { x: b.x, y: b.y + 100 }, actor), 'An inhabitant in front is retained');
    assert(!api.villagePaintOccludedV70([b], { x: paint.right + 30, y: actor.y }, actor), 'No whole-building or whole-group culling');
    assert(!api.villagePaintOccludedV70([b], actor, actor, { depth: b.y + 1 }), 'Native facade objects assigned to a measured front ledge remain visible');
    assert(!api.villageFacadeFadedV70(b, { x: b.x, y: paint.top / d - 200 }, 82), 'A distant actor behind the building does not make its roof transparent');
    assert(!api.villageFacadeFadedV70(b, { x: b.x, y: b.y + 100 }, 82), 'Standing at a front doorway never fades a roof');
  }
});

test('actual Region JSX hides a rear NPC/prop, retains front and side props, and always renders the hero', () => {
  const id = 'ash-marches', definition = api.HOMEWORLD_REGIONS_V68[id], b = definition.buildings.at(-1);
  const state = api.createHomeworldRegionV68(id, 'v70-render-roof', true);
  state.actor = { ...state.actor, x: 3650, y: 2945 };
  assert(api.normalizeHomeworldRegionV68(state), 'Declared render fixture rests on existing real floor');
  assert(api.villageFacadeFadedV70(b, state.actor));
  const original = definition.props, paint = api.villageBuildingPaintV70(b);
  // Explicit rendering fixtures inside this test-only bundled module, not
  // injected browser play, production assets, actor movement or save evidence.
  definition.props = [...original,
    { id: 'qa-rear', artId: 'chest', x: state.actor.x, y: 2840 },
    { id: 'qa-front', artId: 'chest', x: b.x, y: b.y + 100 },
    { id: 'qa-side', artId: 'chest', x: paint.right + 30, y: state.actor.y },
  ];
  try {
    const markup = renderToStaticMarkup(React.createElement(api.Region, { save: api.defaultSave('2026-10-01T00:00:00.000Z'), regionId: id, checkpoint: state, onCheckpoint: () => true, onReachCity: () => true }));
    assert.doesNotMatch(markup, /data-region-resident="hunter-b"/, 'The observed rear hunter no longer appears through the faded roof');
    assert.doesNotMatch(markup, /data-homeworld-prop-id="ash-marches-qa-rear"/);
    assert.match(markup, /data-homeworld-prop-id="ash-marches-qa-front"/);
    assert.match(markup, /data-homeworld-prop-id="ash-marches-qa-side"/);
    assert.match(markup, /data-region-player="(?:true|)"/, 'The hero is not removed with inhabitants or scenery');
    assert.match(markup, /data-region-resident="watcher-a"/, 'A separate local resident is not hidden as part of a group');
    assert.deepEqual(api.normalizeHomeworldRegionV68(state), state, 'Rendering changed no checkpoint field');
  } finally { definition.props = original; }
});

test('actual V69 life JSX applies the same painted-depth filter to individually rendered residents and native props', () => {
  const regionId = 'ash-marches', actor = { x: 3650, y: 2900 }, tick = 0, life = api.HOMEWORLD_VILLAGE_LIFE_V69[regionId], buildings = api.HOMEWORLD_REGIONS_V68[regionId].buildings;
  const markup = renderToStaticMarkup(React.createElement(api.Life, { regionId, actor, tick, actorHeight: 82, rect: { left: -1000, top: -1000, right: 10000, bottom: 10000 } }));
  for (const n of life.residents) {
    const pose = api.homeworldVillageResidentPoseV69(regionId, n, tick, actor), hidden = api.villagePaintOccludedV70(buildings, pose, actor, { actorHeight: 82 });
    assert.equal(markup.includes('data-region-village-resident-v69="' + n.id + '"'), !hidden, n.id + ' is sorted as its own body');
  }
  for (const p of life.props) {
    const hidden = api.villagePaintOccludedV70(buildings, p, actor, { depth: p.depth, actorHeight: 82 });
    assert.equal(markup.includes('data-homeworld-prop-id="' + p.id + '"'), !hidden, p.id + ' respects its measured front-ledge depth');
  }
  assert(markup.includes('data-region-village-resident-v69='), 'Occlusion never hides the whole village population');
});
