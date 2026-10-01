import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readFile, access } from "node:fs/promises";

const bundle = await build({ entryPoints: ["app/game/systems/gameReserveV66.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const r = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const fresh = (seed = 37) => r.stepGameReserveV66(r.createGameReserveV66(seed));
const ticks = (s, count, input = {}) => { for (let n = 0; n < count; n++) s = r.stepGameReserveV66(s, input); return s; };
const parkHumans = s => { for (let n = 0; n < s.humans.length; n++) { s.humans[n].x = 4200 + n * 20; s.humans[n].lastSeenX = null; s.humans[n].alertUntil = 0; } return s; };

test("first expedition restores exactly, respects seed and rejects future/contradictory checkpoints", () => {
  const s = r.createGameReserveV66(91), copy = structuredClone(s);
  assert.deepEqual(r.normalizeGameReserveV66(s), s); assert.deepEqual(s, copy);
  assert.deepEqual(r.createGameReserveV66(91), s); assert.notDeepEqual(r.createGameReserveV66(92).humans, s.humans);
  for (const bad of [null, {}, { ...s, version: 2 }, { ...s, tick: NaN }, { ...s, reserveId: "canon-planet" }, { ...s, humans: [] }, { ...s, status: "returned" }, { ...s, player: { ...s.player, hp: -1 } }]) assert.equal(r.normalizeGameReserveV66(bad), null);
  const escaped = structuredClone(s); escaped.humans[0].status = "escaped"; assert.equal(r.normalizeGameReserveV66(escaped), null);
  const fakeIdentity = structuredClone(s); fakeIdentity.humans[1].id = fakeIdentity.humans[0].id; assert.equal(r.normalizeGameReserveV66(fakeIdentity), null);
  const fakeTrophy = structuredClone(s); fakeTrophy.humans[1].secured = true; assert.equal(r.normalizeGameReserveV66(fakeTrophy), null);
  assert.equal(r.gameReserveV66Supported(undefined), true); assert.equal(r.gameReserveV66Supported({ version: 2 }), false);
});

test("held inputs must be released before starting; pause is inert and never advances AI", () => {
  const s = r.createGameReserveV66(4); assert.deepEqual(ticks(s, 100, { move: 1, attack: true }), s);
  const armed = r.stepGameReserveV66(s); assert.equal(armed.inputArmed, true); assert.equal(armed.tick, 0);
  assert.equal(r.stepGameReserveV66(armed, { attack: true }, true), armed);
  const step = r.stepGameReserveV66(armed, { move: 1 }); assert.ok(step.player.x > armed.player.x); assert.equal(step.tick, 1); assert.deepEqual(s, r.createGameReserveV66(4));
});

test("JSON arrays and lookalike scalars never become status, projectile-owner or channel enums", () => {
  for (const replacement of [["active"], { toString: () => "active" }, false, 0]) {
    const s = fresh(); s.humans[0].status = replacement; assert.equal(r.normalizeGameReserveV66(s), null);
  }
  for (const replacement of [["human"], ["hunter"], false, 0]) {
    const s = fresh(); s.projectiles.push({ x: 500, y: 385, vx: 1, vy: 0, owner: replacement, life: 10 }); assert.equal(r.normalizeGameReserveV66(s), null);
  }
  for (const replacement of [["none"], ["trophy"], false, 0]) {
    const s = fresh(); s.channel.kind = replacement; assert.equal(r.normalizeGameReserveV66(s), null);
  }
  const a = fresh(); a.player.hp = 80; const healed = structuredClone(a); healed.player.hp = 100; healed.tick++;
  assert.equal(r.canAdvanceGameReserveV66(a, healed), false);
});

test("all three sectors connect by movement and branches support the hunter without teleportation", () => {
  let s = parkHumans(fresh()); s = ticks(s, 950, { move: 1 });
  assert.ok(s.player.x > 3200); assert.deepEqual(s.visited, [0, 1, 2]); assert.ok(r.normalizeGameReserveV66(s));
  s = parkHumans(fresh()); s.player.x = 380;
  s = r.stepGameReserveV66(s, { jump: true }); s = ticks(s, 60);
  assert.equal(s.player.y, 365); assert.equal(s.player.vy, 0); assert.ok(r.normalizeGameReserveV66(s));
});

test("cover interrupts sight/fire and AI has no knowledge of a hidden offscreen hunter", () => {
  let s = fresh(); s.player.x = 430; const h = s.humans[0]; h.x = 610; h.facing = -1;
  assert.equal(r.gameReserveV66LineClear(430, 385, 610, 385), false);
  assert.equal(r.gameReserveV66LineClear(430, 290, 610, 290), true);
  s = ticks(s, 10); assert.equal(s.humans[0].lastSeenX, null);
  s.player.x = 720; s.humans[0].x = 850; s.humans[0].facing = -1; s.humans[1].x = 930; s.humans[1].facing = 1;
  s = r.stepGameReserveV66(s); assert.equal(s.humans[0].lastSeenX, 720); assert.equal(s.humans[1].lastSeenX, 720);
  assert.equal(s.humans[7].lastSeenX, null, "distant group is not notified magically");
});

test("scan records only a physically visible role; weapons expose the hunter and have a cost/cadence", () => {
  let s = fresh(); s.player.x = 1000; s.player.y = 280; s.player.cloak = true; s.humans[0].x = 1030; s.humans[0].facing = 1;
  // Freeze the target at a resource cache while scanning from the adjacent canopy.
  s.player.x = 2160; s.player.y = 280; s.player.vy = 0; s.humans[0].x = 2360; s.humans[0].carrying = true;
  s = ticks(s, 90, { scan: true }); assert.equal(s.humans[0].identified, true); assert.equal(s.humans[0].scan, 90);
  const beforeEnergy = s.player.energy; s = r.stepGameReserveV66(s, { attack: true }); assert.equal(s.player.cloak, false); assert.ok(s.player.energy < beforeEnergy); assert.equal(s.player.cooldown, 40);
  const held = ticks(s, 55, { attack: true }); assert.ok(held.player.energy > s.player.energy, "holding does not repeat a press-action shot");
});

test("a downed armed human requires a vulnerable channel; a shot interrupts it", () => {
  let s = parkHumans(fresh()); s.player.x = 800; s.humans[0].x = 840; s.humans[0].hp = 40;
  s = r.stepGameReserveV66(s, { melee: true }); assert.equal(s.humans[0].status, "down"); assert.equal(s.humans[0].secured, false);
  const before = structuredClone(s); s = ticks(s, 90, { interact: true }); assert.equal(s.humans[0].secured, false); assert.equal(s.channel.ticks, 90);
  s.projectiles.push({ x: 796, y: 390, vx: 4, vy: 0, owner: "human", life: 4 }); s = r.stepGameReserveV66(s, { interact: true }); assert.equal(s.channel.ticks, 0);
  s = ticks(s, 180, { interact: true }); assert.equal(s.humans[0].secured, true); assert.ok(r.canAdvanceGameReserveV66(before, s));
  assert.equal(r.canAdvanceGameReserveV66(s, before), false); const forged = structuredClone(s); forged.humans[0].secured = false; forged.tick++; assert.equal(r.canAdvanceGameReserveV66(s, forged), false);
});

test("humans carry real components along the ground, finish without a technician and escape by actual boarding", () => {
  let s = fresh(), previous = s, sawCarry = false, sawBoard = false;
  // The expedition remains at extraction, not globally aggroed; both AI groups must play their own escape.
  for (let n = 0; n < 18000; n++) {
    s = r.stepGameReserveV66(s);
    for (let i = 0; i < 8; i++) assert.ok(Math.abs(s.humans[i].x - previous.humans[i].x) <= 1.001, "no enemy offscreen teleport");
    sawCarry ||= s.humans.some(h => h.carrying); sawBoard ||= s.humans.some(h => h.status === "boarded");
    if (n % 300 === 0) assert.ok(r.normalizeGameReserveV66(s), "every AI phase serializes");
    previous = s; if (s.ships.every(a => a.departedAt !== null)) break;
  }
  assert.ok(sawCarry); assert.ok(sawBoard); assert.equal(s.ships.filter(a => a.departedAt !== null).length, 2); assert.ok(r.gameReserveV66Summary(s).escaped > 0); assert.ok(r.normalizeGameReserveV66(s));
  let fallback = fresh(); const tech = fallback.humans[1]; tech.hp = 0; tech.status = "down"; tech.downAt = 0;
  fallback.ships[0].parts = 3; fallback.ships[0].repair = 3500; fallback.humans[0].x = 2360;
  fallback = ticks(fallback, 240); assert.equal(fallback.ships[0].repair, 3600); assert.notEqual(fallback.ships[0].launch, null);
});

test("sabotage delays but does not erase components or permanently disable an escape route", () => {
  let s = parkHumans(fresh()); s.player.x = 2360; s.ships[0].parts = 3; s.ships[0].repair = 2500;
  s = ticks(s, 90, { interact: true }); assert.equal(s.ships[0].parts, 3); assert.equal(s.ships[0].repair, 500); assert.equal(s.ships[0].sabotages, 1); assert.equal(s.ships[0].launch, null);
  s.player.x = 115; s.humans[1].x = 2360; s = ticks(s, 1600); assert.equal(s.ships[0].repair, 3600); assert.notEqual(s.ships[0].launch, null);
});

test("return and defeat freeze a durable outcome with no campaign grants; illegal regression is refused", () => {
  let s = fresh(); s = ticks(s, 60, { interact: true }); assert.equal(s.status, "returned"); assert.equal(s.terminalTick, 60); assert.ok(r.normalizeGameReserveV66(s)); assert.equal(r.stepGameReserveV66(s, { move: 1 }), s);
  assert.ok(r.canAdvanceGameReserveV66(s, structuredClone(s))); assert.equal(r.canAdvanceGameReserveV66(s, r.createGameReserveV66(37)), false);
  const changedSeed = structuredClone(s); changedSeed.seed++; assert.equal(r.canAdvanceGameReserveV66(s, changedSeed), false);
  let dead = fresh(); dead.player.hp = 8; dead.projectiles.push({ x: 110, y: 390, vx: 5, vy: 0, owner: "human", life: 5 }); dead = r.stepGameReserveV66(dead);
  assert.equal(dead.status, "incapacitated"); assert.ok(r.normalizeGameReserveV66(dead));
  assert.equal("inventory" in dead, false); assert.equal("honor" in dead, false); assert.equal("rankId" in dead, false);
});

test("native render assets exist and the screen refuses running through image/write failures", async () => {
  const source = await readFile("app/game/gameReserveV66Rendering.ts", "utf8"); const paths = [...source.matchAll(/"(\/game\/[^"\n]+\.(?:png|webp))"/g)].map(m => m[1]);
  assert.equal(paths.length, 10); await Promise.all(paths.map(p => access("public" + p)));
  const ui = await readFile("app/game/GameReserveV66.tsx", "utf8");
  assert.match(ui, /!bank \|\| blockedKeys/); assert.match(ui, /if \(latest\.current\.onCheckpoint/); assert.match(ui, /window\.addEventListener\("blur"/);
  assert.match(ui, /checkpoint\(\)\) return/); assert.match(ui, /100 fiches H001–H100/);
});
