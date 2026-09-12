import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function loadModule(relativePath) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const [animation, pit, rig] = await Promise.all([
  loadModule("../app/game/pitFighterAnimation.ts"),
  loadModule("../app/game/systems/pitCombat.ts"),
  loadModule("../app/game/hunterRig.ts"),
]);
const resolve = animation.resolvePitFighterAnimation;
const fighter = (id = "jungle-hunter", patch = {}) => ({
  ...pit.createPitCombatState(id, id === "berserker" ? "jungle-hunter" : "berserker").fighters[0],
  ...patch,
});
const point = (frame, bone) => rig.transformPoint(frame.bones[bone], { x: 0, y: 0 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const actionFighter = (id, attack, stage) => {
  const move = pit.PIT_FIGHTERS[id].attacks[attack];
  const frame = stage === "startup" ? Math.floor(move.startup * 0.5)
    : stage === "active" ? move.startup
      : move.startup + move.active + Math.floor(move.recovery * 0.5);
  return fighter(id, {
    phase: stage,
    action: { kind: "attack", attack, frame, connected: false },
  });
};
function freezeDeep(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

test("rendering a frozen combat state is deterministic and cannot change replay state or hitboxes", () => {
  let state = pit.createPitCombatState();
  for (let tick = 0; tick < 150; tick += 1) {
    state = pit.stepPitCombat(state, [
      { right: tick < 20, jump: tick === 30, attack: tick === 60 ? "light" : tick === 100 ? "technique" : undefined },
      { left: tick < 20, guardHigh: tick >= 55 && tick <= 80 },
    ]);
    const serialized = pit.serializePitCombat(state);
    const boxes = state.fighters.map(pit.getPitFighterBoxes);
    freezeDeep(state);
    for (const current of state.fighters) {
      assert.deepEqual(resolve(current, tick), resolve(current, tick));
    }
    assert.equal(pit.serializePitCombat(state), serialized);
    assert.deepEqual(state.fighters.map(pit.getPitFighterBoxes), boxes);
  }
  assert.equal(state.version, 5);
});

test("each available melee action has distinct anticipation, contact and recovery poses", () => {
  for (const id of ["jungle-hunter", "berserker"]) {
    const contactHands = [];
    for (const attack of ["light", "medium", "heavy"]) {
      const motions = ["startup", "active", "recovery"].map(stage =>
        resolve(actionFighter(id, attack, stage), 50));
      assert.equal(motions[0].motion, attack + "-startup");
      assert.equal(motions[1].motion, attack + "-active");
      assert.equal(motions[2].motion, attack + "-recovery");
      assert.ok(distance(motions[0].frame.anchors.handGrip, motions[1].frame.anchors.handGrip) > 12);
      assert.ok(distance(motions[1].frame.anchors.handGrip, motions[2].frame.anchors.handGrip) > 5);
      assert.equal(motions[1].bladeExtension, 1);
      assert.ok(motions[2].bladeExtension < 1);
      contactHands.push(motions[1].frame.anchors.handGrip);
    }
    for (let a = 0; a < contactHands.length; a += 1) {
      for (let b = a + 1; b < contactHands.length; b += 1) {
        assert.ok(distance(contactHands[a], contactHands[b]) > 8, "each melee contact must read as a different gesture");
      }
    }
  }
});

test("animation follows existing technique devices without silently changing franchise mechanics", () => {
  const jungle = resolve(actionFighter("jungle-hunter", "technique", "active"), 40);
  const berserker = resolve(actionFighter("berserker", "technique", "active"), 40);
  assert.equal(jungle.motion, "technique-disc-active");
  assert.equal(berserker.motion, "technique-ground-slam-active");
  assert.equal(jungle.bladeExtension, 0);
  assert.equal(berserker.bladeExtension, 0);
  assert.ok(distance(jungle.frame.anchors.handGrip, berserker.frame.anchors.handGrip) > 50);
});

test("complete hierarchy mirrors around canonical x=128 including knocked-down root rotations", () => {
  const samples = [
    fighter(), fighter("jungle-hunter", { velocityX: 4.7 }),
    fighter("jungle-hunter", { velocityX: -4.7 }),
    fighter("jungle-hunter", { guard: "low", crouching: true }),
    fighter("jungle-hunter", { phase: "knockdown", knockdownFrames: 25, comboLastHitFrame: 1 }),
    fighter("jungle-hunter", { health: 0, phase: "knockdown", comboLastHitFrame: 1 }),
    actionFighter("jungle-hunter", "heavy", "active"),
    actionFighter("berserker", "technique", "active"),
  ];
  for (const current of samples) {
    const right = resolve({ ...current, facing: 1 }, 20);
    const left = resolve({ ...current, facing: -1, velocityX: -current.velocityX }, 20);
    assert.equal(left.motion, right.motion);
    for (const bone of Object.keys(right.frame.bones)) {
      for (const localPoint of [{ x: 0, y: 0 }, { x: 10, y: 17 }]) {
        const a = rig.transformPoint(right.frame.bones[bone], localPoint);
        const b = rig.transformPoint(left.frame.bones[bone], localPoint);
        assert.ok(Math.abs(a.x + b.x - 256) < 1e-8, bone + " x mirror");
        assert.ok(Math.abs(a.y - b.y) < 1e-8, bone + " y mirror");
      }
    }
  }
});

test("walking articulates feet, distinguishes retreat, and plants one support foot on the floor", () => {
  const current = fighter("jungle-hunter", { velocityX: 4.7 });
  const start = resolve(current, 8);
  const opposite = resolve(current, 24);
  assert.equal(start.motion, "walk-forward");
  assert.equal(resolve({ ...current, velocityX: -4.7 }, 8).motion, "walk-backward");
  assert.ok(distance(point(start.frame, "footFront"), point(opposite.frame, "footFront")) > 45);
  for (let tick = 0; tick <= 64; tick += 1) {
    const { frame } = resolve(current, tick);
    const lowest = Math.max(
      rig.transformPoint(frame.bones.footFront, { x: 0, y: 22 }).y,
      rig.transformPoint(frame.bones.footBack, { x: 0, y: 20 }).y,
    );
    assert.ok(Math.abs(lowest - 366) < 1e-8);
  }
});

test("low guard bends knees and lowers the head without shrinking bones or equipment", () => {
  const high = resolve(fighter("jungle-hunter", { guard: "high" }), 0);
  const low = resolve(fighter("jungle-hunter", { guard: "low", crouching: true }), 0);
  assert.equal(high.motion, "guard-high");
  assert.equal(low.motion, "guard-low");
  assert.ok(low.frame.anchors.maskCenter.y - high.frame.anchors.maskCenter.y > 30);
  for (const crouching of [false, true]) {
    const actualLow = resolve(fighter("jungle-hunter", { guard: "low", crouching }), 0);
    for (const [bone, soleOffset] of [["footFront", 22], ["footBack", 20]]) {
      assert.ok(Math.abs(rig.transformPoint(actualLow.frame.bones[bone], { x: 0, y: soleOffset }).y - 366) < 1e-8);
    }
  }
  for (const bone of Object.keys(high.frame.bones)) {
    const determinant = matrix => matrix.a * matrix.d - matrix.b * matrix.c;
    assert.ok(Math.abs(determinant(high.frame.bones[bone]) - determinant(low.frame.bones[bone])) < 1e-10);
  }
});

test("jump, fall, air attack, stun, block, throw and KO all produce usable finite poses", () => {
  const samples = [
    [fighter(), "idle"],
    [fighter("jungle-hunter", { grounded: false, y: 50, velocityY: 4 }), "jump"],
    [fighter("jungle-hunter", { grounded: false, y: 50, velocityY: -4 }), "fall"],
    [fighter("jungle-hunter", { crouching: true }), "crouch"],
    [fighter("jungle-hunter", { crouching: true, velocityX: 2 }), "crouch-walk"],
    [fighter("jungle-hunter", { phase: "hitstun", stunFrames: 10 }), "hitstun"],
    [fighter("jungle-hunter", { phase: "blockstun", guard: "high", stunFrames: 10 }), "blockstun-high"],
    [fighter("jungle-hunter", { phase: "blockstun", guard: "low", crouching: true, stunFrames: 10 }), "blockstun-low"],
    [fighter("jungle-hunter", { phase: "active", action: { kind: "throw", attack: null, frame: 7, connected: true } }), "throw-active"],
    [fighter("jungle-hunter", { phase: "knockdown", health: 0, knockdownFrames: 20, comboLastHitFrame: 0 }), "ko"],
  ];
  for (const [current, motion] of samples) {
    const result = resolve(current, 20);
    assert.equal(result.motion, motion);
    for (const matrix of Object.values(result.frame.bones)) {
      assert.ok(Object.values(matrix).every(Number.isFinite), motion);
    }
  }
  const grounded = actionFighter("jungle-hunter", "light", "active");
  const air = resolve({ ...grounded, grounded: false, y: 50, velocityY: 2 }, 20);
  assert.ok(distance(point(air.frame, "footFront"), point(resolve(grounded, 20).frame, "footFront")) > 20);
});

test("optional rig channels preserve legacy defaults and ignore non-finite authored offsets", () => {
  for (const pose of ["idle", "run", "jump", "fall", "climb", "extract"]) {
    for (const facing of [-1, 1]) {
      const input = { pose, facing, phase: 0.23, speed: 280, extractionProgress: 0.23 };
      const legacy = rig.solveHunterRig(input);
      assert.deepEqual(rig.solveHunterRig({ ...input, jointRotations: {}, rootOffset: { x: 0, y: 0 }, rootRotation: 0 }), legacy);
      assert.deepEqual(rig.solveHunterRig({
        ...input, jointRotations: { torso: NaN, armFrontLower: Infinity },
        rootOffset: { x: NaN, y: Infinity }, rootRotation: NaN,
      }), legacy);
    }
  }
});

test("added parent rotations preserve exact aimed cannon angle and joint offsets", () => {
  for (const facing of [-1, 1]) {
    const angle = facing === 1 ? -0.35 : Math.PI + 0.35;
    const frame = rig.solveHunterRig({
      pose: "idle", facing, phase: 0, aimAngle: angle,
      jointRotations: { torso: 0.2, pelvis: 0.1, casterShoulderMount: -0.15 },
      rootRotation: 0.25, rootOffset: { x: 15, y: -8 },
    });
    const origin = point(frame, "casterMuzzle");
    const axis = rig.transformPoint(frame.bones.casterMuzzle, { x: 10, y: 0 });
    assert.ok(Math.abs(Math.atan2(Math.sin(Math.atan2(axis.y - origin.y, axis.x - origin.x) - angle), Math.cos(Math.atan2(axis.y - origin.y, axis.x - origin.x) - angle))) < 1e-8);
  }
});
