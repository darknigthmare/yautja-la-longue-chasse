import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ stdin: { contents: `
  export * from './app/game/systems/homeworldNpcMissionsV66';
  export {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64} from './app/game/systems/homeworldInteriorsV64';
  export {default as Panel,HomeworldNpcMissionsJournalV66 as Journal} from './app/game/HomeworldNpcMissionsV66';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node',
external: ['react', 'react/jsx-runtime'], logLevel: 'silent' });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const api = evaluated.exports;
const room = api.homeworldInteriorForBuildingV64('clan-lodge');
const socket = room.points.find(point => point.pointId === 'medbay-service');
const context = { autonomousHunter: true, interiorId: room.buildingId, pointId: socket.pointId,
  npcId: 'clan-healer', actor: { x: socket.x, y: socket.y + 45 }, suspended: false };
assert.equal(api.isHomeworldInteriorWalkableV64(room, context.actor), true);
const ash = { expeditionId: 'ash-marches', trueTrailInspected: true, falseTrailRejected: true,
  obstacleMoved: true, convoyRecovered: true, shortcutOpened: true, secretFound: false, ticks: 7250 };
const glass = (route = 'stepping-stones', beacon = 'preserve') => ({ expeditionId: 'glass-desert',
  terrainSurveyed: true, transportLogRecovered: true, diversionCorroborated: true, safePassageOpened: true,
  crossingRoute: route, beaconDisposition: beacon, secretFound: false, ticks: 11200 });
const accept = id => ({ kind: 'accept', missionId: id });
const debrief = (id, answer) => ({ kind: 'debrief', missionId: id, answer });
const run = (state, action, where = context) => api.applyNpcMissionsV66(state, action, where);
const firstAccepted = () => run(undefined, accept('return-paths-ash')).state;
const firstReady = () => api.recordNpcMissionReportV66(firstAccepted(), ash).state;
const firstDone = () => run(firstReady(), debrief('return-paths-ash', 'shortcut-confirmed')).state;

test('legacy mission state starts empty and historical expedition reports never auto-credit a request', () => {
  const initial = api.defaultNpcMissionsV66();
  assert.deepEqual(api.normalizeNpcMissionsV66(undefined), initial);
  assert.deepEqual(api.normalizeNpcMissionsV66({ expeditions: { 'ash-marches': ash, 'glass-desert': glass() } }), initial);
  for (const proof of [ash, glass()]) {
    const result = api.recordNpcMissionReportV66(undefined, proof);
    assert.equal(result.changed, false); assert.deepEqual(result.state, initial);
  }
  const accepted = firstAccepted();
  assert.equal(accepted.ash.report, null); assert.equal(accepted.ash.delivered, false);
  assert.equal(api.npcMissionsJournalV66(accepted).phase, 'field');
});

test('future, malformed and contradictory records cannot authorize a write', () => {
  const base = api.defaultNpcMissionsV66();
  for (const value of [null, [], { ...base, version: 2 }, { ...base, ash: null },
    { ...base, ash: { ...base.ash, accepted: 'true' } },
    { ...base, ash: { ...base.ash, report: ash } },
    { ...base, ash: { ...base.ash, delivered: true } },
    { ...base, glass: { accepted: true, report: null, delivered: false } },
    { ...base, ash: { accepted: true, report: { ...ash, ticks: Infinity }, delivered: true } }]) {
    const original = structuredClone(value);
    assert.equal(api.isNpcMissionsV66(value), false);
    assert.equal(run(value, accept('return-paths-ash')).changed, false);
    assert.equal(api.recordNpcMissionReportV66(value, ash).changed, false);
    assert.deepEqual(value, original);
    assert.equal(api.npcMissionsDialogueV66(value, 'clan-healer').options.length, 0);
  }
});

test('the giver requires the real V64 room and current close position, not an old outdoor socket', () => {
  assert.equal(api.canMeetNpcMissionGiverV66(context), true);
  for (const wrong of [
    { ...context, interiorId: null }, { ...context, interiorId: 'deep-forge' },
    { ...context, pointId: 'forge-service' }, { ...context, npcId: 'forge-artisan' },
    { ...context, actor: { x: 3000, y: 1000 } }, { ...context, actor: { x: NaN, y: 50 } },
    { ...context, actor: { x: socket.x, y: socket.y } },
    { ...context, suspended: true }, { ...context, autonomousHunter: false },
  ]) {
    assert.equal(api.canMeetNpcMissionGiverV66(wrong), false);
    assert.equal(run(undefined, accept('return-paths-ash'), wrong).changed, false);
    assert.equal(run(firstReady(), debrief('return-paths-ash', 'shortcut-confirmed'), wrong).changed, false);
  }
});

test('out-of-order acceptance, incomplete proof and early return never complete a mission', () => {
  assert.equal(run(undefined, accept('return-paths-glass')).ok, false);
  assert.equal(run(firstAccepted(), accept('return-paths-glass')).ok, false);
  assert.equal(run(firstAccepted(), debrief('return-paths-ash', 'shortcut-confirmed')).changed, false);
  for (const raw of [null, {}, { ...ash, shortcutOpened: false }, { ...ash, convoyRecovered: false },
    { ...ash, ticks: 0 }, { ...ash, ticks: 5_184_001 }, { ...glass(), safePassageOpened: false }]) {
    assert.equal(api.recordNpcMissionReportV66(firstAccepted(), raw).ok, false);
  }
  const unrelated = api.recordNpcMissionReportV66(firstAccepted(), glass());
  assert.equal(unrelated.changed, false); assert.equal(unrelated.state.glass.accepted, false);
  const state = firstReady();
  assert.equal(state.ash.delivered, false); assert.equal(api.npcMissionsJournalV66(state).phase, 'return');
});

test('a wrong deduction provides feedback and leaves the saved report available for retry', () => {
  const ready = firstReady(), source = structuredClone(ready);
  const failed = run(ready, debrief('return-paths-ash', 'region-harmless'));
  assert.equal(failed.ok, false); assert.equal(failed.changed, false); assert.match(failed.message, /prouve ton rapport/);
  assert.deepEqual(failed.state, source); assert.deepEqual(ready, source);
  assert.equal(run(ready, debrief('return-paths-ash', 'shortcut-confirmed')).state.ash.delivered, true);
});

for (const route of ['stepping-stones', 'decoy-corridor']) for (const beacon of ['preserve', 'disable'])
  test(`two missions complete with a fresh ${route}/${beacon} field report and a return to the same giver`, () => {
    let state = api.defaultNpcMissionsV66();
    const original = structuredClone(state);
    state = run(state, accept('return-paths-ash')).state;
    state = api.recordNpcMissionReportV66(state, ash).state;
    state = run(state, debrief('return-paths-ash', 'shortcut-confirmed')).state;
    state = run(state, accept('return-paths-glass')).state;
    assert.equal(state.glass.report, null, 'chapter2 always requires a new sortie after its own acceptance');
    state = api.recordNpcMissionReportV66(state, glass(route, beacon)).state;
    const dialogue = api.npcMissionsDialogueV66(state, 'clan-healer');
    assert.match(dialogue.text, beacon === 'disable' ? /coupé le canal/ : /conservé le canal/);
    const answer = route === 'stepping-stones' ? 'rock-cornices' : 'decoy-corridor';
    const wrong = route === 'stepping-stones' ? 'decoy-corridor' : 'rock-cornices';
    assert.equal(run(state, debrief('return-paths-glass', wrong)).changed, false);
    const result = run(state, debrief('return-paths-glass', answer));
    assert.equal(result.ok, true); assert.equal(result.changed, true); state = result.state;
    assert.equal(api.npcMissionsJournalV66(state).phase, 'complete');
    assert.equal(api.npcMissionsJournalV66(state).completed, 2);
    assert.equal(api.npcMissionsDialogueV66(state, 'clan-healer').options.length, 0);
    assert.equal(api.isNpcMissionsV66(state), true);
    assert.deepEqual(api.normalizeNpcMissionsV66(JSON.parse(JSON.stringify(state))), state, 'exact local save roundtrip');
    assert.deepEqual(Object.keys(state), Object.keys(original), 'no reward, inventory, honor, treatment or rank field is created');
    assert.equal(run(state, debrief('return-paths-glass', answer)).changed, false);
    assert.equal(run(state, accept('return-paths-ash')).changed, false);
    assert.equal(api.recordNpcMissionReportV66(state, glass(route, beacon)).changed, false);
  });

test('the first report remains immutable across later revisits and never rewrites route or beacon choices', () => {
  const ready = api.recordNpcMissionReportV66(run(firstDone(), accept('return-paths-glass')).state, glass('decoy-corridor', 'disable')).state;
  const original = structuredClone(ready);
  const repeated = api.recordNpcMissionReportV66(ready, { ...glass('stepping-stones', 'preserve'), secretFound: true, ticks: 100 });
  assert.equal(repeated.changed, false); assert.deepEqual(repeated.state, original); assert.deepEqual(ready, original);
});

test('dialogue and journal identify the giver and do not offer missions to youth or another NPC', () => {
  assert.equal(api.npcMissionsDialogueV66(undefined, 'forge-artisan'), null);
  assert.equal(api.npcMissionsDialogueV66(undefined, 'clan-healer', false).options.length, 0);
  assert.match(api.npcMissionsDialogueV66(undefined, 'clan-healer', false).text, /formation ni le rite/);
  assert.equal(api.npcMissionsJournalV66(undefined).pointId, 'medbay-service');
  assert.equal(api.npcMissionsJournalV66(firstAccepted()).pointId, 'region-ash-marches');
  assert.equal(api.npcMissionsJournalV66(firstReady()).pointId, 'medbay-service');
});

test('presentation uses semantic buttons, respects suspension and shows no optimistic local completion', () => {
  const props = { value: undefined, npcId: 'clan-healer', autonomousHunter: true, disabled: true, onAction() {} };
  const html = renderToStaticMarkup(React.createElement(api.Panel, props));
  assert.match(html, /data-npc-missions-v66/); assert.match(html, /data-npc-mission-id="return-paths-ash"/);
  assert.match(html, /disabled=""/); assert.match(html, /0\/2/);
  assert.equal(renderToStaticMarkup(React.createElement(api.Panel, { ...props, npcId: 'dock-officer' })), '');
  const youth = renderToStaticMarkup(React.createElement(api.Panel, { ...props, autonomousHunter: false }));
  assert.doesNotMatch(youth, /<button/);
  assert.match(renderToStaticMarkup(React.createElement(api.Journal, { value: undefined, autonomousHunter: false })), /parcours de jeunesse/);
});
