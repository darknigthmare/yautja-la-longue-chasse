import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const api = homeworldQaModelV64(process.cwd(), [
  '../../dev/destinations.ts', '../shipCatalogue.ts', '../hunterLore.ts',
  'planetArrival.ts', 'planetArrivalRun.ts', 'planetInsertion.ts', 'wolfCastle.ts',
]);
const source = fs.readFileSync('app/dev/session.tsx', 'utf8');
const tree = ts.createSourceFile('session.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Execute the host's actual callbacks, not a second implementation of their
// guards. React refs/setters and navigation are ports; scene reducers are real.
// Stay in the reducers' realm: their DTO validators require plain objects.
function sessionHandler(name, environment) {
  let implementation;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name &&
        node.initializer && ts.isCallExpression(node.initializer) &&
        node.initializer.expression.getText(tree) === 'useCallback') implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert(implementation, `Execute actual DevTravelSession ${name}`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(environment), `${compiled}; return handler;`)(...Object.values(environment));
}

function mountSession(id) {
  const destination = api.resolveDevDestination(id);
  const save = api.createDevSave(destination);
  const fixture = destination.kind === 'arrival' ? api.createDevArrival(destination, save) : null;
  const observations = { arrival: [], writes: [], destinations: [], exits: 0, audioPauses: [], notices: [], order: [] };
  const controls = { focused: true };
  const environment = {
    ...api, destination, arrivalFixture: fixture,
    saveRef: { current: save }, ownerRef: { current: save.createdAt },
    sessionAliveRef: { current: true }, serviceRef: { current: null },
    restoreWolfFocusRef: { current: false },
    audioRef: { current: { setPaused(value) { observations.audioPauses.push(value); observations.order.push(`audio:${value}`); } } },
    arrivalRef: { current: fixture?.state ?? null },
    selectedShipId: api.DEFAULT_SHIP_ID,
    readGameFocus() { return controls.focused; },
    subscribeGameFocus(notify) { controls.notifyFocus = notify; return () => { controls.notifyFocus = null; }; },
    setService(value) { observations.order.push(`service:${value}`); },
    setArrival(value) { observations.arrival.push(value); },
    setNotice(value) { observations.notices.push(value); },
    replaceSave(value) { environment.saveRef.current = value; observations.writes.push(value); },
    onTravel(value) { observations.destinations.push(value); },
    onExit() { observations.exits++; },
  };
  for (const name of ['subscribeFocus', 'openService', 'closeService', 'leaveSession', 'exitSession', 'returnToShip', 'inspectArrivalUpdate',
    'checkpointArrival', 'finishArrival', 'exitArrival', 'actWolf', 'checkpointWolf']) {
    environment[name] = sessionHandler(name, environment);
  }
  return { environment, observations, controls,
    get arrival() { return environment.arrivalRef.current; },
    get save() { return environment.saveRef.current; } };
}

test('all native arrivals and explicit insertion variants pause, resume and hand off once without changing a campaign document', () => {
  for (const destination of api.DEV_DESTINATIONS.filter(entry => entry.kind === 'arrival')) {
    const run = mountSession(destination.id), host = run.environment;
    const savedBytes = JSON.stringify(run.save);
    assert.equal(host.checkpointArrival(api.startPlanetArrival(run.arrival)), true, destination.id);
    let timeline = run.arrival;
    for (let frame = 0; frame < 90; frame++) timeline = api.advancePlanetArrival(timeline, 100);
    assert.equal(host.checkpointArrival(api.pausePlanetArrival(timeline)), true);
    assert.equal(run.arrival.status, 'paused');
    assert.equal(run.arrival.elapsedMs, 9_000);
    assert.equal(host.checkpointArrival(api.startPlanetArrival(run.arrival)), true);
    assert.equal(run.arrival.status, 'playing');
    assert.equal(run.arrival.elapsedMs, 9_000, 'resume does not rewind the mounted presentation');
    const pending = api.requestPlanetArrivalHandoff(run.arrival, 'skipped');
    const before = run.observations.arrival.length;
    assert.equal(host.finishArrival(pending), true);
    assert.equal(run.arrival.status, 'complete');
    assert.equal(run.arrival.completedBy, 'skipped');
    assert.equal(run.observations.arrival.length, before + 1);
    assert.equal(host.finishArrival(pending), true, 'the same acknowledgement is idempotent');
    assert.equal(run.observations.arrival.length, before + 1, 'no second render transition is published');
    assert.equal(host.checkpointArrival(api.pausePlanetArrival(timeline)), false);
    host.exitArrival();
    assert.equal(run.observations.exits, 0, 'a late cinematic exit cannot close the active hunt');
    assert.equal(JSON.stringify(run.save), savedBytes);
    assert.equal(run.observations.writes.length, 0);
  }
});

test('natural handoff requires the real end of the native timeline and remains idempotent', () => {
  const run = mountSession('arrival-jungle-vey'), host = run.environment;
  let timeline = api.startPlanetArrival(run.arrival);
  assert.equal(host.checkpointArrival(timeline), true);
  assert.equal(host.finishArrival({ ...timeline, status: 'handoff-pending', completedBy: 'natural' }), false);
  for (let frame = 0; frame < api.PLANET_ARRIVAL_DURATION_MS / 100; frame++) {
    timeline = api.advancePlanetArrival(timeline, 100);
  }
  assert.equal(timeline.status, 'handoff-pending');
  assert.equal(timeline.completedBy, 'natural');
  assert.equal(host.finishArrival(timeline), true);
  assert.equal(run.arrival.elapsedMs, api.PLANET_ARRIVAL_DURATION_MS);
  const transitionCount = run.observations.arrival.length;
  assert.equal(host.finishArrival(timeline), true);
  assert.equal(run.observations.arrival.length, transitionCount);
});

test('arrival checkpoints reject another owner, run, mission, ship, preset, encounter or earlier time', () => {
  const run = mountSession('arrival-jungle-vey'), host = run.environment;
  const initial = run.arrival;
  const changes = [
    { ownerCreatedAt: '2001-01-01T00:00:00.000Z' },
    { runId: 'another-run' },
    { missionId: api.DEV_DESTINATIONS.find(entry => entry.kind === 'arrival' && entry.missionId !== initial.missionId).missionId },
    { personalShipId: api.SHIP_IDS.find(id => id !== initial.personalShipId) },
    { hunterPresetId: api.HUNTER_PRESETS.find(preset => preset.id !== initial.hunterPresetId).id },
    { encounterRun: initial.encounterRun + 1 },
    { insertion: { version: 1, method: 'ship', team: 'solo' } },
    { insertion: { version: 1, method: 'pod', team: 'triad' } },
  ];
  for (const change of changes) {
    const other = api.startPlanetArrival(api.createPlanetArrival({ ...initial, ...change }));
    assert.equal(api.inspectPlanetArrival(other).status, 'valid', 'the substituted DTO is natively valid');
    assert.equal(host.checkpointArrival(other), false, JSON.stringify(change));
    assert.equal(host.finishArrival(api.requestPlanetArrivalHandoff(other)), false, JSON.stringify(change));
  }
  const advanced = api.advancePlanetArrival(api.startPlanetArrival(initial), 100);
  assert.equal(host.checkpointArrival(advanced), true);
  assert.equal(host.checkpointArrival(api.startPlanetArrival(initial)), false);
  assert.equal(host.finishArrival(api.requestPlanetArrivalHandoff(initial)), false);
  assert.equal(run.arrival.elapsedMs, 100);
  host.arrivalFixture.run.configuration.inventory = null;
  assert.equal(host.finishArrival(api.requestPlanetArrivalHandoff(advanced)), false, 'the frozen run must also validate');
  assert.equal(run.arrival.status, 'playing');
});

test('a ship or triad session rejects a substituted insertion plan at checkpoint and handoff', () => {
  for (const id of ['arrival-ship-jungle-vey', 'arrival-triad-jungle-vey', 'arrival-ship-triad-jungle-vey']) {
    const run = mountSession(id), host = run.environment;
    const initial = run.arrival;
    for (const insertion of [undefined, { ...initial.insertion, method: initial.insertion.method === 'ship' ? 'pod' : 'ship' },
      { ...initial.insertion, team: initial.insertion.team === 'solo' ? 'triad' : 'solo' }]) {
      const substituted = api.startPlanetArrival(api.createPlanetArrival({ ...initial, insertion }));
      assert.equal(api.inspectPlanetArrival(substituted).status, 'valid');
      assert.equal(host.checkpointArrival(substituted), false, id);
      assert.equal(host.finishArrival(api.requestPlanetArrivalHandoff(substituted)), false, id);
    }
    const pending = api.requestPlanetArrivalHandoff(api.startPlanetArrival(initial));
    assert.equal(host.finishArrival(pending), true);
    assert.deepEqual(run.arrival.insertion, initial.insertion);
    assert.deepEqual(host.arrivalFixture.run.configuration.insertion, initial.insertion);
    assert.equal(host.arrivalFixture.run.configuration.insertionShipId, initial.personalShipId);
    assert.equal(run.observations.writes.length, 0);
  }
});

test('leaving a presentation invalidates its late handoff even when a reset has the same synthetic owner', () => {
  const run = mountSession('arrival-jungle-vey'), host = run.environment;
  const pending = api.requestPlanetArrivalHandoff(api.startPlanetArrival(run.arrival));
  host.exitArrival();
  assert.equal(host.sessionAliveRef.current, false);
  assert.equal(run.observations.exits, 1);
  assert.deepEqual(run.observations.audioPauses, [true]);
  const reset = mountSession('arrival-jungle-vey');
  assert.equal(reset.save.createdAt, run.save.createdAt);
  assert.equal(host.checkpointArrival(api.startPlanetArrival(run.arrival)), false);
  assert.equal(host.finishArrival(pending), false);
  host.exitArrival();
  assert.equal(run.observations.exits, 1);
  assert.equal(reset.arrival.status, 'prepared');
  assert.equal(reset.environment.finishArrival(api.requestPlanetArrivalHandoff(reset.arrival)), true);
});

test('Wolf actions and walking checkpoints keep the native revision, menu and departure boundaries', () => {
  const run = mountSession('wolf-approach'), host = run.environment;
  assert.equal(host.actWolf({ type: 'board' }), true);
  assert.equal(run.save.wolfCastle.status, 'aboard');
  const visit = run.save.wolfCastle;
  const position = api.stepWolfCastleActor(visit.roomId, visit.position, { x: 1, y: 0 }, 50);
  const checkpoint = { ownerCreatedAt: run.save.createdAt, personalShipId: visit.personalShipId,
    roomId: visit.roomId, expectedRevision: visit.revision, position: { ...position, facing: 1 }, combat: null };
  assert.equal(host.checkpointWolf(checkpoint), true);
  assert(run.save.wolfCastle.position.x > visit.position.x);
  assert.equal(host.checkpointWolf(checkpoint), false, 'an older revision cannot replace the latest position');
  assert.equal(host.checkpointWolf({ ...checkpoint, expectedRevision: run.save.wolfCastle.revision,
    ownerCreatedAt: '2001-01-01T00:00:00.000Z' }), false);
  host.serviceRef.current = 'settings';
  assert.equal(host.actWolf({ type: 'depart' }), false, 'menu suspends actions');
  assert.equal(host.checkpointWolf({ ...checkpoint, expectedRevision: run.save.wolfCastle.revision }), true,
    'opening the menu still permits the last visible frame');
  host.serviceRef.current = null;
  run.controls.focused = false;
  assert.equal(host.actWolf({ type: 'depart' }), false, 'blur suspends actions');
  run.controls.focused = true;
  assert.equal(host.actWolf({ type: 'depart' }), true);
  assert.deepEqual(run.observations.destinations, ['ship']);
  assert.equal(host.sessionAliveRef.current, false);
  assert.equal(host.actWolf({ type: 'approach' }), false);
  assert.equal(host.checkpointWolf({ ...checkpoint, expectedRevision: run.save.wolfCastle.revision }), false);
  assert.equal(run.save.wolfCastle.status, 'departed');
});

test('returning from settings or blur resumes the audio owner before native scene effects can request a loop', () => {
  const run = mountSession('wolf-royal-berth'), host = run.environment;
  host.openService('settings');
  assert.equal(host.serviceRef.current, 'settings');
  assert.equal(host.restoreWolfFocusRef.current, true);
  assert.deepEqual(run.observations.order, ['audio:true', 'service:settings']);
  run.observations.order.length = 0;
  host.closeService();
  assert.equal(host.serviceRef.current, null);
  assert.deepEqual(run.observations.order, ['audio:false', 'service:null']);
  const unsubscribe = host.subscribeFocus(() => run.observations.order.push('notify-focus'));
  run.controls.focused = false;
  run.observations.order.length = 0;
  run.controls.notifyFocus();
  assert.deepEqual(run.observations.order, ['audio:true', 'notify-focus']);
  run.controls.focused = true;
  run.observations.order.length = 0;
  run.controls.notifyFocus();
  assert.deepEqual(run.observations.order, ['audio:false', 'notify-focus']);
  host.leaveSession();
  run.observations.order.length = 0;
  host.openService('settings');
  host.closeService();
  run.controls.notifyFocus();
  assert.deepEqual(run.observations.order, [], 'a retired owner cannot reactivate the audio bus');
  unsubscribe();
  assert.equal(run.controls.notifyFocus, null);
});
