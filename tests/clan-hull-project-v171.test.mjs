import assert from 'node:assert/strict';
import test from 'node:test';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {playShipAcquisitionV161} from './helpers/ship-receipt-v161.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const ship = qa.load('app/game/systems/shipAcquisitionV89.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const project = qa.load('app/game/systems/clanHullProjectV171.ts');
const owner = '2026-11-21T10:00:00.000Z';
const storageKey = saves.SAVE_STORAGE_KEY;

function withOwnedHull() {
  const save = saves.defaultSave(owner);
  save.profile.honor = 5000;
  save.profile.rankId = 'elite';
  const owned = playShipAcquisitionV161(qa, save);
  const receipt = ship.shipAcquisitionOwnedHullV89(owned.shipAcquisitionV89, owner);
  assert.ok(receipt);
  const context = { ownerCreatedAt: owner, personalShipId: receipt.shipId };
  let state = docking.createClanShipDockingState(owner, receipt.shipId);
  for (const type of ['approach', 'dock', 'board']) {
    const next = docking.actClanShipDocking(state, { type }, context);
    assert.ok(next.accepted, next.message);
    state = next.state;
  }
  return { ...owned, clanShipDocking: state };
}

function at(save, roomId) {
  const state = save.clanShipDocking;
  if (state.roomId === roomId) return save;
  const result = docking.actClanShipDocking(state, { type: 'move-room', roomId },
    { ownerCreatedAt: owner, personalShipId: state.personalShipId });
  assert.ok(result.accepted, result.message);
  return { ...save, clanShipDocking: result.state };
}

function accept(save, command, contact = null) {
  const before = JSON.stringify(save);
  const result = project.commitClanHullProject(save, { expectedRevision: save.clanHullProjectV171?.revision ?? 0, ...command }, contact);
  assert.ok(result.ok, result.message);
  assert.equal(JSON.stringify(save), before);
  return { ...save, clanHullProjectV171: result.state };
}

test('a genuinely issued Elite hull can inspect, meet both holders and record either decision at the council', () => {
  const start = withOwnedHull();
  assert.equal(project.canReviewClanHullProject(start), true);
  assert.equal(project.canReviewClanHullProject({ ...start, shipAcquisitionV89: null }), false);
  assert.equal(project.commitClanHullProject(at(start, 'conseil'), { type: 'inspect', expectedRevision: 0 }, null).ok, false);
  let visit = accept(start, { type: 'inspect' });
  assert.equal(project.commitClanHullProject(visit, { type: 'consult', expectedRevision: 1 }, 'star-watch').ok, false);
  assert.equal(project.commitClanHullProject(visit, { type: 'consult', expectedRevision: 0 }, 'threshold-guard').ok, false);
  visit = accept(visit, { type: 'consult' }, 'threshold-guard');
  visit = at(visit, 'conseil');
  assert.equal(project.commitClanHullProject(visit, { type: 'pledge', expectedRevision: 2, pledge: 'personal' }, null).ok, false);
  visit = accept(visit, { type: 'consult' }, 'star-watch');
  for (const pledge of ['shared-watch', 'personal']) {
    const finished = accept(visit, { type: 'pledge', pledge });
    assert.equal(finished.clanHullProjectV171.pledge, pledge);
    assert.equal(finished.clanHullProjectV171.revision, 4);
    assert.deepEqual(finished.shipAcquisitionV89, start.shipAcquisitionV89);
    const parsed = saves.parseSaveImport(saves.exportSave(finished));
    assert.equal(parsed.failure, null);
    assert.deepEqual(parsed.save.clanHullProjectV171, finished.clanHullProjectV171);
    assert.equal(project.commitClanHullProject(finished, { type: 'pledge', expectedRevision: 4, pledge }, null).ok, false);
  }
});

test('normal writes reject rollback, skipped consultations, foreign hull and future project data', () => {
  const start = withOwnedHull();
  const inspected = accept(start, { type: 'inspect' });
  const witness = accept(inspected, { type: 'consult' }, 'threshold-guard');
  const council = accept(at(witness, 'conseil'), { type: 'consult' }, 'star-watch');
  const values = new Map();
  const storage = {
    get length() { return values.size; },
    key(i) { return [...values.keys()][i] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  assert.ok(saves.writeSaveWithStatus(start, storage, storageKey).persisted);
  assert.equal(saves.writeSaveWithStatus(witness, storage, storageKey).failure, 'save-conflict');
  const first = saves.writeSaveWithStatus(inspected, storage, storageKey);
  assert.ok(first.persisted, first.failure);
  const oneWitness = { ...first.save, clanHullProjectV171: witness.clanHullProjectV171 };
  const second = saves.writeSaveWithStatus(oneWitness, storage, storageKey);
  assert.ok(second.persisted, second.failure);
  assert.equal(saves.writeSaveWithStatus(first.save, storage, storageKey).failure, 'save-conflict');
  const last = { ...second.save, clanShipDocking: council.clanShipDocking, clanHullProjectV171: council.clanHullProjectV171 };
  const third = saves.writeSaveWithStatus(last, storage, storageKey);
  assert.ok(third.persisted, third.failure);
  for (const [patch, failure] of [
    [{ hullInstanceId: 'replacement' }, 'invalid-save'],
    [{ ownerCreatedAt: '2026-11-20T12:00:00.000Z' }, 'invalid-save'],
    [{ version: 2 }, 'future-version'],
  ]) {
    const save = { ...last, clanHullProjectV171: { ...last.clanHullProjectV171, ...patch } };
    assert.equal(saves.parseSaveImport(JSON.stringify(save)).failure, failure);
  }
});

const exterior = qa.load('app/game/systems/clanHullExteriorV172.ts');
const exteriorJourney = [
  ...Array(4).fill('east'), 'inspect',
  'north', 'north', ...Array(5).fill('east'), ...Array(3).fill('north'), 'inspect',
  ...Array(3).fill('south'), ...Array(5).fill('west'), ...Array(3).fill('north'), 'west', 'west', 'inspect',
  'west', 'west', ...Array(5).fill('south'), 'report',
];

test('the exterior route needs both real scans, an open gantry and a return to the hangar', () => {
  let view = exterior.createHullExteriorView();
  for (const command of ['north', 'north', ...Array(4).fill('east')]) view = exterior.stepHullExterior(view, command);
  assert.deepEqual(view.position, { column: 5, row: 4 });
  assert.equal(exterior.stepHullExterior(view, 'east'), view);
  assert.equal(exterior.inspectHullExteriorSurvey({ route: ['report'] }), null);
  assert.equal(exterior.inspectHullExteriorSurvey({ route: exteriorJourney.slice(0, -1) }), null);
  assert.equal(exterior.inspectHullExteriorSurvey({ route: [...exteriorJourney, 'inspect'] }), null);
  const report = { type: 'exterior-survey', survey: { route: exteriorJourney } };
  const initial = withOwnedHull();
  assert.equal(project.commitClanHullProject(initial, { expectedRevision: 0, ...report }, null).ok, false);
  const inspected = accept(initial, { type: 'inspect' });
  assert.equal(project.commitClanHullProject(at(inspected, 'conseil'), { expectedRevision: 1, ...report }, null).ok, false);
  const checked = accept(inspected, report);
  assert.equal(checked.clanHullProjectV171.revision, 2);
  assert.deepEqual(checked.clanHullProjectV171.exteriorSurvey, report.survey);
  assert.equal(checked.clanHullProjectV171.consultations, 0);
  assert.equal(checked.clanHullProjectV171.pledge, null);
  assert.equal(checked.clanShipOperations, inspected.clanShipOperations);
  assert.equal(project.commitClanHullProject(checked, { expectedRevision: 2, ...report }, null).ok, false);
});

test('the exterior proof writes and reloads against the old campaign hull without changing its choice', () => {
  const base = accept(withOwnedHull(), { type: 'inspect' });
  const guard = accept(base, { type: 'consult' }, 'threshold-guard');
  const watch = accept(at(guard, 'conseil'), { type: 'consult' }, 'star-watch');
  const oldChoice = at(accept(watch, { type: 'pledge', pledge: 'personal' }), 'hangar');
  const data = new Map();
  const memory = {
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key),
  };
  const started = saves.replaceSaveWithStatus(oldChoice, memory);
  assert.ok(started.persisted, started.failure);
  const played = accept(started.save, { type: 'exterior-survey', survey: { route: exteriorJourney } });
  const wrote = saves.writeSaveWithStatus(played, memory);
  assert.ok(wrote.persisted, wrote.failure);
  const parsed = saves.parseSaveImport(saves.exportSave(wrote.save));
  assert.ok(parsed.save, parsed.failure);
  assert.equal(parsed.save.clanHullProjectV171.pledge, 'personal');
  assert.equal(parsed.save.clanHullProjectV171.consultations, 3);
  assert.equal(parsed.save.clanHullProjectV171.revision, 5);
  assert.deepEqual(parsed.save.clanHullProjectV171.exteriorSurvey.route, exteriorJourney);
  assert.equal(saves.writeSaveWithStatus(oldChoice, memory).failure, 'save-conflict');
  for (const patch of [
    { exteriorSurvey: { route: ['report'] } }, { hullInstanceId: 'another-hull' }, { ownerCreatedAt: '2026-11-12T10:01:00.000Z' },
  ]) {
    const altered = { ...parsed.save, clanHullProjectV171: { ...parsed.save.clanHullProjectV171, ...patch } };
    assert.equal(saves.parseSaveImport(JSON.stringify(altered)).failure, 'invalid-save');
  }
});
