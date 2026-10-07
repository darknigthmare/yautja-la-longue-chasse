import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const bundle = await build({ stdin: { contents: `export * from './app/game/systems/shipPreparationV88';
  export {defaultSave} from './app/game/save'; export {createDefaultShipProgression,SHIP_PROGRESSION_STORAGE_KEY,SHIP_PROGRESSION_VERSION} from './app/game/systems/progression';
  export {SHIP_LEVEL_STATIONS} from './app/game/systems/shipLevelLayout';`, loader: 'ts', resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const owner = '2026-10-07T17:00:00.000Z';
function fixture() {
  const save = api.defaultSave(owner), fleet = api.createDefaultShipProgression(save, owner);
  const selectedMissionId = Object.entries(save.missionProgress).find(([, progress]) => ['available', 'completed'].includes(progress.status))[0];
  return { save, fleet, shipId: fleet.selectedShipId, selectedMissionId, active: true, focused: true, suspended: false };
}
function observation(id) { const station = api.SHIP_LEVEL_STATIONS.find(item => item.id === id); return { stationId: id, x: station.x, y: station.y }; }
function inspect(state, id, context) { const result = api.inspectShipPreparationV88(state, observation(id), context); assert.equal(result.accepted, true, result.message); return result.state; }
function seven(context, state = null) { for (const id of api.SHIP_LEVEL_STATIONS.map(station => station.id).filter(id => id !== 'launch-airlock')) state = inspect(state, id, context); return state; }
function complete(context) { return inspect(seven(context), 'launch-airlock', context); }

test('twelve source rows retain the original V6 SHA and eleven shared corpus rows match exact cells', async () => {
  const [book, ships, dialogues] = await Promise.all([
    readFile(new URL('../work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx', import.meta.url)),
    readFile(new URL('../public/game/dialogues/v85/bible-ships.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/game/dialogues/v85/bible-dialogues.json', import.meta.url), 'utf8'),
  ]);
  const source = api.SHIP_PREPARATION_SOURCE_V88, documents = [JSON.parse(ships), JSON.parse(dialogues)];
  assert.equal(createHash('sha256').update(book).digest('hex'), source.source.sha256);
  assert.equal(source.source.totalWorkbookSheets, 139);
  assert.equal(source.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0), 12);
  let checked = 0;
  for (const sheet of source.sheets) {
    const original = documents.flatMap(document => document.sheets).find(item => item.name === sheet.name);
    if (!original) { assert.equal(sheet.name, 'Campagne commune'); continue; }
    for (const row of sheet.rows) { assert.deepEqual(row, original.rows.find(item => item.number === row.number)); checked++; }
  }
  assert.equal(checked, 11);
});

test('raw fleet reads never initialize, adopt, normalize future records or write storage', () => {
  const context = fixture(), key = api.SHIP_PROGRESSION_STORAGE_KEY;
  const variants = [null, '', '{', JSON.stringify({ ...context.fleet, version: api.SHIP_PROGRESSION_VERSION + 1 }),
    JSON.stringify({ ...context.fleet, ownerSaveCreatedAt: 'another-owner' })];
  for (const value of variants) {
    const storage = { getItem: wanted => { assert.equal(wanted, key); return value; } };
    assert.equal(api.readShipPreparationFleetV88(context.save, storage), null);
  }
  assert.equal(api.readShipPreparationFleetV88(context.save, null), null);
  assert.equal(api.readShipPreparationFleetV88(context.save, { getItem: () => { throw Error('access denied'); } }), null);
  assert.equal(api.readShipPreparationFleetV88(context.save, { getItem: () => ' '.repeat(1000001) }), null);
  const serialized = JSON.stringify(context.fleet);
  assert.deepEqual(api.readShipPreparationFleetV88(context.save, { getItem: () => serialized }), context.fleet);
  assert.equal(serialized, JSON.stringify(context.fleet));
});

test('a distant interface, wrong deck, NaN or unknown post cannot stamp an inspection', () => {
  const context = fixture();
  for (const bad of [{ ...observation('galaxy-map'), x: 3000 }, { ...observation('galaxy-map'), y: 1360 },
    { ...observation('galaxy-map'), x: NaN }, { stationId: 'unknown', x: 0, y: 0 }]) {
    const result = api.inspectShipPreparationV88(null, bad, context);
    assert.equal(result.accepted, false); assert.equal(result.state, null);
  }
});

test('inactive, paused and unfocused decks preserve the last confirmed checkpoint', () => {
  const context = fixture(), state = inspect(null, 'wall-armory', context), before = JSON.stringify(state);
  for (const flags of [{ active: false }, { suspended: true }, { focused: false }]) {
    const result = api.inspectShipPreparationV88(state, observation('clan-archives'), { ...context, ...flags });
    assert.equal(result.accepted, false); assert.deepEqual(result.state, state);
  }
  assert.equal(JSON.stringify(state), before);
});

test('the seven posts and final airlock produce one reusable checkpoint without acquisition, travel or resource mutation', () => {
  const context = fixture(), saveBefore = JSON.stringify(context.save), fleetBefore = JSON.stringify(context.fleet);
  assert.equal(api.inspectShipPreparationV88(null, observation('launch-airlock'), context).accepted, false);
  const state = seven(context), last = inspect(state, 'launch-airlock', context);
  assert.equal(api.evaluateShipPreparationV88(state, context).inspected, 7);
  assert.equal(api.evaluateShipPreparationV88(last, context).ready, true);
  assert.equal(last.revision, 8); assert.equal(last.hulls[0].inspections.length, 8);
  assert.deepEqual(api.normalizeShipPreparationV88(JSON.parse(JSON.stringify(last)), owner), last);
  assert.equal(JSON.stringify(context.save), saveBefore); assert.equal(JSON.stringify(context.fleet), fleetBefore);
  assert.equal(Object.hasOwn(last, 'personalOwned'), false); assert.equal(Object.hasOwn(last, 'preflightReady'), false);
  assert.equal(Object.hasOwn(last, 'fuel'), false); assert.equal(Object.hasOwn(last, 'missionCompleted'), false);
});

test('repeated inspection is idempotent and the pure reducer leaves its input unchanged', () => {
  const context = fixture(), state = inspect(null, 'wall-armory', context), before = JSON.stringify(state);
  const result = api.inspectShipPreparationV88(state, observation('wall-armory'), context);
  assert.equal(result.accepted, true); assert.equal(result.changed, false); assert.equal(result.state.revision, 1);
  const newState = inspect(state, 'clan-archives', context);
  assert.equal(newState.revision, 2); assert.equal(JSON.stringify(state), before);
});

test('changing a real kit invalidates its armory and sealed airlock but retains unrelated observations', () => {
  const context = fixture(), state = complete(context), changed = structuredClone(context);
  changed.save.loadout.weaponIds.reverse();
  const evaluation = api.evaluateShipPreparationV88(state, changed);
  assert.equal(evaluation.ready, false); assert.equal(evaluation.completedStationIds.includes('wall-armory'), false);
  assert.equal(evaluation.completedStationIds.includes('launch-airlock'), false);
  assert.equal(evaluation.completedStationIds.includes('clan-archives'), true);
  let renewed = inspect(state, 'wall-armory', changed);
  assert.equal(api.evaluateShipPreparationV88(renewed, changed).ready, false);
  renewed = inspect(renewed, 'launch-airlock', changed);
  assert.equal(api.evaluateShipPreparationV88(renewed, changed).ready, true);
});

test('an absent or locked destination prevents navigation and airlock inspection', () => {
  const context = fixture(), state = complete(context);
  for (const selectedMissionId of [null, 'not-a-mission', Object.entries(context.save.missionProgress).find(([, result]) => result.status === 'locked')[0]]) {
    const changed = { ...context, selectedMissionId };
    assert.equal(api.inspectShipPreparationV88(state, observation('galaxy-map'), changed).accepted, false);
    assert.equal(api.evaluateShipPreparationV88(state, changed).ready, false);
  }
});

test('ongoing treatment blocks the physical medical inspection without automatic treatment or score grants', () => {
  const context = fixture();
  context.fleet.medbay = { status: 'treating', treatmentId: 'minor-wounds', startedAt: owner,
    completesAt: '2026-10-07T18:00:00.000Z', treatmentsCompleted: 0 };
  const before = JSON.stringify(context);
  const result = api.inspectShipPreparationV88(null, observation('medical-bay'), context);
  assert.equal(result.accepted, false); assert.match(result.message, /traitement en cours/); assert.equal(JSON.stringify(context), before);
});

test('future, foreign and malformed checkpoints are refused without erasure or adoption', () => {
  const context = fixture(), state = complete(context);
  const invalids = [{ ...state, version: 2 }, { ...state, ownerSaveCreatedAt: 'foreign' }, { ...state, revision: 0 },
    { ...state, hulls: [...state.hulls, state.hulls[0]] },
    { ...state, hulls: [{ ...state.hulls[0], inspections: [...state.hulls[0].inspections, state.hulls[0].inspections[0]] }] }];
  for (const raw of invalids) {
    const before = JSON.stringify(raw);
    assert.equal(api.normalizeShipPreparationV88(raw, owner), null);
    const result = api.inspectShipPreparationV88(raw, observation('wall-armory'), context);
    assert.equal(result.accepted, false); assert.equal(result.changed, false); assert.equal(JSON.stringify(raw), before);
  }
});

test('coque and owner changes do not transfer inspections; both hull records remain independent', () => {
  const context = fixture(), state = complete(context), next = structuredClone(context);
  next.fleet.unlockedShipIds.push('advanced-predator-ship'); next.fleet.selectedShipId = 'advanced-predator-ship'; next.shipId = 'advanced-predator-ship';
  assert.equal(api.evaluateShipPreparationV88(state, next).inspected, 0);
  const result = api.inspectShipPreparationV88(state, observation('wall-armory'), next);
  assert.equal(result.accepted, true, result.message); assert.equal(result.state.hulls.length, 2);
  assert.equal(api.evaluateShipPreparationV88(result.state, context).ready, true);
  const foreign = { ...context, save: { ...context.save, createdAt: 'another-owner' } };
  assert.equal(api.inspectShipPreparationV88(state, observation('wall-armory'), foreign).accepted, false);
});

test('missing raw fleet evidence disables checkpoint mutation rather than creating a default hull', () => {
  const context = { ...fixture(), fleet: null }, result = api.inspectShipPreparationV88(null, observation('wall-armory'), context);
  assert.equal(result.accepted, false); assert.equal(result.state, null);
  assert.equal(api.evaluateShipPreparationV88(null, context).writable, false);
});

test('actual panel displays pause, physical guidance and scope boundaries with disabled public commands', () => {
  const context = fixture(), evaluation = api.evaluateShipPreparationV88(null, context), qa = homeworldSceneSsrV78();
  const component = 'app/game/ShipPreparationPanelV88.tsx', controlled = { evaluation, onInspect: () => { throw Error('SSR must never inspect'); } };
  const active = qa.render(component, { controlled, stationId: 'wall-armory', suspended: false, observe: () => null });
  assert.match(active, /R2-M021/); assert.match(active, /R2-M022/); assert.match(active, /Inspecter le kit sur les supports/);
  assert.match(active, /0\/8/);
  const paused = qa.render(component, { controlled, stationId: 'wall-armory', suspended: true, observe: () => null });
  assert.match(paused, /Inspection suspendue/); assert.match(paused, /<button[^>]*disabled/);
  const corridor = qa.render(component, { controlled, stationId: null, suspended: false, observe: () => null });
  assert.match(corridor, /les accès rapides ne valident aucun contrôle/);
});
