import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { buildMaintenanceFixture, maintenanceAt, maintenanceIntervene, maintenanceOperation, maintenanceInterception } from './helpers/clan-ship-maintenance-fixtures-20261109.mjs';

const qa = homeworldSceneSsrV78();
const domain = Object.assign({}, ...['save', 'systems/clanShipOperations', 'systems/clanShipDocking',
  'systems/clanShipIncidents', 'systems/clanShipSpaceEncounter'].map(name => qa.load(`app/game/${name}.ts`)));
const diagnostics = qa.load('app/game/systems/clanShipMaintenanceDiagnostics.ts');
const dialogue = qa.load('app/game/systems/clanShipCrewDialogue.ts');
const contact = { roomId: 'hangar', focusedNpcId: 'threshold-guard' };
const clone = value => JSON.parse(JSON.stringify(value));
const frozen = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(frozen); } return value; };
const completed = () => buildMaintenanceFixture(domain, { completed: true });
const interception = () => buildMaintenanceFixture(domain, { completed: true, interception: true });

test('B01 trust is spoken at the real guard contact only after the full physical closure', () => {
  let save = maintenanceAt(domain, buildMaintenanceFixture(domain), 'hangar');
  assert.equal(diagnostics.clanShipSealTrustReply(save, 'threshold-guard', contact), null);
  const variant = domain.clanShipIncidentVariant(save.createdAt, 'sealed-lot');
  for (const [type, branch] of [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['check-pressure']])
    save = maintenanceIntervene(domain, save, 'sealed-lot', type, branch);
  assert.equal(diagnostics.clanShipSealTrustReply(maintenanceAt(domain, save, 'hangar'), 'threshold-guard', contact), null);
  save = maintenanceIntervene(domain, save, 'sealed-lot', 'close-lot');
  const before = JSON.stringify(save), reply = diagnostics.clanShipSealTrustReply(frozen(save), 'threshold-guard', contact);
  assert.match(reply.line, /confier de nouveau ce seuil/);
  assert.match(reply.fact, new RegExp(variant.lotCode));
  const spoken = dialogue.selectClanShipCrewDialogue(save, 'threshold-guard', contact);
  assert.equal(spoken.status, 'spoken');
  assert.ok(spoken.line.endsWith(reply.line));
  assert.ok(spoken.facts.includes(reply.fact));
  assert.equal(JSON.stringify(save), before);
});

test('B01 reply survives real export/import, keeps existing dialogue priority and pays nothing on reads', () => {
  const save = maintenanceAt(domain, completed(), 'hangar'), before = JSON.stringify(save);
  const restored = domain.parseSaveImport(domain.exportSave(save)).save;
  const first = dialogue.selectClanShipCrewDialogue(restored, 'threshold-guard', contact);
  assert.equal(first.context, 'recent-proof');
  for (let index = 0; index < 10; index++) assert.deepEqual(dialogue.selectClanShipCrewDialogue(restored, 'threshold-guard', contact), first);
  assert.equal(JSON.stringify(restored), JSON.stringify(domain.parseSaveImport(domain.exportSave(save)).save));
  assert.equal(JSON.stringify(save), before);
});

test('B01 never projects trust onto another speaker, unfocused contact or wrong room', () => {
  const save = maintenanceAt(domain, completed(), 'hangar');
  assert.equal(diagnostics.clanShipSealTrustReply(save, 'iron-claw', contact), null);
  assert.equal(diagnostics.clanShipSealTrustReply(save, 'threshold-guard', { ...contact, focusedNpcId: null }), null);
  assert.equal(diagnostics.clanShipSealTrustReply(save, 'threshold-guard', { ...contact, roomId: 'conseil' }), null);
  assert.equal(diagnostics.clanShipSealTrustReply(maintenanceAt(domain, save, 'conseil'), 'threshold-guard', contact), null);
});

test('B02 does not confer a diagnostic for a collected component, an installed relay or one restored circuit', () => {
  const variants = [buildMaintenanceFixture(domain, { interception: true })];
  let save = buildMaintenanceFixture(domain), variant = domain.clanShipIncidentVariant(save.createdAt, 'relay-fault');
  for (const [type, branch] of [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['collect-component'], ['install-component'], ['restore-circuit', variant.other]]) {
    save = maintenanceIntervene(domain, save, 'relay-fault', type, branch);
    const context = maintenanceInterception(domain, save);
    assert.equal(context.clanShipOperations.activeContract.contractId, 'space-interception');
    assert.equal(diagnostics.readClanShipRelayDiagnostic(context), null);
  }
  for (const fixture of variants) assert.equal(diagnostics.readClanShipRelayDiagnostic(fixture), null);
});

test('B02 is a completed-repair diagnostic at the actual council interception, never an automatic combat buff', () => {
  const save = frozen(interception()), before = JSON.stringify(save), encounter = save.clanShipOperations.spaceEncounter;
  const diagnostic = diagnostics.readClanShipRelayDiagnostic(save);
  assert.ok(diagnostic); assert.equal(diagnostic.sourceTurn, 0); assert.equal(diagnostic.forecasts.length, 3);
  assert.equal(diagnostics.clanShipRelayDiagnosticMatches(diagnostic, encounter), true);
  assert.deepEqual(encounter.crewRoles, []); assert.equal(encounter.scanLevel, 0); assert.equal(encounter.energy, 5);
  assert.equal(JSON.stringify(save), before);
  assert.equal(diagnostics.readClanShipRelayDiagnostic(maintenanceAt(domain, clone(save), 'hangar')), null);
  assert.equal(diagnostics.readClanShipRelayDiagnostic(completed()), null);
});

test('every projected pair exactly replays the real reducer, including reaction, reserve and objective', () => {
  let save = interception();
  for (let turn = 0; turn < 6 && save.clanShipOperations.spaceEncounter.status === 'active'; turn++) {
    const encounter = save.clanShipOperations.spaceEncounter, before = JSON.stringify(save);
    const diagnostic = diagnostics.readClanShipRelayDiagnostic(save);
    assert.equal(new Set(diagnostic.forecasts.map(row => row.first)).size, diagnostic.forecasts.length);
    for (const row of diagnostic.forecasts) {
      let replay = encounter;
      for (const type of [row.first, row.second].filter(Boolean)) {
        const result = domain.actClanShipSpaceEncounter(replay, { type, expectedTurn: replay.turn });
        assert.equal(result.accepted, true); replay = result.state;
      }
      assert.deepEqual([row.formation, row.energy, row.hostileIntegrity, row.hostileDrive, row.scanLevel, row.range, row.outcome, row.turns],
        [replay.formationIntegrity, replay.energy, replay.hostileIntegrity, replay.hostileDrive, replay.scanLevel, replay.range, replay.status, replay.turn - encounter.turn]);
      assert.notEqual(replay.status, 'defeat');
    }
    assert.equal(JSON.stringify(save), before);
    const order = diagnostic.forecasts[0]?.first ?? 'withdraw';
    save = maintenanceOperation(domain, save, { type: 'space-command', command: { type: order, expectedTurn: encounter.turn } });
    assert.equal(diagnostics.clanShipRelayDiagnosticMatches(diagnostic, save.clanShipOperations.spaceEncounter), false);
  }
});

test('a one-order victory is reported as one turn, with no second fictitious command', () => {
  let save = interception();
  for (const type of ['scan', 'manoeuvre', 'fire', 'brace', 'brace', 'fire', 'brace'])
    save = maintenanceOperation(domain, save, { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  const diagnostic = diagnostics.readClanShipRelayDiagnostic(save), win = diagnostic.forecasts.find(row => row.first === 'fire');
  assert.ok(win); assert.equal(win.outcome, 'victory'); assert.equal(win.turns, 1); assert.equal(win.second, null);
  assert.equal(win.labels.length, 1);
});

test('refusal, foreign owner, skipped journal, future schema or impossible encounter cannot unlock either consequence', () => {
  const good = interception();
  for (const tamper of [
    save => { save.clanShipIncidents.ownerCreatedAt = 'another-owner'; },
    save => { save.clanShipIncidents.version = 99; },
    save => { save.clanShipIncidents.incidents[1].events.pop(); },
    save => { save.clanShipOperations.ownerCreatedAt = 'another-owner'; },
    save => { save.clanShipOperations.spaceEncounter.energy = 8; },
    save => { save.clanShipDocking.ownerCreatedAt = 'another-owner'; },
  ]) {
    const save = clone(good); tamper(save); const before = JSON.stringify(save);
    assert.equal(diagnostics.readClanShipRelayDiagnostic(save), null);
    assert.equal(diagnostics.clanShipSealTrustReply(save, 'threshold-guard', contact), null);
    assert.equal(JSON.stringify(save), before);
  }
});

test('terminal interception and another contract retain the repair but expose no stale plan', () => {
  let save = interception(), first = diagnostics.readClanShipRelayDiagnostic(save);
  save = maintenanceOperation(domain, save, { type: 'space-command', command: { type: 'withdraw', expectedTurn: 0 } });
  assert.equal(diagnostics.readClanShipRelayDiagnostic(save), null);
  assert.equal(diagnostics.clanShipRelayDiagnosticMatches(first, save.clanShipOperations.spaceEncounter), false);
  save = maintenanceOperation(domain, save, { type: 'accept-contract', contractId: 'space-recovery' });
  assert.equal(diagnostics.readClanShipRelayDiagnostic(save), null);
});

test('the real encounter component exposes three manual first orders, pauses them and refuses a stale campaign snapshot', () => {
  const save = interception(), encounter = save.clanShipOperations.spaceEncounter;
  const props = { encounter, campaign: save, onCommand() { throw Error('SSR may not issue an order'); } };
  const before = JSON.stringify(save), html = qa.render('app/game/ClanShipSpaceEncounter.tsx', props);
  assert.match(html, /data-clan-relay-diagnostic/);
  assert.equal((html.match(/data-clan-relay-order=/g) ?? []).length, 3);
  assert.match(html, /seconde action reste à confirmer/);
  assert.equal(JSON.stringify(save), before);
  const paused = qa.render('app/game/ClanShipSpaceEncounter.tsx', { ...props, suspended: true });
  assert.equal((paused.match(/disabled="" data-clan-relay-order=/g) ?? []).length, 3);
  const progressed = domain.actClanShipSpaceEncounter(encounter, { type: 'scan', expectedTurn: 0 }).state;
  assert.doesNotMatch(qa.render('app/game/ClanShipSpaceEncounter.tsx', { ...props, encounter: progressed }), /data-clan-relay-diagnostic/);
});

test('a future or malformed maintenance journal remains byte-identical when the old five-context dialogue is read', () => {
  for (const patch of [save => { save.clanShipIncidents.version = 99; }, save => { save.clanShipIncidents.incidents[0].events.pop(); }]) {
    const save = maintenanceAt(domain, completed(), 'hangar'); patch(save); const before = JSON.stringify(save);
    const spoken = dialogue.selectClanShipCrewDialogue(save, 'threshold-guard', contact);
    assert.equal(spoken.status, 'spoken'); assert.doesNotMatch(spoken.line, /confier de nouveau ce seuil/);
    assert.equal(JSON.stringify(save), before);
  }
});

test('valid JSON key reordering preserves a canonical diagnostic identity across export/import', () => {
  const save = interception(), expected = diagnostics.readClanShipRelayDiagnostic(save);
  save.clanShipOperations.spaceEncounter = Object.fromEntries(Object.entries(save.clanShipOperations.spaceEncounter).reverse());
  assert.equal(domain.inspectClanShipOperations(save.clanShipOperations, save.createdAt).status, 'valid');
  const read = diagnostics.readClanShipRelayDiagnostic(save);
  assert.deepEqual(read, expected);
  assert.equal(diagnostics.clanShipRelayDiagnosticMatches(read, save.clanShipOperations.spaceEncounter), true);
  assert.deepEqual(diagnostics.readClanShipRelayDiagnostic(domain.parseSaveImport(domain.exportSave(save)).save), expected);
});
