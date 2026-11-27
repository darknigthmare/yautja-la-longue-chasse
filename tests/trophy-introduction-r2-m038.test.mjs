import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const usage = qa.load("app/game/systems/trophyUsagesV147.ts");
const workshop = qa.load("app/game/systems/trophyWorkshop.ts");
const commit = qa.load("app/game/systems/trophyWorkshopCommitV94.ts");
const { MISSION_BY_ID } = qa.load("app/game/data.ts");
const { residenceTrophiesR2M038 } = qa.load("app/game/systems/trophyIntroductionR2M038.ts");
const { RESIDENCE_HOUSES_V149, emptyResidenceV149 } = qa.load("app/game/systems/residenceV149.ts");

const owner = "2026-11-27T08:00:00.000Z";
const when = "2026-11-27T09:00:00.000Z";
const trophyId = "m038:physical-oregion";
const mission = MISSION_BY_ID["jungle-vey"];
const station = { atPersonalTrophyHall: true };
const elsewhere = { atPersonalTrophyHall: false };

function seed() {
  const fresh = saves.defaultSave(owner);
  return saves.applyMissionResult(fresh, {
    missionId: mission.id, difficultyId: fresh.settings.difficultyId, outcome: "success", score: 75,
    elapsedSeconds: 180, completedObjectiveIds: mission.objectives.map(value => value.id), honorEvents: [],
    trophyQuality: "blooded", trophyClaims: [{
      id: trophyId, definitionId: mission.trophy.id, targetName: mission.targetName, targetKind: mission.targetKind,
      partId: "skull", condition: "intact", quality: "blooded",
    }],
    kills: 1, scans: 1, secondWindUsed: false, completedAt: when,
  });
}
const act = (save, step, options = {}, atPost = station) =>
  usage.applyTrophyUsageV147(save, { kind: "introduce", trophyId, step, ...options }, when, atPost);

function portable(save) {
  const loaded = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(loaded.save, loaded.failure);
  return loaded.save;
}

function prepare(save) {
  for (const action of ["clean", "prepare"]) {
    let state = workshop.startTrophyWorkshopGame(workshop.createTrophyWorkshopGame(action, trophyId));
    state = workshop.stepTrophyWorkshopGame(state, workshop.TROPHY_WORKSHOP_TIMING.readyDurationSeconds).state;
    for (const input of state.sequence) {
      const step = workshop.stepTrophyWorkshopGame(state, workshop.TROPHY_WORKSHOP_TIMING.perfectHitSeconds, input);
      assert.equal(step.accepted, true);
      state = step.state;
    }
    const result = workshop.trophyWorkshopResult(state);
    assert.ok(result);
    const verified = commit.createTrophyWorkshopCommitV94(save, { action, trophyId, trophyName: mission.targetName }, result, undefined, when);
    assert.ok(verified);
    save = verified.candidate();
  }
  return save;
}

function toMount() {
  const original = seed();
  assert.equal(original.trophies[0].id, trophyId);
  assert.equal(act(saves.defaultSave(owner), "inspect"), null);
  assert.equal(act(original, "install", { site: "ship" }), null);
  let save = portable(act(original, "inspect"));
  assert.equal(save.trophyUsagesV147.introduction.stage, "support");
  assert.equal(act(save, "support"), null);
  save = portable(act(prepare(save), "support"));
  assert.equal(save.trophyUsagesV147.introduction.stage, "provenance");
  assert.equal(act(save, "label", { missionId: "desert-sandmaw" }), null);
  save = portable(act(save, "label", { missionId: mission.id }));
  assert.equal(save.trophyUsagesV147.introduction.stage, "mount");
  return save;
}

test("M038 ties the actual workshop sequence, mission report and ship display to one original", () => {
  const prepared = toMount();
  assert.equal(act(prepared, "install", { site: "ship" }, elsewhere), null);
  assert.equal(act(prepared, "install", { site: "home" }), null);
  const finished = portable(act(prepared, "install", { site: "ship" }));
  assert.deepEqual(finished.trophyUsagesV147.introduction, {
    trophyId, missionId: mission.id, claimedAt: when, stage: "complete", place: { site: "ship" },
  });
  assert.deepEqual(finished.trophyUsagesV147.assignments[trophyId], { usage: "displayed", site: "ship", since: when });
  assert.equal(act(finished, "install", { site: "ship" }), null);
  assert.equal(act(finished, "inspect"), null);
  assert.equal(finished.trophies.length, 1);

  const stored = usage.applyTrophyUsageV147(finished, { kind: "store", trophyId }, when, station);
  const exchanged = usage.applyTrophyUsageV147(stored, { kind: "exchange", trophyId, clanId: "CL1", receive: "favor" }, when, station);
  assert.equal(exchanged.trophies.length, 0);
  assert.deepEqual(portable(exchanged).trophyUsagesV147.introduction, finished.trophyUsagesV147.introduction);
});

test("M038 mounts in the named current residence and renders exactly that shelf", () => {
  const prepared = toMount();
  const house = RESIDENCE_HOUSES_V149[0];
  const other = RESIDENCE_HOUSES_V149[1];
  const residence = { ...emptyResidenceV149(), rights: [house.id], activeResidenceId: house.id,
    missions: { [house.id]: { status: "completed", runId: "qa-threshold", done: ["report"], choice: 0 } } };
  assert.equal(act({ ...prepared, residenceV149: residence }, "install", { site: "home" }), null);
  residence.respect[house.communityId] = 100;
  const available = { ...prepared, residenceV149: residence };
  assert.equal(act({ ...available, residenceV149: { ...residence, transfer: {
    fromHouseId: house.id, toHouseId: other.id, stage: "packing",
  } } }, "install", { site: "home" }), null);
  const placed = portable(act(available, "install", { site: "home" }, elsewhere));
  assert.deepEqual(placed.trophyUsagesV147.introduction.place, { site: "home", houseId: house.id });
  assert.deepEqual(residenceTrophiesR2M038(placed, house.id).map(trophy => trophy.id), [trophyId]);
  assert.deepEqual(residenceTrophiesR2M038(placed, other.id), []);
  assert.equal(placed.trophies.length, 1);
  assert.deepEqual(placed.profile, prepared.profile);
  assert.deepEqual(placed.inventory, prepared.inventory);

  const presentation = qa.load("app/game/TrophyUsagesV147.tsx");
  assert.equal(typeof presentation.TrophyUsageSummaryV147, "function");
  const shelf = qa.render("app/game/ResidencePanelV149.tsx", {
    house, residence: placed.residenceV149, rankId: "elite", disabled: false,
    regionAllowed: () => true, onAction() { throw Error("read only"); },
    displayedTrophies: residenceTrophiesR2M038(placed, house.id),
  });
  assert.match(shelf, /data-residence-v149/);
  assert.equal(typeof presentation.TrophyUsageControlsV147, "function");
});
