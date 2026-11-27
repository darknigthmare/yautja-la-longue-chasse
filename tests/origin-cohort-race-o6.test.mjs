import assert from "node:assert/strict";
import test from "node:test";
import { course as n, courtyardHandoffO6 } from "./helpers/origin-cohort-race-o6.mjs";

const p = n.COHORT_COURSE_O6;
function action(save, order) {
  const after = n.playCohortRaceO6(save, order);
  assert.ok(after, JSON.stringify(order));
  assert.ok(n.keepsCohortRaceO6(save, after));
  return after;
}
const state = save => save.originV151.cohortRaceO6;
const jump = (save, x, direction = 1) => action(save, { type: "jump", x, direction });
function climb(save, choice = "lead") {
  save = action(save, { type: "choose", x: n.COHORT_CHOICE_POSTS_O6[choice], choice });
  save = jump(save, p.start.launch);
  assert.equal(n.cohortRaceViewO6(state(save)).platform, "lower");
  save = jump(save, p.lower.launch);
  assert.equal(n.cohortRaceViewO6(state(save)).platform, "upper");
  return save;
}
function acceptSignal(save) {
  return action(save, { type: "signal", x: p.upper.launch, elapsed: n.COHORT_SIGNAL_WAIT_O6 });
}
function seal(save) {
  const last = jump(save, p.upper.launch);
  assert.equal(n.cohortRaceViewO6(state(last)).platform, "finish");
  assert.equal(state(last).resolved, false);
  return action(last, { type: "help", x: p.finish.launch });
}
function read(save) {
  const result = n.parseSaveImport(JSON.stringify(save));
  assert.equal(result.failure, null);
  return result.save;
}

test("M02 reads a played, returned M01; legacy files keep their own city and later training", () => {
  const { common, before, returned } = courtyardHandoffO6();
  assert.equal(n.startCohortRaceO6(common), common);
  assert.equal(n.startCohortRaceO6(before), before);
  assert.equal(n.activeCohortRaceO6(read(returned)), null);
  assert.ok(n.canStartCohortRaceO6(returned));
  const begun = n.startCohortRaceO6(returned);
  assert.equal(n.cohortRaceViewO6(n.activeCohortRaceO6(read(begun))).stage, "choice");
  assert.deepEqual(begun.originV151.firstShockO6, returned.originV151.firstShockO6);
  const later = n.startYouthCampaign({ ...returned, homeworld: { ...returned.homeworld,
    greetedNpcIds: ["hunt-king", "terrace-instructor"] } });
  assert.ok(later);
  assert.equal(n.startCohortRaceO6(later), later);
  assert.equal(n.parseSaveImport(JSON.stringify({ ...later, originV151: begun.originV151 })).failure, "invalid-save");
  assert.ok(read(later).youthTraining);
});

test("the physical bags form two levels and the last jump needs the observed signal", () => {
  assert.ok(p.start.y > p.lower.y && p.lower.y > p.upper.y);
  const ready = climb(n.startCohortRaceO6(courtyardHandoffO6().returned));
  assert.equal(n.playCohortRaceO6(ready, { type: "signal", x: p.upper.launch, elapsed: n.COHORT_SIGNAL_WAIT_O6 - 1 }), null);
  assert.equal(n.playCohortRaceO6(ready, { type: "signal", x: p.upper.left, elapsed: n.COHORT_SIGNAL_WAIT_O6 }), null);
  assert.equal(n.playCohortRaceO6(ready, { type: "help", x: p.finish.launch }), null);
  const before = n.simulateCohortJumpO6("upper", { type: "jump", x: p.upper.launch, direction: 1 }, false);
  const after = n.simulateCohortJumpO6("upper", { type: "jump", x: p.upper.launch, direction: 1 }, true);
  assert.equal(before.outcome, "fall");
  assert.equal(after.outcome, "next");
  assert.equal(after.frames.at(-1).y, p.finish.y);
  const fell = jump(ready, p.upper.launch);
  assert.equal(state(fell).roundsLost, 1);
  assert.deepEqual(state(fell).observations, ["fall"]);
  assert.equal(state(fell).relation, null);

  const restored = read(fell);
  assert.equal(n.cohortRaceViewO6(state(restored)).stage, "rally");
  assert.equal(n.playCohortRaceO6(restored, { type: "retry", x: p.start.left }), null);
  const retry = action(restored, { type: "retry", x: n.COHORT_RALLY_X_O6 });
  assert.equal(n.cohortRaceViewO6(state(retry)).platform, "start");
  const upper = jump(jump(retry, p.start.launch), p.lower.launch);
  assert.equal(n.mayWaitCohortSignalO6(state(upper), p.upper.launch), true);
  const done = read(seal(read(acceptSignal(upper))));
  assert.ok(state(done).resolved && state(done).success);
  assert.deepEqual(state(done).observations, ["fall", "signal-tov"]);
  assert.deepEqual(state(done).relation, { partner: "yena", gesture: "stabiliser-le-nœud" });
  assert.deepEqual(state(done).transfers, ["franchissement-signal", "stabiliser-le-nœud"]);
  assert.deepEqual(done.prologue, ready.prologue);
  assert.deepEqual(done.inventory, ready.inventory);
});

test("a partial first read changes the roster; observing links Harek only after the real help", () => {
  const { returned } = courtyardHandoffO6({ partial: true });
  const active = climb(n.startCohortRaceO6(returned), "observe");
  assert.equal(n.cohortRaceViewO6(state(active)).signalPartner, "yena");
  assert.equal(n.cohortRaceViewO6(state(active)).helpPartner, "harek");
  const signalled = acceptSignal(active);
  assert.deepEqual(state(signalled).observations, ["signal-yena"]);
  assert.deepEqual(state(signalled).transfers, []);
  const done = read(seal(signalled));
  assert.deepEqual(state(done).relation, { partner: "harek", gesture: "montrer-l’appui" });
  assert.deepEqual(done.originV151.firstShockO6, returned.originV151.firstShockO6);
});

test("a real fallen round can close as partial without inventing a signal, transfer or relationship", () => {
  const failed = jump(climb(n.startCohortRaceO6(courtyardHandoffO6().returned)), p.upper.launch);
  const done = read(action(failed, { type: "partial", x: n.COHORT_RALLY_X_O6 }));
  assert.equal(state(done).resolved, true);
  assert.equal(state(done).success, false);
  assert.equal(state(done).outcome, "partial");
  assert.deepEqual(state(done).observations, ["fall"]);
  assert.deepEqual(state(done).transfers, []);
  assert.equal(state(done).relation, null);
  assert.equal(n.activeCohortRaceO6(done), null);
});

test("new receipts are replayed and a cold write refuses forged, future or regressive O6 records", () => {
  const { before, armed: ready } = courtyardHandoffO6();
  const values = new Map([[n.SAVE_STORAGE_KEY, JSON.stringify(before)]]);
  const storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  assert.ok(n.loadSaveWithStatus(storage).loaded);
  assert.ok(n.writeSaveWithStatus(ready, storage).persisted);
  assert.equal(n.playCohortRaceO6(ready, { type: "choose", x: n.COHORT_CHOICE_POSTS_O6.observe, choice: "lead" }), null);
  const picked = action(ready, { type: "choose", choice: "lead", x: n.COHORT_CHOICE_POSTS_O6.lead });
  assert.ok(n.writeSaveWithStatus(picked, storage).persisted);
  const lower = jump(picked, p.start.launch);
  assert.ok(n.writeSaveWithStatus(lower, storage).persisted);
  assert.equal(n.writeSaveWithStatus(picked, storage).persisted, false);
  assert.deepEqual(state(n.loadSaveWithStatus(storage).save), state(lower));
  const forged = structuredClone(lower);
  forged.originV151.cohortRaceO6.transfers.push("franchissement-signal");
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  forged.originV151.cohortRaceO6 = { ...state(lower), ownerCreatedAt: "2001-01-01T00:00:00.000Z" };
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  forged.originV151.cohortRaceO6 = { ...state(lower), version: 2 };
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "future-version");
  assert.equal(n.keepsCohortRaceO6(ready, lower), false);
});

test("new first-shock v2 commits the second admission atomically and cannot shed it at the dojo", () => {
  const { before, armed, incomplete, returned } = courtyardHandoffO6();
  assert.equal(before.originV151.firstShockO6.version, 2);
  assert.equal(armed.originV151.firstShockO6.version, 2);
  assert.ok(read(before));
  assert.equal(n.parseSaveImport(JSON.stringify(incomplete)).failure, "invalid-save");
  assert.deepEqual(read(armed).originV151.cohortRaceO6.round, []);
  assert.ok(read(returned));
  const completed = seal(acceptSignal(climb(armed)));
  const youth = n.startYouthCampaign({ ...completed, homeworld: { ...completed.homeworld,
    greetedNpcIds: ["hunt-king", "terrace-instructor"] } });
  assert.ok(read(youth).youthTraining);
  const missing = structuredClone(youth);
  delete missing.originV151.cohortRaceO6;
  assert.equal(n.parseSaveImport(JSON.stringify(missing)).failure, "invalid-save");
  const downgraded = { ...missing, originV151: { ...missing.originV151,
    firstShockO6: { ...missing.originV151.firstShockO6, version: 1 } } };
  assert.ok(read(downgraded).youthTraining, "The archived v1 shape remains readable.");
  const values = new Map([[n.SAVE_STORAGE_KEY, JSON.stringify(youth)]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key) };
  assert.ok(n.loadSaveWithStatus(storage).loaded);
  assert.equal(n.writeSaveWithStatus(downgraded, storage).persisted, false);
});
