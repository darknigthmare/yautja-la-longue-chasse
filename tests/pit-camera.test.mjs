import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({
  stdin: {
    contents: [
      'export { createPitCombatState, PIT_ARENAS, PIT_FIGHTERS, stepPitCombat, serializePitCombat } from "./app/game/systems/pitCombat";',
      'export * from "./app/game/systems/pitCamera";',
    ].join("\n"),
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});

const api = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")
);

function stateAt(leftX, rightX, leftY = 0, rightY = 0) {
  const state = api.createPitCombatState("jungle-hunter", "city-hunter", {
    mode: "training",
    arenaId: "the-pit",
  });
  state.fighters[0].x = leftX;
  state.fighters[1].x = rightX;
  state.fighters[0].y = leftY;
  state.fighters[1].y = rightY;
  return state;
}

test("close fighters receive a stronger presentation zoom without changing combat state", () => {
  const state = stateAt(430, 530);
  const before = structuredClone(state);
  const camera = api.targetPitPresentationCamera(state);
  assert.ok(camera.zoom >= 1.8 && camera.zoom <= api.PIT_CAMERA_LIMITS.maxZoom);
  const bounds = api.getPitPresentationBounds(state);
  assert.ok(Math.abs(camera.centerX - (bounds.left + bounds.right) / 2) <= 1,
    "the frame centers asymmetrical illustrated weapons rather than only collision midpoints");
  assert.deepEqual(state, before);
});

test("spacing and high jumps pull back to include the visual border outside collision walls", () => {
  const close = api.targetPitPresentationCamera(stateAt(420, 540));
  const far = api.targetPitPresentationCamera(stateAt(90, 870));
  const high = api.targetPitPresentationCamera(stateAt(420, 540, 0, 300));
  assert.ok(far.zoom < close.zoom);
  assert.ok(high.zoom < close.zoom);
  assert.ok(far.zoom >= api.PIT_CAMERA_LIMITS.minZoom);
  assert.ok(high.zoom >= api.PIT_CAMERA_LIMITS.minZoom);
  assertContained(far, stateAt(90, 870));
  assertContained(high, stateAt(420, 540, 0, 300));
});

test("large technique effects participate in framing", () => {
  const base = stateAt(430, 530);
  const close = api.targetPitPresentationCamera(base);
  base.techniqueEffects.push({
    id: 1,
    ownerSlot: 0,
    techniqueId: "plasma-caster",
    x: 820,
    y: 120,
    direction: 1,
    age: 0,
    phase: "active",
    hitCount: 0,
    rehitFrames: 0,
  });
  const framed = api.targetPitPresentationCamera(base);
  assert.ok(framed.zoom < close.zoom);
  assert.ok(framed.centerX > close.centerX);
});

test("camera interpolation is bounded and dead zones prevent pumping", () => {
  const nearState = stateAt(430, 530);
  nearState.frame = 10;
  const previous = api.targetPitPresentationCamera(nearState);
  const farState = stateAt(100, 860);
  farState.frame = 11;
  const advanced = api.advancePitPresentationCamera(previous, farState);
  const farTarget = api.targetPitPresentationCamera(farState);
  assert.ok(advanced.zoom < previous.zoom);
  assert.ok(advanced.zoom > farTarget.zoom);

  const stableState = stateAt(430, 530);
  stableState.frame = 11;
  const stable = api.advancePitPresentationCamera(previous, stableState);
  assert.equal(stable.zoom, previous.zoom);
  assert.equal(stable.centerX, previous.centerX);
  assert.equal(stable.centerY, previous.centerY);
});

function assertContained(camera, state) {
  const arena = api.PIT_ARENAS[state.arenaId], bounds = api.getPitPresentationBounds(state);
  const left = camera.centerX - arena.width / camera.zoom / 2;
  const right = camera.centerX + arena.width / camera.zoom / 2;
  const top = camera.centerY - arena.height / camera.zoom / 2;
  const bottom = camera.centerY + arena.height / camera.zoom / 2;
  assert.ok(left <= bounds.left + 1e-8 && right >= bounds.right - 1e-8,
    JSON.stringify({ camera, bounds, clipped: "horizontal" }));
  assert.ok(top <= bounds.top + 1e-8 && bottom >= bounds.bottom - 1e-8,
    JSON.stringify({ camera, bounds, clipped: "vertical" }));
}

test("a redraw at the same frame preserves an interpolating camera, while backward seek and arena change reset", () => {
  const first = stateAt(430, 530); first.frame = 20;
  const next = stateAt(100, 860); next.frame = 21;
  const advanced = api.advancePitPresentationCamera(api.targetPitPresentationCamera(first), next);
  assert.notDeepEqual(advanced, api.targetPitPresentationCamera(next));
  for (let redraw = 0; redraw < 8; redraw++)
    assert.strictEqual(api.advancePitPresentationCamera(advanced, next), advanced);
  const rewind = { ...next, frame: 4 };
  assert.deepEqual(api.advancePitPresentationCamera(advanced, rewind), api.targetPitPresentationCamera(rewind));
  const otherArena = { ...next, arenaId: "glass-terrace" };
  assert.deepEqual(api.advancePitPresentationCamera(advanced, otherArena), api.targetPitPresentationCamera(otherArena));
});

test("all fighters retain full visual bounds at either wall, crouching and airborne", () => {
  for (const id of Object.keys(api.PIT_FIGHTERS)) for (const arenaId of Object.keys(api.PIT_ARENAS)) {
    const arena = api.PIT_ARENAS[arenaId];
    for (const facing of [-1, 1]) for (const y of [0, 130, 300]) {
      const state = api.createPitCombatState(id, id === "jungle-hunter" ? "city-hunter" : "jungle-hunter", { arenaId });
      Object.assign(state.fighters[0], { x: arena.leftWall, facing, y, crouching: true });
      Object.assign(state.fighters[1], { x: arena.rightWall, facing: -facing });
      const before = api.serializePitCombat(state);
      assertContained(api.targetPitPresentationCamera(state), state);
      assert.equal(api.serializePitCombat(state), before);
    }
  }
});

test("interpolation never clips a suddenly extended weapon or high jump", () => {
  const near = stateAt(450, 520); near.frame = 10;
  const previous = api.targetPitPresentationCamera(near);
  const jump = stateAt(54, 906, 300, 0); jump.frame = 11;
  jump.fighters[0].definitionId = "falconer";
  const camera = api.advancePitPresentationCamera(previous, jump);
  assertContained(camera, jump);
  assert.ok(camera.zoom < previous.zoom);
});

test("reduced motion uses a stable wide frame independent of movement, frame gaps and repeated renders", () => {
  const options = { reducedMotion: true };
  const initial = stateAt(430, 530); initial.frame = 50;
  const fixed = api.targetPitPresentationCamera(initial, options);
  assert.equal(fixed.mode, "fixed");
  assert.equal(fixed.zoom, api.PIT_CAMERA_LIMITS.fixedZoom);
  const follow = api.targetPitPresentationCamera(initial);
  assert.deepEqual(api.advancePitPresentationCamera(follow, initial, options), fixed,
    "changing the accessibility setting takes effect even on a frozen tick");
  for (let frame = 51; frame <= 90; frame++) {
    const state = stateAt(54, 906, frame % 2 ? 0 : 130, 0); state.frame = frame;
    const camera = api.advancePitPresentationCamera(fixed, state, options);
    assert.deepEqual({ ...camera, frame: fixed.frame }, fixed);
    assertContained(camera, state);
  }
  assert.equal(api.advancePitPresentationCamera(fixed, initial).mode, "follow");
});

test("camera observation cannot change combat or replay serialization in either motion mode", () => {
  let state = api.createPitCombatState();
  const cameras = [null, null];
  for (let frame = 0; frame < 180; frame++) {
    state = api.stepPitCombat(state, [{ right: frame < 35, jump: frame === 36, attack: frame === 75 ? "heavy" : undefined }, {}]);
    const bytes = api.serializePitCombat(state);
    for (let mode = 0; mode < 2; mode++) {
      cameras[mode] = api.advancePitPresentationCamera(cameras[mode], state, { reducedMotion: Boolean(mode) });
      assert.equal(api.serializePitCombat(state), bytes);
    }
  }
});

test("the constant reduced-motion frame contains every delivered plate at both walls and normal jump heights", () => {
  for (const id of Object.keys(api.PIT_FIGHTERS)) for (const facing of [-1, 1]) {
    const state = api.createPitCombatState(id, id === "wolf" ? "scar" : "wolf");
    Object.assign(state.fighters[0], { x: 54, y: 180, facing, crouching: true });
    Object.assign(state.fighters[1], { x: 906, y: 0, facing: -facing });
    assertContained(api.targetPitPresentationCamera(state, { reducedMotion: true }), state);
  }
});


test("screen shake can be disabled without disabling dynamic framing; reduced motion remains authoritative", () => {
  assert.deepEqual(api.resolvePitPresentationMotion({ screenShake: false, prefersReducedMotion: false }),
    { reducedMotion: false, screenShake: false });
  assert.deepEqual(api.resolvePitPresentationMotion({ screenShake: true, prefersReducedMotion: false }),
    { reducedMotion: false, screenShake: true });
  assert.deepEqual(api.resolvePitPresentationMotion({ screenShake: true, prefersReducedMotion: true }),
    { reducedMotion: true, screenShake: false });
  assert.deepEqual(api.resolvePitPresentationMotion({ screenShake: true, prefersReducedMotion: false, fixedCamera: true }),
    { reducedMotion: true, screenShake: false });
});

test("a single fighter retreat changes framing visibly, then approaching restores a close view", () => {
  let state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training" });
  let camera = api.targetPitPresentationCamera(state);
  const initial = camera;
  const rivalX = state.fighters[1].x;
  let previous = camera;
  for (let tick = 0; tick < 90; tick++) {
    state = api.stepPitCombat(state, [{ left: true }, {}]);
    camera = api.advancePitPresentationCamera(camera, state);
    assertContained(camera, state);
    assert.ok(Math.abs(camera.zoom - previous.zoom) < 0.025, "normal walking does not snap zoom");
    previous = camera;
  }
  assert.equal(state.fighters[1].x, rivalX);
  assert.ok(initial.zoom - camera.zoom > 0.3);
  assert.ok(initial.centerX - camera.centerX > 80);
  const wide = camera;
  for (let tick = 0; tick < 140; tick++) {
    state = api.stepPitCombat(state, [{ right: true }, {}]);
    camera = api.advancePitPresentationCamera(camera, state);
    assertContained(camera, state);
    assert.ok(Math.abs(camera.zoom - previous.zoom) < 0.025, "approaching does not snap zoom");
    previous = camera;
  }
  assert.ok(camera.zoom - wide.zoom > 0.6, "return to close combat visibly zooms in");
  assert.ok(camera.zoom > 1.8);
});

test("camera pans continuously as airborne fighters cross instead of locking to a player slot", () => {
  const state = stateAt(320, 640, 160, 0);
  let camera = api.targetPitPresentationCamera(state);
  for (let tick = 1; tick <= 80; tick++) {
    state.frame = tick;
    state.fighters[0].x = 320 + tick * 4;
    state.fighters[1].x = 640 - tick * 4;
    state.fighters[0].facing = state.fighters[0].x > state.fighters[1].x ? -1 : 1;
    state.fighters[1].facing = -state.fighters[0].facing;
    const next = api.advancePitPresentationCamera(camera, state);
    assertContained(next, state);
    assert.ok(Math.abs(next.centerX - camera.centerX) < 6, "cross-up cannot teleport camera center");
    assert.ok(Math.abs(next.zoom - camera.zoom) < 0.035, "cross-up cannot snap zoom");
    camera = next;
  }
});

test("outward zoom reacts faster than inward zoom without bypassing visual containment", () => {
  const state = stateAt(160, 800); state.frame = 1;
  const target = api.targetPitPresentationCamera(state);
  const wider = { ...target, frame: 0, zoom: target.zoom - 0.1 };
  const closer = { ...target, frame: 0, zoom: target.zoom + 0.1 };
  const inward = api.advancePitPresentationCamera(wider, state);
  const outward = api.advancePitPresentationCamera(closer, state);
  assert.ok(closer.zoom - outward.zoom > inward.zoom - wider.zoom);
  assert.ok(outward.zoom > target.zoom, "padding allows smooth pullback before hard clipping safety");
  assertContained(outward, state);
});


test("Ahab keeps a constant reduced-motion envelope for both walls, native sides, attacks and normal jumps in every arena", () => {
  for (const [arenaId, arena] of Object.entries(api.PIT_ARENAS)) {
    const state = api.createPitCombatState("user-ahab", "city-hunter", { arenaId, mode: "training" });
    state.fighters[0].variantId = "ahab-avec-casque-0c8ceb1c95";
    const initial = api.targetPitPresentationCamera(state, { reducedMotion: true });
    assert.ok(initial.zoom <= api.PIT_CAMERA_LIMITS.fixedZoom);
    let previous = initial;
    for (const x of [arena.leftWall, arena.rightWall]) for (const y of [0, 90, 180])
      for (const facing of [-1, 1]) for (const crouching of [false, true])
        for (const attack of [null, "light", "medium", "heavy"]) {
          state.frame += 1;
          Object.assign(state.fighters[0], { x, y, facing, crouching, phase: attack ? "active" : "idle",
            action: attack ? { kind: "attack", attack, frame: 0, connected: false } : null });
          Object.assign(state.fighters[1], { x: x === arena.leftWall ? arena.rightWall : arena.leftWall, facing: -facing });
          const bytes = api.serializePitCombat(state);
          const camera = api.advancePitPresentationCamera(previous, state, { reducedMotion: true });
          assert.deepEqual({ ...camera, frame: initial.frame }, initial, "fixed framing cannot follow live pose or facing");
          assertContained(camera, state);
          assert.equal(api.serializePitCombat(state), bytes, "presentation cannot alter damage, collisions or replay state");
          previous = camera;
        }
  }
});
