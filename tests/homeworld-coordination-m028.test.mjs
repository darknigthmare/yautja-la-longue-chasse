import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";
import { createCradleReturnRoute } from "./helpers/buried-cradle-return-route.mjs";

const qa = homeworldSceneSsrV78();
const system = qa.load("app/game/systems/homeworldCoordinationM028.ts");
const { actBuriedCradleCampaign } = qa.load("app/game/systems/buriedCradleCampaign.ts");
const cradle = qa.load("app/game/systems/buriedCradle.ts");
const snapshots = qa.load("app/game/systems/buriedCradleSnapshot.ts");
const { defaultSave, normalizeSave } = qa.load("app/game/save.ts");
const { MISSIONS } = qa.load("app/game/data.ts");
const interiors = qa.load("app/game/systems/homeworldInteriorsV64.ts");

const council = { ...system.COORDINATION_OFFICER_M028, actor: { x: 1, y: 1 }, suspended: false };
const workshop = { roomId: system.COORDINATION_WORKSHOP_M028.roomId, pointId: null,
  actor: system.COORDINATION_WORKSHOP_M028.position, suspended: false };

function prepareCampaign() {
  let save = defaultSave("2026-11-22T10:00:00.000Z");
  save.settings.difficultyId = "hunter";
  const ship = "classic-predator-spaceship";
  const context = { personalShipId: ship, ownedShipIds: [ship] };
  for (const mission of MISSIONS) Object.assign(save.missionProgress[mission.id], { status: "completed", attempts: 1, completions: 1 });
  function apply(action) {
    const result = actBuriedCradleCampaign(save, action, context);
    assert.ok(result.accepted, result.message);
    save = { ...save, buriedCradle: result.state, prologue: result.prologue };
  }
  apply({ type: "prepare" });
  apply({ type: "depart" });
  let run = cradle.createBuriedCradleRun(cradle.createBuriedCradleProgress(), 1);
  run.player.x = 156;
  run.player.y = 508;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert.ok(run.extracted);
  apply({ type: "extract", progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
  const extracted = save;
  const reported = createCradleReturnRoute(qa).complete(extracted, context);
  return { extracted, reported };
}

test("M028 opens after the existing Berceau debrief and keeps both team assignments through a retry", () => {
  const { extracted, reported } = prepareCampaign();
  assert.equal(system.homeworldCoordinationOpenM028(extracted), false);
  assert.equal(system.homeworldCoordinationOpenM028(reported), true);
  assert.equal(system.homeworldCoordinationOpenM028({ ...reported, createdAt: "some other owner" }), false);

  for (const role of ["field", "delegate"]) {
    let save = reported;
    const act = (kind, site = council, extra = {}) => {
      const result = system.actHomeworldCoordinationM028(save.homeworld.coordinationM028, save, { kind, ...extra }, site);
      assert.ok(result.state, result.message);
      save = normalizeSave(JSON.parse(JSON.stringify({ ...save, homeworld: { ...save.homeworld, coordinationM028: result.state } })));
      assert.deepEqual(save.homeworld.coordinationM028, result.state);
      return result.state;
    };
    const deny = (kind, site) => assert.equal(system.actHomeworldCoordinationM028(save.homeworld.coordinationM028, save, { kind }, site).state, undefined);
    act("begin", council, { role });
    deny("clear", workshop);
    const blocked = act("dispatch");
    assert.match(system.homeworldCoordinationTeamsM028(blocked)[0], /verrou bloqué/);
    const late = act("signal");
    assert.equal(late.phase, "delayed");
    assert.equal(late.delays, 1);
    deny("clear", workshop);
    act("retry");
    deny("clear", council);
    deny("clear", { ...workshop, actor: { x: 0, y: 0 } });
    deny("clear", { ...workshop, suspended: true });
    const fieldResult = act("clear", workshop);
    assert.equal(fieldResult.phase, role === "field" ? "cleared" : "surveyed");
    if (role === "delegate") {
      deny("order-clear", workshop);
      act("order-clear");
    } else {
      deny("order-clear", council);
    }
    const recovery = act("signal");
    assert.match(system.homeworldCoordinationTeamsM028(recovery)[1], /caisse prise/);
    const receipt = act("recall");
    assert.equal(receipt.phase, "returned");
    assert.equal(receipt.role, role);
    assert.equal(receipt.delays, 1);
    assert.match(system.homeworldCoordinationTeamsM028(receipt)[1], /caisse remise/);
    deny("recall", council);
    assert.deepEqual(save.inventory, reported.inventory);
    assert.deepEqual(save.profile, reported.profile);
    assert.deepEqual(save.buriedCradle, reported.buriedCradle);
  }
});

test("M028 places the jammed gate beside a real, walkable route in the existing workshop", () => {
  const room = interiors.homeworldInteriorForBuildingV64(workshop.roomId);
  assert.ok(room);
  const moves = [[4, 0], [-4, 0], [0, 4], [0, -4]];
  const queue = [room.spawn];
  const seen = new Set();
  let reached = null;
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    const key = point.x + "," + point.y;
    if (seen.has(key) || !interiors.isHomeworldInteriorWalkableV64(room, point)) continue;
    seen.add(key);
    if (system.homeworldCoordinationWorkshopReachedM028(room.buildingId, point)) {
      reached = point;
      break;
    }
    for (const [dx, dy] of moves) queue.push({ x: point.x + dx, y: point.y + dy });
  }
  assert.ok(reached, "a real walk from the room spawn can reach the interaction");
  const trial = { version: 1, ownerCreatedAt: "2026-11-22T10:00:00.000Z", phase: "jammed", role: "field", delays: 0 };
  const params = { room, actorPosition: reached, activePointId: null };
  assert.match(qa.render("app/game/HomeworldInteriorSurface.tsx", { ...params, coordinationM028: trial }), /data-homeworld-coordination-gate-m028="jammed"/);
  assert.match(qa.render("app/game/HomeworldInteriorSurface.tsx", { ...params, coordinationM028: { ...trial, phase: "cleared" } }), /data-homeworld-coordination-gate-m028="open"/);
  assert.equal(system.normalizeHomeworldCoordinationM028({ ...trial, phase: "delayed" }), null);
});
