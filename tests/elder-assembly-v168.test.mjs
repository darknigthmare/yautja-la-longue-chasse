import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";
import { adultElderTrialAdmission } from "../scripts/qa-elder-mentoring-v168.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const assembly = qa.load("app/game/systems/elderAssemblyV168.ts");
const { rankCampaignReceiptsV168: rankReceipts } = qa.load("app/game/systems/rankRiteDossierV168.ts");
const mentoring = { version: 1, revision: 6, supports: ["west", "east"],
  attempt: { choice: "alone", observed: 2 }, resolved: true };
const passage = { version: 1, revision: 5, traces: 3, anchors: 0, replayed: true,
  trial: { method: "schedule", delay: 3 }, resolved: true };

function qualified() {
  const save = adultElderTrialAdmission(qa);
  return {
    ...save,
    elderMentoringV168: { ...mentoring, ownerCreatedAt: save.createdAt },
    elderPassageJudgmentV168: { ...passage, ownerCreatedAt: save.createdAt },
  };
}
const hear = act => ({ type: "hear", act });
const accept = responsibility => ({ type: "accept", responsibility });
function act(save, operation, expectedRevision = save.elderAssemblyV168?.revision ?? 0) {
  return assembly.commitElderAssembly(save, { expectedRevision, operation });
}
function apply(save, operation) {
  const result = act(save, operation);
  assert.equal(result.ok, true, result.message);
  return { ...save, elderAssemblyV168: result.state };
}

test("the assembly requires both witnessed acts, career honor and a free rank trial", () => {
  const save = qualified();
  assert.equal(assembly.canConveneElderAssembly(save), true);
  assert.equal(assembly.canConveneElderAssembly({ ...save, elderMentoringV168: null }), false);
  assert.equal(assembly.canConveneElderAssembly({ ...save, elderPassageJudgmentV168: null }), false);
  assert.equal(assembly.canConveneElderAssembly({ ...save, profile: { ...save.profile, honor: 7999 } }), false);
  assert.equal(assembly.canConveneElderAssembly({ ...save, tribunalV147: { freeze: { rankId: "elite" }, exile: null } }), false);
  assert.equal(act(save, accept("council")).ok, false);
  const heard = apply(save, hear("judgment"));
  assert.equal(act(heard, hear("judgment")).ok, false);
  assert.equal(act(heard, hear("mentoring"), 0).ok, false);
  assert.equal(act(heard, accept("council")).ok, false);
  assert.equal(heard.elderAssemblyV168.responsibility, null);
});

for (const responsibility of ["council", "travel"]) {
  test(`Elder recognition records the ${responsibility} obligation exactly once`, () => {
    const initial = qualified();
    const prepared = apply(apply(initial, hear("mentoring")), hear("judgment"));
    const settled = apply(prepared, accept(responsibility));
    assert.equal(prepared.elderAssemblyV168.responsibility, null);
    assert.equal(settled.profile.rankId, initial.profile.rankId);
    assert.equal(settled.profile.honor, initial.profile.honor);
    assert.equal(settled.elderAssemblyV168.revision, 3);
    assert.equal(act(settled, accept(responsibility)).ok, false);
    const imported = saves.parseSaveImport(saves.exportSave(settled));
    assert.ok(imported.save, imported.failure);
    assert.equal(imported.save.elderAssemblyV168.responsibility, responsibility);
    assert.equal(imported.save.prologue, null);
    assert.equal(rankReceipts(imported.save)[2].status, "in-progress");
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...settled, elderMentoringV168: null })).failure, "invalid-save");
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...settled, elderAssemblyV168: {
      ...settled.elderAssemblyV168, ownerCreatedAt: "different-owner",
    } })).failure, "invalid-save");
  });
}

test("regular saves protect the two depositions against stale or skipped writes", () => {
  const initial = qualified();
  const partial = apply(initial, hear("mentoring"));
  const ready = apply(partial, hear("judgment"));
  const settled = apply(ready, accept("travel"));
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, data) => memory.set(key, data), removeItem: key => memory.delete(key) };
  assert.equal(saves.replaceSaveWithStatus(initial, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(ready, disk).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(partial, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(initial, disk).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(ready, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(settled, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(ready, disk).failure, "save-conflict");
  const restored = saves.loadSaveWithStatus(disk).save;
  assert.equal(restored.elderAssemblyV168.responsibility, "travel");
  assert.equal(restored.elderAssemblyV168.revision, 3);
});
