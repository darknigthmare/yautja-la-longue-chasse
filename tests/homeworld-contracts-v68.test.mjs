import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ stdin: { contents: `
export * from './app/game/systems/homeworldContractsV68';
export {HOMEWORLD_REGIONS_V68,HOMEWORLD_REGION_TRACES_V68} from './app/game/systems/homeworldRegionsV68';
export {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64} from './app/game/systems/homeworldInteriorsV64';
export {default as Panel,HomeworldContractsJournalV68 as Journal} from './app/game/HomeworldContractsV68';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node',
external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' }, outfile: 'contracts-v68-test.cjs', logLevel: 'silent' });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles.find(item => item.path.endsWith('.cjs')).text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const api = evaluated.exports;
const contract = id => api.HOMEWORLD_CONTRACTS_V68.find(item => item.id === id);
const where = (definition, overrides = {}) => {
  const room = api.homeworldInteriorForBuildingV64(definition.buildingId);
  const point = room.points.find(item => item.pointId === definition.pointId);
  return { eligible: true, interiorId: room.buildingId, pointId: point.pointId, npcId: definition.giverNpcId,
    actor: { x: point.x, y: point.y + 45 }, suspended: false, ...overrides };
};
const apply = (state, id, kind, context) => api.applyHomeworldContractV68(state, { contractId: id, kind }, context ?? where(contract(id)));
const fieldActor = (regionId, action) => action === 'survey' ? { x: api.HOMEWORLD_REGION_TRACES_V68[2].x, y: api.HOMEWORLD_REGION_TRACES_V68[2].y }
  : action === 'recover' ? { x: 7720, y: 2220 }
  : action === 'report' ? { x: api.HOMEWORLD_REGIONS_V68[regionId].residents[0].x, y: api.HOMEWORLD_REGIONS_V68[regionId].residents[0].y + 45 }
  : { x: 7450, y: 2050 };
const fieldEvent = (regionId, action, overrides = {}) => ({ version: 1, regionId, runId: 'village-fresh-1', tick: 1500,
  action, siteId: `${regionId}-${action === 'survey' ? 'trail-3' : action === 'recover' ? 'cache' : action === 'report' ? 'guide' : action}`,
  targetId: `${regionId}-${action === 'survey' ? 'trail' : action === 'report' ? 'guide' : action === 'track' || action === 'challenge' ? 'fauna' : 'relay'}`,
  walked: 2300, actor: fieldActor(regionId, action), trailCount: 3, evaded: 2, armed: false,
  observedTicks: 90, touches: 3, interventions: 2, ...overrides });
const recordEvent = (state, event, overrides = {}) => api.recordContractsFieldEventV68(state, event,
  { regionId: event.regionId, runId: event.runId, suspended: false, ...overrides });
const accepted = id => apply(undefined, id, 'accept').state;
const ready = (id, initial = accepted(id)) => {
  let state = initial;
  for (const [index, objective] of contract(id).objectives.entries()) {
    const runId = `village-fresh-${index + 1}`;
    state = api.bindContractsVillageRunV68(state, objective.regionId, runId).state;
    const proof = fieldEvent(objective.regionId, objective.action, { runId });
    state = recordEvent(state, proof).state;
    state = recordEvent(state, fieldEvent(objective.regionId, 'report', { runId, tick: proof.tick + 300 })).state;
  }
  return state;
};

test('old saves and historical expedition reports never create accepted contracts or marks', () => {
  assert.deepEqual(api.normalizeHomeworldContractsV68(undefined), { version: 1, serial: 0, entries: [] });
  const event = fieldEvent('ash-marches', 'track');
  assert.equal(recordEvent(undefined, event).changed, false);
  assert.equal(api.contractMarksV68({ expeditions: { 'ash-marches': { done: true } } }), 0);
  assert.equal(api.homeworldContractsJournalV68(undefined).active.length, 0);
});

test('all twenty terrain requests and four personal missions can be taken at their real room giver', () => {
  assert.equal(api.HOMEWORLD_BOARD_CONTRACTS_V68.length, 20);
  assert.equal(api.HOMEWORLD_NPC_CONTRACTS_V68.length, 4);
  for (const regionId of api.CONTRACT_REGIONS_V68) assert.equal(api.HOMEWORLD_BOARD_CONTRACTS_V68.filter(item => item.objectives[0].regionId === regionId).length, 2);
  for (const definition of api.HOMEWORLD_CONTRACTS_V68) {
    const context = where(definition), room = api.homeworldInteriorForBuildingV64(context.interiorId);
    assert.equal(api.isHomeworldInteriorWalkableV64(room, context.actor), true, definition.id);
    assert.equal(api.canMeetContractGiverV68(definition, context), true, definition.id);
    assert.equal(apply(undefined, definition.id, 'accept').ok, true, definition.id);
  }
});

test('no menu, old outside socket, wrong giver, blocked actor or suspended scene can accept or pay', () => {
  const id = 'ash-marches-track', definition = contract(id), completeField = ready(id), context = where(definition);
  const bad = [{ interiorId: null }, { interiorId: 'deep-forge' }, { npcId: 'forge-artisan' }, { pointId: 'forge-service' },
    { actor: { x: 1600, y: 1970 } }, { actor: { x: NaN, y: context.actor.y } },
    { actor: { x: context.actor.x, y: context.actor.y - 45 } }, { eligible: false }, { suspended: true }];
  for (const override of bad) {
    assert.equal(apply(undefined, id, 'accept', { ...context, ...override }).changed, false);
    const result = apply(completeField, id, 'deliver', { ...context, ...override });
    assert.equal(result.changed, false); assert.equal(result.rewardMarks, 0);
  }
});

test('a new departure binding after acceptance is mandatory; reports, different runs and pauses never fake progress', () => {
  const id = 'ash-marches-track', state = accepted(id), proof = fieldEvent('ash-marches', 'track');
  assert.equal(recordEvent(state, proof).changed, false);
  const bound = api.bindContractsVillageRunV68(state, proof.regionId, proof.runId).state;
  assert.equal(recordEvent(bound, { ...proof, runId: 'historical-run' }).changed, false);
  assert.equal(recordEvent(bound, proof, { runId: 'other-live-run' }).ok, false);
  assert.equal(recordEvent(bound, proof, { suspended: true }).ok, false);
  assert.equal(recordEvent(bound, fieldEvent('ash-marches', 'report')).changed, false);
  assert.equal(apply(bound, id, 'deliver').rewardMarks, 0);
  assert.equal(apply(bound, id, 'deliver').ok, false);
});

test('tracking, warding, recovery and challenges require the corresponding performed gameplay', () => {
  const checks = [
    ['ash-marches', 'track', { observedTicks: 89 }], ['ash-marches', 'challenge', { touches: 2 }],
    ['ash-marches', 'challenge', { evaded: 1 }], ['pillar-jungle', 'ward', { interventions: 1 }],
    ['pillar-jungle', 'ward', { evaded: 0 }], ['thermal-caves', 'recover', { evaded: 0 }],
    ['thermal-caves', 'survey', { trailCount: 2 }],
  ];
  for (const [regionId, action, invalid] of checks) {
    const id = `${regionId}-${action}`, state = api.bindContractsVillageRunV68(accepted(id), regionId, 'village-fresh-1').state;
    assert.equal(recordEvent(state, fieldEvent(regionId, action, invalid)).ok, false, id);
    assert.equal(recordEvent(state, fieldEvent(regionId, action)).changed, true, id);
  }
});

test('bad target, incomplete movement, nonfinite counters and premature guide report remain uncredited', () => {
  const id = 'ash-marches-track', acceptedState = accepted(id), base = fieldEvent('ash-marches', 'track');
  const bound = api.bindContractsVillageRunV68(acceptedState, base.regionId, base.runId).state;
  for (const override of [{ siteId: 'anywhere' }, { targetId: 'captive-civilian' }, { armed: true }, { walked: 399 },
    { walked: Infinity }, { tick: -1 }, { trailCount: 99 }, { observedTicks: NaN }, { actor: { x: Infinity, y: 100 } },
    { actor: { x: 400, y: 3000 } }, { walked: 60000 }, { version: 2 }]) {
    const source = structuredClone(bound);
    const result = recordEvent(bound, { ...base, ...override });
    assert.equal(result.changed, false); assert.deepEqual(bound, source);
  }
  const observed = recordEvent(bound, base).state;
  assert.equal(recordEvent(observed, fieldEvent('ash-marches', 'report', { tick: base.tick })).changed, false);
  assert.equal(apply(observed, id, 'deliver').changed, false);
  assert.equal(api.contractMarksV68(observed), 0);
});

test('the guide confirms a later physical return, then the original giver pays exactly once', () => {
  const id = 'ash-marches-challenge', state = ready(id), original = structuredClone(state);
  assert.equal(api.homeworldContractsJournalV68(state).active[0].ready, true);
  const paid = apply(state, id, 'deliver');
  assert.equal(paid.ok, true); assert.equal(paid.rewardMarks, contract(id).rewardMarks);
  assert.equal(api.contractMarksV68(paid.state), contract(id).rewardMarks);
  assert.deepEqual(state, original);
  for (const action of ['deliver', 'accept', 'resume', 'abandon']) {
    const again = apply(paid.state, id, action);
    assert.equal(again.changed, false); assert.equal(again.rewardMarks, 0); assert.deepEqual(again.state, paid.state);
  }
});

test('abandon and resume invalidate previous run proofs while keeping an explicit journal record', () => {
  const id = 'glass-desert-challenge', prepared = ready(id);
  const abandoned = apply(prepared, id, 'abandon').state;
  assert.equal(abandoned.entries[0].status, 'abandoned');
  assert.equal(api.homeworldContractsJournalV68(abandoned).active.length, 0);
  assert.equal(recordEvent(abandoned, fieldEvent('glass-desert', 'challenge')).changed, false);
  const resumed = apply(abandoned, id, 'resume').state;
  assert.equal(resumed.entries[0].acceptanceSerial, 2);
  assert.deepEqual(resumed.entries[0].stages, [{ regionId: 'glass-desert', runId: null, proof: null, reportTick: null }]);
  assert.equal(apply(resumed, id, 'deliver').changed, false);
  assert.equal(recordEvent(resumed, fieldEvent('glass-desert', 'challenge')).changed, false);
});

test('four personal missions require both different regions and a return to their own person', () => {
  for (const definition of api.HOMEWORLD_NPC_CONTRACTS_V68) {
    const started = accepted(definition.id), first = definition.objectives[0];
    let partial = api.bindContractsVillageRunV68(started, first.regionId, 'village-first-1').state;
    partial = recordEvent(partial, fieldEvent(first.regionId, first.action, { runId: 'village-first-1' })).state;
    partial = recordEvent(partial, fieldEvent(first.regionId, 'report', { runId: 'village-first-1', tick: 1800 })).state;
    assert.equal(apply(partial, definition.id, 'deliver').changed, false);
    assert.equal(api.homeworldContractsJournalV68(partial).active[0].completedStages, 1);
    const fulfilled = ready(definition.id, partial);
    assert.equal(apply(fulfilled, definition.id, 'deliver', where(contract('ash-marches-track'))).changed, false);
    assert.equal(apply(fulfilled, definition.id, 'deliver').rewardMarks, definition.rewardMarks);
  }
});

test('future versions, duplicate ledger entries and invented completion cannot authorize new saves or marks', () => {
  const complete = apply(ready('ash-marches-track'), 'ash-marches-track', 'deliver').state;
  const unfinished = accepted('ash-marches-track');
  const corrupted = [null, [], { version: api.HOMEWORLD_CONTRACT_SCHEMA_VERSION_V69 + 1, serial: 1, entries: [] }, { ...complete, entries: [...complete.entries, complete.entries[0]] },
    { ...complete, serial: Infinity }, { ...unfinished, entries: [{ ...unfinished.entries[0], status: 'completed' }] },
    { ...complete, entries: [{ ...complete.entries[0], stages: [{ ...complete.entries[0].stages[0], reportTick: 1 }] }] }];
  for (const state of corrupted) {
    assert.equal(api.isHomeworldContractsV68(state), false); assert.equal(api.contractMarksV68(state), 0);
    assert.equal(apply(state, 'glass-desert-track', 'accept').changed, false);
    assert.equal(api.bindContractsVillageRunV68(state, 'glass-desert', 'valid-new-run').changed, false);
    assert.equal(recordEvent(state, fieldEvent('ash-marches', 'track')).changed, false);
  }
});

test('a mid-run save round trip preserves proofs, and restarting an unfinished run discards its old guide receipt', () => {
  const id = 'ash-marches-track', event = fieldEvent('ash-marches', 'track');
  let state = api.bindContractsVillageRunV68(accepted(id), event.regionId, event.runId).state;
  state = recordEvent(state, event).state;
  assert.deepEqual(api.normalizeHomeworldContractsV68(JSON.parse(JSON.stringify(state))), state);
  assert.equal(recordEvent(state, event).changed, false);
  const restarted = api.bindContractsVillageRunV68(state, event.regionId, 'new-fresh-run').state;
  assert.equal(restarted.entries[0].stages[0].proof, null);
  assert.equal(recordEvent(restarted, fieldEvent('ash-marches', 'report', { tick: 3000 })).changed, false);
  const completed = ready(id);
  assert.deepEqual(api.bindContractsVillageRunV68(completed, event.regionId, 'irrelevant-new-run').state, completed);
});

test('the board and mission journal expose native art, actionable objectives and no instant completion button', () => {
  const markup = renderToStaticMarkup(React.createElement(api.Panel, { value: undefined, npcId: 'market-artisan', eligible: true, disabled: false, reducedMotion: true, onAction() {} }));
  assert.match(markup, /\/game\/homeworld\/v68\/hunt-board\.png/);
  assert.equal((markup.match(/data-contract-id=/g) ?? []).length, 22, 'Twenty original offers and two new circuit starters');
  assert.equal((markup.match(/data-contract-action="accept"/g) ?? []).length, 22);
  for (const definition of api.HOMEWORLD_BOARD_CONTRACTS_V68) assert(markup.includes(`data-contract-id="${definition.id}"`), 'Every original offer remains visible');
  assert.doesNotMatch(markup, /data-contract-action="deliver"/);
  const blocked = renderToStaticMarkup(React.createElement(api.Panel, { value: undefined, npcId: 'market-artisan', eligible: false, disabled: false, reducedMotion: true, onAction() {} }));
  assert.equal((blocked.match(/data-contract-action="accept" disabled=/g) ?? []).length, 0);
  assert.equal((blocked.match(/disabled="" data-contract-action="accept"/g) ?? []).length, 22);
  const journal = renderToStaticMarkup(React.createElement(api.Journal, { value: ready('npc-dock-return-line') }));
  assert.match(journal, /Officier des quais/); assert.match(journal, /2\/2/);
});
