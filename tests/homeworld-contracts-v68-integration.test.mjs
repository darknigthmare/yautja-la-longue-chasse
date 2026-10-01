import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
export * from './app/game/systems/homeworld';
export * from './app/game/systems/homeworldInteriorsV64';
export * from './app/game/systems/homeworldContractsV68';
export * from './app/game/systems/homeworldRegionsV68';
export * from './app/game/systems/homeworldAccessV69';
export {createNurseryCampaign} from './app/game/systems/nurseryCampaign';
export * from './app/game/save';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const trees = await Promise.all(['HomeworldHub.tsx', 'GameClient.tsx'].map(async file => {
  const source = await readFile(new URL('../app/game/' + file, import.meta.url), 'utf8');
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}));
function callback(name, environment) {
  let implementation, foundTree;
  for (const tree of trees) {
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.getText(tree) === name) { implementation = node; foundTree = tree; }
      if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) {
        implementation = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer; foundTree = tree;
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  assert(implementation, 'Execute the real application callback: ' + name);
  const javascript = ts.transpileModule(`const handler=${implementation.getText(foundTree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(()=>{${javascript};return handler;})()`, environment);
}
function fixture(initialOverrides = {}) {
  const values = new Map(), writes = [], notices = []; let reject = false, rejectReadback = false, failNextRead = false, dialog = null, screens = [];
  const key = 'contracts-v68';
  const storage = { getItem(name) { if (name === key && failNextRead) { failNextRead = false; throw new Error('QA readback failure after committed primary'); } return values.get(name) ?? null; }, removeItem: name => values.delete(name),
    setItem(name, value) { if (reject && name === key) throw new DOMException('QA refusal', 'QuotaExceededError'); values.set(name, value); if (rejectReadback && name === key) { rejectReadback = false; failNextRead = true; } } };
  const initial = api.writeSaveWithStatus({ ...api.defaultSave('2026-10-01T00:00:00.000Z'), ...initialOverrides }, storage, key).save;
  const environment = { ...api, structuredClone, crypto: { randomUUID: () => 'v68-new-run' },
    save: initial, saveRef: { current: initial }, entry: { ownerCreatedAt: initial.createdAt }, progressRef: { current: initial.homeworld },
    sessionAliveRef: { current: true }, pendingTerminalRunRef: { current: null }, pendingSocialWriteRef: { current: null }, activeHuntSessionRef: { current: null },
    actorRef: { current: api.createHomeworldActor() }, interiorRef: { current: null }, dialogStateRef: { current: null },
    suspendedRef: { current: false }, pausedRef: { current: false }, youthWelcome: false,
    clearInputs() {}, setAnnouncement() {}, setSaveFailure() {}, setHubLocation() {},
    setScreen(screen) { screens.push(screen); }, setToast(message) { notices.push(message); }, onNotify(message) { notices.push(message); },
    setDialog(update) { dialog = update(dialog); }, setSave(save) {
      environment.save = save;
      // The mounted Hub's save.homeworld effect refreshes this ref after the
      // host acknowledges a field write. Model that external React boundary.
      environment.progressRef.current = save.homeworld;
    },
    writeSaveWithStatus(save) { const result = api.writeSaveWithStatus(save, storage, key); writes.push(result.persisted); return result; },
    reconcileSaveWrite(attempt, owner) { return api.reconcileSaveWrite(attempt, owner, storage, key); },
  };
  for (const name of ['persistSocialProgress', 'persistHomeworldProgress', 'pointInCurrentSpace', 'openHomeworldRegionV68', 'checkpointHomeworldRegionV68', 'fieldHomeworldRegionV68', 'submitContractV68']) environment[name] = callback(name, environment);
  environment.onProgress = environment.persistHomeworldProgress;
  const select = pointId => {
    const room = api.homeworldInteriorForPointV64(pointId), point = room.points.find(item => item.pointId === pointId);
    environment.interiorRef.current = room;
    environment.actorRef.current = { ...environment.actorRef.current, x: point.x, y: point.y + 45 };
    const actualPoint = environment.pointInCurrentSpace(environment.actorRef.current, room);
    assert.equal(actualPoint.id, pointId);
    environment.dialogStateRef.current = dialog = { point: actualPoint };
  };
  const installTrackCheckpoint = () => {
    const state = api.createHomeworldRegionV68('ash-marches', 'v68-new-run', true);
    // Declared valid mid-route unit fixture. The separate browser recipe walks
    // the entire connector and all traces; no browser coordinates are injected.
    state.tick = 12000; state.walked = 24000; state.actor = { ...state.actor, x: 7140, y: 2050 };
    state.greeted = ['guide']; state.traces = ['trail-1', 'trail-2', 'trail-3'];
    assert(api.normalizeHomeworldRegionV68(state));
    assert(environment.persistSocialProgress({ homeworldRegionV68: state }));
    let pending = state;
    for (let index = 0; index < 92; index++) pending = api.stepHomeworldRegionV68(pending);
    pending = api.stepHomeworldRegionV68(pending, { interact: true });
    assert.equal(pending.pendingFieldEvent?.action, 'track');
    assert(api.normalizeHomeworldRegionV68(pending));
    return pending;
  };
  const prepareDelivery = () => {
    select('market-service'); environment.submitContractV68(action());
    assert(environment.openHomeworldRegionV68('ash-marches'));
    const pending = installTrackCheckpoint(); assert(environment.fieldHomeworldRegionV68(pending.pendingFieldEvent, pending));
    const guide = api.HOMEWORLD_REGIONS_V68['ash-marches'].residents[0], returned = structuredClone(environment.saveRef.current.homeworldRegionV68);
    // Declared valid return checkpoint for this callback/storage test. The full
    // guide and city walks are exercised without fixtures in the browser recipe.
    returned.tick += 6000; returned.walked += 8500; returned.actor = { ...returned.actor, x: guide.x, y: guide.y + 95, vx: 0, vy: 0 };
    assert(api.normalizeHomeworldRegionV68(returned)); assert(environment.persistSocialProgress({ homeworldRegionV68: returned }));
    const report = api.stepHomeworldRegionV68(returned, { interact: true });
    assert.equal(report.pendingFieldEvent?.action, 'report');
    assert(environment.fieldHomeworldRegionV68(report.pendingFieldEvent, report));
    assert(environment.persistSocialProgress({ homeworldRegionV68: null })); select('market-service');
    assert(api.homeworldContractsJournalV68(environment.saveRef.current.homeworld.contractsV68).active[0].ready);
  };
  const prepareCircuitDelivery = () => {
    select('market-service'); environment.submitContractV68({ kind: 'accept', contractId: 'v69-return-1' });
    for (const regionId of ['ash-marches', 'thermal-caves']) {
      assert(environment.openHomeworldRegionV68(regionId));
      const runId = environment.saveRef.current.homeworldRegionV68.runId;
      // Declared valid mid-route callback fixture; the separate V69 browser
      // recipe walks both connectors and the traces without injected positions.
      let pending;
      if (regionId === 'ash-marches') pending = installTrackCheckpoint();
      else {
        const state = api.createHomeworldRegionV68(regionId, runId, true), trace = api.HOMEWORLD_REGION_TRACES_V68[2];
        state.tick = 12000; state.walked = 24000; state.actor = { ...state.actor, x: trace.x, y: trace.y };
        state.greeted = ['guide']; state.traces = ['trail-1', 'trail-2'];
        assert(api.normalizeHomeworldRegionV68(state)); assert(environment.persistSocialProgress({ homeworldRegionV68: state }));
        pending = api.stepHomeworldRegionV68(state, { interact: true });
      }
      assert.equal(pending.pendingFieldEvent?.action, regionId === 'ash-marches' ? 'track' : 'survey'); assert(environment.fieldHomeworldRegionV68(pending.pendingFieldEvent, pending));
      const guide = api.HOMEWORLD_REGIONS_V68[regionId].residents[0], returned = structuredClone(environment.saveRef.current.homeworldRegionV68);
      returned.tick += 6000; returned.walked += 8500; returned.actor = { ...returned.actor, x: guide.x, y: guide.y + 95, vx: 0, vy: 0 };
      assert(api.normalizeHomeworldRegionV68(returned)); assert(environment.persistSocialProgress({ homeworldRegionV68: returned }));
      const report = api.stepHomeworldRegionV68(returned, { interact: true });
      assert.equal(report.pendingFieldEvent?.action, 'report'); assert(environment.fieldHomeworldRegionV68(report.pendingFieldEvent, report));
      assert(environment.persistSocialProgress({ homeworldRegionV68: null }));
    }
    select('market-service'); assert(api.homeworldContractsJournalV68(environment.saveRef.current.homeworld.contractsV68).active[0].ready);
  };
  return { environment, storage, values, writes, notices, screens, select, installTrackCheckpoint, prepareDelivery, prepareCircuitDelivery, setRejected(value) { reject = value; }, rejectNextReadback() { rejectReadback = true; },
    get current() { return environment.saveRef.current; }, get dialog() { return dialog; } };
}
const action = (kind = 'accept') => ({ kind, contractId: 'ash-marches-track' });

test('actual Hub acceptance and new village binding update only after the real durable write confirms', () => {
  const f = fixture(); f.select('market-service');
  const before = structuredClone(f.current), bytes = f.storage.getItem('contracts-v68');
  f.setRejected(true); f.environment.submitContractV68(action());
  assert.equal(f.storage.getItem('contracts-v68'), bytes);
  assert.deepEqual(structuredClone(f.environment.progressRef.current), before.homeworld);
  assert.match(f.dialog.message, /n’a pas été sauvegardé/);
  f.setRejected(false); f.environment.submitContractV68(action());
  assert.equal(f.current.homeworld.contractsV68.entries[0].status, 'active');
  const acceptedBytes = f.storage.getItem('contracts-v68');
  f.setRejected(true); assert.equal(f.environment.openHomeworldRegionV68('ash-marches'), false);
  assert.equal(f.storage.getItem('contracts-v68'), acceptedBytes); assert.equal(f.current.homeworldRegionV68, null);
  assert.equal(f.current.homeworld.contractsV68.entries[0].stages[0].runId, null);
  f.setRejected(false); assert.equal(f.environment.openHomeworldRegionV68('ash-marches'), true);
  assert.equal(f.current.homeworld.contractsV68.entries[0].stages[0].runId, f.current.homeworldRegionV68.runId);
  assert.deepEqual(f.current.profile, before.profile); assert.deepEqual(f.current.inventory, before.inventory);
  assert.deepEqual(api.loadSave(f.storage, 'contracts-v68').homeworld.contractsV68, f.current.homeworld.contractsV68);
});

test('the actual live field callback commits receipt and acknowledged scene together, survives a quota retry and refuses changed pending events', () => {
  const f = fixture(); f.select('market-service'); f.environment.submitContractV68(action());
  assert.equal(f.environment.openHomeworldRegionV68('ash-marches'), true);
  const pending = f.installTrackCheckpoint(), event = pending.pendingFieldEvent;
  const before = structuredClone(f.current), bytes = f.storage.getItem('contracts-v68');
  assert.equal(f.environment.fieldHomeworldRegionV68({ ...event, tick: event.tick + 1 }, pending), false);
  assert.equal(f.storage.getItem('contracts-v68'), bytes);
  f.setRejected(true); assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), false);
  assert.equal(f.storage.getItem('contracts-v68'), bytes); assert.deepEqual(f.current, before);
  f.setRejected(false); assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), true);
  assert.equal(f.current.homeworldRegionV68.pendingFieldEvent, null);
  assert(f.current.homeworldRegionV68.eventReceipts.includes('track'));
  assert.deepEqual(f.current.homeworld.contractsV68.entries[0].stages[0].proof, event);
  assert.equal(f.current.homeworld.contractsV68.entries[0].stages[0].reportTick, null);
  assert.equal(api.contractMarksV68(f.current.homeworld.contractsV68), 0);
  assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), false);
  const reloaded = api.loadSave(f.storage, 'contracts-v68');
  assert.deepEqual(reloaded.homeworldRegionV68, f.current.homeworldRegionV68);
  assert.deepEqual(reloaded.homeworld.contractsV68, f.current.homeworld.contractsV68);
});

test('callbacks from a replaced campaign owner, dead session or remote Hub position write nothing', () => {
  for (const mutate of [f => { f.environment.save = { ...f.environment.save, createdAt: 'another-owner' }; },
    f => { f.environment.actorRef.current.x += 2000; }, f => { f.environment.suspendedRef.current = true; },
    f => { f.environment.pausedRef.current = true; }, f => { f.environment.dialogStateRef.current = null; }]) {
    const f = fixture(); f.select('market-service'); const bytes = f.storage.getItem('contracts-v68'); mutate(f);
    f.environment.submitContractV68(action()); assert.equal(f.storage.getItem('contracts-v68'), bytes); assert.equal(f.writes.length, 0);
  }
  for (const mutate of [f => { f.environment.entry.ownerCreatedAt = 'other-owner'; }, f => { f.environment.sessionAliveRef.current = false; }]) {
    const f = fixture(); f.select('market-service'); f.environment.submitContractV68(action()); f.environment.openHomeworldRegionV68('ash-marches');
    const pending = f.installTrackCheckpoint(), bytes = f.storage.getItem('contracts-v68'), count = f.writes.length; mutate(f);
    assert.equal(f.environment.fieldHomeworldRegionV68(pending.pendingFieldEvent, pending), false);
    assert.equal(f.environment.openHomeworldRegionV68('ash-marches'), false);
    assert.equal(f.storage.getItem('contracts-v68'), bytes); assert.equal(f.writes.length, count);
  }
});

test('an acknowledged field write with one failed readback reconciles exactly without a second receipt or a rewind', () => {
  const f = fixture(); f.select('market-service'); f.environment.submitContractV68(action());
  assert.equal(f.environment.openHomeworldRegionV68('ash-marches'), true);
  const pending = f.installTrackCheckpoint(), event = pending.pendingFieldEvent, before = structuredClone(f.current);
  f.rejectNextReadback(); assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), false);
  assert.deepEqual(f.current, before, 'No optimistic advancement before durable readback confirmation');
  const committedBytes = f.values.get('contracts-v68');
  assert.equal(JSON.parse(committedBytes).homeworldRegionV68.pendingFieldEvent, null, 'Atomic setItem actually committed');
  const writes = f.writes.length;
  assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), true);
  assert.equal(f.writes.length, writes, 'Exact pending payload is reconciled without rewriting or duplicating');
  assert.equal(f.values.get('contracts-v68'), committedBytes);
  assert.deepEqual(f.current.homeworld.contractsV68.entries[0].stages[0].proof, event);
  assert.equal(f.current.homeworldRegionV68.pendingFieldEvent, null);
  assert.equal(f.environment.fieldHomeworldRegionV68(event, pending), false);
});

test('the real physical delivery callback credits the spendable wallet with the ledger in one write, only once after quota retry', () => {
  const f = fixture(); f.prepareDelivery();
  const before = structuredClone(f.current), bytes = f.values.get('contracts-v68');
  f.setRejected(true); f.environment.submitContractV68(action('deliver'));
  assert.equal(f.values.get('contracts-v68'), bytes); assert.deepEqual(f.current, before);
  assert.equal(f.environment.progressRef.current.contractsV68.entries[0].status, 'active');
  f.setRejected(false); f.environment.submitContractV68(action('deliver'));
  assert.equal(f.current.profile.clanMarks, before.profile.clanMarks + 18);
  assert.equal(f.current.homeworld.contractsV68.entries[0].status, 'completed');
  for (const key of ['rankId', 'honor']) assert.equal(f.current.profile[key], before.profile[key]);
  for (const key of ['inventory', 'trophies', 'prologue', 'youthTraining', 'soloV66', 'soloV67', 'soloV68']) assert.deepEqual(f.current[key], before[key]);
  const writes = f.writes.length;
  for (const kind of ['deliver', 'accept', 'resume']) f.environment.submitContractV68(action(kind));
  assert.equal(f.current.profile.clanMarks, 18); assert.equal(f.writes.length, writes);
  const loaded = api.loadSave(f.storage, 'contracts-v68');
  assert.equal(loaded.profile.clanMarks, 18); assert.deepEqual(loaded.homeworld.contractsV68, f.current.homeworld.contractsV68);
});

test('a committed reward with failed readback is reconciled together with its exact wallet, never paid twice', () => {
  const f = fixture(); f.prepareDelivery(); const before = structuredClone(f.current);
  f.rejectNextReadback(); f.environment.submitContractV68(action('deliver'));
  assert.deepEqual(f.current, before);
  const serialized = f.values.get('contracts-v68'), committed = JSON.parse(serialized), writes = f.writes.length;
  assert.equal(committed.profile.clanMarks, 18); assert.equal(committed.homeworld.contractsV68.entries[0].status, 'completed');
  f.environment.submitContractV68(action('deliver'));
  assert.equal(f.current.profile.clanMarks, 18); assert.equal(f.current.homeworld.contractsV68.entries[0].status, 'completed');
  assert.equal(f.values.get('contracts-v68'), serialized); assert.equal(f.writes.length, writes);
  f.environment.submitContractV68(action('deliver')); assert.equal(f.current.profile.clanMarks, 18); assert.equal(f.writes.length, writes);
});

test('future records stay protected; malformed contracts and villages recover a valid backup without importing the invalid primary', () => {
  for (const field of ['contracts', 'region']) for (const future of [true, false]) {
    const save = api.defaultSave('2026-10-01T00:00:00.000Z');
    if (field === 'contracts') save.homeworld.contractsV68 = future ? { version: api.HOMEWORLD_CONTRACT_SCHEMA_VERSION_V69 + 1, keep: ['exact', 'bytes'] } : { version: 1, serial: 1, entries: [{ id: 'fake', status: 'completed' }] };
    else save.homeworldRegionV68 = { ...api.createHomeworldRegionV68('ash-marches', 'future-run'), version: future ? 2 : 1, actor: { x: -999, y: 1 } };
    const primary = JSON.stringify(save), backup = JSON.stringify(api.defaultSave(save.createdAt));
    const values = new Map([['protected', primary], ['protected.backup', backup]]), writes = [];
    const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key), setItem(key, value) { writes.push(key); values.set(key, value); } };
    const before = [...values], loaded = api.loadSaveWithStatus(storage, 'protected');
    assert.equal(loaded.loaded, !future); assert.equal(loaded.failure, future ? 'future-version' : 'backup-recovered');
    if (future) assert.equal(api.writeSaveWithStatus(loaded.save, storage, 'protected').persisted, false);
    else { assert.equal(loaded.source, 'backup'); assert.equal(loaded.save.homeworldRegionV68, null); assert.deepEqual(loaded.save.homeworld.contractsV68.entries, []); }
    assert.equal(api.parseSaveImport(primary).failure, future ? 'future-version' : 'invalid-save');
    assert.equal(api.importSaveWithStatus(primary, storage, 'protected').persisted, false);
    assert.deepEqual([...values], before); assert.deepEqual(writes, []);
  }
});

test('a V69 chain upgrades the durable ledger only on acceptance, requires actual delivery, and unlocks the next physical giver after quota-safe payment', () => {
  const f = fixture(), acceptFirst = { kind: 'accept', contractId: 'v69-return-1' }, acceptSecond = { kind: 'accept', contractId: 'v69-return-2' };
  f.select('market-service'); const bytes = f.values.get('contracts-v68');
  f.setRejected(true); f.environment.submitContractV68(acceptFirst);
  assert.equal(f.values.get('contracts-v68'), bytes); assert.equal(f.current.homeworld.contractsV68.version, 1);
  f.setRejected(false); f.environment.submitContractV68(acceptFirst); assert.equal(f.current.homeworld.contractsV68.version, 2);
  f.select('medbay-service'); const count = f.writes.length; f.environment.submitContractV68(acceptSecond);
  assert.equal(f.writes.length, count); assert.match(f.dialog.message, /Remets d’abord/);
  f.prepareCircuitDelivery(); f.select('medbay-service'); f.environment.submitContractV68(acceptSecond);
  assert.equal(f.current.homeworld.contractsV68.entries.length, 1, 'Even two actual field+guide receipts do not replace giver delivery');
  f.select('market-service'); const before = structuredClone(f.current); f.setRejected(true);
  f.environment.submitContractV68({ kind: 'deliver', contractId: 'v69-return-1' }); assert.deepEqual(f.current, before);
  f.setRejected(false); f.environment.submitContractV68({ kind: 'deliver', contractId: 'v69-return-1' });
  assert.equal(f.current.profile.clanMarks, before.profile.clanMarks + 44);
  const completed = structuredClone(f.current.homeworld.contractsV68.entries[0]); f.select('medbay-service'); f.setRejected(true);
  f.environment.submitContractV68(acceptSecond); assert.equal(f.current.homeworld.contractsV68.entries.length, 1);
  f.setRejected(false); f.environment.submitContractV68(acceptSecond); assert.equal(f.current.homeworld.contractsV68.entries.length, 2);
  assert.deepEqual(f.current.homeworld.contractsV68.entries[0], completed); assert.equal(f.current.profile.clanMarks, 44);
  const writes = f.writes.length; f.environment.submitContractV68(acceptSecond); assert.equal(f.writes.length, writes);
  assert.deepEqual(api.loadSave(f.storage, 'contracts-v68').homeworld.contractsV68, f.current.homeworld.contractsV68);
  for (const key of ['rankId', 'honor']) assert.equal(f.current.profile[key], before.profile[key]);
  for (const key of ['inventory', 'trophies', 'justice', 'prologue', 'youthTraining', 'soloV66', 'soloV67', 'soloV68', 'soloV69']) assert.deepEqual(f.current[key], before[key]);
});

test('a V69 reward with failed readback reconciles the exact version 2 ledger and wallet only once', () => {
  const f = fixture(); f.prepareCircuitDelivery(); const before = structuredClone(f.current);
  f.rejectNextReadback(); f.environment.submitContractV68({ kind: 'deliver', contractId: 'v69-return-1' }); assert.deepEqual(f.current, before);
  const bytes = f.values.get('contracts-v68'), committed = JSON.parse(bytes), writes = f.writes.length;
  assert.equal(committed.profile.clanMarks, 44); assert.equal(committed.homeworld.contractsV68.version, 2); assert.equal(committed.homeworld.contractsV68.entries[0].status, 'completed');
  f.environment.submitContractV68({ kind: 'deliver', contractId: 'v69-return-1' }); assert.equal(f.current.profile.clanMarks, 44); assert.equal(f.writes.length, writes);
  f.environment.submitContractV68({ kind: 'deliver', contractId: 'v69-return-1' }); assert.equal(f.current.profile.clanMarks, 44); assert.equal(f.values.get('contracts-v68'), bytes);
});

test('the real Hub gate reads the current youth training history and refuses a forged honor rank or chronicle rank field', () => {
  const f = fixture({ prologue: api.createNurseryCampaign() }); f.select('market-service');
  f.environment.saveRef.current = { ...f.current, profile: { ...f.current.profile, honor: 999999, rankId: 'elder' },
    prologue: { ...f.current.prologue, chronicle: { ...f.current.prologue.chronicle, rankId: 'ancient', trainingCompleted: true } } };
  const bytes = f.values.get('contracts-v68'), writes = f.writes.length;
  f.environment.submitContractV68({ kind: 'accept', contractId: 'v69-return-1' });
  assert.equal(f.values.get('contracts-v68'), bytes); assert.equal(f.writes.length, writes); assert.deepEqual(f.current.homeworld.contractsV68.entries, []);
});

test('a V9 save preserves the exact V68 ledger during migration, while a future chain schema remains protected on import', () => {
  const f = fixture(); f.prepareDelivery(); f.environment.submitContractV68(action('deliver'));
  const old = structuredClone(f.current); old.version = 9; delete old.soloV69;
  const migrated = api.parseSaveImport(JSON.stringify(old)); assert.equal(migrated.failure, null); assert.equal(migrated.save.version, api.SAVE_VERSION);
  assert.deepEqual(migrated.save.homeworld.contractsV68, old.homeworld.contractsV68); assert.equal(migrated.save.homeworld.contractsV68.version, 1); assert.equal(migrated.save.profile.clanMarks, old.profile.clanMarks);
  const chain = fixture(); chain.prepareCircuitDelivery(); const future = structuredClone(chain.current); future.homeworld.contractsV68.version = 3;
  assert.equal(api.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  const spoofed = structuredClone(chain.current); spoofed.homeworld.contractsV68.version = 1;
  assert.equal(api.parseSaveImport(JSON.stringify(spoofed)).failure, 'invalid-save');
});
