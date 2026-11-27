import assert from "node:assert/strict";
import test from "node:test";
import { applyRivalForTest, findRivalLaunchO6, rival, rivalAdmissionO6, rivalCheckpointO6, town } from "./helpers/origin-rival-race-o6.mjs";
import { playTownOrderO6, townActorPositionO6 } from "./helpers/origin-town-bell-o6.mjs";

const latest = save => save.originV151.rivalRaceO6;
const observe = { type: "observe", x: rival.RIVAL_HAREK_POST_O6 };
const choose = choice => ({ type: "choose", choice, x: rival.RIVAL_HAREK_POST_O6 });
const finish = { type: "finish", x: rival.RIVAL_FLAG_O6 };
function launch(save, outcome = "land") {
  const view = rival.rivalRaceViewO6(latest(save));
  const step = findRivalLaunchO6(view.platform, view.choice, view.x, outcome, rival.RIVAL_SUPPORTS_O6[view.platform].right);
  return applyRivalForTest(save, step.order);
}
const challenge = (save, choice) => [null, observe, choose(choice)].reduce(applyRivalForTest, save);

test("Harek proposes the roof race at a real exterior position separately from the regular forge door", () => {
  const unresolved = rivalAdmissionO6({ unresolved: true });
  assert.equal(rival.beginRivalRaceO6(unresolved, rivalCheckpointO6(unresolved)), null);
  const complete = rivalAdmissionO6({ nurseryPolicies: true });
  const partial = rivalAdmissionO6({ partial: true });
  const forge = townActorPositionO6("regroup");
  assert.equal(rival.beginRivalRaceO6(complete, rivalCheckpointO6(complete, forge.point)), null);
  assert.equal(rival.beginRivalRaceO6(complete, rivalCheckpointO6(complete, rival.RIVAL_WORKSHOP_O6.point, "+1")), null);
  assert.equal(rival.beginRivalRaceO6(complete, { ...rivalCheckpointO6(complete), ownerCreatedAt: "elsewhere" }), null);
  assert.equal(latest(applyRivalForTest(complete)).town.firstVisit, "workshop");
  assert.equal(latest(applyRivalForTest(partial)).town.outcome, "postpone");
  const legacy = town.parseSaveImport(JSON.stringify(complete));
  assert.equal(legacy.failure, null);
  assert.equal(latest(legacy.save), undefined);
});

test("Observation and choice use the physical post, and the short route uses the movable beam", () => {
  const prior = rivalAdmissionO6({ nurseryPolicies: true });
  const started = applyRivalForTest(prior);
  assert.equal(rival.playRivalRaceO6(started, choose("race")), null);
  assert.equal(rival.playRivalRaceO6(started, { ...observe, x: 123 }), null);
  assert.equal(rival.playRivalRaceO6(started, finish), null);
  let save = [observe, choose("race")].reduce(applyRivalForTest, started);
  assert.equal(rival.playRivalRaceO6(save, { type: "jump", direction: 1, x: 245, beat: 120 }), null);
  save = launch(save);
  assert.equal(rival.rivalRaceViewO6(latest(save)).platform, "beam");
  assert.ok(rival.rivalBeamShiftO6(30) - rival.rivalBeamShiftO6(90) > 80);
  save = launch(save);
  assert.equal(rival.rivalRaceViewO6(latest(save)).stage, "flag");
  assert.equal(rival.playRivalRaceO6(save, { ...finish, x: 598 }), null);
  save = applyRivalForTest(save, finish);
  assert.equal(latest(save).resolved, true);
  assert.equal(latest(save).success, true);
  assert.equal(latest(save).harek, "lead");
  assert.deepEqual(latest(save).transfers, ["fanion-atteint", "avantage-pris-au-fanion"]);
  assert.equal(save.prologue.ceremonyM006, true);
  assert.equal(save.prologue.templeTriadFirstM017, true);
  assert.deepEqual(save.inventory, prior.inventory);
});

test("The real warning uses both stable bridges and accepts later catch-up visits without rewriting M03", () => {
  const prior = rivalAdmissionO6({ partial: true });
  let save = challenge(prior, "warn");
  for (const platform of ["bridgeA", "bridgeB", "flag"]) {
    save = launch(save);
    assert.equal(rival.rivalRaceViewO6(latest(save)).platform, platform);
  }
  save = applyRivalForTest(save, finish);
  assert.equal(latest(save).harek, "warning");
  assert.equal(latest(save).success, true);
  assert.deepEqual(latest(save).transfers, ["danger-signalé-à-harek", "fanion-atteint"]);
  const afterwards = playTownOrderO6(save, "kennel");
  assert.equal(rival.rivalRaceMatchesSaveO6(afterwards), true);
  assert.deepEqual(latest(afterwards), latest(save));
  assert.equal(afterwards.originV151.townBellO6.choice, "kennel");
});

test("A late fall persists on the lower landing until the ladder and flag are reached", () => {
  let save = challenge(rivalAdmissionO6(), "warn");
  save = launch(launch(save));
  save = launch(save, "fall");
  assert.equal(rival.rivalRaceViewO6(latest(save)).platform, "lower");
  assert.equal(latest(save).resolved, false);
  const backup = town.parseSaveImport(JSON.stringify(save));
  assert.deepEqual(rival.rivalRaceViewO6(latest(backup.save)), rival.rivalRaceViewO6(latest(save)));
  assert.equal(rival.playRivalRaceO6(save, { type: "climb", x: 130 }), null);
  const climbed = applyRivalForTest(save, { type: "climb", x: rival.RIVAL_LADDER_O6 });
  save = applyRivalForTest(climbed, finish);
  assert.equal(latest(save).resolved, true);
  assert.equal(latest(save).success, false);
  assert.equal(latest(save).choice, "warn");
  assert.equal(latest(save).harek, "warning");
  assert.ok(latest(save).observations.includes("palier-inférieur-atteint"));
  assert.ok(latest(save).transfers.includes("retour-au-fanion-par-le-palier"));
});

test("Save import and monotonic writing keep the witness and reject forged outcomes or moved active races", () => {
  const prior = rivalAdmissionO6();
  const progress = challenge(prior, "race");
  function replace(part) {
    return { ...progress, originV151: { ...progress.originV151, rivalRaceO6: { ...latest(progress), ...part } } };
  }
  for (const save of [
    replace({ success: true }),
    replace({ town: { outcome: "postpone", firstVisit: null }, observations: ["détour-de-la-ville-reporté", "hésitation-de-harek-observée"] }),
    replace({ journal: [finish] }),
    { ...progress, homeworld: prior.homeworld },
    { ...progress, originV151: { ...progress.originV151, townBellO6: undefined } },
    { ...progress, originV151: { ...progress.originV151, originId: "O5" } },
  ]) assert.notEqual(town.parseSaveImport(JSON.stringify(save)).failure, null);
  assert.equal(rival.keepsRivalRaceO6(progress, prior), false);
  assert.equal(rival.keepsRivalRaceO6(progress, replace({ choice: "warn" })), false);
  assert.equal(rival.keepsRivalRaceO6(progress, progress), true);
});
