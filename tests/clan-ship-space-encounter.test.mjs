import test from 'node:test';
import assert from 'node:assert/strict';
import * as space from '../app/game/systems/clanShipSpaceEncounter.ts';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const paths = Object.freeze({
  escort: ['scan', 'manoeuvre', 'brace', 'brace', 'extract'],
  interception: ['scan', 'manoeuvre', 'fire', 'brace', 'brace', 'fire', 'brace', 'fire'],
  recovery: ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract'],
});

function act(state, type) {
  const result = space.actClanShipSpaceEncounter(state, { type, expectedTurn: state.turn });
  assert.equal(result.accepted, true, `${type} at turn ${state.turn}: ${result.message}`);
  assert.equal(result.changed, true);
  assert.equal(result.state.turn, state.turn + 1);
  assert.equal(space.inspectClanShipSpaceEncounter(result.state).status, 'valid');
  return result.state;
}
function run(kind, orders, crew = []) {
  let state = space.createClanShipSpaceEncounter(kind, crew);
  for (const order of orders) state = act(state, order);
  return state;
}
function deny(state, command, reason) {
  const before = JSON.stringify(state);
  const result = space.actClanShipSpaceEncounter(state, command);
  assert.equal(result.accepted, false);
  assert.equal(result.changed, false);
  assert.equal(result.state, state, 'a refusal retains the exact original state');
  assert.equal(JSON.stringify(state), before);
  if (reason) assert.equal(result.reason, reason);
  return result;
}

test('three independently constructed encounters start without granting a victory or advancing a clock', () => {
  for (const kind of space.CLAN_SHIP_SPACE_KINDS) {
    const state = space.createClanShipSpaceEncounter(kind);
    assert.equal(state.status, 'active');
    assert.equal(state.turn, 0);
    assert.deepEqual(state.history, []);
    assert.equal(state.kind, kind);
    assert.equal(space.inspectClanShipSpaceEncounter(state).status, 'valid');
    assert.notEqual(state, space.createClanShipSpaceEncounter(kind));
  }
});

test('only known scenarios and unique known crew roles can start a sortie', () => {
  for (const kind of ['royal-castle', '__proto__', '', null, 0]) assert.throws(() => space.createClanShipSpaceEncounter(kind), TypeError);
  for (const crew of [['navigator', 'navigator'], ['royal-fleet'], null, {}, Array(2)]) {
    assert.throws(() => space.createClanShipSpaceEncounter('escort', crew), TypeError);
  }
  const state = space.createClanShipSpaceEncounter('escort', ['warden', 'navigator']);
  assert.deepEqual(state.crewRoles, ['navigator', 'warden']);
});

test('each mission can be won through different actual objectives without any recruited bonus', () => {
  for (const [kind, orders] of Object.entries(paths)) {
    const state = run(kind, orders);
    assert.equal(state.status, 'victory', kind);
    assert.ok(state.formationIntegrity > 0);
    assert.ok(state.assetIntegrity > 0);
    if (kind === 'interception') assert.equal(state.hostileIntegrity, 0);
    else assert.equal(state.objectiveProgress, 3);
  }
});

test('interception also supports a non-destructive boarding victory', () => {
  const boarding = paths.recovery.slice(0, 11);
  const state = run('interception', boarding);
  assert.equal(state.status, 'victory');
  assert.equal(state.hostileDrive, 0);
  assert.equal(state.hostileIntegrity, 92, 'neutralisation does not require destroying the contact');
  assert.equal(state.history.at(-1), 'board');
});

test('an escort needs identification, coverage and explicit extraction; destruction alone is insufficient', () => {
  let state = run('escort', ['brace', 'manoeuvre', 'brace']);
  assert.equal(state.objectiveProgress, 0, 'blind manoeuvres do not prove the route is clear');
  deny(state, { type: 'extract', expectedTurn: state.turn }, 'objective-incomplete');
  state = act(state, 'scan');
  for (const type of ['brace', 'brace', 'brace']) state = act(state, type);
  assert.equal(state.objectiveProgress, 3);
  assert.equal(state.status, 'active');
  state = act(state, 'extract');
  assert.equal(state.status, 'victory');
  const cleared = run('escort', paths.interception);
  assert.equal(cleared.hostileIntegrity, 0);
  assert.equal(cleared.status, 'active');
  assert.equal(act(act(cleared, 'brace'), 'extract').status, 'victory');
});

test('recovery requires a close, analysed, weakened contact and the capsule must still be extracted', () => {
  let state = space.createClanShipSpaceEncounter('recovery');
  deny(state, { type: 'board', expectedTurn: 0 }, 'intel-required');
  state = run('recovery', ['scan', 'scan']);
  deny(state, { type: 'board', expectedTurn: state.turn }, 'range-required');
  state = act(act(state, 'manoeuvre'), 'manoeuvre');
  deny(state, { type: 'board', expectedTurn: state.turn }, 'target-not-disabled');
  const recovered = run('recovery', paths.recovery.slice(0, 11));
  assert.equal(recovered.status, 'active');
  assert.equal(recovered.objectiveProgress, 2);
  deny(recovered, { type: 'board', expectedTurn: recovered.turn }, 'no-change');
  deny(recovered, { type: 'extract', expectedTurn: recovered.turn }, 'insufficient-energy');
  assert.equal(act(act(recovered, 'brace'), 'extract').status, 'victory');
});

test('energy and known-target checks refuse a command without triggering an enemy response', () => {
  const fresh = space.createClanShipSpaceEncounter('interception');
  deny(fresh, { type: 'fire', expectedTurn: 0 }, 'intel-required');
  const identified = act(fresh, 'scan');
  deny(identified, { type: 'disrupt', expectedTurn: identified.turn }, 'range-required');
  const empty = run('interception', ['scan', 'manoeuvre', 'fire']);
  assert.equal(empty.energy, 0);
  deny(empty, { type: 'fire', expectedTurn: empty.turn }, 'insufficient-energy');
  assert.equal(act(empty, 'recharge').energy, 4);
  const charged = act(act(fresh, 'recharge'), 'brace');
  assert.equal(charged.energy, space.CLAN_SHIP_SPACE_MAX_ENERGY);
  deny(charged, { type: 'recharge', expectedTurn: charged.turn }, 'no-change');
});

test('the forecast is deterministic and defensive choices really reduce the next losses', () => {
  const beforeVolley = run('escort', ['scan']);
  assert.equal(space.clanShipSpaceEnemyIntent(beforeVolley).id, 'volley');
  const braced = act(beforeVolley, 'brace');
  const exposed = act(beforeVolley, 'recharge');
  const moved = act(beforeVolley, 'manoeuvre');
  assert.ok(braced.formationIntegrity > moved.formationIntegrity);
  assert.ok(moved.formationIntegrity > exposed.formationIntegrity);
  assert.ok(braced.assetIntegrity > exposed.assetIntegrity);
  assert.equal(space.clanShipSpaceEnemyIntent(braced).id, 'flank');
});

test('each of the six crew roles changes an explicit tactical effect', () => {
  const empty = space.createClanShipSpaceEncounter('escort');
  const navigator = space.createClanShipSpaceEncounter('escort', ['navigator']);
  assert.equal(act(navigator, 'manoeuvre').range, 2);
  assert.equal(act(empty, 'manoeuvre').range, 1);
  assert.equal(act(space.createClanShipSpaceEncounter('escort', ['tracker']), 'scan').scanLevel, 2);
  const baseHit = run('interception', ['scan', 'manoeuvre', 'disrupt']);
  const armedHit = run('interception', ['scan', 'manoeuvre', 'disrupt'], ['armorer']);
  assert.ok(armedHit.hostileDrive < baseHit.hostileDrive);
  for (const role of ['medic', 'veteran']) {
    const helped = act(space.createClanShipSpaceEncounter('escort', [role]), 'scan');
    assert.ok(helped.formationIntegrity > act(empty, 'scan').formationIntegrity, role);
  }
  const warden = space.createClanShipSpaceEncounter('escort', ['warden']);
  assert.ok(act(warden, 'scan').assetIntegrity > act(empty, 'scan').assetIntegrity);
  assert.equal(space.clanShipSpaceOrderAvailability(space.createClanShipSpaceEncounter('recovery', ['warden']), 'board').cost, 1);
});

test('the complete recruited crew supports a shorter recovery route but cannot bypass its objectives', () => {
  const state = run('recovery', ['scan', 'manoeuvre', 'disrupt', 'recharge', 'disrupt', 'brace', 'board', 'extract'], space.CLAN_SHIP_SPACE_CREW_ROLES);
  assert.equal(state.status, 'victory');
  assert.equal(state.turn, 8);
  assert.ok(state.formationIntegrity > run('recovery', paths.recovery).formationIntegrity);
  assert.equal(state.objectiveProgress, 3);
});

test('serialized checkpoints at every turn resume exactly the same branch and enemy response', () => {
  for (const [kind, orders] of Object.entries(paths)) {
    let state = space.createClanShipSpaceEncounter(kind);
    for (const type of orders) {
      const bytes = JSON.stringify(state);
      const inspection = space.inspectClanShipSpaceEncounter(JSON.parse(bytes));
      assert.equal(inspection.status, 'valid');
      assert.deepEqual(inspection.state, state);
      assert.notEqual(inspection.state, state);
      assert.notEqual(inspection.state.history, state.history);
      const resumed = act(inspection.state, type);
      state = act(state, type);
      assert.deepEqual(resumed, state, `${kind}: ${type}`);
    }
  }
});

test('stale double inputs, malformed intentions and commands after terminal outcomes never advance a turn', () => {
  const fresh = space.createClanShipSpaceEncounter('escort');
  const next = act(fresh, 'scan');
  deny(next, { type: 'scan', expectedTurn: 0 }, 'turn-mismatch');
  for (const command of [null, [], { type: 'scan' }, { type: 'scan', expectedTurn: NaN }, { type: 'scan', expectedTurn: -1 },
    { type: 'victory', expectedTurn: 1 }, { type: 'scan', expectedTurn: 1, reward: 100 }]) {
    deny(next, command, 'invalid-command');
  }
  for (const state of [run('escort', paths.escort), act(fresh, 'withdraw')]) {
    for (const type of space.CLAN_SHIP_SPACE_ORDERS) deny(state, { type, expectedTurn: state.turn }, 'operation-ended');
  }
});

test('withdrawing returns a distinct no-victory result and cannot manufacture progress', () => {
  const state = run('recovery', ['scan', 'manoeuvre', 'withdraw']);
  assert.equal(state.status, 'withdrawn');
  assert.equal(state.objectiveProgress, 0);
  assert.equal(state.turn, 3);
  assert.equal(state.formationIntegrity, run('recovery', ['scan', 'manoeuvre']).formationIntegrity);
});

test('poor repeated orders can lose the formation, while even a safe crew cannot stall beyond 16 turns', () => {
  let exposed = space.createClanShipSpaceEncounter('recovery');
  while (exposed.status === 'active') {
    const order = exposed.energy < 7 ? 'recharge' : 'manoeuvre';
    exposed = act(exposed, order);
  }
  assert.equal(exposed.status, 'defeat');
  assert.ok(exposed.formationIntegrity === 0 || exposed.assetIntegrity === 0);
  const timeout = run('recovery', Array(space.CLAN_SHIP_SPACE_MAX_TURNS).fill('brace'), space.CLAN_SHIP_SPACE_CREW_ROLES);
  assert.equal(timeout.status, 'defeat');
  assert.ok(timeout.formationIntegrity > 0);
  assert.ok(timeout.assetIntegrity > 0);
  assert.equal(timeout.turn, space.CLAN_SHIP_SPACE_MAX_TURNS);
  deny(timeout, { type: 'withdraw', expectedTurn: timeout.turn }, 'operation-ended');
});

test('missing data is distinguished from unsupported or corrupt saved encounters', () => {
  for (const raw of [undefined, null]) assert.equal(space.inspectClanShipSpaceEncounter(raw).status, 'absent');
  for (const raw of [{ version: 2 }, { version: 99, newRules: true }]) {
    assert.equal(space.inspectClanShipSpaceEncounter(raw).status, 'future-version');
    deny(raw, { type: 'withdraw', expectedTurn: 0 }, 'future-version');
  }
  for (const raw of [[], '', 1, {}, { version: 0 }, { version: '1' }, { ...space.createClanShipSpaceEncounter('escort'), owner: 'foreign-field' }]) {
    assert.equal(space.inspectClanShipSpaceEncounter(raw).status, 'invalid-save');
    deny(raw, { type: 'withdraw', expectedTurn: 0 }, 'invalid-state');
  }
});

test('replay rejects forged rewards, restored health, edited crew order and impossible or oversized journals', () => {
  const active = run('recovery', ['scan', 'manoeuvre']);
  const edits = [
    { ...active, status: 'victory', objectiveProgress: 3 }, { ...active, formationIntegrity: 100 },
    { ...active, energy: 999 }, { ...active, hostileDrive: 0 }, { ...active, scanLevel: 2 },
    { ...active, turn: 3 }, { ...active, range: 2 }, { ...active, assetIntegrity: NaN },
    { ...active, history: ['extract'] }, { ...active, history: ['scan', 'scan', 'scan'] },
    { ...active, history: Array(17).fill('brace') }, { ...active, history: Array(2) },
    { ...active, crewRoles: ['navigator', 'navigator'] }, { ...active, crewRoles: ['unknown'] },
    { ...space.createClanShipSpaceEncounter('escort', ['navigator', 'warden']), crewRoles: ['warden', 'navigator'] },
    { ...run('escort', paths.escort), history: [...paths.escort, 'withdraw'] },
  ];
  for (const state of edits) assert.equal(space.inspectClanShipSpaceEncounter(state).status, 'invalid-save', JSON.stringify(state));
});

test('accepted actions do not mutate frozen source snapshots and reports are a bounded read-only projection', () => {
  const fresh = space.createClanShipSpaceEncounter('interception', ['navigator']);
  Object.freeze(fresh.crewRoles); Object.freeze(fresh.history); Object.freeze(fresh);
  const next = act(fresh, 'scan');
  assert.equal(fresh.turn, 0);
  assert.notEqual(next.history, fresh.history);
  assert.notEqual(next.crewRoles, fresh.crewRoles);
  const victory = run('recovery', paths.recovery);
  const bytes = JSON.stringify(victory);
  const reports = space.clanShipSpaceReports(victory);
  assert.equal(reports.length, 4);
  assert.equal(reports.at(-1).turn, victory.turn);
  assert.match(reports.at(-1).message, /réussie/);
  assert.equal(JSON.stringify(victory), bytes);
});

test('tactical previews expose capped energy, crew protection and objective progress without issuing an order', () => {
  const state = run('escort', ['recharge', 'scan'], ['medic', 'warden']);
  assert.equal(state.energy, 7);
  const before = JSON.stringify(state);
  const preview = space.previewClanShipSpaceOrder(state, 'brace');
  assert.equal(preview.energyChange, 1, 'the table must not promise +2 when only one unit fits');
  const actual = act(state, 'brace');
  assert.equal(preview.formationLoss, state.formationIntegrity - actual.formationIntegrity);
  assert.equal(preview.assetLoss, state.assetIntegrity - actual.assetIntegrity);
  assert.equal(preview.energyChange, actual.energy - state.energy);
  const full = space.previewClanShipSpaceOrder(actual, 'brace');
  assert.equal(full.energyChange, 0, 'a useful defensive turn can still restore no energy at the cap');
  const inRange = act(state, 'manoeuvre');
  const segment = space.previewClanShipSpaceOrder(inRange, 'brace');
  assert.equal(segment.objectiveGain, 1);
  assert.equal(JSON.stringify(state), before, 'consulting or executing a preview never mutates the original snapshot');
  assert.equal(state.turn, 2);
});

test('previews distinguish a finishing order, a doomed order, retreat and unavailable commands', () => {
  const ready = run('escort', paths.escort.slice(0, -1));
  const extraction = space.previewClanShipSpaceOrder(ready, 'extract');
  assert.equal(extraction.outcome, 'victory');
  assert.equal(extraction.formationLoss, 0);
  assert.equal(extraction.assetLoss, 0);
  assert.equal(extraction.energyChange, -2);
  const closingWindow = run('recovery', Array(15).fill('brace'), space.CLAN_SHIP_SPACE_CREW_ROLES);
  assert.equal(space.previewClanShipSpaceOrder(closingWindow, 'brace').outcome, 'defeat');
  assert.equal(space.previewClanShipSpaceOrder(closingWindow, 'withdraw').outcome, 'withdrawn');
  assert.equal(space.previewClanShipSpaceOrder(space.createClanShipSpaceEncounter('recovery'), 'board'), null);
  assert.equal(space.previewClanShipSpaceOrder(run('escort', paths.escort), 'scan'), null);
  assert.equal(space.previewClanShipSpaceOrder({ ...ready, energy: 100 }, 'fire'), null);
  assert.equal(space.previewClanShipSpaceOrder({ version: 2 }, 'brace'), null);
  assert.equal(space.previewClanShipSpaceOrder(ready, 'victory'), null);
});

test('SSR presents the actual objectives, accessible commands and suspension state; it is not a browser proof', () => {
  const encounter = space.createClanShipSpaceEncounter('escort', ['navigator']);
  const html = qa.render('app/game/ClanShipSpaceEncounter.tsx', { encounter, onCommand: () => { throw Error('render must never issue an order'); } });
  assert.match(html, /data-clan-space="escort"/);
  assert.match(html, /data-clan-space-turn="0"/);
  assert.match(html, /role="img" aria-labelledby=/);
  assert.match(html, /data-clan-space-order="scan"/);
  assert.match(html, /data-clan-space-order="extract" data-clan-space-available="false"/);
  assert.match(html, /data-clan-space-crew="navigator"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-clan-space-forecast="scan"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /data-space-asset-extracted="false"/);
  const paused = qa.render('app/game/ClanShipSpaceEncounter.tsx', { encounter, suspended: true, onCommand: () => false });
  assert.match(paused, /data-clan-space-suspended="true"/);
  assert.match(paused, /<fieldset[^>]* disabled=""/);
  const terminal = qa.render('app/game/ClanShipSpaceEncounter.tsx', { encounter: run('escort', paths.escort), onCommand: () => false });
  assert.match(terminal, /data-clan-space-status="victory"/);
  assert.doesNotMatch(terminal, /data-clan-space-order=/);
  assert.match(terminal, /transform="translate\(582 245\)" data-space-asset-extracted="true"/);
  const capped = qa.render('app/game/ClanShipSpaceEncounter.tsx', { encounter: run('escort', ['recharge', 'scan']), onCommand: () => false });
  assert.match(capped, /aria-label="Gain : 1 énergie"/);
});
