import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { BuriedCradleRun, CradleInput, CradleRoomId, BuriedCradleProgress, CradleShortcutId } from "../app/game/systems/buriedCradle";

const bundled = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/buriedCradle.ts", import.meta.url))],
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/buriedCradle");
const physicsBundled = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/platformCollision.ts", import.meta.url))],
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
const physics = await import("data:text/javascript;base64," + Buffer.from(physicsBundled.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/platformCollision");

const dt = 1 / 60;
function frame(run: BuriedCradleRun, input: CradleInput = {}): BuriedCradleRun {
  return api.stepBuriedCradle(run, input, dt).run;
}
function wait(run: BuriedCradleRun, seconds: number): BuriedCradleRun {
  for (let i = 0; i < Math.ceil(seconds / dt); i += 1) run = frame(run);
  return run;
}
function walkTo(run: BuriedCradleRun, x: number, jump = false): BuriedCradleRun {
  for (let i = 0; Math.abs(run.player.x + 36 - x) > 2.6 && i < 1200; i += 1) {
    run = frame(run, { move: run.player.x + 36 < x ? 1 : -1, jumpPressed: jump && i === 0, jumpHeld: true });
  }
  assert.ok(Math.abs(run.player.x + 36 - x) < 3, `did not reach ${run.roomId}:${x}; got ${run.player.x + 36}`);
  return run;
}
function traverseDoor(run: BuriedCradleRun, destination: CradleRoomId): BuriedCradleRun {
  const result = api.stepBuriedCradle(run, { interactPressed: true }, dt);
  assert.equal(result.run.roomId, destination, JSON.stringify(result.events));
  return result.run;
}
/** Local encounter fixtures use the same doorway-sized player, never an extra jump ability. */
function inRoom(id: CradleRoomId, feetX: number, feetY = 624): BuriedCradleRun {
  const run = api.createBuriedCradleRun();
  run.roomId = id;
  run.progress.visitedRoomIds = [...api.CRADLE_ROOM_IDS];
  run.progress.rootRingCut = id === "11" || id === "12";
  run.player.x = feetX - 36; run.player.y = feetY - 116;
  return run;
}
function rootEncounter(run: BuriedCradleRun): BuriedCradleRun {
  run = walkTo(run, 736); // Enter the marked basalt band and bait the tip.
  assert.equal(run.rootTrap.stage, "telegraph");
  const ringX = run.rootTrap.targetX;
  run = walkTo(run, ringX - 140);
  for (let i = 0; run.rootTrap.stage !== "opening" && i < 240; i += 1) run = frame(run);
  assert.equal(run.rootTrap.attackHit, false);
  run = walkTo(run, ringX - 60);
  const result = api.stepBuriedCradle(run, { move: 1, meleePressed: true }, dt);
  assert.ok(result.events.some(event => event.type === "root-cut"));
  return result.run;
}

test("source topology has twelve independent rooms and the exact non-linear branches", () => {
  assert.deepEqual(api.BURIED_CRADLE_ROOMS.map(room => room.id), api.CRADLE_ROOM_IDS);
  assert.equal(new Set(api.BURIED_CRADLE_DOORS.map(door => door.id)).size, 14);
  assert.deepEqual(api.BURIED_CRADLE_DOORS.filter(door => door.shortcutId).map(door => `${door.a.roomId}->${door.b.roomId}`), ["06->02", "07->03", "10->07"]);
  for (const room of api.BURIED_CRADLE_ROOMS) {
    assert.ok(room.platforms.length >= 8);
    assert.ok(room.platforms.every(p => p.x >= 0 && p.x + p.width <= room.width && p.y >= 0 && p.y + p.height <= room.height));
    assert.ok(room.platforms.every(p => p.width < 440), `${room.id} is modular`);
  }
  assert.equal(api.BURIED_CRADLE_SOURCE.geometryStatus, "authored-adaptation");
  assert.equal(api.BURIED_CRADLE_SOURCE.deliveredArtCount, 0);
});

test("doors and checkpoints land on real supports without intersecting a solid collider", () => {
  const progress = api.createBuriedCradleProgress();
  for (const door of api.BURIED_CRADLE_DOORS) for (const end of [door.a, door.b]) {
    const actor = { x: end.feet.x - 36, y: end.feet.y - 116, width: 72, height: 116, velocityX: 0, velocityY: 20 };
    const platforms = api.getBuriedCradlePlatforms(end.roomId, progress);
    assert.equal(physics.overlapsSolidPlatform(actor, platforms), false, door.id);
    const landed = physics.resolvePlatformMotion(actor, { x: actor.x, y: actor.y + 2 }, platforms, 624);
    assert.equal(landed.grounded, true, door.id);
    assert.equal(landed.y, actor.y, door.id);
  }
});

test("a normal player ascends all four tree landings and returns from the fault without an energy ability", () => {
  let run = inRoom("04", 96);
  for (const [launch, landing, height] of [[208, 440, 520], [528, 800, 416], [888, 1160, 312], [1248, 1520, 208]]) {
    run = walkTo(run, launch);
    run = walkTo(run, landing, true);
    run = wait(run, 0.3);
    assert.equal(run.player.y + 116, height);
    assert.equal(run.player.grounded, true);
  }
  run = traverseDoor(run, "05");
  run = walkTo(run, 1696);
  run = traverseDoor(run, "07");
  assert.equal(run.progress.checkpointId, "07");
  run = walkTo(run, 1580); run = wait(run, 1);
  assert.equal(run.player.y + 116, 624);
  // Reverse the entire descent. Three raised landings replace a one-way drop.
  run = walkTo(run, 992); run = walkTo(run, 840, true); run = wait(run, 0.6);
  assert.equal(run.player.y + 116, 520);
  run = walkTo(run, 680); run = walkTo(run, 500, true); run = wait(run, 0.6);
  assert.equal(run.player.y + 116, 416);
  run = walkTo(run, 360); run = walkTo(run, 160, true); run = wait(run, 0.6);
  assert.equal(run.player.y + 116, 312);
  run = walkTo(run, 96); run = traverseDoor(run, "05");
  assert.equal(run.player.health > 0, true);
});

test("main route is completable without either optional room or any deployed shortcut", () => {
  let run = api.createBuriedCradleRun();
  for (const [x, destination] of [[1440, "02"], [1696, "03"], [1696, "04"]] as const) run = traverseDoor(walkTo(run, x), destination);
  for (const [launch, landing] of [[208, 440], [528, 800], [888, 1160], [1248, 1520]]) {
    run = walkTo(run, launch); run = wait(walkTo(run, landing, true), 0.3);
  }
  run = traverseDoor(run, "05"); run = traverseDoor(walkTo(run, 1696), "07");
  run = traverseDoor(walkTo(run, 1696), "08");
  run = traverseDoor(walkTo(run, 1696), "10");
  run = rootEncounter(run);
  run = traverseDoor(walkTo(run, 1696), "11");
  assert.equal(run.progress.checkpointId, "11");
  run = traverseDoor(walkTo(run, 1184), "12");
  assert.deepEqual(run.progress.visitedRoomIds, ["01", "02", "03", "04", "05", "07", "08", "10", "11", "12"]);
  assert.equal(run.progress.drainageOpened, false);
  assert.deepEqual(run.progress.shortcutIds, []);
  const locked = api.stepBuriedCradle(run, { interactPressed: true }, dt);
  assert.equal(locked.run.roomId, "12");
  assert.ok(locked.events.some(event => event.type === "door-locked"));
  run = defeatBossByOrdinaryInputs(run);
  run = walkTo(run, 1696); run = wait(run, 0.5);
  run = walkTo(run, 1656); run = frame(run, { interactPressed: true });
  assert.equal(run.progress.crownClaimed, true);
  run = walkTo(run, 1824); run = frame(run, { interactPressed: true });
  assert.equal(run.extracted, true);
});

test("shortcuts deploy only on discovery side and stay reversible after restore and KO", () => {
  for (const door of api.BURIED_CRADLE_DOORS.filter(d => d.shortcutId)) {
    const lockedRun = inRoom(door.b.roomId, door.b.feet.x, door.b.feet.y);
    lockedRun.progress.rootRingCut = true;
    let result = api.stepBuriedCradle(lockedRun, { interactPressed: true }, dt);
    assert.equal(result.run.roomId, door.b.roomId);
    assert.ok(result.events.some(e => e.type === "door-locked"), door.id);
    let run = inRoom(door.a.roomId, door.a.feet.x, door.a.feet.y);
    run.progress.rootRingCut = true;
    result = api.stepBuriedCradle(run, { interactPressed: true }, dt);
    assert.ok(result.events.some(e => e.type === "shortcut-opened"), door.id);
    run = result.run;
    assert.equal(run.roomId, door.b.roomId);
    run = traverseDoor(run, door.a.roomId);
    assert.ok(api.createBuriedCradleRun(JSON.parse(JSON.stringify(run.progress))).progress.shortcutIds.includes(door.shortcutId!));
    run.player.health = 0; run = frame(run);
    assert.ok(run.progress.shortcutIds.includes(door.shortcutId!));
  }
});

test("all shortcut/drainage/victory combinations preserve the rock route and cannot require the boss to reach its own gate", () => {
  const shortcuts: CradleShortcutId[] = ["perch-forest", "fault-river", "roots-fault"];
  for (let mask = 0; mask < 8; mask += 1) for (const drainageOpened of [false, true]) for (const bossDefeated of [false, true]) {
    const p: BuriedCradleProgress = { ...api.createBuriedCradleProgress(), rootRingCut: true, drainageOpened, bossDefeated,
      visitedRoomIds: [...api.CRADLE_ROOM_IDS], shortcutIds: shortcuts.filter((_, i) => (mask & 1 << i) !== 0) };
    assert.equal(api.getCradleReachableRooms(p).length, 12);
    for (const room of api.BURIED_CRADLE_ROOMS) {
      const after = api.getBuriedCradlePlatforms(room.id, p);
      for (const permanent of room.platforms) assert.deepEqual(after.find(support => support.id === permanent.id), permanent);
    }
  }
  const beforeRing = api.getCradleReachableRooms(api.createBuriedCradleProgress());
  assert.ok(beforeRing.includes("10"));
  assert.ok(beforeRing.includes("09"));
  assert.ok(!beforeRing.includes("11"));
  assert.ok(!beforeRing.includes("12"));
});

test("root gate blocks collision before the ordinary bait-and-cut interaction, then stays removed", () => {
  let run = inRoom("10", 1500);
  for (let i = 0; i < 60; i += 1) run = frame(run, { move: 1 });
  assert.equal(run.player.x + 72, 1568);
  run = rootEncounter(inRoom("10", 96));
  assert.equal(api.getBuriedCradlePlatforms("10", run.progress).some(p => p.id === "10-living-root-gate"), false);
  run.player.health = 0; run = frame(run);
  assert.equal(run.progress.rootRingCut, true);
});

test("drainage is a local interaction that changes actual acid lifetimes, never the boss route", () => {
  let drainRun = inRoom("09", 1408);
  drainRun = frame(drainRun, { interactPressed: true });
  assert.equal(drainRun.progress.drainageOpened, true);
  for (const drained of [false, true]) {
    let run = inRoom("12", 96);
    run.progress.drainageOpened = drained;
    run.boss.phase = "sheath"; run.boss.health["motor-a"] = 0; run.boss.health["motor-b"] = 0;
    run.boss.attack = "breath"; run.boss.remainingSeconds = dt / 2;
    run = frame(run);
    assert.equal(run.boss.pools.length, 2);
    assert.equal(run.boss.pools[0].remainingSeconds, drained ? 3 : 8);
    for (const pool of run.boss.pools) {
      assert.ok(pool.x >= 640 && pool.x + pool.width <= 1264);
      assert.ok(pool.x + pool.width < 1360); // Jaw platform and escape/refuge are never pooled.
    }
    run = wait(run, 3.1);
    assert.equal(run.boss.pools.length, drained ? 0 : 2);
  }
});

test("boss anatomy only accepts exposed ordinary melee and retains damage between openings", () => {
  let run = inRoom("12", 260);
  run.boss.targetX = 340;
  const health = { ...run.boss.health };
  run = frame(run, { meleePressed: true });
  assert.deepEqual(run.boss.health, health);
  run = walkTo(run, 180); run = wait(run, 1.6);
  assert.equal(run.boss.stage, "opening");
  assert.equal(run.boss.weakPoint?.partId, "motor-a");
  run = walkTo(run, 270); run = frame(run, { move: 1, meleePressed: true });
  assert.equal(run.boss.health["motor-a"], 40);
  run = walkTo(run, 96); run = wait(run, 8);
  assert.equal(run.boss.health["motor-a"], 40);
  assert.equal(run.boss.health["motor-b"], 60);
});

function defeatBossByOrdinaryInputs(run: BuriedCradleRun): BuriedCradleRun {
  const phases = new Set<string>(); let knocks = 0;
  // Deterministic player policy. Never modifies the boss, player health or position.
  for (let i = 0; i < 18000 && !run.progress.bossDefeated; i += 1) {
    phases.add(run.boss.phase);
    const boss = run.boss; const center = run.player.x + 36; const feet = run.player.y + 116;
    let goal = center;
    let jump = false;
    if (boss.phase === "tentacles") {
      if (boss.weakPoint) goal = boss.weakPoint.x - 36;
      else if (boss.attack === "puncture" || boss.attack === "capture") goal = Math.max(60, boss.targetX - 160);
      else goal = 96;
    } else if (boss.phase === "sheath") {
      goal = 1496;
      jump = run.player.grounded && feet > 552 && center > 1280 && center < 1610;
    } else if (boss.phase === "bulb") {
      goal = boss.weakPoint ? 1496 : boss.attack === "bite" ? 1260 : 1496;
      jump = run.player.grounded && feet > 552 && center > 1280 && center < 1610;
      if ((boss.attack === "sweep" || boss.attack === "pulse") && boss.stage === "telegraph" && boss.remainingSeconds < 0.3 && feet > 560) jump = run.player.grounded;
    }
    const move = Math.abs(goal - center) < 3 ? 0 : goal > center ? 1 : -1;
    // Strikes must face the vulnerability; movement takes the player close enough first.
    const weak = api.getCradleWeakPoint(run);
    const close = weak && Math.abs(center - (weak.x - 36)) < 36;
    const strike = Boolean(weak && (close || (boss.phase !== "tentacles" && Math.abs(center - 1496) < 8)));
    const result = api.stepBuriedCradle(run, { move: strike ? 1 : move, jumpPressed: jump, jumpHeld: true, meleePressed: strike }, dt);
    knocks += result.events.filter(event => event.type === "knockout").length;
    run = result.run;
  }
  assert.equal(knocks, 0, `unexpected KO; phase ${run.boss.phase}`);
  assert.equal(run.progress.bossDefeated, true, JSON.stringify({ boss: run.boss, player: run.player }));
  assert.deepEqual([...phases], ["tentacles", "sheath", "bulb"]);
  assert.equal(run.progress.drainageOpened, false);
  assert.equal(run.player.health > 0, true);
  return run;
}

test("ordinary movement, jump and melee can defeat all three phases without drainage or a ranged weapon", () => {
  const run = inRoom("12", 96);
  run.progress.checkpointId = "11";
  defeatBossByOrdinaryInputs(run);
});

test("KO resets the attempt, preserves world changes and respawns outside the boss seal", () => {
  const run = inRoom("12", 96); run.progress.checkpointId = "11";
  run.progress.drainageOpened = true; run.progress.shortcutIds = ["perch-forest", "roots-fault"];
  run.boss.health["motor-a"] = 0; run.player.health = 0;
  const result = api.stepBuriedCradle(run, {}, dt);
  assert.equal(result.run.roomId, "11");
  assert.equal(result.run.player.health, 100);
  assert.equal(result.run.boss.health["motor-a"], 60);
  assert.deepEqual(result.run.progress, run.progress);
  assert.equal(api.getCradleWorldCondition(result.run.progress).basinControlAlive, true);
  assert.equal(api.getCradleWorldCondition(result.run.progress).autonomousXenomorphsRemain, true);
  assert.equal(api.getCradleWorldCondition(result.run.progress).fungalForestRemains, true);
  assert.ok(result.events.some(event => event.type === "knockout"));
});

test("victory leaves the head, forest, autonomous enemies and acid intact; trophy is only a crown fragment", () => {
  let run = inRoom("12", 1656);
  run.progress.bossDefeated = true; run.boss.phase = "defeated";
  run = frame(run, { interactPressed: true });
  const condition = api.getCradleWorldCondition(run.progress);
  assert.equal(condition.crownTrophy, "fragment");
  assert.equal(condition.basinControlAlive, false);
  assert.equal(condition.headRemainsInRoom12, true);
  assert.equal(condition.autonomousXenomorphsRemain, true);
  assert.equal(condition.fungalForestRemains, true);
  assert.equal(condition.riverBridgeDeployed, true);
  assert.ok(api.getCradleEnvironmentHazards({ ...run, roomId: "08" }).some(h => h.stage === "active"));
  assert.deepEqual(api.getCradleEnvironmentHazards({ ...run, roomId: "07" }), []);
  const copy = JSON.stringify(run);
  const extracted = api.stepBuriedCradle(walkTo(run, 1824), { interactPressed: true }, dt);
  assert.equal(extracted.run.extracted, true);
  assert.equal(JSON.stringify(run), copy);
});

test("progress is separate, serializable and rejects malformed/future versions without resetting them", () => {
  const good = api.createBuriedCradleProgress();
  assert.deepEqual(api.parseBuriedCradleProgress(JSON.parse(JSON.stringify(good))), good);
  for (const bad of [null, [], {}, { ...good, version: 2, futureProof: ["preserve"] },
    { ...good, visitedRoomIds: ["01", "01"] }, { ...good, visitedRoomIds: ["13"] },
    { ...good, shortcutIds: ["roots-fault"] }, { ...good, drainageOpened: "yes" }, { ...good, crownClaimed: true },
    { ...good, drainageOpened: true }, { ...good, rootRingCut: true },
    { ...good, visitedRoomIds: ["01", "11"], checkpointId: "11" }, { ...good, shortcutIds: ["perch-forest"] }]) {
    const before = JSON.stringify(bad);
    assert.equal(api.parseBuriedCradleProgress(bad), null);
    assert.throws(() => api.createBuriedCradleRun(bad), /Unsupported or malformed/);
    assert.equal(JSON.stringify(bad), before);
  }
  const run = api.createBuriedCradleRun(); const before = JSON.stringify(run);
  api.stepBuriedCradle(run, { move: 1, jumpPressed: true }, 0.2);
  assert.equal(JSON.stringify(run), before);
  for (const duration of [-1, Infinity, NaN, 0.3]) assert.throws(() => api.stepBuriedCradle(run, {}, duration));
});

test("walking below the canopy never bypasses its elevated doors", () => {
  let run = inRoom("04", 96);
  run = walkTo(run, 1520);
  assert.equal(run.player.y + 116, 624);
  run = frame(run, { interactPressed: true });
  assert.equal(run.roomId, "04");
  run = inRoom("05", 96, 624);
  run = walkTo(run, 1696);
  run = frame(run, { interactPressed: true });
  assert.equal(run.roomId, "05");
  // A fallen player can recover the high route without a boost or consumable.
  run = walkTo(run, 1635);
  run = walkTo(run, 1490, true); run = wait(run, 0.6);
  assert.equal(run.player.y + 116, 520);
  run = frame(run, { jumpPressed: true, jumpHeld: true }); run = wait(run, 0.8);
  assert.equal(run.player.y + 116, 416);
  run = traverseDoor(walkTo(run, 1696), "07");
  assert.equal(run.roomId, "07");
});

test("all three shortcuts have physically reachable approaches on both sides", () => {
  let run = inRoom("05", 880, 416);
  run = traverseDoor(run, "06"); run = traverseDoor(walkTo(run, 96), "02");
  assert.deepEqual(run.progress.shortcutIds, ["perch-forest"]);
  run = walkTo(run, 1580); run = wait(run, 0.8);
  run = walkTo(run, 1500); run = walkTo(run, 1340, true); run = wait(run, 0.5);
  assert.equal(run.player.y + 116, 528);
  run = walkTo(run, 1240); run = walkTo(run, 1060, true); run = wait(run, 0.5);
  assert.equal(run.player.y + 116, 424);
  run = traverseDoor(run, "06");

  run = inRoom("07", 1580);
  run = walkTo(run, 992); run = walkTo(run, 840, true); run = wait(run, 0.6);
  run = walkTo(run, 680); run = walkTo(run, 480, true); run = wait(run, 0.6);
  run = traverseDoor(run, "03");
  assert.ok(run.progress.shortcutIds.includes("fault-river"));
  run = walkTo(run, 1640); run = wait(run, 0.7);
  run = walkTo(run, 1250); run = walkTo(run, 1120, true); run = wait(run, 0.5);
  assert.equal(run.player.y + 116, 552);
  run = walkTo(run, 1190); run = walkTo(run, 1400, true); run = wait(run, 0.5);
  assert.equal(run.player.y + 116, 472);
  run = traverseDoor(walkTo(run, 1440), "07");

  run = rootEncounter(inRoom("10", 96));
  run = traverseDoor(walkTo(run, 320), "07");
  assert.ok(run.progress.shortcutIds.includes("roots-fault"));
  run = walkTo(run, 1430); run = wait(run, 0.6);
  run = walkTo(run, 1380); run = walkTo(run, 1220, true); run = wait(run, 0.6);
  assert.equal(run.player.y + 116, 520);
  run = traverseDoor(run, "10");
  assert.equal(run.progress.rootRingCut, true);
});
test("jumping from the highest landing keeps the full player inside the room camera space", () => {
  let run = inRoom("04", 1520, 208);
  for (let i = 0; i < 120; i += 1) {
    run = frame(run, { jumpPressed: i === 0, jumpHeld: true });
    assert.ok(run.player.y >= 0);
    assert.ok(run.player.y + run.player.height <= 624);
  }
  assert.equal(run.player.y + 116, 208);
  assert.equal(run.player.grounded, true);
});