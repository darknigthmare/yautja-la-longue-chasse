import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const saveApi = qa.load('app/game/save.ts');
const operations = qa.load('app/game/systems/clanShipOperations.ts');
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const OWNER = '2026-11-05T16:00:00.000Z';
const MAIN = saveApi.SAVE_STORAGE_KEY;
const trees = new Map(['app/game/GameClient.tsx', 'app/dev/session.tsx'].map(filename =>
  [filename, ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)]));

/** Execute the actual host callback in the reducers' own JS realm. React
 * refs/setters are ports; incident reducers, writer and reconciliation are real.
 * Re-extract after a primitive prop changes, like React's callback dependency update. */
function callback(filename, name, environment) {
  const tree = trees.get(filename);
  let implementation;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name && node.initializer &&
        ts.isCallExpression(node.initializer) && node.initializer.expression.getText(tree) === 'useCallback') implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(implementation, `Execute actual ${filename} ${name}`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(environment), `${compiled}; return handler;`)(...Object.values(environment));
}

function memory() {
  const values = new Map();
  return {
    values, writes: 0, failQuota: false, failReadback: false, pendingReadback: false,
    get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem(key) {
      if (key === MAIN && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); }
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === MAIN && this.failQuota) throw new DOMException('Full', 'QuotaExceededError');
      this.writes++; values.set(key, value);
      if (key === MAIN && this.failReadback) { this.failReadback = false; this.pendingReadback = true; }
    },
    removeItem(key) { this.writes++; values.delete(key); },
  };
}
function fixture(beforeIncident = false) {
  let save = saveApi.defaultSave(OWNER);
  let visit = docking.createClanShipDockingState(OWNER, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) visit = docking.actClanShipDocking(visit, { type },
    { ownerCreatedAt: OWNER, personalShipId: 'classic-predator-spaceship' }).state;
  save = { ...save, clanShipDocking: visit, clanShipOperations: operations.createClanShipOperations(OWNER) };
  const op = (type, values, roomId) => {
    save = { ...save, clanShipDocking: { ...save.clanShipDocking, roomId } };
    const result = operations.actClanShipOperations(save.clanShipOperations,
      { type, expectedRevision: save.clanShipOperations.revision, ...values }, { ownerCreatedAt: OWNER, docking: save.clanShipDocking, campaign: save });
    assert.equal(result.accepted, true, result.message);
    save = { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
  };
  for (const step of operations.CLAN_SHIP_ONBOARDING_STEPS) op('onboard-step', { stepId: step.id }, step.roomId);
  op('accept-mandate', {}, 'conseil'); op('accept-contract', { contractId: 'ship-seal-check' }, 'conseil');
  for (const step of operations.clanShipContract('ship-seal-check').steps) op('interior-step', { stepId: step.id }, step.roomId);
  if (beforeIncident) return save;
  save.clanShipIncidents = incidents.createClanShipIncidents(OWNER);
  const act = (action, target) => {
    if (target) save = { ...save, clanShipDocking: { ...save.clanShipDocking, roomId: target.roomId } };
    const result = incidents.actClanShipIncidents(save.clanShipIncidents, { ...action, expectedRevision: save.clanShipIncidents.revision },
      { ownerCreatedAt: OWNER, campaign: save, operations: save.clanShipOperations, docking: save.clanShipDocking,
        actor: target?.position, escort: null });
    assert.equal(result.accepted, true, result.message);
    save = { ...save, clanShipIncidents: result.state };
  };
  act({ type: 'start-incident', incidentId: 'seal-discrepancy' });
  for (let index = 0; index < 4; index++) {
    const step = incidents.getClanShipIncidentStep(save.clanShipIncidents), target = incidents.clanShipIncidentTarget(step.targetId);
    act(step.kind === 'choice' ? { type: 'choose', targetId: target.id, choiceId: step.correctChoiceId } : { type: 'interact', targetId: target.id }, target);
  }
  return { ...save, clanShipDocking: { ...save.clanShipDocking, roomId: 'hangar' } };
}
function campaignHost(source = fixture()) {
  const storage = memory(), initial = saveApi.writeSaveWithStatus(source, storage, MAIN);
  assert.equal(initial.persisted, true, initial.failure);
  const observed = { proposals: [], publications: [], failures: [], toasts: [], reconciliations: 0 };
  const env = { ...saveApi, ...operations, ...incidents,
    saveRef: { current: initial.save }, sessionAliveRef: { current: true }, entry: { ownerCreatedAt: OWNER },
    pendingSocialWriteRef: { current: null }, pendingTrophyCommitRef: { current: null }, pendingTerminalRunRef: { current: null },
    activeHuntSessionRef: { current: null }, screen: 'clan-ship', gameFocusedV89: true, settingsOpen: false,
    archiveTransferBusy: false, archiveRecoveryIssue: null, campaignSaveBusy: false, resumableHunt: null,
    setSave(value) { observed.publications.push(value); }, setSaveFailure(value) { observed.failures.push(value); }, setToast(value) { observed.toasts.push(value); },
    writeSaveWithStatus(value) { observed.proposals.push(value); return saveApi.writeSaveWithStatus(value, storage, MAIN); },
    reconcileSaveWrite(attempt, owner) { observed.reconciliations++; return saveApi.reconcileSaveWrite(attempt, owner, storage, MAIN); },
    isExplorationMission: () => false, reconcileHuntWrite: () => null,
    explorationWriteFailure: () => assert.fail('No active hunt in this aboard fixture'),
  };
  env.persistSocialProgress = callback('app/game/GameClient.tsx', 'persistSocialProgress', env);
  return { env, storage, observed, get save() { return env.saveRef.current; },
    commit: (action, physical) => callback('app/game/GameClient.tsx', 'commitClanShipIncident', env)(action, physical),
    operate: action => callback('app/game/GameClient.tsx', 'commitClanShipOperations', env)(action) };
}
const closure = save => ({ type: 'interact', targetId: 'seal-cargo', expectedRevision: save.clanShipIncidents.revision });
const physicalClosure = { actor: { x: 410, y: 650 }, escort: null };

test('the real campaign incident host withholds acknowledgement and the atomic reward on quota failure, then commits one retry', () => {
  const host = campaignHost(), before = host.save, initialBytes = [...host.storage.values], action = closure(before);
  host.storage.failQuota = true;
  assert.equal(host.commit(action, physicalClosure), false);
  assert.equal(host.save, before); assert.equal(host.observed.publications.length, 0);
  assert.deepEqual([...host.storage.values], initialBytes);
  assert.equal(host.observed.proposals.length, 1);
  assert.equal(host.observed.proposals[0].clanShipIncidents.activeIncident, null);
  assert.equal(host.observed.proposals[0].clanShipIncidents.completedIncidents.length, 1);
  assert.equal(host.observed.proposals[0].profile.clanMarks, before.profile.clanMarks + 8, 'receipt and reward share the same proposed campaign');
  host.storage.failQuota = false;
  assert.equal(host.commit(action, physicalClosure), true);
  assert.equal(host.save.profile.clanMarks, before.profile.clanMarks + 8);
  assert.equal(host.save.clanShipIncidents.completedIncidents.length, 1);
  assert.deepEqual(saveApi.loadSaveWithStatus(host.storage, MAIN).save.clanShipIncidents, host.save.clanShipIncidents);
  assert.equal(host.commit(action, physicalClosure), false, 'a stale repeated physical action is refused');
  assert.equal(host.observed.proposals.length, 2); assert.equal(host.observed.publications.length, 1);
});

test('the actual pending-write host reconciles the same reward without replay, and refreshes instead of overwriting it with a stale cancellation', () => {
  for (const sameIntent of [true, false]) {
    const host = campaignHost(), before = host.save, action = closure(before);
    host.storage.failReadback = true;
    assert.equal(host.commit(action, physicalClosure), false);
    assert.equal(host.save, before); assert.equal(host.observed.publications.length, 0);
    assert.ok(host.env.pendingSocialWriteRef.current);
    const storedBytes = [...host.storage.values], writeCount = host.storage.writes;
    const retry = sameIntent ? action : { type: 'cancel-incident', expectedRevision: before.clanShipIncidents.revision };
    assert.equal(host.commit(retry, physicalClosure), sameIntent);
    assert.equal(host.observed.reconciliations, 1); assert.equal(host.observed.proposals.length, 1);
    assert.equal(host.storage.writes, writeCount); assert.deepEqual([...host.storage.values], storedBytes);
    assert.equal(host.env.pendingSocialWriteRef.current, null);
    assert.equal(host.save.profile.clanMarks, before.profile.clanMarks + 8);
    assert.equal(host.save.clanShipIncidents.completedIncidents.length, 1);
    assert.equal(host.save.clanShipIncidents.activeIncident, null);
    assert.equal(host.observed.publications.length, 1);
    assert.equal(host.commit(action, physicalClosure), false);
  }
});

test('real campaign host guards reject paused, foreign, stale, incompatible and overflowing requests without storage calls', () => {
  const cases = [
    host => { host.env.sessionAliveRef.current = false; },
    host => { host.env.entry.ownerCreatedAt = '2026-11-05T17:00:00.000Z'; },
    host => { host.env.screen = 'deck'; },
    host => { host.env.gameFocusedV89 = false; },
    host => { host.env.settingsOpen = true; },
    host => { host.env.archiveTransferBusy = true; },
    host => { host.env.archiveRecoveryIssue = {}; },
    host => { host.env.campaignSaveBusy = true; },
    host => { host.env.resumableHunt = {}; },
    host => { host.env.pendingTrophyCommitRef.current = {}; },
    host => { host.env.pendingTerminalRunRef.current = {}; },
    host => { host.save.clanShipDocking.status = 'docked'; },
    host => { host.save.clanShipIncidents.version = 2; },
    host => { host.save.clanShipIncidents.ownerCreatedAt = 'foreign'; },
    host => { host.save.clanShipOperations.version = 2; },
    host => { host.save.profile.clanMarks = Number.MAX_SAFE_INTEGER; },
  ];
  for (const change of cases) {
    const host = campaignHost(); change(host);
    const before = JSON.stringify(host.save), bytes = [...host.storage.values];
    assert.equal(host.commit(closure(host.save), physicalClosure), false);
    assert.equal(JSON.stringify(host.save), before); assert.deepEqual([...host.storage.values], bytes);
    assert.equal(host.observed.proposals.length, 0); assert.equal(host.observed.publications.length, 0);
  }
  const host = campaignHost();
  assert.equal(host.commit({ ...closure(host.save), expectedRevision: 0 }, physicalClosure), false);
  assert.equal(host.commit(closure(host.save), { actor: { x: 1000, y: 640 }, escort: null }), false);
  assert.equal(host.operate({ type: 'accept-contract', contractId: 'ship-training-circuit', expectedRevision: host.save.clanShipOperations.revision }), false);
  assert.equal(host.observed.proposals.length, 0, 'mutual exclusion is enforced before a host write');
});

test('the real dev incident and replacement callbacks award only temporary RAM state and retain the focus, owner, service and stale guards', () => {
  const initial = fixture(), sourceBytes = JSON.stringify(initial), published = [], notices = [];
  const controls = { focused: true, storageCalls: 0 };
  const blockedStorage = () => { controls.storageCalls++; assert.fail('The dev host must not access browser storage'); };
  const env = { ...incidents, ...operations,
    saveRef: { current: structuredClone(initial) }, ownerRef: { current: OWNER }, sessionAliveRef: { current: true },
    destination: { kind: 'clan' }, serviceRef: { current: null }, readGameFocus: () => controls.focused,
    setSave: value => published.push(value), setNotice: value => notices.push(value),
    localStorage: { getItem: blockedStorage, setItem: blockedStorage, removeItem: blockedStorage },
    writeSaveWithStatus: blockedStorage, persistSocialProgress: blockedStorage,
  };
  env.window = { localStorage: env.localStorage };
  env.replaceSave = callback('app/dev/session.tsx', 'replaceSave', env);
  const commit = action => callback('app/dev/session.tsx', 'actClanIncident', env)(action, physicalClosure);
  const action = closure(env.saveRef.current);
  for (const change of ['focus', 'service', 'owner', 'session', 'destination']) {
    controls.focused = change !== 'focus'; env.serviceRef.current = change === 'service' ? 'settings' : null;
    env.ownerRef.current = change === 'owner' ? 'foreign' : OWNER; env.sessionAliveRef.current = change !== 'session';
    env.destination.kind = change === 'destination' ? 'ship' : 'clan';
    assert.equal(commit(action), false, change); assert.equal(published.length, 0);
  }
  controls.focused = true; env.serviceRef.current = null; env.ownerRef.current = OWNER; env.sessionAliveRef.current = true; env.destination.kind = 'clan';
  const operate = callback('app/dev/session.tsx', 'actClanOperations', env);
  assert.equal(operate({ type: 'accept-contract', contractId: 'ship-training-circuit', expectedRevision: env.saveRef.current.clanShipOperations.revision }), false);
  assert.equal(commit(action), true); assert.equal(published.length, 1);
  assert.equal(env.saveRef.current.profile.clanMarks, initial.profile.clanMarks + 8);
  assert.equal(env.saveRef.current.clanShipIncidents.completedIncidents.length, 1);
  assert.equal(commit(action), false); assert.equal(published.length, 1);
  assert.equal(controls.storageCalls, 0); assert.equal(JSON.stringify(initial), sourceBytes);
  assert.ok(notices.some(line => /essai temporaire, aucune campagne modifiée/.test(line)));
});
