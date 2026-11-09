import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const space = qa.load('app/game/systems/clanShipSpaceEncounter.ts');
const { ClanShipOperationsAudio, CLAN_SHIP_OPERATIONS_SOUND_CUES: CUES, confirmedClanShipOperationsCues } =
  qa.load('app/game/systems/clanShipOperationsAudio.ts');
const saves = qa.load('app/game/save.ts');
const OWNER = '2026-11-09T10:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
const campaign = saves.defaultSave(OWNER);
function action(state, command) { return { ...command, expectedRevision: state.revision }; }
function apply(state, command, roomId = 'conseil') {
  const sent = action(state, command), before = JSON.stringify(state);
  const result = ops.actClanShipOperations(state, sent, { ownerCreatedAt: OWNER, campaign,
    docking: { ownerCreatedAt: OWNER, status: 'aboard', roomId } });
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  assert.equal(result.changed, true);
  assert.equal(ops.inspectClanShipOperations(result.state, OWNER).status, 'valid');
  assert.equal(JSON.stringify(state), before, 'campaign action leaves its input unchanged');
  return { after: result.state, sent };
}
function ready() {
  let state = ops.createClanShipOperations(OWNER);
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) state = apply(state, { type: 'onboard-step', stepId: step.id }, step.roomId).after;
  return apply(state, { type: 'accept-mandate' }).after;
}
function start(state = ready(), contractId = 'space-screening') { return apply(state, { type: 'accept-contract', contractId }).after; }
function harness() {
  const played = [], calls = [];
  let available = true;
  const voice = {
    play(sound) {
      calls.push('play');
      if (!available) return false;
      const id = Object.keys(CUES).find(key => CUES[key] === sound);
      assert.ok(id, 'only a named authored preset reaches the shared voice');
      played.push(id); return true;
    },
    loop() { assert.fail('the table must not create another ambience loop'); },
    unlock() { calls.push('unlock'); }, stop() { calls.push('stop'); }, dispose() { calls.push('dispose'); },
  };
  const director = new ClanShipOperationsAudio(voice, OWNER);
  return { director, played, calls, setAvailable(value) { available = value; },
    clear() { played.length = 0; calls.length = 0; },
    issue(before, command, roomId = 'conseil') {
      const result = apply(before, command, roomId);
      director.issued(before, result.sent, true);
      director.sync(result.after);
      return result.after;
    } };
}
function turn(f, state, type) { return f.issue(state, { type: 'space-command', command: { type, expectedTurn: state.spaceEncounter.turn } }); }
function run(f, state, orders) { for (const order of orders) state = turn(f, state, order); return state; }

test('loading, inspecting forecasts and synchronizing an archive are silent until an explicit table interaction', () => {
  const state = start(), f = harness();
  f.director.sync(state);
  for (const order of space.CLAN_SHIP_SPACE_ORDERS) space.previewClanShipSpaceOrder(state.spaceEncounter, order);
  f.director.sync(clone(state));
  assert.deepEqual(f.played, []); assert.deepEqual(f.calls, []);
  f.director.open(state);
  assert.deepEqual(f.played, ['table-open']);
  f.director.open(state);
  f.director.sync(clone(state));
  assert.deepEqual(f.played, ['table-open'], 're-rendering an open table cannot replay activation');
});

test('activation and closure are distinct, bounded one-shots without an ambient loop', () => {
  const f = harness(), state = ready();
  f.director.open(state); f.director.close(); f.director.close();
  assert.deepEqual(f.played, ['table-open', 'table-close']);
  f.director.open(state); f.director.close();
  assert.deepEqual(f.played, ['table-open', 'table-close', 'table-open', 'table-close']);
  assert.equal(f.calls.filter(call => call === 'unlock').length, 4);
  f.director.dispose(); f.director.dispose();
  assert.equal(f.calls.filter(call => call === 'dispose').length, 1);
});

test('a true callback waits for the actual changed campaign revision before playing confirmation', () => {
  const state = ready(), f = harness(), { sent, after } = apply(state, { type: 'accept-contract', contractId: 'ship-armory-audit' });
  f.director.open(state); f.clear();
  f.director.issued(state, sent, true);
  assert.deepEqual(f.played, []);
  f.director.sync(clone(state));
  assert.deepEqual(f.played, [], 'an accepted boolean alone is not a durable state');
  f.director.sync(after); f.director.sync(clone(after));
  assert.deepEqual(f.played, ['order-accepted']);
});

test('an unconfirmed write has only the refusal sound, leaves the campaign untouched and cannot later announce success', () => {
  const state = ready(), before = JSON.stringify(state), f = harness();
  const { sent, after } = apply(state, { type: 'accept-contract', contractId: 'space-screening' });
  f.director.open(state); f.clear();
  f.director.issued(state, sent, false);
  assert.deepEqual(f.played, ['order-refused']);
  f.director.sync(state); f.director.sync(after);
  assert.deepEqual(f.played, ['order-refused'], 'no pending success survives a storage refusal');
  assert.equal(JSON.stringify(state), before);
});

test('accepting an actual space operation emits its start and contact warning once', () => {
  const state = ready(), f = harness(); f.director.open(state); f.clear();
  const after = f.issue(state, { type: 'accept-contract', contractId: 'space-screening' });
  assert.deepEqual(f.played, ['mission-start', 'contact-alert']);
  f.director.sync(clone(after));
  assert.deepEqual(f.played, ['mission-start', 'contact-alert']);
});

test('new confirmed turns sound scan, manoeuvre, defensive screen and the actual announced contact intent', () => {
  const f = harness(); let state = start(); f.director.open(state); f.clear();
  state = turn(f, state, 'scan');
  assert.deepEqual(f.played, ['scan', 'contact-alert']);
  f.clear(); state = turn(f, state, 'manoeuvre');
  assert.deepEqual(f.played, ['manoeuvre', 'contact-alert']);
  f.clear(); state = turn(f, state, 'brace');
  assert.deepEqual(f.played, ['brace'], 'the next acquisition intent has no volley/flank alarm');
  assert.equal(state.spaceEncounter.history.length, 3);
});

test('actual extraction resolves before a victory debrief and never mixes a stale hostile alarm', () => {
  const f = harness(); let state = start(); f.director.open(state);
  state = run(f, state, ['scan', 'manoeuvre', 'brace', 'brace']); f.clear();
  state = turn(f, state, 'extract');
  assert.equal(state.spaceEncounter.status, 'victory');
  assert.deepEqual(f.played, ['extraction', 'victory']);
  f.director.sync(clone(state));
  assert.deepEqual(f.played, ['extraction', 'victory']);
  f.director.close(); f.clear(); f.director.open(clone(state));
  assert.deepEqual(f.played, ['table-open'], 'reopening the saved terminal report is not another victory');
});

test('recharge, fire, neutralisation and boarding follow real orders rather than forecast reads', () => {
  const f = harness(); let state = start(); f.director.open(state);
  state = run(f, state, ['scan', 'manoeuvre', 'brace', 'brace', 'extract']);
  state = f.issue(state, { type: 'accept-contract', contractId: 'space-interception' }); f.clear();
  state = run(f, state, ['scan', 'manoeuvre', 'fire', 'recharge']);
  assert.ok(f.played.includes('fire')); assert.ok(f.played.includes('recharge'));
  state = run(f, state, ['brace', 'fire', 'brace', 'fire']);
  assert.equal(state.spaceEncounter.status, 'victory');
  state = f.issue(state, { type: 'accept-contract', contractId: 'space-recovery' }); f.clear();
  state = run(f, state, ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board']);
  assert.ok(f.played.includes('disrupt')); assert.ok(f.played.includes('board'));
  assert.equal(state.spaceEncounter.objectiveProgress, 2);
});

test('a real formation-integrity defeat has its own result and suppresses order/alert/victory sounds', () => {
  const f = harness(); let state = start(); f.director.open(state);
  while (state.spaceEncounter.status === 'active') {
    f.clear();
    const order = space.clanShipSpaceOrderAvailability(state.spaceEncounter, 'recharge').available ? 'recharge' : 'manoeuvre';
    state = turn(f, state, order);
  }
  assert.equal(state.spaceEncounter.status, 'defeat');
  assert.equal(state.spaceEncounter.formationIntegrity, 0);
  assert.ok(state.spaceEncounter.turn < 16);
  assert.deepEqual(f.played, ['defeat']);
});

test('voluntary withdrawal never sounds like a victory or a destruction', () => {
  const f = harness(), state = start(); f.director.open(state); f.clear();
  const after = turn(f, state, 'withdraw');
  assert.equal(after.spaceEncounter.status, 'withdrawn');
  assert.deepEqual(f.played, ['withdrawn']);
});

test('onboarding, interior controls and closing a contract use only their changed campaign state', () => {
  const f = harness(); let state = ops.createClanShipOperations(OWNER); f.director.open(state); f.clear();
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) state = f.issue(state, { type: 'onboard-step', stepId: step.id }, step.roomId);
  state = f.issue(state, { type: 'accept-mandate' });
  state = f.issue(state, { type: 'accept-contract', contractId: 'ship-armory-audit' });
  for (const step of ops.clanShipContract('ship-armory-audit').steps) state = f.issue(state, { type: 'interior-step', stepId: step.id }, step.roomId);
  assert.equal(f.played.filter(cue => cue === 'order-accepted').length, 8);
  state = f.issue(state, { type: 'accept-contract', contractId: 'space-screening' }); f.clear();
  f.issue(state, { type: 'cancel-contract' });
  assert.deepEqual(f.played, ['withdrawn']);
});

test('foreign, future or corrupt campaign state cannot play, confirm or replace a legitimate operation', () => {
  const f = harness(), state = start(), { sent, after } = apply(state, { type: 'space-command', command: { type: 'scan', expectedTurn: 0 } });
  for (const invalid of [{ ...state, ownerCreatedAt: 'foreign' }, { ...state, version: 2 }, { ...state, spaceEncounter: { ...state.spaceEncounter, energy: 999 } }]) {
    f.director.open(invalid); f.director.issued(invalid, sent, true); f.director.sync(invalid);
    assert.deepEqual(confirmedClanShipOperationsCues(invalid, sent, after), []);
  }
  assert.deepEqual(f.played, []);
  f.director.open(state); f.clear(); f.director.issued(state, sent, true);
  f.director.sync({ ...after, ownerCreatedAt: 'foreign' });
  f.director.sync(after);
  assert.deepEqual(f.played, [], 'an invalid synchronization consumes pending audio before recovery');
});

test('another accepted order at the same revision cannot be substituted for the attempted order', () => {
  const f = harness(), state = start(), sent = action(state, { type: 'space-command', command: { type: 'scan', expectedTurn: 0 } });
  const wrong = apply(state, { type: 'space-command', command: { type: 'manoeuvre', expectedTurn: 0 } }).after;
  assert.deepEqual(confirmedClanShipOperationsCues(state, sent, wrong), []);
  f.director.open(state); f.clear(); f.director.issued(state, sent, true); f.director.sync(wrong);
  assert.deepEqual(f.played, []);
});

test('closing, blur/pause and resuming never queue a pending command or replay a debrief', () => {
  for (const interrupt of ['close', 'suspend', 'disabled-sync']) {
    const f = harness(), state = start(), { sent, after } = apply(state, { type: 'space-command', command: { type: 'scan', expectedTurn: 0 } });
    f.director.open(state); f.director.issued(state, sent, true);
    if (interrupt === 'disabled-sync') f.director.sync(state, false); else f.director[interrupt]();
    f.clear(); f.director.sync(after, true); f.director.open(after); f.director.sync(clone(after));
    assert.ok(f.played.every(cue => cue === 'table-open'), interrupt);
  }
});

test('autoplay-blocked or muted commands are consumed rather than played after output returns', () => {
  const f = harness(); let state = start(); f.director.open(state); f.clear(); f.setAvailable(false);
  state = turn(f, state, 'scan');
  assert.deepEqual(f.played, []);
  assert.ok(f.calls.includes('play'), 'the immediate voice attempt is observable but not audible');
  f.setAvailable(true); f.director.sync(clone(state));
  assert.deepEqual(f.played, []);
  state = turn(f, state, 'manoeuvre');
  assert.deepEqual(f.played, ['manoeuvre', 'contact-alert']);
});

test('stale expected revisions, stale tactical turns and skipped campaign revisions are silent', () => {
  const f = harness(), state = start(), { sent, after } = apply(state, { type: 'space-command', command: { type: 'scan', expectedTurn: 0 } });
  f.director.open(state); f.clear();
  f.director.issued(state, { ...sent, expectedRevision: state.revision - 1 }, true); f.director.sync(after);
  assert.deepEqual(f.played, []);
  f.director.issued(state, { ...sent, command: { type: 'scan', expectedTurn: 1 } }, true); f.director.sync(after);
  assert.deepEqual(f.played, []);
  const later = apply(after, { type: 'space-command', command: { type: 'manoeuvre', expectedTurn: 1 } }).after;
  f.director.issued(state, sent, true); f.director.sync(later); f.director.sync(after);
  assert.deepEqual(f.played, []);
});

test('disposal is final and releases the shared scene voice exactly once', () => {
  const f = harness(), state = start(), { sent, after } = apply(state, { type: 'space-command', command: { type: 'scan', expectedTurn: 0 } });
  f.director.open(state); f.clear(); f.director.dispose(); f.director.dispose();
  f.director.open(state); f.director.issued(state, sent, true); f.director.sync(after); f.director.close();
  assert.deepEqual(f.played, []); assert.deepEqual(f.calls, ['dispose']);
});

test('rendering the actual hub on the server cannot create or unlock an audio engine', () => {
  let calls = 0;
  const state = start();
  const html = qa.render('app/game/ClanShipHub.tsx', {
    state: { version: 1, ownerCreatedAt: OWNER, personalShipId: 'classic-predator-spaceship', status: 'aboard', roomId: 'conseil', revision: 3 },
    save: { ...campaign, clanShipOperations: state }, selectedShipId: 'classic-predator-spaceship', suspended: false,
    onAction() { return true; }, onOperations() { return true; }, onService() {}, onExit() {}, onOpenSettings() {},
    createSceneAudio() { calls += 1; throw new Error('SSR must remain silent'); },
  });
  assert.ok(html.includes('Salle du conseil') || html.includes('Conseil du clan'));
  assert.equal(calls, 0);
});
