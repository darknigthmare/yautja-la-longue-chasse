import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const tutorial = qa.load('app/game/systems/trophyTutorialV6.ts');
const archives = qa.load('app/game/systems/completeArchive.ts');
const OWNER = '2026-11-09T12:00:00.000Z';
const MAIN = saves.SAVE_STORAGE_KEY;
const clone = value => JSON.parse(JSON.stringify(value));

function storage(values = new Map()) {
  return {
    values, writes: 0, denyPrimary: false,
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem(key, raw) {
      if (key === MAIN && this.denyPrimary) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, raw); this.writes++;
    },
    removeItem(key) { values.delete(key); this.writes++; },
  };
}
function write(save, disk) {
  const result = saves.writeSaveWithStatus(save, disk, MAIN);
  assert.equal(result.persisted, true, result.failure);
  return result.save;
}
function walkToNext(state) {
  const step = tutorial.trophyTutorialStepV6(state);
  const target = tutorial.trophyTutorialStationV6(step.station).point;
  let route = tutorial.planTrophyTutorialPathV6(state, target), frames = 0;
  assert.ok(route.length);
  while (route.length && frames++ < 1500) {
    const next = tutorial.stepTrophyTutorialPathV6(state, route, .05);
    state = next.state; route = next.remaining;
  }
  assert.equal(route.length, 0);
  return state;
}
function recorded(count = 3) {
  const values = [
    { open: true, railsRead: true, margin: 20 },
    { frameX: 50, frameY: 50, zoom: 60 },
    { traces: ['visible-mark', 'ground-reference'] },
    { cradle: 'fitted' },
    { leftAttachment: 23, rightAttachment: 77 },
    { provenance: 'local-model', closed: true },
    { rail: 100, sourceVisible: true },
    { screening: 'unknown', handling: 'teaching-model' },
  ];
  let state = tutorial.createTrophyTutorialV6(OWNER);
  for (let i = 0; i < count; i++) {
    state = walkToNext(state);
    const next = tutorial.actTrophyTutorialV6(state, { step: i + 1, values: values[i] });
    assert.equal(next.accepted, true, next.message); state = next.state;
  }
  return state;
}

test('legacy campaign import does not create an activity, object or tutorial completion', () => {
  const original = saves.defaultSave(OWNER);
  const disk = storage(), confirmed = write(original, disk);
  for (const source of [confirmed, saves.loadSaveWithStatus(disk, MAIN).save,
    saves.parseSaveImport(saves.exportSave(confirmed)).save]) {
    assert.ok(source);
    assert.equal(Object.hasOwn(source, 'trophyTutorialV6'), false);
    assert.deepEqual(source.profile, confirmed.profile);
    assert.deepEqual(source.trophies, confirmed.trophies);
  }
});

test('three physically completed gestures survive the actual writer, reload and portable import without rewards', () => {
  const original = saves.defaultSave(OWNER), disk = storage();
  const ledger = recorded();
  const confirmed = write({ ...original, trophyTutorialV6: ledger }, disk);
  const loaded = saves.loadSaveWithStatus(disk, MAIN);
  const imported = saves.parseSaveImport(saves.exportSave(confirmed));
  assert.equal(loaded.loaded, true, loaded.failure);
  assert.ok(imported.save, imported.failure);
  for (const save of [loaded.save, imported.save]) {
    assert.deepEqual(save.trophyTutorialV6, confirmed.trophyTutorialV6);
    assert.equal(save.trophyTutorialV6.completedSteps, 3);
    assert.deepEqual(save.profile, original.profile);
    assert.deepEqual(save.inventory, original.inventory);
    assert.deepEqual(save.trophies, original.trophies);
  }
});

test('one observed face at gesture nine remains a partial observation after campaign normalization', () => {
  const atInspection = walkToNext(recorded(8));
  const viewed = tutorial.actTrophyTutorialV6(atInspection, { step: 9, partial: 'view', values: { view: 'face' } });
  assert.equal(viewed.accepted, true, viewed.message);
  const disk = storage();
  const confirmed = write({ ...saves.defaultSave(OWNER), trophyTutorialV6: viewed.state }, disk);
  const restored = saves.loadSaveWithStatus(disk, MAIN).save;
  assert.equal(restored.trophyTutorialV6.completedSteps, 8);
  assert.equal(restored.trophyTutorialV6.revision, 9);
  assert.deepEqual(tutorial.trophyTutorialObservedViewsV6(restored.trophyTutorialV6), ['face']);
  assert.deepEqual(restored.trophyTutorialV6, confirmed.trophyTutorialV6);
});

test('complete archive parsing retains the same pedagogical object and stable post', () => {
  const disk = storage();
  const confirmed = write({ ...saves.defaultSave(OWNER), trophyTutorialV6: recorded() }, disk);
  const before = [...disk.values];
  const result = archives.parseCompleteArchive(archives.createCompleteArchive(confirmed, disk, OWNER).serialized);
  assert.ok(result.archive, result.failure);
  assert.deepEqual(result.archive.campaign.trophyTutorialV6, confirmed.trophyTutorialV6);
  assert.deepEqual([...disk.values], before);
});

test('future, explicit null, foreign and fabricated tutorial records cannot overwrite a confirmed campaign', () => {
  const disk = storage(), confirmed = write({ ...saves.defaultSave(OWNER), trophyTutorialV6: recorded() }, disk);
  for (const [expected, edit] of [
    ['future-version', save => { save.trophyTutorialV6.version = 2; }],
    ['invalid-save', save => { save.trophyTutorialV6 = null; }],
    ['invalid-save', save => { save.trophyTutorialV6.owner = '2026-11-10T12:00:00.000Z'; }],
    ['invalid-save', save => { save.trophyTutorialV6.completedSteps = 18; }],
    ['invalid-save', save => { save.trophyTutorialV6.objectId = 'real-hunted-trophy'; }],
  ]) {
    const invalid = clone(confirmed); edit(invalid);
    const before = [...disk.values], writes = disk.writes;
    assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, expected);
    assert.equal(saves.writeSaveWithStatus(invalid, disk, MAIN).persisted, false);
    assert.equal(saves.importSaveWithStatus(JSON.stringify(invalid), disk, MAIN).persisted, false);
    assert.deepEqual([...disk.values], before);
    assert.equal(disk.writes, writes);
  }
});

test('a future primary stays protected beside an older valid tutorial backup', () => {
  const old = { ...saves.defaultSave(OWNER), trophyTutorialV6: recorded() };
  const future = clone(old); future.trophyTutorialV6.version = 2;
  const disk = storage(new Map([[MAIN, JSON.stringify(future)], [MAIN + '.backup', JSON.stringify(old)]]));
  const before = [...disk.values];
  const loaded = saves.loadSaveWithStatus(disk, MAIN);
  assert.equal(loaded.loaded, false); assert.equal(loaded.failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(old, disk, MAIN).failure, 'protected-save');
  assert.deepEqual([...disk.values], before); assert.equal(disk.writes, 0);
});

test('quota denial leaves the old checkpoint readable; retry stores the same gesture once', () => {
  const disk = storage(), original = write(saves.defaultSave(OWNER), disk);
  const before = disk.getItem(MAIN), candidate = { ...original, trophyTutorialV6: recorded() };
  disk.denyPrimary = true;
  assert.equal(saves.writeSaveWithStatus(candidate, disk, MAIN).persisted, false);
  assert.equal(disk.getItem(MAIN), before);
  assert.equal(Object.hasOwn(saves.loadSaveWithStatus(disk, MAIN).save, 'trophyTutorialV6'), false);
  disk.denyPrimary = false;
  const confirmed = write(candidate, disk);
  assert.equal(confirmed.trophyTutorialV6.events.length, 3);
  assert.equal(confirmed.trophyTutorialV6.revision, 3);
  assert.deepEqual(confirmed.profile, original.profile);
});
