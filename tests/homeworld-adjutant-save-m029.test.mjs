import assert from "node:assert/strict";
import { test } from "node:test";
import { bloodedTempleAdmissionV174, qa } from "./helpers/blooded-temple-fixture-v174.mjs";
import { playShipAcquisitionV161 } from "./helpers/ship-receipt-v161.mjs";
import { createCradleReturnRoute } from "./helpers/buried-cradle-return-route.mjs";

const temple = qa.load("app/game/systems/bloodedTempleV174.ts");
const saves = qa.load("app/game/save.ts");
const chronicles = qa.load("app/game/systems/clanChronicle.ts");
const cradle = qa.load("app/game/systems/buriedCradle.ts");
const cradleCampaign = qa.load("app/game/systems/buriedCradleCampaign.ts");
const { snapshotBuriedCradleRun } = qa.load("app/game/systems/buriedCradleSnapshot.ts");
const coordination = qa.load("app/game/systems/homeworldCoordinationM028.ts");
const world = qa.load("app/game/systems/homeworldWorldV77.ts");
const geometry = qa.load("app/game/systems/homeworldGeometryV64.ts");
const rooms = qa.load("app/game/systems/homeworldInteriorsV64.ts");

function prepareAdmission() {
  let save = bloodedTempleAdmissionV174();
  const data = new Map();
  const disk = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const initial = saves.replaceSaveWithStatus(save, disk);
  assert.ok(initial.persisted, initial.failure);
  save = initial.save;
  const checked = (stage) => {
    const imported = saves.parseSaveImport(JSON.stringify(save));
    assert.ok(imported.save, stage + ": " + imported.failure);
    save = imported.save;
  };
  let time = Date.parse(save.createdAt) + 86400000;
  const play = action => {
    const result = temple.advanceBloodedTempleV174(save, { action, expectedRevision: save.bloodedTempleV174?.events.length ?? 0 }, time += 100);
    assert.ok(result.ok, result.notice + " while " + JSON.stringify(action));
    const stored = saves.writeSaveWithStatus({ ...save, ...result.update }, disk);
    assert.ok(stored.persisted, "Temple " + JSON.stringify(action) + ": " + stored.failure);
    save = stored.save;
  };
  play("present");
  for (const [index, room] of temple.BLOODED_ROOMS.entries()) {
    if (room.lane) play("lane");
    play("right"); play("right"); play("interact");
    if (index === 0) { play("interact"); play("lane"); }
    play("right");
    if ("hunter" in room) { play("guard"); play("strike"); play("guard"); play("strike"); }
    if (index === 4) play("interact");
    play("right"); play("right"); play("next");
  }
  for (let repetition = 0; repetition < 2; repetition++) {
    for (const mark of [0, 1, 4, 7]) play({ mark });
    play("seal-mark");
  }
  play("return-tools");
  assert.equal(chronicles.getChronicleRank(save.prologue.chronicle), "blooded");
  save.profile.honor = 3000;
  save.settings.masterVolume = 0;
  checked("Blooded and honor");
  const ship = "classic-predator-spaceship";
  save = playShipAcquisitionV161(qa, save);
  checked("ship");
  const context = { personalShipId: ship, ownedShipIds: [ship] };
  for (const mission of qa.load("app/game/data.ts").MISSIONS) {
    Object.assign(save.missionProgress[mission.id], { status: "completed", attempts: 1, completions: 1 });
  }
  checked("hunt proceedings");
  const apply = action => {
    const result = cradleCampaign.actBuriedCradleCampaign(save, action, context);
    assert.ok(result.accepted, result.message);
    save = { ...save, buriedCradle: result.state, prologue: result.prologue };
  };
  apply({ type: "prepare" });
  apply({ type: "depart" });
  let run = cradle.createBuriedCradleRun(cradle.createBuriedCradleProgress(), 1);
  run.player.x = 156;
  run.player.y = 508;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert.ok(run.extracted);
  apply({ type: "extract", progress: run.progress, snapshot: snapshotBuriedCradleRun(run) });
  checked("extract cradle");
  save = createCradleReturnRoute(qa).complete(save, context);
  checked("cradle report");
  const dock = { ...coordination.COORDINATION_OFFICER_M028, actor: { x: 1, y: 1 }, suspended: false };
  const workshop = { roomId: coordination.COORDINATION_WORKSHOP_M028.roomId, pointId: null,
    actor: coordination.COORDINATION_WORKSHOP_M028.position, suspended: false };
  for (const action of [{ kind: "begin", role: "field" }, { kind: "dispatch" }, { kind: "clear" }, { kind: "signal" }, { kind: "recall" }]) {
    const result = coordination.actHomeworldCoordinationM028(save.homeworld.coordinationM028, save, action, action.kind === "clear" ? workshop : dock);
    assert.ok(result.state, result.message);
    save.homeworld.coordinationM028 = result.state;
  }
  const hall = world.HOMEWORLD_BUILDINGS_V77.find(building => building.id === "training-hall");
  save.homeworld.locationV77 = { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: hall.levelId,
    exterior: geometry.homeworldBuildingDoorwayV64(hall).approach,
    interiorId: hall.id, local: rooms.homeworldInteriorForBuildingV64(hall.id).spawn };
  checked("coordination and location");
  return save;
}

const pack = qa.load("app/game/systems/homeworldPackTrialM029.ts");
const appointment = qa.load("app/game/systems/homeworldAdjutantM029.ts");

test("M029 and the common Warp route validate their atomic receipts, checkpoints and portable saves", () => {
  const legacy = saves.defaultSave("2026-11-27T00:00:00.000Z");
  assert.ok(saves.parseSaveImport(saves.exportSave(legacy)).save);
  let save = prepareAdmission();
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, bytes) => memory.set(key, bytes), removeItem: key => memory.delete(key) };
  const initialized = saves.replaceSaveWithStatus(save, disk);
  assert.ok(initialized.persisted, initialized.failure);
  save = initialized.save;
  const persist = next => {
    const attempt = saves.writeSaveWithStatus(next, disk);
    assert.ok(attempt.persisted, attempt.failure);
    save = attempt.save;
  };

  const atPack = { ...pack.PACK_POST_M029, suspended: false };
  const view = () => pack.homeworldPackViewM029(save.homeworld.packTrialM029, save.createdAt);
  const drivePack = action => {
    const result = pack.actHomeworldPackTrialM029(save.homeworld.packTrialM029, save, action, atPack);
    assert.ok(result.state, result.message);
    persist({ ...save, homeworld: { ...save.homeworld, packTrialM029: result.state } });
  };
  const walkPack = (target, direction) => {
    while (view().player !== target) drivePack(pack.homeworldPackActionsM029(view()).includes(direction) ? direction : "regroup");
    while (view().pupils.some(position => position !== target)) drivePack("regroup");
  };
  drivePack("start"); walkPack(6, "east"); drivePack("shelter"); walkPack(16, "east"); drivePack("turn");
  walkPack(12, "west"); drivePack("shelter"); walkPack(0, "west"); drivePack("count");

  const pass = (action, station, actor = { x: 0, y: 0 }) => appointment.actHomeworldAdjutantM029(
    save.homeworld.adjutantM029, save, action, { ...station, actor, suspended: false },
  );
  const confirmed = (action, station, actor) => {
    const outcome = pass(action, station, actor);
    assert.ok(outcome.state, outcome.message);
    persist({ ...save, homeworld: { ...save.homeworld, adjutantM029: outcome.state } });
  };
  confirmed("study", appointment.ADJUTANT_DOCK_M029);
  const study = save;
  confirmed("place-relay", { roomId: appointment.ADJUTANT_RELAY_M029.roomId, pointId: null }, appointment.ADJUTANT_RELAY_M029.position);
  confirmed("confirm-signal", appointment.ADJUTANT_SAS_M029);
  confirmed("defer", appointment.ADJUTANT_LEADER_M029);
  assert.deepEqual(chronicles.getChronicleFunctions(save.prologue.chronicle), []);
  assert.equal(saves.writeSaveWithStatus(study, disk).failure, "save-conflict");
  const before = save;
  const outcome = pass("accept", appointment.ADJUTANT_LEADER_M029);
  assert.ok(outcome.state && outcome.prologue, outcome.message);
  const homeworld = { ...save.homeworld, adjutantM029: outcome.state };
  assert.equal(saves.writeSaveWithStatus({ ...save, prologue: outcome.prologue }, disk).failure, "invalid-save");
  assert.equal(saves.writeSaveWithStatus({ ...save, homeworld }, disk).failure, "invalid-save");
  persist({ ...save, homeworld, prologue: outcome.prologue });
  assert.deepEqual(chronicles.getChronicleFunctions(save.prologue.chronicle), ["adjutant"]);
  assert.equal(chronicles.getChronicleRank(save.prologue.chronicle), "blooded");
  assert.equal(saves.writeSaveWithStatus(before, disk).failure, "save-conflict");
  const portable = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(portable.save, portable.failure);
  assert.deepEqual(portable.save.homeworld.adjutantM029.events, ["study", "place-relay", "confirm-signal", "defer", "accept"]);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...portable.save, homeworld: {
    ...portable.save.homeworld, adjutantM029: { ...portable.save.homeworld.adjutantM029, version: 2 },
  } })).failure, "future-version");


  const warp = qa.load("app/game/systems/warpEpochsV165.ts");
  const route = qa.load("app/game/systems/warpCommonRouteR2.ts");
  const authority = qa.load("app/game/systems/shipReceiptV161.ts");
  const ctx = warp.warpAccessContextFromSaveV165(save, {});
  const hull = authority.shipReceiptV161(save).receipt;
  assert.ok(hull && ctx.blooded && ctx.personalShip && ctx.adjutant);
  const step = action => warp.advanceWarpCommonRouteV165(
    save.warpEpochsV165 ?? warp.createWarpEpochsV165(save.createdAt), ctx, hull.instanceId, action,
  );
  const record = action => {
    const result = step(action);
    assert.ok(result.accepted, result.message);
    persist({ ...save, warpEpochsV165: result.state });
  };
  assert.equal(step({ kind: "read", at: 0 }).accepted, false);
  record({ kind: "read", at: 3 });
  const beforeWarpSurvey = save;
  record({ kind: "read", at: 8 });
  assert.equal(saves.writeSaveWithStatus(beforeWarpSurvey, disk).failure, "save-conflict");
  record({ kind: "read", at: 13 });
  record({ kind: "survey", at: 13, choice: "energie" });
  assert.equal(save.warpEpochsV165.warpQuestOutcome, "en_cours");
  assert.equal(step({ kind: "haul", at: 16 }).accepted, false);
  for (const [index, part] of route.WARP_COMMON_PARTS_R2.entries()) {
    const method = index === 1 ? "variante" : "reparer";
    record({ kind: "inspect", at: part.position, part: part.id });
    const required = route.warpTestDialR2(part.id, method, "energie");
    assert.equal(step({ kind: "bench", at: part.position, part: part.id, choice: method, dial: (required + 1) % 5 }).accepted, false);
    record({ kind: "bench", at: part.position, part: part.id, choice: method, dial: required });
  }
  assert.deepEqual(save.warpEpochsV165.components, {});
  record({ kind: "haul", at: 16 });
  assert.equal(Object.keys(save.warpEpochsV165.components).length, 3);
  record({ kind: "align", at: 3 });
  assert.equal(step({ kind: "dry-return", at: 13, choice: "fenetre-courte", dial: 3 }).accepted, false);
  record({ kind: "connect", at: 8 });
  assert.equal(step({ kind: "dry-return", at: 13, choice: "fenetre-courte", dial: 4 }).accepted, false);
  const installed = step({ kind: "dry-return", at: 13, choice: "fenetre-courte", dial: 3 });
  assert.ok(installed.accepted, installed.message);
  assert.equal(saves.writeSaveWithStatus({ ...save, warpEpochsV165: installed.state }, disk).failure, "invalid-save");
  const proof = chronicles.CHRONICLE_EVIDENCE.find(entry => entry.id === "warp-module-quest");
  const confirmedWarp = chronicles.recordChronicleEvidence(save.prologue.chronicle, { id: proof.id, sourceId: proof.sourceId });
  assert.ok(confirmedWarp.accepted && confirmedWarp.changed);
  const prologue = { ...save.prologue, chronicle: confirmedWarp.state };
  assert.equal(saves.writeSaveWithStatus({ ...save, prologue }, disk).failure, "invalid-save");
  persist({ ...save, warpEpochsV165: installed.state, prologue });
  const recovered = saves.parseSaveImport(saves.exportSave(save)).save;
  assert.equal(recovered.warpEpochsV165.warpModuleInstalled, true);
  assert.equal(recovered.warpEpochsV165.commonRouteR2.hullInstanceId, hull.instanceId);
  assert.equal(chronicles.getChronicleRank(recovered.prologue.chronicle), "blooded");
  assert.equal(chronicles.evaluateChronicleAccess(recovered.prologue.chronicle, "warp-universe",
    { personalShipAvailable: true, warpModuleInstalled: true }).allowed, true);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...recovered, warpEpochsV165: {
    ...recovered.warpEpochsV165, commonRouteR2: { ...recovered.warpEpochsV165.commonRouteR2, hullInstanceId: "wrong-hull" },
  } })).failure, "invalid-save");
});
