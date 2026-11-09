import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const built = await build({ entryPoints: ['../app/game/systems/canopyGripPresentationV112.ts', '../app/game/hunterRig.ts']
  .map(path => fileURLToPath(new URL(path, import.meta.url))), bundle: true, write: false,
  outdir: '/tmp/canopy-grip-presentation-bundle', platform: 'node', format: 'cjs', logLevel: 'silent' });
function load(name) {
  const compiled = { exports: {} }, file = built.outputFiles.find(output => output.path.endsWith(`/${name}.js`));
  assert.ok(file); runInNewContext(file.text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
  return compiled.exports;
}
const presentation = load('canopyGripPresentationV112'), rig = load('hunterRig');
const plain = value => JSON.parse(JSON.stringify(value));
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} expected ${b}`);
const unchanged = (native, held) => {
  for (const bone of Object.keys(native.bones)) {
    if (['armBackUpper', 'armBackLower', 'handBack'].includes(bone)) continue;
    assert.deepEqual(plain(held.bones[bone]), plain(native.bones[bone]), bone);
    assert.deepEqual(plain(held.localMatrices[bone]), plain(native.localMatrices[bone]), 'local ' + bone);
  }
  assert.deepEqual(plain(held.anchors), plain(native.anchors), 'Every front-hand, trophy, mask and muzzle anchor is exactly native');
  assert.equal(held.pose, native.pose); assert.equal(held.facing, native.facing);
};
function check(input, grip) {
  const native = rig.solveHunterRig(input), held = presentation.solveCanopyGripRigV112(input, grip);
  const palm = presentation.canopyBackHandGripV112(held);
  near(palm.x, grip.x); near(palm.y, grip.y); unchanged(native, held);
  for (const [a, b] of [['armBackUpper', 'armBackLower'], ['armBackLower', 'handBack']]) {
    const length = frame => Math.hypot(frame.bones[a].e - frame.bones[b].e, frame.bones[a].f - frame.bones[b].f);
    near(length(held), length(native));
  }
  return { native, held, palm };
}

test('the registered back palm holds the physical body grip through both facings, three scales and every climb phase', () => {
  for (const facing of [-1, 1]) for (const scale of [.22, 116 / 384, .4]) for (let step = 0; step <= 32; step++) {
    const input = Object.freeze({ pose: 'climb', phase: step / 16, facing, scale,
      worldX: 220, worldY: -90, speed: facing * 140, verticalVelocity: 80 });
    const grip = Object.freeze({ x: 348, y: 276 - 384 * scale * .72 });
    check(input, grip);
  }
});

test('native09 real pumped pendulum and next-vine snapshots retain aim/body/legs while closing the recorded rear-hand gap', () => {
  // Exact neighbouring states in native-09-final/report.json. The capture
  // itself ran between observations; these are not invented capture-frame times.
  const records = [
    { name: 'beforeRelease', elapsed: 22.599999999999998, x: 2546.928380708604, y: 75.16531258135159,
      velocityX: 109.69474312198813, velocityY: -69.6133629186807 },
    { name: 'final', elapsed: 26.59999999999977, x: 2743.135369770736, y: 129.9525136156812,
      velocityX: -229.26113201951532, velocityY: 110.73399880189254 },
  ];
  for (const record of records) {
    const input = { pose: 'climb', phase: record.elapsed * (.55 + Math.abs(record.velocityY) / 280), facing: 1,
      speed: record.velocityX, verticalVelocity: record.velocityY, recoil: 0, extractionProgress: 0,
      scale: 116 / 384, worldX: record.x + 36 - 128, worldY: record.y + 116 - 366 };
    const grip = { x: record.x + 36, y: record.y + 116 * .28 };
    const { native } = check(input, grip);
    const oldPalm = presentation.canopyBackHandGripV112(native);
    assert.ok(Math.hypot(oldPalm.x - grip.x, oldPalm.y - grip.y) > 50, record.name + ' must reproduce the real previous visible gap');
  }
});

test('climbing weapon aim and authored front-hand offsets stay bit-identical when the back hand holds', () => {
  for (const facing of [-1, 1]) for (const aim of [-.7, 0, .45]) {
    const input = { pose: 'climb', phase: .37, facing, scale: 116 / 384, worldX: 100, worldY: 250,
      aimAngle: facing > 0 ? aim : Math.PI - aim, handAimAngle: facing > 0 ? aim : Math.PI - aim,
      recoil: .4, jointRotations: { handFront: .12, armFrontLower: -.08, armBackUpper: .3, handBack: .15 } };
    check(input, { x: 228, y: 616 - 116 * .72 });
  }
});

test('a missing/invalid/remote attachment or a different native pose never fabricates a rear-hand grasp', () => {
  const input = { pose: 'climb', phase: .37, facing: 1, scale: 116 / 384, worldX: 100, worldY: 250 };
  for (const grip of [{ x: NaN, y: 530 }, { x: 228, y: Infinity }, { x: 9000, y: -9000 }]) {
    assert.deepEqual(plain(presentation.solveCanopyGripRigV112(input, grip)), plain(rig.solveHunterRig(input)));
  }
  for (const pose of ['idle', 'run', 'jump', 'fall', 'extract']) {
    assert.deepEqual(plain(presentation.solveCanopyGripRigV112({ ...input, pose }, { x: 228, y: 532.48 })), plain(rig.solveHunterRig({ ...input, pose })));
  }
});

test('reloading the same physical grasp and simulation phase reconstructs the same back arm without a separate animation clock', () => {
  const input = { pose: 'climb', phase: 184.27, facing: -1, scale: 116 / 384, worldX: 1280, worldY: -240 };
  const grip = { x: 1408, y: 126 - 116 * .72 };
  const first = presentation.solveCanopyGripRigV112(input, grip);
  const restored = presentation.solveCanopyGripRigV112(plain(input), plain(grip));
  assert.deepEqual(plain(first), plain(restored));
  assert.deepEqual(input, { pose: 'climb', phase: 184.27, facing: -1, scale: 116 / 384, worldX: 1280, worldY: -240 });
});
