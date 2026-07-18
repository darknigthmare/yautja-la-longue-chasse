import assert from "node:assert/strict";
import test from "node:test";

import {
  HUNTER_RIG_CANVAS,
  solveHunterRig,
  transformPoint,
} from "../app/game/hunterRig.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const angleDelta = (a, b) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

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
