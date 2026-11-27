import assert from 'node:assert/strict';
import test from 'node:test';
import { finale, houseSite, legacyCanonicalCohortFixture, legacyFixture, legacyPlayer, legacyRegions as regions, saves } from './helpers/legacy-finale-r2.mjs';
import { walkO6 } from './helpers/origin-continuation-o6.mjs';

function withEpilogue(save, complete = true) {
  const player = legacyPlayer(save);
  player.move('epilogue', 'belongings', 6);
  player.move('epilogue', 'relations', 11);
  player.move('epilogue', 'choose', 16, { choice: 'welcome' });
  if (complete) player.move('epilogue', 'act', 14);
  return player.save;
}

const view = save => finale.legacyDepartureViewR2(save, save.homeworldRegionV68);
function play(save, order) {
  const post = view(save).actions.find(action => action.order === order);
  assert.ok(post, order);
  save = walkO6(save, post);
  const next = finale.advanceLegacyDepartureR2(save, save.homeworldRegionV68, order);
  assert.ok(next, order);
  assert.equal(finale.legacyFinaleSuccessorR2(save.legacyFinaleR2, next), true);
  return { ...save, legacyFinaleR2: next };
}

function settleThreshold(save) {
  let region = save.homeworldRegionV68;
  for (let tick = 0; tick < 50; tick++) region = regions.stepHomeworldRegionV68(region);
  assert.equal(region.zone, 'interior');
  return { ...save, homeworldRegionV68: region };
}

test('the voluntary departure needs the played lesson, a completed home M060 and a recognized senior rank', () => {
  const ancient = legacyCanonicalCohortFixture();
  assert.equal(view(ancient), null);
  assert.equal(view(withEpilogue(ancient, false)), null);
  assert.equal(view(withEpilogue(legacyFixture({ ancient: false }))), null);
  const home = withEpilogue(ancient);
  assert.equal(home.legacyFinaleR2.version, 1);
  assert.equal(finale.legacyDepartureStatusR2(home).stage, 'waiting');
  assert.equal(finale.advanceLegacyDepartureR2(home, home.homeworldRegionV68, 'departure-escort'), null);
  const oldOrigin = { ...home.originV151 };
  delete oldOrigin.continuationO6;
  const archive = saves.parseSaveImport(saves.exportSave({ ...home, originV151: oldOrigin }));
  assert.ok(archive.save, archive.failure);
  assert.equal(view(archive.save), null);
  assert.ok(finale.legacyEpilogueViewR2(archive.save.legacyFinaleR2, houseSite).complete);
});

test('a deferred departure keeps the advice, signs the threshold first and can resume outside', () => {
  const baseline = withEpilogue(legacyCanonicalCohortFixture());
  let save = baseline;
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key) };
  assert.ok(saves.replaceSaveWithStatus(save, disk).persisted);
  const advance = order => {
    save = play(save, order);
    const write = saves.writeSaveWithStatus(save, disk);
    assert.ok(write.persisted, write.failure);
    const reloaded = saves.parseSaveImport(saves.exportSave(write.save));
    assert.ok(reloaded.save, reloaded.failure);
    save = reloaded.save;
  };
  for (const order of ['departure-listen', 'departure-advise', 'departure-defer']) advance(order);
  assert.equal(save.legacyFinaleR2.version, 2);
  assert.deepEqual([view(save).stage, view(save).resolved, view(save).success], ['deferred', false, false]);
  assert.deepEqual(view(save).actions.map(action => action.order), ['departure-resume']);
  assert.match(view(save).line, /garde ton conseil/);
  advance('departure-resume');
  advance('departure-let-pass');
  assert.equal(view(save).passing, true);
  assert.equal(view(save).actions[0].near, false);
  const passing = save;
  save = walkO6(settleThreshold(save), regions.HOMEWORLD_REGION_INTERIOR_V68.entry);
  const village = regions.stepHomeworldRegionV68(save.homeworldRegionV68, { interact: true });
  assert.equal(village.zone, 'village');
  assert.ok(regions.canAdvanceHomeworldRegionV68(save.homeworldRegionV68, village));
  save = { ...save, homeworldRegionV68: village };
  assert.ok(view(save).student);
  assert.equal(view(save).actions[0].order, 'departure-escort');
  advance('departure-escort');
  assert.deepEqual([view(save).stage, view(save).resolved, view(save).success], ['escorted', true, true]);
  assert.deepEqual(save.originV151, baseline.originV151);
  assert.deepEqual(save.prologue.chronicle, baseline.prologue.chronicle);
  assert.deepEqual(save.trophies, baseline.trophies);
  assert.deepEqual(save.legacyFinaleR2.epilogue, baseline.legacyFinaleR2.epilogue);
  assert.equal(saves.writeSaveWithStatus(passing, disk).failure, 'save-conflict');

  for (const corrupt of [
    state => { state.legacyFinaleR2.departureO6.events.splice(1, 1); },
    state => { state.legacyFinaleR2.departureO6.houseId = 'HOME-CM08'; },
    state => { delete state.legacyFinaleR2.departureO6.crossing; },
    state => { state.legacyFinaleR2.epilogue.events.pop(); },
  ]) {
    const wrong = structuredClone(save);
    corrupt(wrong);
    assert.equal(saves.parseSaveImport(JSON.stringify(wrong)).failure, 'invalid-save');
  }
});

test('after letting the novice pass, staying takes the mentor back to the actual bench', () => {
  let save = withEpilogue(legacyCanonicalCohortFixture());
  for (const order of ['departure-listen', 'departure-advise', 'departure-let-pass']) save = play(save, order);
  save = settleThreshold(save);
  assert.equal(finale.advanceLegacyDepartureR2(save, save.homeworldRegionV68, 'departure-stay'), null);
  save = play(save, 'departure-stay');
  assert.deepEqual([view(save).stage, view(save).resolved, view(save).success], ['stayed', true, true]);
  assert.equal(finale.advanceLegacyDepartureR2(save, save.homeworldRegionV68, 'departure-stay'), null);
  assert.equal(finale.legacyFinaleSuccessorR2(save.legacyFinaleR2, { ...save.legacyFinaleR2, departureO6: undefined }), false);
});
