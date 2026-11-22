import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './helpers/ship-receipt-v161.mjs';

const qa = homeworldSceneSsrV78();
const { defaultSave } = qa.load('app/game/save.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const {
  applyEarthHuntActionV171: apply,
  getEarthHuntAccessV171: admission,
  inspectEarthHuntV171: inspect,
} = qa.load('app/game/systems/earthHuntV171.ts');
const owner = '2026-11-22T12:00:00.000Z';
const admitted = { allowed: true };
const deploy = { kind: 'deploy', site: 'papyrus' };
const move = direction => ({ kind: 'move', direction });
const action = kind => ({ kind });

function bloodedCampaign() {
  const state = chronicle.createClanChronicle();
  const rites = chronicle.CHRONICLE_RITES.slice(0, 3);
  const expectedProofs = new Set(['intro-begun', ...rites.flatMap(rite => rite.requiredEvidenceIds)]);
  state.evidence = chronicle.CHRONICLE_EVIDENCE.filter(proof => expectedProofs.has(proof.id))
    .map(({ id, sourceId }) => ({ id, sourceId }));
  state.rites = rites.map(({ id, sourceId }) => ({ id, sourceId }));
  assert.equal(chronicle.getChronicleRank(state), 'blooded');
  return { ...defaultSave(owner), prologue: { chronicle: state } };
}

function run(state, ...commands) {
  for (const command of commands) {
    const next = apply(state, owner, command, admitted);
    assert.equal(next.accepted, true, JSON.stringify(command) + ' – ' + next.message);
    state = next.state;
  }
  return state;
}

function beforeFlare() {
  return run(null, deploy, move('north'), move('north'), action('scan'), move('north'), action('scan'),
    move('east'), action('cloak'), move('east'), move('east'), move('east'), action('listen'),
    move('east'), move('east'), action('strike'));
}

function atLisle(state) {
  return run(state, action('cloak'), move('east'), action('strike'), move('east'));
}

test('Earth access requires the chronicle, ownership and the first interstellar return', () => {
  const automaticRank = defaultSave(owner);
  automaticRank.profile.rankId = 'elite';
  automaticRank.profile.acquiredRankIdV166 = 'elite';
  assert.match(admission(automaticRank, true).reason, /Blooded/);
  const campaign = bloodedCampaign();
  assert.match(admission(campaign, true).reason, /R2-M021/);
  assert.match(admission(playShipAcquisitionV161(qa, campaign, 'rights'), true).reason, /R2-M021/);
  const ownerCampaign = playShipAcquisitionV161(qa, campaign);
  const beforeReturn = admission(ownerCampaign, false);
  assert.match(beforeReturn.reason, /R2-M023/);
  assert.equal(apply(null, owner, deploy, beforeReturn).accepted, false);
  assert.deepEqual(admission(ownerCampaign, true), admitted);
});

test('Okavango resumes after reload and reports a trophy after reaching extraction', () => {
  const flare = run(beforeFlare(), action('strike'));
  let view = inspect(flare, owner).view;
  assert.equal(view.flooded, true);
  assert.equal(view.guard, 'alert');
  assert.equal(view.cloak, false);
  assert.equal(apply(flare, owner, action('extract'), admitted).accepted, false);
  const resumed = JSON.parse(JSON.stringify(flare));
  const defeated = atLisle(run(resumed, action('jam')));
  view = inspect(defeated, owner).view;
  assert.equal(view.index, 0);
  assert.equal(view.guard, 'jammed');
  assert.equal(view.lislePhase, 3);
  const trophy = run(defeated, action('finish'), action('harvest'));
  assert.equal(inspect(trophy, owner).view.cloak, false);
  const quay = run(trophy, move('south'), action('clean'), move('south'), action('extract'));
  assert.equal(inspect(quay, owner).view.phase, 'extracted');
  assert.equal(inspect(quay, owner).view.index, 0);
  assert.equal(inspect(run(quay, action('report')), owner).view.phase, 'reported');
  assert.equal(apply(quay, owner, action('harvest'), admitted).accepted, false);
});

test('An image left on the phone and a spared target affect the same discretion index', () => {
  const defeated = atLisle(run(beforeFlare(), action('strike')));
  assert.equal(inspect(defeated, owner).view.guard, 'transmitted');
  assert.equal(inspect(defeated, owner).view.index, 8);
  const spared = run(defeated, action('spare'));
  assert.equal(inspect(spared, owner).view.index, 11);
  assert.equal(apply(spared, owner, action('harvest'), admitted).accepted, false);
  const returned = run(spared, move('south'), move('south'), action('extract'), action('report'));
  assert.equal(inspect(returned, owner).view.outcome, 'spared');
  assert.equal(inspect(returned, owner).view.phase, 'reported');
});

test('An interrupted extraction preserves discretion on return to the registry', () => {
  let state = run(atLisle(run(beforeFlare(), action('strike'))), action('spare'));
  for (let remaining = 16; remaining > 0; remaining -= 1) state = run(state, action('scan'));
  assert.equal(inspect(state, owner).view.phase, 'failed');
  const retry = run(state, action('retry'));
  assert.equal(inspect(retry, owner).view.phase, 'registry');
  assert.equal(inspect(retry, owner).view.index, 11);
  assert.equal(inspect(retry, owner).view.trophy, false);
});

test('Replayed journals refuse invalid action order and foreign ownership', () => {
  const state = run(null, deploy);
  assert.equal(inspect(state, '2026-11-21T12:00:00.000Z').status, 'invalid');
  assert.equal(inspect({ ...state, version: 2 }, owner).status, 'future-version');
  const forged = { ...state, actions: [...state.actions, action('report')] };
  assert.equal(inspect(forged, owner).status, 'invalid');
  assert.equal(apply(forged, owner, action('scan'), admitted).accepted, false);
  assert.equal(inspect({ ...state, trophy: true }, owner).view.trophy, false);
});

test('The scene renders the admission explanation and the actual map checkpoints', () => {
  const props = { owner, onAction: () => { throw Error('SSR must not dispatch'); }, onExit() {} };
  const render = extra => qa.render('app/game/EarthHuntV171.tsx', { ...props, ...extra });
  const locked = render({ access: { allowed: false, reason: 'Trajet requis' }, state: null });
  assert.match(locked, /Trajet requis/);
  assert.doesNotMatch(locked, /Choisir le dépôt/);
  assert.match(render({ access: admitted, state: null }), /Îlot de papyrus/);
  const field = render({ access: admitted, state: run(null, deploy) });
  assert.match(field, /Carte du delta/);
  assert.match(field, /data-earth-hunt="field"/);
});
