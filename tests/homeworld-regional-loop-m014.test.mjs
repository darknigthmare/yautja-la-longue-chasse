import assert from "node:assert/strict";
import test from "node:test";
import { desert, p, store } from "./helpers/youth-patrol-played-route.mjs";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const loopApi = qa.load("app/game/systems/homeworldRegionalLoopM014.ts");
const workshopsApi = qa.load("app/game/systems/youthWorkshopV174.ts");
const { YOUTH_MEDICOMP } = qa.load("app/game/systems/youthMedicompV172.ts");

function trainedSave({ reports = 6, treatment = true } = {}) {
  const save = structuredClone(desert.save);
  const state = save.youthTraining.checkpoint;
  // Old youth progress is physically replayed by the fixture. For the new
  // admission gate, these are separately tested, normalized workshop reports.
  const workshop = {
    version: 1, active: null, maskProfile: "contrast",
    reports: workshopsApi.YOUTH_WORKSHOP_RANGES.slice(0, reports).map(([route], n) => ({
      route, tick: state.milestones["youth-camp-duel"] + n + 1, failures: 0,
    })),
  };
  state.workshopV174 = workshop;
  save.youthTraining.equipment.workshop = workshopsApi.youthWorkshopEquipment(workshop);
  if (treatment) state.medicompV172 = {
    version: 1, route: "prepared", stage: "complete",
    treatedTicks: YOUTH_MEDICOMP.duration, alertCleared: true,
  };
  assert.ok(p.normalizeYouthCampaign(save.youthTraining));
  return save;
}

test("M014 requires every workshop and the completed Medicomp on the same youth save", () => {
  assert.equal(loopApi.startRegionalLoopM014(desert.save), null);
  assert.equal(loopApi.startRegionalLoopM014(trainedSave({ reports: 5 })), null);
  assert.equal(loopApi.startRegionalLoopM014(trainedSave({ treatment: false })), null);
  assert.ok(loopApi.startRegionalLoopM014(trainedSave()));
  assert.equal(p.loadSaveWithStatus(store(desert.save)).loaded, true);
});

test("M014 plays both approaches, retries at the halt, reloads and returns the loan once", () => {
  let save = trainedSave();
  const disk = store(save);
  let loop = loopApi.startRegionalLoopM014(save);
  const setLoop = state => ({ ...save, homeworld: { ...save.homeworld, regionalLoopM014: state } });
  const write = next => {
    const stored = p.writeSaveWithStatus(next, disk);
    assert.ok(stored.persisted, stored.failure ?? "");
    save = p.loadSaveWithStatus(disk).save;
    assert.equal(p.getChronicleRank(save.prologue.chronicle), "unblooded");
    loop = save.homeworld.regionalLoopM014;
    assert.deepEqual(loop, next.homeworld.regionalLoopM014);
  };
  write(setLoop(loop));
  const fail = command => assert.equal(loopApi.advanceRegionalLoopM014(loop, command).state, null);
  const act = command => {
    const result = loopApi.advanceRegionalLoopM014(loop, command);
    assert.ok(result.state, result.message);
    write(setLoop(result.state));
  };
  const walk = direction => act({ type: "walk", direction });
  fail({ type: "return-bag" });
  for (const [index, region] of loopApi.REGIONAL_LOOP_M014.entries()) {
    const selected = index === 1 ? "high" : "sheltered";
    const lane = region[selected];
    const go = route => {
      act({ type: "choose", route });
      walk(1);
      walk(1);
      fail({ type: "walk", direction: 1 });
      fail({ type: "tool", tool: region[route].tool === "mask" ? "staff" : "mask" });
      act({ type: "tool", tool: region[route].tool });
      while (loop.passage.position < loopApi.LOOP_M014_LAST) {
        walk(1);
        if (loop.passage.position === loopApi.LOOP_M014_RESOURCE) act({ type: "sample" });
      }
    };
    if (index === 1) {
      go("sheltered");
      act({ type: "observe" });
      assert.equal(loop.passage.observation, "alert");
      fail({ type: "retry" });
      while (loop.passage.position) walk(-1);
      act({ type: "retry" });
      assert.deepEqual(loop.reports, [{ route: "sheltered", sample: true }]);
    }
    go(selected);
    for (let count = 0; count < lane.quiet; count++) act({ type: "wait" });
    act({ type: "observe" });
    fail({ type: "report" });
    while (loop.passage.position) walk(-1);
    act({ type: "report" });
    assert.deepEqual(loop.reports[index], { route: selected, sample: true });
  }
  assert.equal(loop.phase, "return-to-instructor");
  const previous = save;
  act({ type: "return-bag" });
  fail({ type: "return-bag" });
  assert.equal(loop.phase, "complete");
  assert.equal(p.writeSaveWithStatus(previous, disk).failure, "save-conflict");
  const forger = structuredClone(save);
  forger.homeworld.regionalLoopM014.ownerCreatedAt = "2026-01-01T00:00:00.000Z";
  assert.equal(p.parseSaveImport(JSON.stringify(forger)).failure, "invalid-save");
  forger.homeworld.regionalLoopM014.version = 2;
  assert.equal(p.parseSaveImport(JSON.stringify(forger)).failure, "future-version");
  assert.equal(p.parseSaveImport(JSON.stringify(save)).save.homeworld.regionalLoopM014.phase, "complete");
});

test("M014 rejects skipped gestures and preserves the last valid position on stale writes", () => {
  let save = trainedSave();
  const disk = store(save);
  const open = loopApi.startRegionalLoopM014(save);
  const withLoop = state => ({ ...save, homeworld: { ...save.homeworld, regionalLoopM014: state } });
  assert.ok(p.writeSaveWithStatus(withLoop(open), disk).persisted);
  const chosen = loopApi.advanceRegionalLoopM014(open, { type: "choose", route: "high" }).state;
  assert.ok(p.writeSaveWithStatus(withLoop(chosen), disk).persisted);
  const moved = loopApi.advanceRegionalLoopM014(chosen, { type: "walk", direction: 1 }).state;
  const altered = { ...moved, passage: { ...moved.passage, position: 2 } };
  assert.equal(p.writeSaveWithStatus(withLoop(altered), disk).failure, "save-conflict");
  assert.equal(p.loadSaveWithStatus(disk).save.homeworld.regionalLoopM014.passage.position, 0);
  assert.ok(p.writeSaveWithStatus(withLoop(moved), disk).persisted);
  assert.equal(p.writeSaveWithStatus(save, disk).failure, "save-conflict");
  assert.equal(p.loadSaveWithStatus(disk).save.homeworld.regionalLoopM014.passage.position, 1);
});
