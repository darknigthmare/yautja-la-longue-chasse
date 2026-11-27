import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesMapV1";
export * from "./app/game/isles/islesMovementV1";
export * from "./app/game/isles/islesCameraV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const isles = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const tuning = JSON.parse(await readFile('app/game/data/islesTuningV1.json', 'utf8'));
const testSource = JSON.parse(await readFile('app/game/data/islesMapTestV1.json', 'utf8'));
const verdantSource = JSON.parse(await readFile('app/game/data/islesMapVerdantV1.json', 'utf8'));
const map = isles.parseIslesMapV1(testSource, tuning.tileMeters);
const M = tuning.movement, C = tuning.cloak;
const DT = 1 / 60;

function run(actor, input, seconds, onStep) {
  let current = actor; const events = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const result = isles.stepIslesActorV1(current, input, map, M, C, DT);
    current = result.actor; events.push(...result.events);
    if (onStep?.(current)) break;
  }
  return {actor: current, events};
}
const at = (tx, tz) => isles.createIslesActorV1(map, (tx + .5) * 2, (tz + .5) * 2, C);
const move = (x, z, extra = {}) => ({...isles.NO_MOVE_INPUT_V1, moveX: x, moveZ: z, ...extra});

test('both prototype maps parse, with every marker on dry ground', () => {
  for (const source of [testSource, verdantSource]) {
    const parsed = isles.parseIslesMapV1(source, 2);
    for (const [name, points] of Object.entries(parsed.markers)) {
      for (const [x, z] of points) assert.ok(isles.isWalkableV1(parsed, x, z), name + ' ' + x + ',' + z + ' est praticable');
    }
  }
  assert.throws(() => isles.parseIslesMapV1({...testSource, rows: ['..', '...']}), /longueur/);
  assert.throws(() => isles.parseIslesMapV1({...testSource, rows: ['?']}), /inconnu/);
});

test('the hunter walks, then runs faster, and stops at the ARGOS cordon at the map edge', () => {
  const walk = run(at(24, 27), move(1, 0), 1).actor;
  const sprint = run(at(24, 27), move(1, 0, {run: true}), 1).actor;
  assert.ok(sprint.x - at(24, 27).x > (walk.x - at(24, 27).x) * 1.6, 'la course va presque deux fois plus vite');
  const swim = run(at(24, 45), move(0, 1, {run: true}), 20).actor;
  assert.ok(swim.z <= map.depth * 2 - M.radius + 1e-9, 'impossible de sortir de la carte, même à la nage');
});

test('a jump leaves the ground and lands back on it', () => {
  const {actor, events} = run(at(24, 27), move(0, 0, {jump: true}), 0.02);
  assert.ok(events.includes('jump') && !actor.grounded && actor.vy > 0);
  const landed = run(actor, move(0, 0), 1.5);
  assert.ok(landed.actor.grounded && Math.abs(landed.actor.y) < 1e-6 && landed.events.includes('land'));
});

test('pushing into the cliff climbs it and stands on the plateau; letting go falls back', () => {
  // Rock plateau (3 m) begins east of tile 28 on row 14.
  const start = at(27, 15);
  const {actor, events} = run(start, move(1, 0), 6, a => a.grounded && a.y > 2.9 && !a.climbing);
  assert.ok(events.includes('climb-start') && events.includes('climb-end'), events.join(','));
  assert.equal(actor.y, 3);
  const midClimb = run(start, move(1, 0), 1.2, a => a.climbing && a.y > 1).actor;
  assert.ok(midClimb.climbing);
  const fall = run(midClimb, move(0, 0), 1.5).actor;
  assert.ok(!fall.climbing && fall.y < 1e-6, 'lâcher la paroi fait tomber');
});

test('trees are climbable and their canopy is a walkable level', () => {
  // Tree block around 15,31 (7 m).
  const {actor} = run(at(15, 25), move(0, 1), 12, a => a.y >= 7 && a.grounded);
  assert.equal(actor.y, 7);
  const walked = run(actor, move(0, 1), 0.3).actor;
  assert.ok(walked.y === 7 || !walked.grounded, 'marcher sur la canopée ou en tomber au bord');
});

test('deep water makes the hunter swim, slower, and reveals the cloak', () => {
  let hunter = at(24, 42);
  hunter = run(hunter, move(0, 0, {cloak: true}), DT).actor;
  assert.ok(hunter.cloaked);
  const {actor, events} = run(hunter, move(0, 1), 6, a => a.swimming);
  assert.ok(actor.swimming && events.includes('revealed') && !actor.cloaked);
  const retry = run(actor, move(0, 0, {cloak: true}), DT).actor;
  assert.ok(!retry.cloaked, 'pas de camouflage dans l’eau');
  const speed = run(actor, move(0, 1, {run: true}), 1).actor;
  assert.ok(Math.hypot(speed.vx, speed.vz) <= M.swimSpeed + 1e-6);
});

test('the cloak drains faster at a run and switches off when empty, then recharges', () => {
  const on = run(at(24, 27), move(0, 0, {cloak: true}), DT).actor;
  const still = run(on, move(0, 0), 2).actor;
  const running = run(on, move(1, 0, {run: true}), 2).actor;
  assert.ok(running.cloakEnergy < still.cloakEnergy);
  const empty = run(on, move(0, 0), C.capacity / C.drainPerSecond + 1);
  assert.ok(!empty.actor.cloaked && empty.events.includes('cloak-off'));
  assert.ok(run(empty.actor, move(0, 0), 3).actor.cloakEnergy > 20);
});

test('screen directions map to the ground for every quarter turn', () => {
  for (let r = 0; r < 4; r++) {
    const b = isles.viewBasisV1(r, tuning.camera);
    const up = isles.screenToWorldMoveV1(0, 1, b), right = isles.screenToWorldMoveV1(1, 0, b);
    assert.ok(Math.abs(up.x * right.x + up.z * right.z) < 1e-9, 'haut et droite orthogonaux');
    assert.ok(up.x * b.toCamera.x + up.z * b.toCamera.z < 0, 'haut s’éloigne de la caméra');
    const dot = b.toCamera.x * b.screenUp.x + b.toCamera.y * b.screenUp.y + b.toCamera.z * b.screenUp.z;
    assert.ok(Math.abs(dot) < 1e-9);
  }
  assert.ok(Math.abs(isles.viewBasisV1(0, tuning.camera).toCamera.y - Math.sin(35 * Math.PI / 180)) < 1e-9);
});

test('the camera leads the run and settles back when the hunter stops', () => {
  let lead = {x: 0, z: 0};
  for (let i = 0; i < 120; i++) lead = isles.stepCameraLeadV1(lead, {x: 8.6, z: 0}, true, tuning.camera, DT);
  assert.ok(lead.x > 3 && lead.x <= tuning.camera.leadMax + 1e-9);
  for (let i = 0; i < 240; i++) lead = isles.stepCameraLeadV1(lead, {x: 0, z: 0}, false, tuning.camera, DT);
  assert.ok(Math.abs(lead.x) < 0.1);
});

test('camera test: no position on the test island leaves the hunter behind decor without cut-away', () => {
  let checked = 0;
  for (let r = 0; r < 4; r++) {
    const basis = isles.viewBasisV1(r, tuning.camera);
    for (let tz = 0; tz < map.depth; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const kind = isles.kindAtV1(map, tx, tz);
        if (kind === 'water') continue;
        // Standing on the tile (ground, roof, canopy) and pressed against each side of it.
        const y = Math.max(0, isles.heightAtV1(map, tx, tz));
        for (const [ox, oz] of [[.5, .5], [M.radius, .5], [2 - M.radius, .5], [.5, M.radius], [.5, 2 - M.radius]]) {
          const feet = {x: tx * 2 + (ox === .5 ? 1 : ox), y, z: tz * 2 + (oz === .5 ? 1 : oz)};
          const left = isles.uncutOccludersV1(map, feet, M.radius, basis, tuning.camera);
          assert.equal(left.length, 0, `rotation ${r}, tuile ${tx},${tz} : ${JSON.stringify(left[0])}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 4 * 1000);
});

test('the cut-away keeps the ground at the feet and what lies behind the hunter', () => {
  const basis = isles.viewBasisV1(0, tuning.camera);
  const feet = {x: 10, y: 0, z: 10};
  const toward = (d, y) => ({x: feet.x + basis.toCamera.x * d / Math.cos(basis.pitch), y, z: feet.z + basis.toCamera.z * d / Math.cos(basis.pitch)});
  assert.equal(isles.cutawayHidesV1(toward(1.5, 0), feet, basis, tuning.camera), false, 'le sol devant les pieds reste');
  assert.equal(isles.cutawayHidesV1(toward(1.5, 2), feet, basis, tuning.camera), true, 'un mur devant le chasseur s’ouvre');
  assert.equal(isles.cutawayHidesV1(toward(-1.5, 1.5), feet, basis, tuning.camera), false, 'un mur derrière reste plein');
  assert.equal(isles.cutawayHidesV1({x: feet.x + basis.right.x * 6, y: 2, z: feet.z + basis.right.z * 6}, feet, basis, tuning.camera), false,
    'loin sur le côté, le décor reste plein');
});
