import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
export * from './app/game/systems/homeworld';
export * from './app/game/systems/homeworldInput';
export * from './app/game/systems/homeworldContractsV68';
export * from './app/game/systems/homeworldRegionsV68';
export * from './app/game/save';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const trees = new Map(await Promise.all(['GameClient.tsx', 'HomeworldRegionV68.tsx'].map(async file => {
  const source = await readFile(new URL('../app/game/' + file, import.meta.url), 'utf8');
  return [file, ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)];
})));

// Run the shipped callback bodies, including the scene's leave/pause handlers.
// The harness supplies only React refs/setters and a fallible storage adapter;
// no transaction, retry, movement validator or ownership logic is duplicated.
function callback(file, name, environment) {
  const tree = trees.get(file); let implementation;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) {
      implementation = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert(implementation, 'Execute actual callback ' + file + ':' + name);
  const javascript = ts.transpileModule(`const handler=${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(()=>{${javascript};return handler;})()`, environment);
}

function fixture() {
  const key = 'region-return-v68', values = new Map(), writes = [], notices = [], screens = [], hubs = [], arrivals = [], transitions = [], returnArguments = [];
  let reject = false, rejectReadback = false, failNextRead = false, checkpointCalls = 0, paused = false, error = '';
  const storage = {
    getItem(name) { if (name === key && failNextRead) { failNextRead = false; throw new Error('QA confirmation interrupted'); } return values.get(name) ?? null; },
    removeItem(name) { values.delete(name); },
    setItem(name, value) {
      if (name === key && reject) throw new DOMException('QA full disk', 'QuotaExceededError');
      values.set(name, value);
      if (name === key && rejectReadback) { rejectReadback = false; failNextRead = true; }
    },
  };
  const initial = api.writeSaveWithStatus(api.defaultSave('2026-10-01T00:00:00.000Z'), storage, key).save;
  const root = {
    ...api, structuredClone, crypto: { randomUUID: () => 'region-return-run' }, save: initial, saveRef: { current: initial },
    entry: { ownerCreatedAt: initial.createdAt }, sessionAliveRef: { current: true }, pendingTerminalRunRef: { current: null },
    pendingSocialWriteRef: { current: null }, nurseryWriteAttemptRef: { current: null }, activeHuntSessionRef: { current: null },
    setToast(message) { notices.push(message); }, setSaveFailure() {}, setNurseryPersistenceError() {},
    setSave(save) { root.save = save; transitions.push(['save', save.homeworldRegionV68 === null]); },
    setHomeworldArrivalV67(arrival) { arrivals.push(arrival); transitions.push(['arrival', arrival.pointId]); },
    setHubLocation(hub) { hubs.push(hub); transitions.push(['hub', hub]); },
    setScreen(screen) {
      // A navigation setter cannot see an optimistic or still-active journey.
      if (screen === 'homeworld') {
        assert.equal(JSON.parse(values.get(key)).homeworldRegionV68, null);
        assert.equal(root.saveRef.current.homeworldRegionV68, null);
        assert.equal(root.pendingSocialWriteRef.current, null);
      }
      screens.push(screen); transitions.push(['screen', screen]);
    },
    writeSaveWithStatus(save) { const result = api.writeSaveWithStatus(save, storage, key); writes.push(result); return result; },
    reconcileSaveWrite(attempt, owner) { return api.reconcileSaveWrite(attempt, owner, storage, key); },
  };
  for (const name of ['persist', 'persistSocialProgress', 'openHomeworldRegionV68', 'checkpointHomeworldRegionV68', 'fieldHomeworldRegionV68', 'reachCityHomeworldRegionV68']) root[name] = callback('GameClient.tsx', name, root);
  assert.equal(root.openHomeworldRegionV68('ash-marches'), true);
  const walking = structuredClone(root.saveRef.current.homeworldRegionV68);
  // An actual city interaction creates this arrival; no terminal flag is forged.
  const arrival = api.stepHomeworldRegionV68(walking, { interact: true });
  assert.equal(arrival.status, 'at-city'); assert(api.canAdvanceHomeworldRegionV68(walking, arrival));
  const ui = {
    ...api, structuredClone, current: { current: arrival }, exiting: { current: false },
    held: { current: new Set(['ArrowLeft']) }, touch: { current: new Set(['left']) }, interact: { current: true },
    gamepad: { current: api.createHomeworldGamepadState() }, pauseRef: { current: false },
    // Terminal-arrival fixtures have no cultural dialog open. The shipped
    // pause callback reads this React ref before considering a checkpoint.
    bibleOpenRef: { current: false },
    bibleAction() { throw new Error('Arrival fixture must not manufacture an open cultural dialog'); },
    setPaused(value) { paused = value; }, setError(value) { error = value; },
    latest: { current: {
      suspended: false,
      onCheckpoint(state) { checkpointCalls++; return root.checkpointHomeworldRegionV68(state); },
      onReachCity(state) { returnArguments.push(JSON.stringify(state)); return root.reachCityHomeworldRegionV68(state); },
    } },
  };
  for (const name of ['clear', 'freeze', 'persist', 'pause', 'leave']) ui[name] = callback('HomeworldRegionV68.tsx', name, ui);
  writes.length = screens.length = hubs.length = arrivals.length = transitions.length = 0;
  return {
    key, root, ui, values, storage, writes, notices, screens, hubs, arrivals, transitions, walking, arrival, returnArguments,
    setRejected(value) { reject = value; }, failConfirmationOnce() { rejectReadback = true; },
    get current() { return root.saveRef.current; }, get paused() { return paused; }, get error() { return error; }, get checkpointCalls() { return checkpointCalls; },
  };
}

test('actual scene arrival clears the journey in one confirmed transaction before navigating to its city gate', () => {
  const f = fixture(), before = structuredClone(f.current);
  f.ui.leave(f.arrival);
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0].persisted, true);
  assert.equal(f.current.homeworldRegionV68, null); assert.equal(f.checkpointCalls, 0);
  assert.deepEqual(f.screens, ['homeworld']); assert.deepEqual(f.hubs, ['homeworld']);
  assert.deepEqual(JSON.parse(JSON.stringify(f.arrivals)), [{ pointId: 'region-ash-marches', requestId: 'region-return-run' }]);
  assert.deepEqual(f.transitions.map(item => item[0]), ['save', 'arrival', 'hub', 'screen']);
  assert.deepEqual(f.current.homeworld, before.homeworld); assert.deepEqual(f.current.profile, before.profile); assert.deepEqual(f.current.inventory, before.inventory);
  assert.equal(api.loadSave(f.storage, f.key).homeworldRegionV68, null);
  assert.equal(f.paused, true); assert.equal(f.ui.exiting.current, true);
});

test('quota refusal retains the terminal scene, skips blur checkpoints and retries the identical arrival', () => {
  const f = fixture(), bytes = f.values.get(f.key), before = structuredClone(f.current);
  f.setRejected(true); f.ui.leave(f.arrival);
  assert.equal(f.values.get(f.key), bytes); assert.deepEqual(f.current, before);
  assert.equal(f.paused, true); assert.equal(f.ui.exiting.current, false); assert.match(f.error, /retour.*n’a pas été enregistré/);
  assert.deepEqual(f.screens, []); assert.deepEqual(f.arrivals, []);
  const count = f.writes.length;
  f.ui.pause(); assert.equal(f.ui.persist(f.arrival), false);
  f.root.persist({ ...f.current, settings: { ...f.current.settings, masterVolume: .1 } });
  assert.equal(f.writes.length, count); assert.equal(f.checkpointCalls, 0);
  assert.match(f.notices.at(-1), /précédente sauvegarde du territoire/);
  f.setRejected(false); f.ui.leave(f.arrival);
  assert.deepEqual(f.returnArguments, [JSON.stringify(f.arrival), JSON.stringify(f.arrival)]);
  assert.equal(f.current.homeworldRegionV68, null); assert.deepEqual(f.screens, ['homeworld']);
  assert.equal(f.current.settings.masterVolume, before.settings.masterVolume);
});

test('setItem followed by failed readback reconciles the same clear without a second write or a blank region screen', () => {
  const f = fixture(), before = structuredClone(f.current);
  f.failConfirmationOnce(); f.ui.leave(f.arrival);
  const committedBytes = f.values.get(f.key);
  assert.equal(JSON.parse(committedBytes).homeworldRegionV68, null, 'Primary storage really committed');
  assert.deepEqual(f.current, before, 'No optimistic local acknowledgment');
  assert(f.root.pendingSocialWriteRef.current); assert.deepEqual(f.screens, []); assert.deepEqual(f.arrivals, []);
  const count = f.writes.length;
  f.ui.pause(); f.root.persist({ ...f.current, settings: { ...f.current.settings, masterVolume: .1 } });
  assert.equal(f.writes.length, count); assert.equal(f.checkpointCalls, 0); assert.deepEqual(f.screens, []);
  f.ui.leave(f.arrival);
  assert.equal(f.writes.length, count, 'Retry confirms exact committed bytes, not another write');
  assert.equal(f.values.get(f.key), committedBytes);
  assert.deepEqual(f.returnArguments, [JSON.stringify(f.arrival), JSON.stringify(f.arrival)]);
  assert.equal(f.current.homeworldRegionV68, null); assert.equal(f.root.pendingSocialWriteRef.current, null);
  assert.deepEqual(f.screens, ['homeworld']); assert.equal(f.ui.exiting.current, true);
});

test('a dead session, replaced owner or other journey cannot clear or navigate the current campaign', () => {
  const changes = [
    f => { f.root.sessionAliveRef.current = false; },
    f => { f.root.entry.ownerCreatedAt = '2026-10-01T01:00:00.000Z'; },
    f => { f.root.saveRef.current = { ...f.current, createdAt: '2026-10-01T01:00:00.000Z' }; },
    f => { f.arrival.runId = 'different-journey'; },
    f => { f.ui.latest.current.suspended = true; },
  ];
  for (const change of changes) {
    const f = fixture(), bytes = f.values.get(f.key); change(f); f.ui.leave(f.arrival);
    assert.equal(f.values.get(f.key), bytes); assert.equal(f.writes.length, 0);
    assert.deepEqual(f.screens, []); assert.deepEqual(f.arrivals, []);
  }
  const f = fixture();
  const otherBytes = JSON.stringify(api.defaultSave('2026-10-01T02:00:00.000Z'));
  f.values.set(f.key, otherBytes); f.ui.leave(f.arrival);
  assert.equal(f.values.get(f.key), otherBytes); assert.equal(f.writes[0].persisted, false);
  assert.equal(f.current.homeworldRegionV68.status, 'walking'); assert.deepEqual(f.screens, []);
});

test('a refused arrival cannot be retried against a replaced durable owner after primary confirmation failed', () => {
  const f = fixture(); f.failConfirmationOnce(); f.ui.leave(f.arrival);
  const otherBytes = JSON.stringify(api.defaultSave('2026-10-01T02:00:00.000Z'));
  f.values.set(f.key, otherBytes); const count = f.writes.length;
  f.ui.leave(f.arrival);
  assert.equal(f.values.get(f.key), otherBytes); assert.equal(f.writes.length, count);
  assert.equal(f.current.homeworldRegionV68.status, 'walking'); assert.deepEqual(f.screens, []); assert.deepEqual(f.arrivals, []);
  assert.equal(f.ui.exiting.current, false); assert.match(f.error, /retour.*n’a pas été enregistré/);
});

test('stale checkpoint, field, pause and duplicate arrival callbacks cannot resurrect a confirmed return', () => {
  const f = fixture(); f.ui.leave(f.arrival);
  const bytes = f.values.get(f.key), count = f.writes.length;
  // A valid abandoned field checkpoint tests the ownership guard rather than
  // succeeding only because a made-up field event would fail normalization.
  let pending = api.createHomeworldRegionV68('ash-marches', f.walking.runId, true);
  pending.tick = 12000; pending.walked = 24000; pending.actor = { ...pending.actor, x: 7140, y: 2050 };
  pending.greeted = ['guide']; pending.traces = ['trail-1', 'trail-2', 'trail-3'];
  for (let tick = 0; tick < 92; tick++) pending = api.stepHomeworldRegionV68(pending);
  pending = api.stepHomeworldRegionV68(pending, { interact: true });
  assert(api.normalizeHomeworldRegionV68(pending)); assert(api.normalizeRegionFieldEventV68(pending.pendingFieldEvent));
  assert.equal(f.root.checkpointHomeworldRegionV68(f.walking), false);
  assert.equal(f.root.fieldHomeworldRegionV68(pending.pendingFieldEvent, pending), false);
  assert.equal(f.root.reachCityHomeworldRegionV68(f.arrival), false);
  f.ui.pause(); f.ui.leave(f.arrival);
  assert.equal(f.checkpointCalls, 0); assert.equal(f.writes.length, count); assert.equal(f.values.get(f.key), bytes);
  assert.deepEqual(f.screens, ['homeworld']); assert.equal(f.arrivals.length, 1);
});

test('callbacks retained from the returned journey cannot mutate a later journey belonging to the same campaign', () => {
  const f = fixture(); f.ui.leave(f.arrival);
  f.root.crypto.randomUUID = () => 'another-region-run';
  assert.equal(f.root.openHomeworldRegionV68('ash-marches'), true);
  const bytes = f.values.get(f.key), count = f.writes.length, screens = [...f.screens];
  assert.equal(f.current.homeworldRegionV68.runId, 'another-region-run');
  assert.equal(f.root.checkpointHomeworldRegionV68(f.walking), false);
  assert.equal(f.root.reachCityHomeworldRegionV68(f.arrival), false);
  assert.equal(f.values.get(f.key), bytes); assert.equal(f.writes.length, count); assert.deepEqual(f.screens, screens);
  assert.equal(f.current.homeworldRegionV68.runId, 'another-region-run'); assert.equal(f.arrivals.length, 1);
});
