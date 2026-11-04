import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
const ownerCreatedAt = '2026-11-04T10:00:00.000Z';
const personalShipId = 'classic-predator-spaceship';
const context = Object.freeze({ ownerCreatedAt, personalShipId });
const fresh = () => docking.createClanShipDockingState(ownerCreatedAt, personalShipId);

function act(state, type, payload = {}, current = context) {
  const result = docking.actClanShipDocking(state, { type, ...payload }, current);
  assert.equal(result.accepted, true, `${type}: ${result.message}`);
  assert.equal(result.changed, true);
  assert.equal(result.reason, null);
  assert.equal(docking.inspectClanShipDocking(result.state, current.ownerCreatedAt).status, 'valid');
  return result.state;
}

function at(status) {
  let state = fresh();
  if (status === 'free-flight') return state;
  state = act(state, 'approach');
  if (status === 'approach') return state;
  state = act(state, 'dock');
  return status === 'docked' ? state : act(state, 'board');
}

function denied(state, action, current = context, reason) {
  const before = JSON.stringify(state);
  const result = docking.actClanShipDocking(state, action, current);
  assert.equal(result.accepted, false);
  assert.equal(result.changed, false);
  assert.equal(result.state, state, 'refusal must retain the original state');
  assert.equal(JSON.stringify(state), before);
  if (reason) assert.equal(result.reason, reason);
  return result;
}

test('old saves without a visit, including explicit null, start in their existing personal hull', () => {
  for (const raw of [undefined, null]) {
    assert.equal(docking.inspectClanShipDocking(raw, ownerCreatedAt).status, 'absent');
    assert.deepEqual(docking.normalizeClanShipDocking(raw, ownerCreatedAt, personalShipId), fresh());
  }
  assert.notEqual(fresh(), fresh());
  assert.equal(fresh().clanShipId, 'avp-clan-mothership');
  assert.notEqual(fresh().clanShipId, fresh().personalShipId);
});

test('constructor requires bounded owner identity and a real catalogue hull', () => {
  for (const owner of ['', ' ', ' owner', 'owner\n', '\u0000', 'a'.repeat(161), 42, null]) {
    assert.throws(() => docking.createClanShipDockingState(owner, personalShipId), TypeError);
    assert.equal(docking.normalizeClanShipDocking(undefined, owner, personalShipId), null);
  }
  for (const hull of ['avp-clan-mothership', '__proto__', 'unknown', '', 1, null]) {
    assert.throws(() => docking.createClanShipDockingState(ownerCreatedAt, hull), TypeError);
    assert.equal(docking.normalizeClanShipDocking(undefined, ownerCreatedAt, hull), null);
  }
  for (const hull of SHIP_IDS) {
    assert.equal(docking.createClanShipDockingState(ownerCreatedAt, hull).personalShipId, hull);
  }
});

test('approach, dock, entry, return and undock preserve two distinct ship identities', () => {
  let state = fresh();
  for (const [command, expected] of [
    ['approach', 'approach'], ['dock', 'docked'], ['board', 'aboard'],
    ['return-to-personal', 'docked'], ['undock', 'free-flight'],
  ]) {
    state = act(state, command);
    assert.equal(state.status, expected);
    assert.equal(state.personalShipId, personalShipId);
    assert.equal(state.clanShipId, 'avp-clan-mothership');
    assert.equal(state.ownerCreatedAt, ownerCreatedAt);
    assert.equal(state.roomId, 'hangar');
  }
});

test('the hunter must return to their docked personal ship before undocking', () => {
  let state = act(at('aboard'), 'move-room', { roomId: 'conseil' });
  const refusal = denied(state, { type: 'undock' }, context, 'invalid-transition');
  assert.match(refusal.message, /Revenir dans le vaisseau personnel/);
  state = act(state, 'return-to-personal');
  assert.equal(state.status, 'docked');
  assert.equal(state.roomId, 'hangar');
  state = act(state, 'undock');
  assert.equal(state.status, 'free-flight');
});

test('no command skips a docking stage; duplicate commands cannot advance twice', () => {
  const legal = {
    'free-flight': ['approach'],
    approach: ['cancel-approach', 'dock'],
    docked: ['board', 'undock'],
    aboard: ['return-to-personal'],
  };
  const commands = ['approach', 'cancel-approach', 'dock', 'board', 'return-to-personal', 'undock'];
  for (const status of Object.keys(legal)) {
    const state = Object.freeze(at(status));
    for (const type of commands) {
      if (legal[status].includes(type)) {
        const next = act(state, type);
        denied(next, { type }, context, 'invalid-transition');
      } else {
        denied(state, { type }, context, 'invalid-transition');
      }
    }
  }
});

test('each clan room round-trips as the exact occupied room; boarding starts in the hangar', () => {
  let state = at('aboard');
  for (const roomId of docking.CLAN_SHIP_ROOM_IDS) {
    if (roomId !== state.roomId) state = act(state, 'move-room', { roomId });
    const serialized = JSON.stringify(state);
    const restored = docking.normalizeClanShipDocking(JSON.parse(serialized), ownerCreatedAt, 'wolf-ship');
    assert.deepEqual(restored, state, 'loading must not replace the occupied room or docked hull');
    assert.equal(restored.status, 'aboard');
    assert.equal(restored.roomId, roomId);
    denied(restored, { type: 'move-room', roomId }, context, 'already-there');
  }
  state = act(state, 'return-to-personal');
  state = act(state, 'board');
  assert.equal(state.roomId, 'hangar');
});

test('a serialized checkpoint resumes every docking stage without a movement or write', () => {
  for (const status of ['free-flight', 'approach', 'docked', 'aboard']) {
    const state = Object.freeze(at(status));
    const bytes = JSON.stringify(state);
    const inspected = docking.inspectClanShipDocking(JSON.parse(bytes), ownerCreatedAt);
    assert.equal(inspected.status, 'valid');
    assert.deepEqual(inspected.state, state);
    assert.notEqual(inspected.state, state);
    assert.equal(JSON.stringify(state), bytes);
  }
});

test('room navigation exists only aboard and rejects invented rooms', () => {
  for (const status of ['free-flight', 'approach', 'docked']) {
    denied(at(status), { type: 'move-room', roomId: 'archives' }, context, 'invalid-transition');
  }
  for (const roomId of ['castle', '__proto__', '', null, 1]) {
    denied(at('aboard'), { type: 'move-room', roomId }, context, 'invalid-action');
    assert.equal(docking.isClanShipRoomId(roomId), false);
  }
});

test('hull selection is locked through approach and the full docking visit', () => {
  const action = { type: 'select-personal-ship', personalShipId: 'wolf-ship' };
  for (const status of ['approach', 'docked', 'aboard']) {
    const state = at(status);
    assert.equal(docking.canSelectPersonalShip(state), false);
    denied(state, action, context, 'personal-ship-locked');
  }
  assert.equal(docking.canSelectPersonalShip(fresh()), true);
  const selected = act(fresh(), action.type, { personalShipId: action.personalShipId });
  assert.equal(selected.personalShipId, 'wolf-ship');
  assert.equal(selected.clanShipId, 'avp-clan-mothership');
  assert.equal(selected.status, 'free-flight');
  denied(selected, action, { ...context, personalShipId: 'wolf-ship' }, 'already-there');
});

test('a personal AVP hull remains an independent identity from the AVP clan destination', () => {
  const current = { ...context, personalShipId: 'avp-predator-mothership' };
  let state = docking.createClanShipDockingState(ownerCreatedAt, current.personalShipId);
  for (const type of ['approach', 'dock', 'board']) state = act(state, type, {}, current);
  assert.equal(state.personalShipId, 'avp-predator-mothership');
  assert.equal(state.clanShipId, 'avp-clan-mothership');
});

test('only free flight reconciles a fleet change; an engaged personal hull cannot be replaced', () => {
  const current = { ...context, personalShipId: 'wolf-ship' };
  const bound = act(fresh(), 'approach', {}, current);
  assert.equal(bound.personalShipId, 'wolf-ship');
  denied(bound, { type: 'dock' }, context, 'personal-ship-mismatch');
  for (const [status, type] of [['approach', 'dock'], ['docked', 'board'], ['aboard', 'return-to-personal']]) {
    denied(at(status), { type }, current, 'personal-ship-mismatch');
  }
  assert.deepEqual(docking.normalizeClanShipDocking(fresh(), ownerCreatedAt, 'wolf-ship'), fresh(),
    'save normalization must not silently rewrite the stored hull');
});

test('another campaign cannot act on or adopt an existing visit', () => {
  const foreign = { ...context, ownerCreatedAt: '2026-11-04T12:00:00.000Z' };
  for (const [status, type] of [['free-flight', 'approach'], ['approach', 'dock'], ['docked', 'board'], ['aboard', 'return-to-personal']]) {
    const state = at(status);
    denied(state, { type }, foreign, 'owner-mismatch');
    assert.equal(docking.inspectClanShipDocking(state, foreign.ownerCreatedAt).status, 'invalid-save');
    assert.equal(docking.normalizeClanShipDocking(state, foreign.ownerCreatedAt, personalShipId), null);
  }
});

test('malformed snapshots are rejected without coercion, resetting or dropping unknown data', () => {
  const invalid = [
    [], 1, 'saved', true, {},
    ...[0, -1, '1', 1.5, NaN].map(version => ({ ...fresh(), version })),
    ...['', ' ', 'a\n', 'a'.repeat(161)].map(ownerCreatedAt => ({ ...fresh(), ownerCreatedAt })),
    { ...fresh(), clanShipId: personalShipId },
    { ...fresh(), personalShipId: 'avp-clan-mothership' },
    { ...fresh(), personalShipId: '__proto__' },
    { ...fresh(), status: 'landed' },
    { ...fresh(), roomId: 'secret' },
    ...['free-flight', 'approach', 'docked'].map(status => ({ ...fresh(), status, roomId: 'conseil' })),
    { ...fresh(), extraProgress: { valuable: true } },
    Object.create(fresh()),
  ];
  for (const key of Object.keys(fresh())) {
    const missing = fresh();
    delete missing[key];
    invalid.push(missing);
  }
  for (const raw of invalid) {
    const before = JSON.stringify(raw);
    assert.equal(docking.inspectClanShipDocking(raw, ownerCreatedAt).status, 'invalid-save');
    assert.equal(docking.normalizeClanShipDocking(raw, ownerCreatedAt, personalShipId), null);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('future schemas expose a protectable diagnostic and never become a fresh visit', () => {
  for (const future of [
    { ...at('aboard'), version: 2, roomId: 'new-room', importantProgress: 123 },
    { version: 17, futureData: { preserve: true } },
  ]) {
    const bytes = JSON.stringify(future);
    const inspected = docking.inspectClanShipDocking(future, ownerCreatedAt);
    assert.equal(inspected.status, 'future-version');
    assert.equal(inspected.state, null);
    assert.equal(docking.normalizeClanShipDocking(future, ownerCreatedAt, personalShipId), null);
    denied(future, { type: 'undock' }, context, 'future-version');
    assert.equal(JSON.stringify(future), bytes);
  }
});

test('invalid command/context payloads are refused before any state transition', () => {
  const state = Object.freeze(fresh());
  for (const action of [null, [], {}, { type: new String('approach') }, { type: 0 },
    { type: 'teleport' }, { type: 'approach', roomId: 'conseil' },
    { type: 'select-personal-ship', personalShipId: 'unknown' }, { type: 'move-room' }]) {
    denied(state, action, context, 'invalid-action');
  }
  for (const current of [null, [], {}, { ...context, ownerCreatedAt: '' }, { ...context, personalShipId: 'unknown' }]) {
    denied(state, { type: 'approach' }, current, 'invalid-context');
  }
  assert.equal(docking.canSelectPersonalShip({ ...state, version: 2 }), false);
  assert.equal(docking.canSelectPersonalShip(null), false);
});

test('replaying the same input history is deterministic and does not mutate prior checkpoints', () => {
  const commands = [
    { type: 'approach' }, { type: 'dock' }, { type: 'board' },
    { type: 'move-room', roomId: 'armurerie' }, { type: 'return-to-personal' }, { type: 'undock' },
  ];
  function replay() {
    let state = Object.freeze(fresh());
    const checkpoints = [];
    for (const command of commands) {
      const before = JSON.stringify(state);
      const result = docking.actClanShipDocking(state, Object.freeze(command), context);
      assert.equal(result.accepted, true, result.message);
      assert.equal(JSON.stringify(state), before);
      checkpoints.push(before);
      state = Object.freeze(result.state);
      denied(state, command);
    }
    return { state, checkpoints };
  }
  assert.deepEqual(replay(), replay());
});
