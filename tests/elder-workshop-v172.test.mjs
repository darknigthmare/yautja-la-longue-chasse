import assert from "node:assert/strict";
import { test } from "node:test";
import { docking, qa, saves } from "./helpers/clan-ship-trophy-hearing-fixture.mjs";
import { elderWorkshopAdmissionV172 } from "./helpers/elder-workshop-fixture-v172.mjs";
const workshop = qa.load("app/game/systems/elderWorkshopV172.ts");

function intoCouncil(save) {
  const result = docking.actClanShipDocking(save.clanShipDocking, { type: "move-room", roomId: "conseil" },
    { ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipDocking: result.state };
}

function commit(save, action, expectedRevision = save.elderWorkshopV172?.history.length ?? 0) {
  return workshop.commitElderWorkshopV172(save, { action, expectedRevision });
}

function act(save, action) {
  const result = commit(save, action);
  assert.equal(result.ok, true, result.message);
  return { ...save, elderWorkshopV172: result.state };
}

test("M052 requires recognition, the recruited armorer, and a current visit to the armory", () => {
  const save = elderWorkshopAdmissionV172();
  assert.equal(workshop.canWorkWithClanArmorerV172(save), true);
  assert.equal(commit({ ...save, elderAssemblyV168: null }, "observe").ok, false);
  assert.equal(commit({ ...save, elderMentoringV168: null }, "observe").ok, false);
  assert.equal(commit({ ...save, clanShipOperations: null }, "observe").ok, false);
  assert.equal(commit(intoCouncil(save), "observe").ok, false);
  assert.equal(commit(save, "fit").ok, false);
  assert.equal(commit(act(save, "observe"), "inspect", 0).ok, false);
});

for (const [method, crans] of [["repair", 3], ["support", 2]]) {
  test("M052 carries out the " + method + " and restores the armorer's control after reload", () => {
    const memory = new Map();
    const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, data) => memory.set(key, data),
      removeItem: key => memory.delete(key) };
    let save = elderWorkshopAdmissionV172();
    assert.equal(saves.replaceSaveWithStatus(save, storage).persisted, true);
    assert.equal(saves.writeSaveWithStatus(act(act(save, "observe"), "inspect"), storage).failure, "save-conflict");
    const history = ["observe", "inspect", method, ...Array(crans).fill("align"), "fit", "handover"];
    for (const action of history) {
      const next = act(save, action);
      const result = saves.writeSaveWithStatus(next, storage);
      assert.equal(result.persisted, true, action + ": " + result.failure);
      assert.equal(saves.writeSaveWithStatus(save, storage).failure, "save-conflict", action);
      save = saves.loadSaveWithStatus(storage).save;
      assert.ok(save);
    }
    assert.deepEqual(save.elderWorkshopV172.history, history);
    assert.equal(commit(save, "handover").ok, false);
    const portable = saves.parseSaveImport(saves.exportSave(intoCouncil(save)));
    assert.ok(portable.save, portable.failure);
    const { view } = workshop.inspectElderWorkshopV172(portable.save.elderWorkshopV172, save.createdAt);
    assert.equal(view.phase, "complete");
    assert.equal(view.method, method);
    assert.equal(view.alignment, crans);
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, elderAssemblyV168: null })).failure, "invalid-save");
    const { elderWorkshopV172: receipt } = save;
    for (const [field, value, failure] of [["version", 2, "future-version"], ["ownerCreatedAt", "other", "invalid-save"],
      ["history", ["observe", "support"], "invalid-save"]]) {
      assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, elderWorkshopV172: { ...receipt, [field]: value } })).failure, failure);
    }
  });
}
