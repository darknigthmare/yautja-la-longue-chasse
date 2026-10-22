import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundled = await build({ entryPoints: ["app/game/systems/gameReserveV66.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const reserve = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const clone = value => structuredClone(value);
const advance = (state, count, input = {}) => {
  for (let tick = 0; tick < count; tick++) state = reserve.stepGameReserveV66(state, input);
  return state;
};
const valid = state => assert.deepEqual(reserve.normalizeGameReserveV66(state), state);

// An explicit geometry fixture: the eight original people are already down.
// This does not claim a played combat victory or a complete campaign. All player
// positions, sector visits, jumps, observation and return below use real steps.
function quietExpedition() {
  const state = reserve.createGameReserveV104(37);
  for (const human of state.humans) {
    human.hp = 0; human.status = "down"; human.downAt = 0; human.moving = false;
  }
  valid(state);
  return reserve.stepGameReserveV66(state);
}
function walkTo(state, x) {
  const direction = x > state.player.x ? 1 : -1;
  for (let tick = 0; tick < 2500 && (x - state.player.x) * direction > 0; tick++) {
    state = reserve.stepGameReserveV66(state, { move: direction });
    assert.equal(state.status, "active");
  }
  assert.ok(Math.abs(state.player.x - x) < 4, `walk reached ${state.player.x}, expected ${x}`);
  valid(state);
  return state;
}
function jumpRightTo(state, landingX, landingY) {
  const startX = state.player.x;
  state = reserve.stepGameReserveV66(state, { move: 1, jump: true });
  assert.ok(state.player.vy < 0, "the jump actually left its support");
  for (let tick = 0; tick < 90; tick++) {
    state = reserve.stepGameReserveV66(state, { move: 1 });
    assert.ok(state.player.x > startX);
    if (state.player.x >= landingX && state.player.y === landingY && state.player.vy === 0) {
      valid(state);
      return state;
    }
  }
  assert.fail(`no physical landing at ${landingX}/${landingY}; got ${state.player.x}/${state.player.y}`);
}
function reachLookout() {
  let state = walkTo(quietExpedition(), 4620);
  state = reserve.stepGameReserveV66(state, { jump: true });
  state = advance(state, 60);
  assert.equal(state.player.y, 360, "the first new branch is reached from the ground");
  state = jumpRightTo(walkTo(state, 4830), 4920, 300);
  state = jumpRightTo(walkTo(state, 5190), 5280, 345);
  state = jumpRightTo(walkTo(state, 5550), 5640, 280);
  state = walkTo(state, 5840);
  assert.equal(state.player.y, 280);
  assert.equal(state.player.vy, 0);
  assert.deepEqual(state.visited, [0, 1, 2, 3]);
  valid(state);
  return state;
}

test("V104 is an explicit second expedition and the original V1 geometry and bounds stay unchanged", () => {
  const old = reserve.createGameReserveV66(37), current = reserve.createGameReserveV104(37);
  assert.equal(old.version, 1); assert.equal(old.reserveId, "vharuun-first-expedition");
  assert.equal(Object.hasOwn(old, "lookout"), false);
  assert.equal(current.version, 2); assert.equal(current.reserveId, "vharuun-lookout-expedition");
  assert.deepEqual(current.lookout, { recordedAt: null, hunterX: null, hunterY: null });
  assert.deepEqual(reserve.gameReserveV66World(), { width: 4800, height: 540, ground: 438, returnX: 115 });
  assert.deepEqual(reserve.gameReserveV66World(old), reserve.gameReserveV66World());
  assert.equal(reserve.gameReserveV66Platforms(old).length, 11);
  assert.equal(reserve.gameReserveV66Cover(old).length, 6);
  assert.equal(reserve.gameReserveV66World(current).width, 6400);
  assert.ok(reserve.gameReserveV66Platforms(current).some(platform => platform.x > 4800));
  assert.ok(reserve.gameReserveV66Cover(current).some(cover => cover.x > 4800));
  assert.equal(reserve.gameReserveV66Sector(5800, old).id, "camp");
  assert.equal(reserve.gameReserveV66Sector(5800, current).id, "beacon-ridge");
  assert.equal(current.humans.length, 8); assert.equal(current.ships.length, 2);
  valid(old); valid(current);
  for (const bad of [
    { ...old, player: { ...old.player, x: 4760.01 } },
    { ...old, visited: [0, 3] },
    { ...current, version: 3 },
    { ...current, reserveId: "vharuun-first-expedition" },
    { ...current, lookout: undefined },
  ]) assert.equal(reserve.normalizeGameReserveV66(bad), null);
  assert.equal(reserve.canAdvanceGameReserveV66(old, current), false);
  assert.equal(reserve.canAdvanceGameReserveV66(current, old), false);
});

test("the fourth sector and canopy observation are reached by walking and jumping, followed by a physical return", () => {
  let state = reachLookout();
  assert.ok(state.log.some(entry => entry.message.includes("Crête des Balises")), "the visited sector is named correctly in the journal");
  const before = clone(state);
  state = advance(state, 120, { interact: true });
  assert.equal(state.lookout.recordedAt, state.tick);
  assert.equal(state.lookout.hunterX, state.player.x);
  assert.equal(state.lookout.hunterY, 280);
  assert.ok(reserve.canAdvanceGameReserveV66(before, state));
  const recorded = clone(state.lookout);
  state = walkTo(state, 115);
  state = advance(state, 60, { interact: true });
  assert.equal(state.status, "returned");
  assert.deepEqual(state.lookout, recorded);
  assert.ok(reserve.canAdvanceGameReserveV66(before, state));
  assert.equal(reserve.stepGameReserveV66(state, { move: 1 }), state);
  valid(state);
});

test("the upper survey requires exactly 120 active ticks and records its real local position once", () => {
  const ready = reachLookout();
  let state = advance(ready, 119, { interact: true });
  assert.equal(reserve.gameReserveV66InteractionDuration("survey"), 120);
  assert.equal(state.lookout.recordedAt, null);
  assert.equal(state.channel.kind, "survey"); assert.equal(state.channel.target, 0); assert.equal(state.channel.ticks, 119);
  assert.equal(reserve.stepGameReserveV66(state, { interact: true }, true), state, "pause consumes no channel ticks");
  valid(state);
  state = reserve.stepGameReserveV66(state, { interact: true });
  assert.deepEqual(state.lookout, { recordedAt: ready.tick + 120, hunterX: state.player.x, hunterY: 280 });
  assert.equal(state.channel.kind, "none");
  const done = clone(state);
  state = advance(state, 240, { interact: true });
  assert.deepEqual(state.lookout, done.lookout, "holding the action cannot rewrite or duplicate the historical observation");
  assert.ok(reserve.canAdvanceGameReserveV66(done, state));
  valid(state);
});

test("movement, jumping and a real projectile injury interrupt an unfinished survey", () => {
  const ready = reachLookout(), started = advance(ready, 60, { interact: true });
  for (const input of [{ move: 1, interact: true }, { jump: true, interact: true }]) {
    const interrupted = reserve.stepGameReserveV66(started, input);
    assert.equal(interrupted.channel.kind, "none");
    assert.equal(interrupted.lookout.recordedAt, null);
    valid(interrupted);
  }
  const injured = clone(started);
  injured.projectiles.push({ x: injured.player.x - 5, y: 230, vx: 5, vy: 0, owner: "human", life: 8 });
  const after = reserve.stepGameReserveV66(injured, { interact: true });
  assert.equal(after.player.hp, injured.player.hp - 8, "a simulated projectile actually hit the hunter");
  assert.equal(after.channel.kind, "none"); assert.equal(after.lookout.recordedAt, null);
  valid(after);
});

test("a visit or nearby ground position cannot remotely complete the upper observation", () => {
  const ready = reachLookout();
  assert.equal(reserve.gameReserveV66Interaction(ready).kind, "survey");
  for (const patch of [{ x: 5809 }, { x: 5871 }, { y: 438 }, { vy: -1 }]) {
    const wrong = clone(ready); Object.assign(wrong.player, patch);
    assert.notEqual(reserve.gameReserveV66Interaction(wrong).kind, "survey");
  }
  const onGround = clone(ready); onGround.player.y = 438;
  const waited = advance(onGround, 180, { interact: true });
  assert.equal(waited.lookout.recordedAt, null);
  valid(waited);
});

test("observation proofs reject partial, future, out-of-place and unvisited records", () => {
  const done = advance(reachLookout(), 120, { interact: true });
  valid(done);
  for (const patch of [
    { recordedAt: null }, { hunterX: null }, { hunterY: null },
    { recordedAt: done.tick + 1 }, { recordedAt: 0 }, { recordedAt: done.tick - .5 },
    { hunterX: 5809 }, { hunterX: 5871 }, { hunterY: 438 },
  ]) {
    const forged = clone(done); Object.assign(forged.lookout, patch);
    assert.equal(reserve.normalizeGameReserveV66(forged), null, JSON.stringify(patch));
  }
  const unvisited = clone(done); unvisited.visited = [0, 1, 2];
  assert.equal(reserve.normalizeGameReserveV66(unvisited), null);
});

test("sparse checkpoints preserve the exact observation and ordinary irreversible expedition facts", () => {
  const before = reachLookout(), done = advance(before, 120, { interact: true });
  const later = advance(done, 60);
  assert.ok(reserve.canAdvanceGameReserveV66(before, later));
  for (const patch of [
    { recordedAt: null, hunterX: null, hunterY: null },
    { recordedAt: done.lookout.recordedAt + 1 },
    { hunterX: done.lookout.hunterX + 1 },
  ]) {
    const regressed = clone(later); Object.assign(regressed.lookout, patch);
    assert.equal(reserve.canAdvanceGameReserveV66(done, regressed), false, JSON.stringify(patch));
  }
  const backdated = clone(later); backdated.lookout.recordedAt = before.tick;
  assert.equal(reserve.canAdvanceGameReserveV66(before, backdated), false);
  const lostVisit = clone(later); lostVisit.visited = [0, 3];
  assert.equal(reserve.canAdvanceGameReserveV66(done, lostVisit), false);
  const hurt = clone(done); hurt.player.hp = 80;
  assert.equal(reserve.canAdvanceGameReserveV66(hurt, later), false, "a new observation cannot heal the hunter");
  const resurrected = clone(later); Object.assign(resurrected.humans[0], { hp: 70, status: "active", downAt: null });
  assert.equal(reserve.canAdvanceGameReserveV66(done, resurrected), false);
});

test("new vegetation blocks local sight without changing V1 cover or the extended world bounds", () => {
  const old = reserve.createGameReserveV66(37), current = reserve.createGameReserveV104(37);
  assert.equal(reserve.gameReserveV66LineClear(4840, 400, 4970, 400, current), false);
  assert.equal(reserve.gameReserveV66LineClear(4840, 300, 4970, 300, current), true);
  assert.equal(reserve.gameReserveV66LineClear(4840, 400, 4970, 400, old), true);
  let state = reachLookout();
  state = advance(state, 400, { move: 1 });
  assert.equal(state.player.x, 6360);
  valid(state);
  const overflow = clone(state); overflow.player.x = 6360.01;
  assert.equal(reserve.normalizeGameReserveV66(overflow), null);
});
