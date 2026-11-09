import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['../app/game/systems/huntFieldPresentationV112.ts',
  '../app/game/systems/canopySupportRendererV112.ts', '../app/game/systems/canopyTraversalV112.ts', '../app/game/hunterRig.ts']
  .map(path => fileURLToPath(new URL(path, import.meta.url))), bundle: true,
  write: false, outdir: '/tmp/hunt-field-presentation-bundle', format: 'cjs', platform: 'node', logLevel: 'silent' });
function load(name) {
  const output = built.outputFiles.find(file => file.path.endsWith(`/${name}.js`));
  assert.ok(output);
  const compiled = { exports: {} };
  runInNewContext(output.text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
  return compiled.exports;
}
const field = load('huntFieldPresentationV112');
const canopy = load('canopySupportRendererV112');
const physics = load('canopyTraversalV112');
const rig = load('hunterRig');
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} expected ${b}`);
const freeze = value => { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child); return value; };
const input = (extra = {}) => ({ action: 'flay', elapsed: 1.6, duration: 3.2,
  player: { x: 300, y: 514, width: 52, height: 110, grounded: true, climbing: false },
  corpse: { x: 370, y: 624, width: 70, height: 50 }, ...extra });

test('work uses the confirmed operation duration, including worn-tool time, and a saved clock replays exactly', () => {
  const source = freeze(input({ duration: 5.28, elapsed: 2.64 }));
  const work = field.describeHuntFieldWorkV112(source);
  near(work.progress, .5); assert.equal(work.phase, 'work');
  assert.deepEqual(work, field.describeHuntFieldWorkV112(JSON.parse(JSON.stringify(source))));
  assert.equal(source.player.x, 300); assert.equal(source.elapsed, 2.64);
  assert.equal(field.describeHuntFieldWorkV112(input({ elapsed: 0 })).phase, 'approach');
  assert.equal(field.describeHuntFieldWorkV112(input({ elapsed: 20 })).phase, 'secure');
  near(field.describeHuntFieldWorkV112(input({ elapsed: 20 })).progress, 1);
});

test('no work pose is invented for another action, an airborne/climbing actor, or an invalid operation clock', () => {
  for (const action of ['analyze', 'carry', 'drop', 'mark', 'hang', 'leave', 'erase']) assert.equal(field.describeHuntFieldWorkV112(input({ action })), null);
  for (const clock of [{ elapsed: NaN }, { elapsed: -1 }, { duration: 0 }, { duration: Infinity }]) assert.equal(field.describeHuntFieldWorkV112(input(clock)), null);
  const source = input();
  assert.equal(field.describeHuntFieldWorkV112({ ...source, player: { ...source.player, grounded: false } }), null);
  assert.equal(field.describeHuntFieldWorkV112({ ...source, player: { ...source.player, climbing: true } }), null);
});

test('all four real work actions are distinct and optional art bounds cannot poison a valid clock', () => {
  const labels = new Set();
  for (const action of ['flay', 'harvest-hide', 'harvest-tissue', 'harvest-bone']) {
    const work = field.describeHuntFieldWorkV112(input({ action, corpse: { x: 370, y: 624, width: NaN, height: Infinity } }));
    labels.add(work.label); assert.ok(Number.isFinite(work.workPoint.x)); assert.ok(Number.isFinite(work.workPoint.y));
  }
  assert.equal(labels.size, 4);
});

test('both original feet remain planted through the working pose at real scales and both facings', () => {
  for (const facing of [-1, 1]) for (const scale of [.22, .4, 1]) for (const progress of [.04, .18, .5, .87, .96]) {
    const source = input({ elapsed: 3.2 * progress, corpse: { x: 326 + facing * 45, y: 624, width: 70, height: 50 } });
    const work = field.describeHuntFieldWorkV112(source);
    const original = { pose: 'idle', phase: 0, facing, worldX: 193, worldY: 258, scale };
    const standing = rig.solveHunterRig(original), working = field.solveHuntFieldWorkRigV112(freeze(original), work);
    for (const foot of ['footFront', 'footBack']) {
      near(working.bones[foot].e, standing.bones[foot].e); near(working.bones[foot].f, standing.bones[foot].f);
      near(working.bones[foot].a, standing.bones[foot].a); near(working.bones[foot].b, standing.bones[foot].b);
    }
  }
});

test('arm and leg lengths stay original while a far intent point is clamped, without moving the collision data', () => {
  const source = freeze(input({ corpse: { x: 1000, y: 624, width: 90, height: 50 } }));
  const original = freeze({ pose: 'idle', phase: 0, facing: 1, worldX: 198, worldY: 258, scale: .3 });
  const standing = rig.solveHunterRig(original), working = field.solveHuntFieldWorkRigV112(original, field.describeHuntFieldWorkV112(source));
  for (const [parent, child] of [['armFrontUpper', 'armFrontLower'], ['armFrontLower', 'handFront'], ['armBackUpper', 'armBackLower'],
    ['armBackLower', 'handBack'], ['legFrontUpper', 'legFrontLower'], ['legFrontLower', 'footFront'], ['legBackUpper', 'legBackLower']]) {
    const length = frame => Math.hypot(frame.bones[parent].e - frame.bones[child].e, frame.bones[parent].f - frame.bones[child].f);
    near(length(working), length(standing));
  }
  for (const matrix of Object.values(working.bones)) assert.ok(Object.values(matrix).every(Number.isFinite));
  assert.equal(source.player.x, 300); assert.equal(source.player.y, 514); assert.equal(source.corpse.x, 1000);
});

test('a world-space operation snapshot reconstructs the exact original-body work frame after reload', () => {
  const source = input({ elapsed: 2.1 });
  const base = { pose: 'idle', phase: 47, facing: 1, worldX: 198, worldY: 258, scale: .3 };
  const first = field.solveHuntFieldWorkRigV112(base, field.describeHuntFieldWorkV112(source));
  const restored = field.solveHuntFieldWorkRigV112(JSON.parse(JSON.stringify(base)), field.describeHuntFieldWorkV112(JSON.parse(JSON.stringify(source))));
  assert.deepEqual(first, restored);
});

test('tool admission refuses distant small bodies and keeps real contact at both facings and three hunter scales', () => {
  let accepted = 0, refused = 0;
  for (const facing of [-1, 1]) for (const height of [84.48, 116, 153.6]) for (const width of [30, 70, 120]) {
    const player = freeze({ x: 300, y: 624 - height, width: 76, height, grounded: true, climbing: false });
    const nearSite = freeze({ player, corpse: { x: 338 + facing * 30, y: 624, width, height: 40 } });
    assert.equal(field.huntFieldWorkReachableV112(nearSite), true); accepted++;
    const farSite = freeze({ player, corpse: { x: 338 + facing * 88, y: 624, width: 30, height: 40 } });
    assert.equal(field.huntFieldWorkReachableV112(farSite), false); refused++;
    for (const distance of [30, 40, 50, 60, 70, 80, 88]) {
      const site = { player, corpse: { x: 338 + facing * distance, y: 624, width, height: 40 } };
      if (!field.huntFieldWorkReachableV112(site)) continue;
      // Independently replay actual operations at many clock samples. Every
      // admitted work stroke must touch with the real 13 px tool at all times.
      for (const action of ['flay', 'harvest-hide', 'harvest-tissue', 'harvest-bone']) for (const progress of [.13, .25, .43, .6, .78, .91]) {
        const work = field.describeHuntFieldWorkV112({ ...site, action, elapsed: 5.28 * progress, duration: 5.28 });
        const frame = field.solveHuntFieldWorkRigV112({ pose: 'idle', phase: 0, facing,
          worldX: 338 - 128, worldY: 624 - 366, scale: height / 384 }, work);
        assert.ok(Math.hypot(frame.anchors.handGrip.x - work.workPoint.x, frame.anchors.handGrip.y - work.workPoint.y) <= field.HUNT_FIELD_TOOL_LENGTH_V112,
          `No off-body work: facing ${facing}, height ${height}, corpse ${width}, distance ${distance}, progress ${progress}`);
      }
    }
  }
  assert.equal(accepted, 18); assert.equal(refused, 18);
});

test('tool contact check follows an actually moved body and does not override physical appui rules', () => {
  const source = input();
  assert.equal(field.huntFieldWorkReachableV112({ player: source.player, corpse: { x: 356, y: 624, width: 70, height: 40 } }), true);
  assert.equal(field.huntFieldWorkReachableV112({ player: source.player, corpse: { x: 420, y: 624, width: 70, height: 40 } }), false);
  assert.equal(field.huntFieldWorkReachableV112({ player: { ...source.player, grounded: false }, corpse: source.corpse }), false);
  assert.equal(field.huntFieldWorkReachableV112({ player: { ...source.player, climbing: true }, corpse: source.corpse }), false);
});

test('prepared-body parts come only from the species catalogue and its exact corpse harvest identities', () => {
  const corpse = { id: 'corpse-one', sourceEnemyId: 'oseris-iv--thunder-macaque', x: 370, y: 624, flayed: true };
  const presentation = field.describePreparedCorpseV112(freeze(corpse), ['harvest-hide:another-corpse', 'harvest-bone:corpse-one']);
  assert.equal(presentation.parts.length, 2);
  assert.equal(presentation.parts.find(part => part.action === 'harvest-hide').harvested, false);
  assert.equal(presentation.parts.find(part => part.action === 'harvest-bone').harvested, true);
  assert.equal(field.describePreparedCorpseV112({ ...corpse, sourceEnemyId: 'unknown-human' }, []).parts.length, 0);
  const xeno = field.describePreparedCorpseV112({ ...corpse, sourceEnemyId: 'xeno-drone' }, []);
  assert.equal(xeno.parts.length, 1); assert.equal(xeno.parts[0].action, 'harvest-bone');
});

const zone = freeze({ id: 'real-vine', x: 300, y: 100, width: 50, height: 340, kind: 'vine', routeId: 'canopy',
  climbSpeedMultiplier: 1, staminaPerSecond: 4, dismounts: [] });
test('drawn flexible grip is the physics grip at every valid pendulum angle and length', () => {
  for (const angle of [-1.2, -.5, 0, .7, 1.2]) for (const length of [70, 200, 340]) {
    const swing = freeze({ supportId: zone.id, length, angle, angularVelocity: .5 });
    const geometry = canopy.canopyStrandGeometryV112(zone, swing), expected = physics.canopySwingPointV112(swing, zone);
    assert.equal(geometry.active, true); near(geometry.grip.x, expected.x); near(geometry.grip.y, expected.y);
    near(Math.hypot(geometry.grip.x - geometry.anchor.x, geometry.grip.y - geometry.anchor.y), length);
  }
});

test('stale or invalid suspended state never draws a false moved support; rigid geometry is left to its own renderer', () => {
  const resting = canopy.canopyStrandGeometryV112(zone, null);
  assert.equal(resting.active, false); near(resting.grip.x, 325); near(resting.grip.y, 440);
  for (const bad of [{ supportId: 'other', length: 200, angle: .5, angularVelocity: 1 },
    { supportId: zone.id, length: 1000, angle: .5, angularVelocity: 1 },
    { supportId: zone.id, length: 200, angle: NaN, angularVelocity: 1 }]) {
    assert.deepEqual(canopy.canopyStrandGeometryV112(zone, bad), resting);
  }
  assert.equal(canopy.canopyStrandGeometryV112({ ...zone, kind: 'tree' }, null), null);
  assert.equal(canopy.canopyStrandGeometryV112({ ...zone, kind: 'ladder' }, null), null);
  assert.equal(canopy.canopyStrandGeometryV112({ ...zone, height: NaN }, null), null);
});
