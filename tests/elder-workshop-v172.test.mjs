import assert from "node:assert/strict";
import { test } from "node:test";
import { aboard, completeInterior, fixture, ops, qa, saves } from "./helpers/clan-ship-trophy-hearing-fixture.mjs";

const assembly = qa.load("app/game/systems/elderAssemblyV168.ts");
const workshop = qa.load("app/game/systems/elderWorkshopV172.ts");

function qualified() {
  let save = fixture({ evidence: false });
  save.profile.honor = 8000;
  save = saves.parseSaveImport(JSON.stringify(save)).save;
  assert.ok(save);
  save.elderMentoringV168 = { version: 1, revision: 6, ownerCreatedAt: save.createdAt, supports: ["west", "east"],
    attempt: { choice: "alone", observed: 2 }, resolved: true };
  save.elderPassageJudgmentV168 = { version: 1, revision: 5, ownerCreatedAt: save.createdAt, traces: 3, anchors: 0, replayed: true,
    trial: { method: "schedule", delay: 3 }, resolved: true };
  for (const operation of [{ type: "hear", act: "mentoring" }, { type: "hear", act: "judgment" },
    { type: "accept", responsibility: "council" }]) {
    const result = assembly.commitElderAssembly(save, { operation, expectedRevision: save.elderAssemblyV168?.revision ?? 0 });
    assert.equal(result.ok, true, result.message);
    save.elderAssemblyV168 = result.state;
  }
  save = aboard(completeInterior(save, "ship-armory-audit"), "armurerie");
  const result = ops.actClanShipOperations(save.clanShipOperations,
    { type: "recruit", npcId: "iron-claw", expectedRevision: save.clanShipOperations.revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipOperations: result.state };
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
  const save = qualified();
  assert.equal(workshop.canWorkWithClanArmorerV172(save), true);
  assert.equal(commit({ ...save, elderAssemblyV168: null }, "observe").ok, false);
  assert.equal(commit({ ...save, elderMentoringV168: null }, "observe").ok, false);
  assert.equal(commit({ ...save, clanShipOperations: null }, "observe").ok, false);
  assert.equal(commit(aboard(save, "conseil"), "observe").ok, false);
  assert.equal(commit(save, "fit").ok, false);
  assert.equal(commit(act(save, "observe"), "inspect", 0).ok, false);
});

for (const [method, crans] of [["repair", 3], ["support", 2]]) {
  test("M052 carries out the " + method + " and restores the armorer's control after reload", () => {
    const memory = new Map();
    const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, data) => memory.set(key, data),
      removeItem: key => memory.delete(key) };
    let save = qualified();
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
    const portable = saves.parseSaveImport(saves.exportSave(aboard(save, "conseil")));
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
