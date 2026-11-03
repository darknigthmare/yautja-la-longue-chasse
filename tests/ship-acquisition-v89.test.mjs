import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalSourcePath = process.env.YAUTJA_V6_SOURCE_PATH ?? resolve(root,
  'work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx');
const requireOriginalSource = process.env.YAUTJA_V89_REQUIRE_SOURCE === '1';
const qa = homeworldSceneSsrV78(root);
const load = qa.load;
const api = load('app/game/systems/shipAcquisitionV89.ts');
const b = api.SHIP_ACQUISITION_BINDING_V89;
const owner = '2026-10-08T12:00:00.000Z';
const foreign = '2026-10-08T12:01:00.000Z';
const clone = value => structuredClone(value);
function context(patch = {}) {
  return {save: {createdAt: owner, profile: {rankId: 'blooded'}, prologue: null},
    active: true, focused: true, suspended: false,
    ...api.shipAcquisitionSceneFactsV89(), authority: null, ...patch};
}
/** This receipt is a TEST FIXTURE only. No product/UI provider creates it. */
function fixtureAuthority(patch = {}) {
  return {version: 1, ownerSaveCreatedAt: owner, sourceId: 'R2-M021',
    sourceSha256: api.SHIP_ACQUISITION_SOURCE_V89.source.sha256,
    candidateId: b.candidateId, shipId: b.shipId, issuerId: b.npcId,
    instanceId: 'test-only:owned-hull-001', agreementReceiptId: 'test-only:agreement-001',
    meansReceiptId: 'test-only:means-001', meansConsumed: true, ...patch};
}
function player(ctx = context()) {
  let state = null;
  return {get state() {return state;}, ctx,
    act(action) {
      const result = api.actShipAcquisitionV89(state, action, this.ctx);
      if (result.accepted && result.changed) state = result.state;
      return result;
    },
    ok(action) {
      const result = this.act(action);
      assert.equal(result.accepted, true, result.message);
      assert.ok(result.state, result.message);
      return result;
    },
    to(x) {
      assert.equal(x % b.stride, 0);
      let remaining = 200;
      while ((state?.actor.x ?? b.spawnX) !== x) {
        assert.ok(remaining-- > 0, 'Bounded physical path did not arrive');
        this.ok({kind: 'walk', direction: (state?.actor.x ?? b.spawnX) < x ? 1 : -1});
      }
      return this;
    },
  };
}
function prepared(ctx = context()) {
  const p = player(ctx);
  p.ok({kind: 'intent', option: 'A'});
  p.to(b.posts.hull); p.ok({kind: 'inspect-hull'});
  p.to(b.posts.load); p.ok({kind: 'inspect-load'});
  p.to(b.posts.sas); p.ok({kind: 'test-sas'});
  p.ok({kind: 'align-latch', direction: 1}); p.ok({kind: 'align-latch', direction: 1});
  p.ok({kind: 'seat-latch'}); p.ok({kind: 'lock-latch'}); p.ok({kind: 'test-sas'});
  return p;
}
function reported(ctx = context()) {
  const p = prepared(ctx);
  p.to(b.posts.responsible); p.ok({kind: 'report'});
  return p;
}
function issued() {
  const p = reported(context({authority: fixtureAuthority()}));
  p.ok({kind: 'request-rights'});
  return p;
}
const denied = result => {
  assert.equal(result.accepted, false, result.message);
  assert.equal(result.changed, false, result.message);
};

test('V89 extracts the exact six-sheet source subset, including only the chantier voice', () => {
  const data = JSON.parse(readFileSync(resolve(root, 'app/game/data/shipAcquisitionSourceV89.json'), 'utf8'));
  assert.equal(data.source.sha256, '87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183');
  assert.equal(data.sheets.length, 6);
  const ranges = new Map([
    ['Campagne commune', [25,28]], ['Scènes de dialogue V6', [597,599]],
    ['Répliques V6', [4923,4946]], ['Choix et actions V6', [1216,1221]],
    ['Voix V6', [208,208]], ['V5 États communs', [22,25]],
  ]);
  assert.equal(data.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0), 42);
  for (const sheet of data.sheets) {
    const range = ranges.get(sheet.name); assert.ok(range, sheet.name);
    assert.deepEqual(sheet.rows.map(row => row.number),
      Array.from({length: range[1] - range[0] + 1}, (_, offset) => range[0] + offset));
    for (const row of sheet.rows) for (const cell of row.cells)
      assert.match(cell.address, new RegExp('^[A-Q]+' + row.number + '$'));
  }
  const voices = data.sheets.find(sheet => sheet.name === 'Voix V6').rows;
  assert.equal(voices.length, 1);
  assert.ok(voices[0].cells.some(cell => cell.value === 'D6-V-C-CHANTIER'));
  assert.equal(api.SHIP_ACQUISITION_LINES_V89.length, 8);
  const documents = ['bible-ships', 'bible-dialogues'].map(name => JSON.parse(readFileSync(
    resolve(root, 'public/game/dialogues/v85/' + name + '.json'), 'utf8')));
  let exactOriginalRows = 0;
  for (const sheet of data.sheets) {
    const original = documents.flatMap(document => document.sheets).find(item => item.name === sheet.name);
    if (!original) { assert.ok(['Campagne commune', 'V5 États communs'].includes(sheet.name)); continue; }
    for (const row of sheet.rows) {
      assert.deepEqual(row, original.rows.find(item => item.number === row.number));
      exactOriginalRows++;
    }
  }
  assert.equal(exactOriginalRows, 34);
  const excerpts = new Map(api.SHIP_ACQUISITION_LINES_V89.map(line => [line.phase, line.text]));
  assert.equal(excerpts.get('SUCCES'), 'Les droits sont remis. Cette fois, tu entres dans ton vaisseau.');
  assert.equal(excerpts.get('ECHEC'), 'Ce verrou ne tient pas encore. La visite n’est pas une remise de coque.');
});

test('local read-only V6 workbook has the reviewed SHA (required in source-proof mode)', {
  skip: !requireOriginalSource && !existsSync(originalSourcePath)
    ? 'Private ignored XLSX absent from this clone; use YAUTJA_V89_REQUIRE_SOURCE=1 with YAUTJA_V6_SOURCE_PATH for source proof'
    : false,
}, () => {
  assert.ok(existsSync(originalSourcePath), 'Required local V6 source workbook is absent');
  const original = readFileSync(originalSourcePath);
  assert.equal(createHash('sha256').update(original).digest('hex'), api.SHIP_ACQUISITION_SOURCE_V89.source.sha256);
});

test('initial checkpoint is owner-bound and cannot be created for malformed owner dates', () => {
  const initial = api.createShipAcquisitionV89(owner);
  assert.equal(initial.actor.x, b.spawnX); assert.equal(initial.revision, 0);
  assert.equal(initial.authorityReceipt, null); assert.equal(initial.enteredAtStep, null);
  assert.deepEqual(api.normalizeShipAcquisitionV89(initial, owner), initial);
  assert.equal(api.createShipAcquisitionV89('not-a-save-date'), null);
  assert.equal(api.normalizeShipAcquisitionV89(initial, foreign), null);
  assert.equal(api.evaluateShipAcquisitionV89(initial, context({save: {...context().save, createdAt: foreign}})).writable, false);
});

test('only existing Blooded eligibility opens preparation; it never gives the rank', () => {
  const ctx = context({save: {...context().save, profile: {rankId: 'youngblood'}}});
  const before = clone(ctx.save);
  denied(api.actShipAcquisitionV89(null, {kind: 'intent', option: 'A'}, ctx));
  assert.deepEqual(ctx.save, before);
  assert.equal(api.shipAcquisitionEligibleV89(context().save), true);
  for (const rankId of ['elite','elder','ancient'])
    assert.equal(api.shipAcquisitionEligibleV89({...context().save, profile: {rankId}}), true);
  const chronicleApi = load('app/game/systems/clanChronicle.ts');
  const young = chronicleApi.createClanChronicle();
  young.evidence = [{id: 'intro-begun', sourceId: 'chronicle.intro.started'}];
  const youngSave = {...context().save, profile: {rankId: 'blooded'}, prologue: {chronicle: young}};
  assert.equal(api.shipAcquisitionEligibleV89(youngSave), false, 'Profile cannot bypass active chronicle');
  const rites = chronicleApi.CHRONICLE_RITES.slice(0, 3);
  const needed = new Set(['intro-begun', ...rites.flatMap(rite => rite.requiredEvidenceIds)]);
  const bloodedChronicle = chronicleApi.createClanChronicle();
  bloodedChronicle.evidence = chronicleApi.CHRONICLE_EVIDENCE.filter(item => needed.has(item.id))
    .map(({id, sourceId}) => ({id, sourceId}));
  bloodedChronicle.rites = rites.map(({id, sourceId}) => ({id, sourceId}));
  assert.equal(api.shipAcquisitionEligibleV89({...context().save, profile: {rankId: 'youngling'},
    prologue: {chronicle: bloodedChronicle}}), true, 'Actual receipt chain takes precedence over profile');
});

test('walking is saved fixed-stride movement; payload coordinates do not teleport', () => {
  const ctx = context();
  denied(api.actShipAcquisitionV89(null, {kind: 'inspect-hull'}, ctx));
  const result = api.actShipAcquisitionV89(null, {kind: 'walk', direction: 1, x: b.posts.sas}, ctx);
  assert.equal(result.state.actor.x, b.spawnX + b.stride);
  assert.equal(result.state.actor.steps, 1); assert.equal(result.state.checks.hangarCrossed, false);
  denied(api.actShipAcquisitionV89(result.state, {kind: 'walk', direction: 0}, ctx));
  const p = player(); p.to(b.minimumX);
  assert.equal(p.act({kind: 'walk', direction: -1}).changed, false);
  p.to(b.gateX);
  assert.equal(p.act({kind: 'walk', direction: 1}).changed, false);
  assert.equal(p.state.authorityReceipt, null);
});

test('actual nearby hull, charge and crossed hangar observations are ordered', () => {
  const p = player();
  p.to(b.posts.load);
  denied(p.act({kind: 'inspect-load'}));
  p.to(b.posts.sas);
  denied(p.act({kind: 'test-sas'}));
  assert.equal(p.state.checks.hangarCrossed, false);
  p.to(b.posts.hull); p.ok({kind: 'inspect-hull'});
  p.to(b.posts.load); p.ok({kind: 'inspect-load'});
  p.to(b.posts.sas);
  assert.equal(p.state.checks.hangarCrossed, true);
  p.ok({kind: 'test-sas'});
  assert.equal(p.state.latch.faultObserved, true);
});

test('the sas defect needs a real test, alignment, seating, locking and retest', () => {
  const p = player(); p.to(b.posts.hull); p.ok({kind: 'inspect-hull'}); p.to(b.posts.sas);
  denied(p.act({kind: 'align-latch', direction: 1}));
  denied(p.act({kind: 'seat-latch'})); denied(p.act({kind: 'lock-latch'}));
  p.ok({kind: 'test-sas'}); assert.equal(p.state.latch.failedTests, 1);
  assert.equal(p.act({kind: 'test-sas'}).changed, false);
  p.ok({kind: 'align-latch', direction: 1}); denied(p.act({kind: 'seat-latch'}));
  p.ok({kind: 'align-latch', direction: 1}); p.ok({kind: 'seat-latch'});
  denied(p.act({kind: 'align-latch', direction: -1}));
  assert.equal(p.act({kind: 'test-sas'}).changed, false);
  p.ok({kind: 'lock-latch'}); p.ok({kind: 'test-sas'});
  assert.equal(p.state.latch.verified, true); assert.equal(p.state.latch.repaired, true);
  assert.equal(p.act({kind: 'test-sas'}).changed, false);
});

test('physical readiness without real means/agreement grants no ship, source success or economy', () => {
  const p = reported(), beforeSave = clone(p.ctx.save);
  assert.equal(api.evaluateShipAcquisitionV89(p.state, p.ctx).physicalReady, true);
  assert.equal(api.evaluateShipAcquisitionV89(p.state, p.ctx).canIssueRights, false);
  denied(p.act({kind: 'request-rights'}));
  assert.equal(p.state.authorityReceipt, null); assert.equal(p.state.dialogueAuthority, null);
  assert.deepEqual(p.state.presentedLineIds, []);
  assert.equal(api.shipAcquisitionOwnedHullV89(p.state, owner), null);
  assert.deepEqual(p.ctx.save, beforeSave);
  assert.equal(Object.hasOwn(p.state, 'fuel'), false); assert.equal(Object.hasOwn(p.state, 'inventory'), false);
  assert.equal(Object.hasOwn(p.state, 'xp'), false);
});

test('raw missing, future, foreign, unconsumed, wrong-source and wrong-hull receipts stay refused', () => {
  for (const patch of [null, {version: 2}, {ownerSaveCreatedAt: foreign}, {meansConsumed: false},
    {sourceId: 'R2-M023'}, {sourceSha256: 'untrusted'}, {candidateId: 'other-hull'},
    {shipId: 'other-ship'}, {issuerId: 'other-npc'}, {meansReceiptId: ''},
    {agreementReceiptId: ''}, {unexpected: true}]) {
    const authority = patch === null ? null : fixtureAuthority(patch);
    assert.equal(api.normalizeShipAcquisitionAuthorityV89(authority, owner), null);
    const p = reported(context({authority}));
    denied(p.act({kind: 'request-rights'}));
    assert.equal(p.state.authorityReceipt, null);
  }
});

test('source voice and handover require the dedicated responsible present alive conscious and nearby', () => {
  for (const patch of [{present: false}, {alive: false}, {conscious: false}, {id: 'dock-officer'}, {x: 120}]) {
    const ctx = context({authority: fixtureAuthority()});
    ctx.host = {...ctx.host, ...patch};
    const p = player(ctx); denied(p.act({kind: 'intent', option: 'A'}));
    p.to(b.posts.hull); p.ok({kind: 'inspect-hull'});
    assert.deepEqual(p.state.presentedLineIds, []);
    assert.equal(api.evaluateShipAcquisitionV89(p.state, ctx).hostAvailable, false);
  }
  const p = reported(context({authority: fixtureAuthority()}));
  p.to(b.posts.load);
  denied(p.act({kind: 'report'})); denied(p.act({kind: 'request-rights'}));
  assert.equal(p.state.authorityReceipt, null);
});

test('an absent or different staged candidate prevents checkpoint writes', () => {
  for (const candidate of [null, {...context().candidate, present: false},
    {...context().candidate, siteId: 'different-site'}, {...context().candidate, id: 'other-hull'},
    {...context().candidate, shipId: 'other-ship'}]) {
    const ctx = context({candidate});
    assert.equal(api.evaluateShipAcquisitionV89(null, ctx).writable, false);
    denied(api.actShipAcquisitionV89(null, {kind: 'walk', direction: 1}, ctx));
  }
});

test('ready facts must be reported physically before rights can be issued', () => {
  const p = prepared(context({authority: fixtureAuthority()}));
  denied(p.act({kind: 'request-rights'}));
  p.to(b.posts.responsible);
  denied(p.act({kind: 'request-rights'}));
  p.ok({kind: 'report'});
  assert.deepEqual(p.state.reportedFindings, ['hull','load','sas-fault','sas-repaired']);
  assert.equal(api.evaluateShipAcquisitionV89(p.state, p.ctx).canIssueRights, true);
  p.ok({kind: 'request-rights'});
  assert.equal(p.state.authorityReceipt.instanceId, 'test-only:owned-hull-001');
  assert.equal(api.shipAcquisitionOwnedHullV89(p.state, owner), null);
});

test('rights are issued once with a saved revision and physical-step stamp', () => {
  const p = issued();
  assert.equal(p.state.issuedAtRevision, p.state.revision);
  assert.equal(p.state.issuedAtStep, p.state.actor.steps);
  const prior = clone(p.state);
  const result = p.act({kind: 'request-rights'});
  assert.equal(result.accepted, true); assert.equal(result.changed, false);
  assert.deepEqual(p.state, prior);
  assert.equal(p.state.enteredAtStep, null);
  assert.ok(!p.state.presentedLineIds.some(id => id.includes('-SUCCES-')));
});

test('entry must follow rights physically, with success spoken only after return/report', () => {
  const p = issued(); const issuedStep = p.state.issuedAtStep;
  p.to(b.entryX);
  assert.ok(p.state.enteredAtStep > issuedStep);
  assert.equal(api.shipAcquisitionOwnedHullV89(p.state, owner).instanceId, 'test-only:owned-hull-001');
  assert.ok(!p.state.presentedLineIds.some(id => id.includes('-SUCCES-')));
  denied(p.act({kind: 'report'}));
  const firstEntry = p.state.enteredAtStep;
  p.to(b.posts.responsible);
  assert.equal(p.state.enteredAtStep, firstEntry);
  assert.ok(api.normalizeShipAcquisitionV89(p.state, owner));
  p.ok({kind: 'report'});
  assert.equal(p.state.presentedLineIds.filter(id => id.includes('-SUCCES-')).length, 1);
  assert.ok(p.state.reportedFindings.includes('entered'));
  assert.equal(p.act({kind: 'report'}).changed, false);
  p.to(b.entryX); p.to(b.posts.responsible);
  assert.equal(p.state.enteredAtStep, firstEntry);
  assert.equal(p.state.presentedLineIds.filter(id => id.includes('-SUCCES-')).length, 1);
});

test('a replacement or absent current authority never silently upgrades historical dialogue permission', () => {
  const p = reported(context({authority: fixtureAuthority()}));
  const historical = clone(p.state.dialogueAuthority);
  p.ctx.authority = fixtureAuthority({instanceId: 'test-only:replacement-hull'});
  denied(p.act({kind: 'request-rights'}));
  assert.deepEqual(p.state.dialogueAuthority, historical);
  p.ctx.authority = null; denied(p.act({kind: 'request-rights'}));
  p.ctx.authority = fixtureAuthority(); p.ok({kind: 'request-rights'});
  p.ctx.authority = null; p.to(b.entryX);
  assert.ok(api.shipAcquisitionOwnedHullV89(p.state, owner));
});

test('deferral and resume conserve work and position without repeated costs or remote source voice', () => {
  const p = prepared(context({authority: fixtureAuthority()}));
  const before = clone(p.state);
  p.ok({kind: 'defer'});
  denied(p.act({kind: 'walk', direction: 1})); denied(p.act({kind: 'test-sas'}));
  const lines = clone(p.state.presentedLineIds);
  p.ok({kind: 'resume'});
  assert.deepEqual(p.state.latch, before.latch);
  assert.deepEqual(p.state.actor, before.actor);
  assert.deepEqual(p.state.presentedLineIds, lines);
  p.to(b.posts.responsible); p.ok({kind: 'report'});
  assert.equal(p.state.presentedLineIds.filter(id => id.includes('-REPRISE-')).length, 1);
  assert.equal(p.act({kind: 'resume'}).changed, false);
  assert.equal(p.state.authorityReceipt, null);
});

test('inactive, unfocused or suspended context refuses commands and UI callbacks', () => {
  for (const patch of [{active: false}, {focused: false}, {suspended: true}]) {
    const ctx = context(patch), e = api.evaluateShipAcquisitionV89(null, ctx);
    assert.equal(e.paused, true);
    denied(api.actShipAcquisitionV89(null, {kind: 'intent', option: 'A'}, ctx));
    let calls = 0;
    denied(api.dispatchShipAcquisitionUIActionV89(e, {kind: 'walk', direction: 1}, () => {calls++;}));
    assert.equal(calls, 0);
  }
});

test('the actual UI dispatch gates wrong-post actions and preserves rejected durable writes', () => {
  const e = api.evaluateShipAcquisitionV89(null, context());
  let calls = 0;
  denied(api.dispatchShipAcquisitionUIActionV89(e, {kind: 'inspect-hull'}, () => {calls++;}));
  assert.equal(calls, 0);
  const before = clone(e.state);
  const failed = api.dispatchShipAcquisitionUIActionV89(e, {kind: 'walk', direction: 1}, () => {
    calls++; return {accepted: false, changed: false, state: e.state, message: 'TEST ONLY: durable write failed'};
  });
  denied(failed); assert.equal(calls, 1); assert.deepEqual(e.state, before);
  assert.deepEqual(failed.state, before);
});

test('keyboard mappings stay inside the active console and exclude native controls/Enter', () => {
  const gate = {active: true, focusedInside: true, suspended: false, controlTarget: false, defaultPrevented: false};
  assert.deepEqual(api.shipAcquisitionKeyboardActionV89('ArrowLeft', gate), {kind: 'walk', direction: -1});
  assert.deepEqual(api.shipAcquisitionKeyboardActionV89('ArrowRight', gate), {kind: 'walk', direction: 1});
  for (const key of ['Enter',' ','Escape','ArrowUp','ArrowDown','x'])
    assert.equal(api.shipAcquisitionKeyboardActionV89(key, gate), null);
  for (const patch of [{active: false},{focusedInside: false},{suspended: true},{controlTarget: true},{defaultPrevented: true}])
    assert.equal(api.shipAcquisitionKeyboardActionV89('ArrowRight', {...gate, ...patch}), null);
});

test('future/foreign/malformed checkpoints are rejected without mutation or fallback adoption', () => {
  const base = api.createShipAcquisitionV89(owner);
  const mutations = [
    state => {state.version = 2;},
    state => {state.ownerSaveCreatedAt = foreign;},
    state => {state.sourceSha256 = 'other';},
    state => {state.extra = 'unsupported';},
    state => {state.actor.x = b.posts.sas;},
    state => {state.actor.x += 1;},
    state => {state.actor.x = b.spawnX + b.stride; state.actor.steps = 2; state.revision = 2;},
    state => {state.reportedFindings = ['sas-repaired'];},
    state => {state.presentedLineIds = [b.sceneId + '-SUCCES---01'];},
    state => {state.latch.verified = true;},
    state => {state.latch.locked = true;},
    state => {state.checks.load = true;},
    state => {state.enteredAtStep = 1;},
    state => {state.issuedAtStep = 0;},
    state => {state.actor.x = b.entryX; state.actor.steps = 60; state.revision = 60;},
  ];
  for (const mutate of mutations) {
    const raw = clone(base); mutate(raw); const bytes = JSON.stringify(raw);
    assert.equal(api.normalizeShipAcquisitionV89(raw, owner), null, bytes);
    denied(api.actShipAcquisitionV89(raw, {kind: 'walk', direction: 1}, context()));
    assert.equal(JSON.stringify(raw), bytes);
  }
});

test('JSON round trips conserve owner/receipt/entry chronology and reject impossible history', () => {
  const p = issued(); p.to(b.entryX); p.to(b.posts.responsible); p.ok({kind: 'report'});
  const roundTrip = JSON.parse(JSON.stringify(p.state));
  assert.deepEqual(api.normalizeShipAcquisitionV89(roundTrip, owner), p.state);
  const backwards = clone(roundTrip); backwards.enteredAtStep = backwards.issuedAtStep;
  assert.equal(api.normalizeShipAcquisitionV89(backwards, owner), null);
  const tooSoon = clone(roundTrip); tooSoon.enteredAtStep = tooSoon.issuedAtStep + 1;
  assert.equal(api.normalizeShipAcquisitionV89(tooSoon, owner), null);
  const missingEntry = clone(issued().state);
  const entryWalk = (b.entryX - missingEntry.actor.x) / b.stride;
  missingEntry.actor.x = b.entryX; missingEntry.actor.steps += entryWalk; missingEntry.revision += entryWalk;
  assert.equal(api.normalizeShipAcquisitionV89(missingEntry, owner), null);
  const earlyIssue = clone(roundTrip); earlyIssue.issuedAtStep = 1;
  assert.equal(api.normalizeShipAcquisitionV89(earlyIssue, owner), null);
  const changedReceipt = clone(roundTrip); changedReceipt.authorityReceipt.instanceId = 'test-only:other';
  assert.equal(api.normalizeShipAcquisitionV89(changedReceipt, owner), null);
  const unsupportedReceipt = clone(roundTrip); unsupportedReceipt.authorityReceipt.version = 2;
  assert.equal(api.normalizeShipAcquisitionV89(unsupportedReceipt, owner), null);
  const lowRevision = clone(roundTrip); lowRevision.revision = lowRevision.actor.steps;
  assert.equal(api.normalizeShipAcquisitionV89(lowRevision, owner), null);
});

test('source dialogue is unique and becomes available only through current real prerequisites', () => {
  const p = player();
  p.ok({kind: 'intent', option: 'B'}); assert.deepEqual(p.state.presentedLineIds, []);
  p.ctx.authority = fixtureAuthority();
  p.ok({kind: 'intent', option: 'B'});
  assert.equal(p.state.presentedLineIds.length, 3);
  assert.equal(new Set(p.state.presentedLineIds).size, 3);
  assert.equal(p.act({kind: 'intent', option: 'B'}).changed, false);
  denied(p.act({kind: 'intent', option: 'A'}));
  assert.equal(p.state.intent, 'B');
});

test('the actual panel renders native disabled pause controls and honest no-authority staging', () => {
  const Panel = load('app/game/ShipAcquisitionV89.tsx').default;
  const types = load('app/game/save.ts');
  // defaultSave remains a source fixture; this does not touch localStorage or account data.
  const defaultSave = types.defaultSave();
  const props = {appearance: defaultSave.appearance, loadout: defaultSave.loadout,
    controlled: {state: null, context: context({suspended: true}),
      onAction: () => {throw new Error('SSR must not dispatch a gameplay action');}},
    onOpenSettings: () => {throw new Error('SSR must not invoke settings');}};
  const markup = renderToStaticMarkup(React.createElement(Panel, props));
  assert.match(markup, /Chantier suspendu/);
  assert.match(markup, /Réglages/);
  const buttons = [...markup.matchAll(/<button\b([^>]*)>/g)];
  assert.ok(buttons.length >= 5);
  assert.ok(buttons.every(match => /\bdisabled\b/.test(match[1])));
  assert.match(markup, /Moyens et accord/);
  assert.match(markup, /aucun accord ni enregistrement audio/);
  assert.match(markup, /data-actor-x="144"/);
  assert.ok(!markup.includes('<audio'));
  assert.ok(!markup.includes('Les droits sont remis. Cette fois, tu entres dans ton vaisseau.'));
});
