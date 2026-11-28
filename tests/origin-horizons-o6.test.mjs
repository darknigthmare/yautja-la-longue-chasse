import assert from "node:assert/strict";
import test from "node:test";
import { applyHorizonO6, horizonCheckpointO6, horizons, horizonsAdmissionO6, terrain } from "./helpers/origin-horizons-o6.mjs";

const copy = value => structuredClone(value);
const receipt = save => save.originV151.horizonsO6;
const prepare = horizon => ({ kind: "prepare", horizon });
const choose = horizon => ({ kind: "choose", horizon });
const listen = { kind: "listen" };

test("un témoin Elite et un poste réellement accessible précèdent les préparatifs", () => {
  const save = horizonsAdmissionO6();
  const at = horizonCheckpointO6(save, "saar");
  const step = (state, point) => horizons.recordHorizonsO6(state, listen, point);
  assert.ok(step(save, at));
  assert.equal(step({ ...save, eliteRecognitionV174: null }, at), null);
  assert.equal(step({ ...save, originV151: { ...save.originV151, source: "legacy-default" } }, at), null);
  assert.equal(step(save, { ...at, levelId: "0" }), null);
  assert.equal(step(save, { ...at, exterior: { x: 2, y: 2 } }), null);
  assert.equal(step(save, { ...at, ownerCreatedAt: "autre" }), null);
  assert.equal(horizons.recordHorizonsO6(save, prepare("teaching"), horizonCheckpointO6(save, "teaching")), null);
});

test("les trois visites et la responsabilité choisie reprennent sans modifier la fin de voie", () => {
  const opening = horizonsAdmissionO6();
  let save = opening;
  const disk = new Map();
  const storage = { getItem: key => disk.get(key) ?? null, setItem: (key, value) => disk.set(key, value) };
  assert.ok(terrain.replaceSaveWithStatus(save, storage).persisted);
  for (const order of [listen, prepare("circle"), prepare("exploration"), prepare("teaching"), choose("exploration")]) {
    const next = applyHorizonO6(save, order);
    if (order.kind === "listen") {
      assert.equal(horizons.recordHorizonsO6(next, order, horizonCheckpointO6(save, "saar")), null);
      assert.equal(horizons.recordHorizonsO6(next, choose("circle"), horizonCheckpointO6(save, "saar")), null);
    }
    const saved = terrain.writeSaveWithStatus(next, storage);
    assert.ok(saved.persisted, saved.failure);
    save = terrain.parseSaveImport(terrain.exportSave(saved.save)).save;
    assert.deepEqual(receipt(save), receipt(next));
    assert.deepEqual(save.homeworld.locationV77, receipt(save).journal.at(-1).at);
  }
  assert.deepEqual(horizons.horizonSitesO6(save), []);
  assert.equal(receipt(save).journal.at(-1).horizon, "exploration");
  assert.equal(save.originV151.ending, opening.originV151.ending);
  assert.deepEqual(save.originV151.relations, opening.originV151.relations);
  assert.deepEqual(save.originV151.consumed, opening.originV151.consumed);
  assert.deepEqual(save.prologue.chronicle, opening.prologue.chronicle);
  assert.deepEqual(save.residenceV149, opening.residenceV149);
  assert.deepEqual(save.trophies, opening.trophies);
  assert.equal(terrain.writeSaveWithStatus(opening, storage).failure, "save-conflict");

  const forged = copy(save);
  forged.originV151.horizonsO6.journal[2].at.levelId = "0";
  assert.equal(terrain.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  const future = copy(save);
  future.originV151.horizonsO6.version = 2;
  assert.equal(terrain.parseSaveImport(JSON.stringify(future)).failure, "future-version");
});

test("un projet réduit reste réalisable et résiste à la substitution de ses moyens", () => {
  let save = applyHorizonO6(horizonsAdmissionO6(false), listen);
  save = applyHorizonO6(save, prepare("teaching"));
  assert.equal(receipt(save).journal.at(-1).reduced, true);
  assert.equal(horizons.recordHorizonsO6(save, prepare("teaching"), horizonCheckpointO6(save, "teaching")), null);
  const forged = copy(save);
  forged.originV151.horizonsO6.journal.at(-1).reduced = false;
  assert.equal(terrain.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  const wrongLocation = applyHorizonO6(save, prepare("circle"));
  wrongLocation.homeworld.locationV77 = save.homeworld.locationV77;
  assert.equal(horizons.keepsHorizonsO6(save, wrongLocation), false);
  save = applyHorizonO6(save, prepare("exploration"));
  save = applyHorizonO6(save, prepare("circle"));
  save = applyHorizonO6(save, choose("teaching"));
  assert.equal(terrain.parseSaveImport(terrain.exportSave(save)).failure, null);
  assert.equal(receipt(save).journal.at(-1).horizon, "teaching");
});
