import assert from "node:assert/strict";
import { test } from "node:test";
import { bloodedTempleAdmissionV174, qa } from "./helpers/blooded-temple-fixture-v174.mjs";

const temple = qa.load("app/game/systems/bloodedTempleV174.ts");
const saves = qa.load("app/game/save.ts");
const chronicles = qa.load("app/game/systems/clanChronicle.ts");
const ship = qa.load("app/game/systems/shipReceiptV161.ts");

function storage() {
  const memory = new Map();
  return { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key) };
}

test("original upper temple, trio and both depositions are required", () => {
  const save = bloodedTempleAdmissionV174();
  assert.equal(temple.templeAvailableV174(save), true);
  assert.equal(temple.templeAvailableV174({ ...save, soloV70: null }), false);
  const missing = structuredClone(save);
  missing.quatzaRij.expeditions.triad.presentations.pop();
  assert.equal(temple.templeAvailableV174(missing), false);
  const outside = temple.advanceBloodedTempleV174(save, { action: "interact", expectedRevision: 0 }, Date.now());
  assert.equal(outside.ok, false);
});

test("six rooms, three hunter proofs and two matching marks produce one durable Blooded rite", () => {
  let save = bloodedTempleAdmissionV174();
  const disk = storage();
  assert.equal(saves.replaceSaveWithStatus(save, disk).persisted, true);
  let time = Date.parse(save.createdAt) + 86400000;
  const view = () => temple.inspectBloodedTempleV174(save.bloodedTempleV174, save.createdAt).view;
  const command = action => ({ action, expectedRevision: save.bloodedTempleV174?.events.length ?? 0 });
  const raw = action => temple.advanceBloodedTempleV174(save, command(action), time += 100);
  function play(action) {
    const result = raw(action);
    assert.ok(result.ok, result.notice + " while " + JSON.stringify(action) + " in room " + view().room);
    const saved = saves.writeSaveWithStatus({ ...save, ...result.update }, disk);
    assert.equal(saved.persisted, true, saved.failure);
    save = saved.save;
  }
  play("present");
  const old = save;
  assert.equal(temple.advanceBloodedTempleV174(save, { action: "right", expectedRevision: 0 }, time).ok, false);
  for (const [index, room] of temple.BLOODED_ROOMS.entries()) {
    assert.equal(view().room, index);
    if (room.lane) play("lane");
    play("right"); play("right");
    assert.equal(raw("right").ok, false);
    play("interact"); play("right");
    if ("hunter" in room) {
      assert.equal(raw("next").ok, false);
      if (index === 1) { play("strike"); assert.equal(view().vitality, 2); }
      play("guard"); play("strike"); play("guard"); play("strike");
    } else if (index === 4) {
      play("interact");
      const when = view().deadline;
      save = saves.loadSaveWithStatus(disk).save;
      assert.equal(view().deadline, when);
      time = when;
      assert.equal(raw("right").ok, false);
      play("retry");
      assert.equal(view().room, 4);
      assert.equal(view().proofs.length, 3);
      play("lane"); play("right"); play("right"); play("interact"); play("right"); play("interact");
    }
    play("right"); play("right"); play("next");
  }
  assert.equal(view().carriesWounded, true);
  assert.deepEqual(view().proofs, ["joueur", "pisteur", "garde"]);
  assert.equal(chronicles.getChronicleRank(save.prologue.chronicle), "young-blood");
  assert.equal(raw("return-tools").ok, false);
  for (const mark of [0, 1, 4, 7]) play({ mark });
  play("seal-mark");
  assert.equal(raw({ mark: 2 }).ok, false);
  for (const mark of [0, 1, 4, 7]) play({ mark });
  play("seal-mark");
  play("return-tools");
  assert.equal(view().stage, "complete");
  assert.equal(chronicles.getChronicleRank(save.prologue.chronicle), "blooded");
  assert.ok(ship.shipAcquisitionAuthorityV161(save));
  assert.equal(raw("return-tools").ok, false);
  for (const key of ["soloV66", "soloV67", "soloV68", "soloV69", "soloV70", "soloV90"]) assert.deepEqual(save[key], old[key]);
  assert.equal(saves.writeSaveWithStatus(old, disk).failure, "save-conflict");
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, bloodedTempleV174: null })).failure, "invalid-save");
  const portable = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(portable.save, portable.failure);
  assert.equal(chronicles.getChronicleRank(portable.save.prologue.chronicle), "blooded");
});
