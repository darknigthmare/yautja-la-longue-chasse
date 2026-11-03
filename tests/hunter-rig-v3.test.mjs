import assert from "node:assert/strict";
import test from "node:test";

import {
  HUNTER_RIG_BIND_POINTS,
  HUNTER_RIG_CANVAS,
  solveHunterRig,
  transformPoint,
} from "../app/game/hunterRig.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const angleDelta = (a, b) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

test("every bind bone rotates on the exact exported sprite pivot", () => {
  const bind = solveHunterRig({
    pose: "idle",
    facing: 1,
    phase: 0,
  });

  for (const [boneId, expected] of Object.entries(HUNTER_RIG_BIND_POINTS)) {
    const actual = transformPoint(bind.bones[boneId], { x: 0, y: 0 });
    assert.ok(
      distance(actual, expected) < 1e-10,
      `${boneId}: ${JSON.stringify(actual)} must equal ${JSON.stringify(expected)}`,
    );
  }
});

test("neutral equipment inherits the body while extraction starts at bind", () => {
  const idle = solveHunterRig({
    pose: "idle",
    facing: 1,
    phase: 0,
  });
  const extractionStart = solveHunterRig({
    pose: "extract",
    facing: 1,
    phase: 0,
    extractionProgress: 0,
  });
  assert.ok(
    distance(idle.anchors.handGrip, extractionStart.anchors.handGrip) < 1e-10,
    "extraction frame zero must not teleport the hand",
  );
  assert.ok(
    distance(idle.anchors.muzzle, extractionStart.anchors.muzzle) < 1e-10,
    "extraction frame zero must not teleport the caster",
  );

  const runningNeutral = solveHunterRig({
    pose: "run",
    facing: 1,
    phase: 0.24,
    speed: 280,
  });
  const torsoOrigin = transformPoint(
    runningNeutral.bones.torso,
    { x: 0, y: 0 },
  );
  const torsoAxis = transformPoint(
    runningNeutral.bones.torso,
    { x: 20, y: 0 },
  );
  const muzzleOrigin = runningNeutral.anchors.muzzle;
  const muzzleAxis = transformPoint(
    runningNeutral.bones.casterMuzzle,
    { x: 20, y: 0 },
  );
  const torsoAngle = Math.atan2(
    torsoAxis.y - torsoOrigin.y,
    torsoAxis.x - torsoOrigin.x,
  );
  const muzzleAngle = Math.atan2(
    muzzleAxis.y - muzzleOrigin.y,
    muzzleAxis.x - muzzleOrigin.x,
  );
  assert.ok(
    Math.abs(angleDelta(muzzleAngle, torsoAngle)) < 1e-10,
    "an unaimed caster must stay docked to the torso instead of world-locking",
  );

  for (let step = 0; step <= 20; step += 1) {
    const progress = step / 20;
    const frame = solveHunterRig({
      pose: "extract",
      facing: 1,
      phase: progress,
      extractionProgress: progress,
    });
    assert.ok(
      frame.anchors.trophyCarry.x <= 252,
      `extraction ${progress}: the trophy hand must stay inside the sheet`,
    );
  }
});

test("the bow aim channel raises both arms to a drawable firing grip", () => {
  const neutral = solveHunterRig({
    pose: "idle",
    facing: 1,
    phase: 0,
  });
  const aimed = solveHunterRig({
    pose: "idle",
    facing: 1,
    phase: 0,
    handAimAngle: -0.32,
  });
  assert.ok(
    distance(neutral.anchors.handGrip, aimed.anchors.handGrip) > 60,
    "drawing the bow must visibly move the grip out of the idle pose",
  );
  assert.ok(
    aimed.anchors.handGrip.x >= 210 &&
      aimed.anchors.handGrip.x <= 230 &&
      aimed.anchors.handGrip.y >= 100 &&
      aimed.anchors.handGrip.y <= 150,
    `bow grip must remain drawable inside the sheet: ${JSON.stringify(aimed.anchors.handGrip)}`,
  );
});

test("the canonical rig remains continuous through cyclic locomotion", () => {
  const poses = ["idle", "run", "jump", "fall", "climb", "extract"];

  for (const pose of poses) {
    const before = solveHunterRig({
      pose,
      facing: 1,
      phase: 0.499,
      speed: 280,
      aimAngle: -0.2,
      extractionProgress: 0.499,
    });
    const after = solveHunterRig({
      pose,
      facing: 1,
      phase: 0.501,
      speed: 280,
      aimAngle: -0.2,
      extractionProgress: 0.501,
    });
    assert.ok(
      distance(before.anchors.handGrip, after.anchors.handGrip) < 2,
      `${pose}: the hand must not teleport between adjacent frames`,
    );
    assert.ok(
      distance(before.anchors.muzzle, after.anchors.muzzle) < 2,
      `${pose}: the caster must not teleport between adjacent frames`,
    );
  }

  const cycleStart = solveHunterRig({
    pose: "run",
    facing: 1,
    phase: 0,
    speed: 300,
  });
  const cycleEnd = solveHunterRig({
    pose: "run",
    facing: 1,
    phase: 1,
    speed: 300,
  });
  assert.ok(distance(cycleStart.anchors.handGrip, cycleEnd.anchors.handGrip) < 1e-8);
  assert.ok(distance(cycleStart.anchors.muzzle, cycleEnd.anchors.muzzle) < 1e-8);
});

test("facing mirrors every public anchor around the canonical root", () => {
  const right = solveHunterRig({
    pose: "idle",
    facing: 1,
    phase: 0.21,
    aimAngle: 0,
  });
  const left = solveHunterRig({
    pose: "idle",
    facing: -1,
    phase: 0.21,
    aimAngle: Math.PI,
  });

  for (const anchorId of [
    "muzzle",
    "handGrip",
    "trophyCarry",
    "maskCenter",
  ]) {
    const rightAnchor = right.anchors[anchorId];
    const leftAnchor = left.anchors[anchorId];
    assert.ok(
      Math.abs(
        rightAnchor.x +
          leftAnchor.x -
          HUNTER_RIG_CANVAS.width,
      ) < 1e-8,
      `${anchorId}: x must mirror around the root`,
    );
    assert.ok(
      Math.abs(rightAnchor.y - leftAnchor.y) < 1e-8,
      `${anchorId}: mirroring must preserve y`,
    );
  }
});

test("the muzzle follows exact aim and barrel recoil", () => {
  const level = solveHunterRig({
    pose: "idle",
    facing: 1,
    aimAngle: 0,
  });
  const elevated = solveHunterRig({
    pose: "idle",
    facing: 1,
    aimAngle: -0.62,
  });
  assert.ok(
    distance(level.anchors.muzzle, elevated.anchors.muzzle) > 10,
    "muzzle position must change with cannon aim",
  );

  const muzzleTip = transformPoint(elevated.bones.casterMuzzle, {
    x: 20,
    y: 0,
  });
  const solvedAngle = Math.atan2(
    muzzleTip.y - elevated.anchors.muzzle.y,
    muzzleTip.x - elevated.anchors.muzzle.x,
  );
  assert.ok(
    Math.abs(angleDelta(solvedAngle, -0.62)) < 1e-10,
    "muzzle world rotation must equal the requested aim",
  );

  const recoiled = solveHunterRig({
    pose: "idle",
    facing: 1,
    aimAngle: 0,
    recoil: 1,
  });
  assert.ok(
    recoiled.anchors.muzzle.x < level.anchors.muzzle.x,
    "barrel recoil must move the muzzle backward along the aim axis",
  );
});
