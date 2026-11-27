import assert from "node:assert/strict";
import test from "node:test";
import { qa, saves } from "./helpers/first-interstellar-fixture-v173.mjs";
import { conquestAdmissionR2M037 } from "./helpers/war-conquest-r2-m037.mjs";

const war = qa.load("app/game/systems/warConquestR2M037.ts");
const front = qa.load("app/game/systems/warConquestFrontR2M037.ts");
const army = qa.load("app/game/systems/clanWarV85.ts");
const { traveled, owned } = conquestAdmissionR2M037();
const strategy = ["reserve-guard", "resolve-cession", "plan-convoy", "reserve-convoy", "deliver-convoy"];
const repeat = (count, order) => Array.from({ length: count }, () => order);
const observe = ["level", ...repeat(7, "right"), "sign", ...repeat(4, "left"), "level", ...repeat(13, "right"), "sign"];
const command = (save, action) => war.advanceConquestR2M037(save, {
  action, expectedRevision: save.warConquestR2M037?.revision ?? 0,
});

function play(base, actions) {
  let save = base;
  for (const action of actions) {
    const next = command(save, action);
    assert.equal(next.ok, true, next.message);
    save = { ...save, warConquestR2M037: next.state };
    assert.equal(front.conquestFrontR2M037(war.conquestViewR2M037(save)).ok, true);
  }
  return save;
}

test("the mission starts from a real owned hull and the first interstellar return", () => {
  assert.equal(war.conquestAccessR2M037(owned).ok, false);
  const noRank = { ...traveled, profile: { ...traveled.profile, rankId: "unblooded" } };
  assert.equal(war.conquestAccessR2M037(noRank).ok, false);
  assert.equal(war.conquestAccessR2M037(traveled).ok, true);
  assert.equal(command(traveled, "enter").ok, false);
  assert.equal(command(traveled, "debrief").ok, false);
  assert.equal(saves.parseSaveImport(saves.exportSave(owned)).save.warConquestR2M037, undefined);
});

test("cession and delivered convoy feed a real patrol and both exits return to command", () => {
  const held = play(traveled, strategy.slice(0, 2));
  const heldFront = front.conquestFrontR2M037(war.conquestViewR2M037(held)).simulation;
  assert.equal(heldFront.territories["CON-T09"].controller, "CON-F01");
  assert.equal(army.warGarrisonV85(heldFront, "CON-T09")[0].id, "P07");
  assert.equal(command(held, "enter").ok, false);
  const delivered = play(held, strategy.slice(2));
  const delivery = front.conquestFrontR2M037(war.conquestViewR2M037(delivered)).simulation;
  assert.equal(delivery.stocks["CON-T09"].m, 1);
  assert.equal(delivery.convoyRouteV105.completedOrderIds.length, 1);
  assert.ok(army.warSuppliedV85(delivery).has("CON-T09"));
  const started = play(delivered, ["enter"]);
  assert.equal(command(started, "exit-canyon").ok, false);
  const patrol = play(started, observe);
  assert.equal(command(patrol, "level").ok, false);
  assert.deepEqual(war.conquestViewR2M037(patrol).patrol.checked, [34, 72]);
  assert.equal(war.conquestReceiptR2M037(patrol), null);
  for (const [steps, action, decision] of [[16, "left", "consolider"], [7, "right", "pousser"]]) {
    const back = play(patrol, [...repeat(steps, action), "exit-canyon"]);
    assert.equal(war.conquestReceiptR2M037(back), null);
    const complete = play(back, ["debrief"]);
    assert.equal(command(complete, "debrief").ok, false);
    const exported = saves.parseSaveImport(saves.exportSave(complete));
    assert.ok(exported.save, exported.failure);
    assert.deepEqual(war.conquestReceiptR2M037(exported.save), {
      missionId: "R2-M037", conquestIntroductionResolved: true, decision,
    });
  }
});

test("a voluntary return preserves logistics and the writer rejects stale and foreign orders", () => {
  const data = new Map();
  const store = { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const put = next => {
    const written = saves.writeSaveWithStatus(next, store);
    assert.equal(written.persisted, true, written.failure);
    return written.save;
  };
  const delivered = play(traveled, strategy);
  let current = put(delivered);
  for (const action of ["enter", "level", "right", "withdraw"]) {
    current = put(play(current, [action]));
  }
  assert.equal(war.conquestViewR2M037(current).phase, "delivered");
  assert.equal(current.warConquestR2M037.revision, 9);
  assert.deepEqual(current.warConquestR2M037.orders, strategy);
  assert.equal(saves.writeSaveWithStatus(delivered, store).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(play(current, ["enter", "right"]), store).failure, "save-conflict");
  const record = current.warConquestR2M037;
  for (const raw of [{ ...record, owner: "foreign" }, { ...record, hullInstanceId: "foreign" },
    { ...record, conquestIntroductionResolved: true }, { ...record, orders: [...strategy, "debrief"] }]) {
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...current, warConquestR2M037: raw })).failure, "invalid-save");
  }
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...current, warConquestR2M037: { version: 2 } })).failure, "future-version");
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...current, firstInterstellarV173: undefined })).failure, "invalid-save");
  assert.match(qa.render("app/game/WarConquestR2M037Panel.tsx", { save: current, onCommand() {} }), /Canyon des Deux Balises/);
});
