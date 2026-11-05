import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const { MISSIONS } = qa.load('app/game/data.ts');
const { planetArrivalLanding, PLANET_ARRIVAL_SHOTS } = qa.load('app/game/systems/planetArrival.ts');
const { ARRIVAL_SPRITES } = qa.load('app/game/systems/planetArrivalArt.ts');
const { arrivalGroundCamera, attachmentToStage } = qa.load('app/game/systems/planetArrivalSpatial.ts');
const {
  ARRIVAL_HUNTER_CYCLE_MS, ARRIVAL_HUNTER_MOVE_START_MS, ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS,
  ARRIVAL_HUNTER_GROUND_CONTACT_MS, ARRIVAL_HUNTER_MOVE_END_MS,
  arrivalHunterMotion, arrivalHunterEgress, arrivalLighting, arrivalLocalLightAngle,
  arrivalImpactDebris, arrivalEffectsFrame, ARRIVAL_CONTACT_MS,
} = qa.load('app/game/systems/planetArrivalPresentation.ts');
const near = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `Expected ${actual} ≈ ${expected} (±${tolerance})`);

function geometryFor(missionId) {
  const landing = planetArrivalLanding({ missionId });
  const art = ARRIVAL_SPRITES.podGround;
  const height = landing.capsuleWidth * art.height / art.width;
  return {
    threshold: {
      x: landing.capsuleX + (art.threshold.x - art.foot.x) * landing.capsuleWidth,
      y: landing.floorY + (art.threshold.y - art.foot.y) * height,
    },
    floorY: landing.floorY,
    clearanceX: landing.capsuleX + landing.capsuleWidth * .42,
    destinationX: landing.spawnX + landing.hunterWidth / 2,
  };
}

test('all eight destinations use the raised physical threshold before reaching the unchanged hunt spawn', () => {
  assert.equal(MISSIONS.length, 8);
  for (const mission of MISSIONS) {
    const geometry = geometryFor(mission.id);
    assert.ok(geometry.threshold.y < geometry.floorY, mission.id);
    near(geometry.floorY - geometry.threshold.y, 40);
    const cabin = arrivalHunterEgress(ARRIVAL_HUNTER_MOVE_START_MS + 100, geometry);
    assert.equal(cabin.stage, 'cabin');
    assert.equal(cabin.contact, 'threshold');
    near(cabin.y, geometry.threshold.y);
    assert.ok(cabin.opacity > 0 && cabin.scale < 1);
    const final = arrivalHunterEgress(ARRIVAL_HUNTER_MOVE_END_MS, geometry);
    near(final.x, geometry.destinationX); near(final.y, geometry.floorY);
    near(final.scale, 1);
    assert.equal(final.stage, 'standing');
    assert.equal(final.speed, 0);
  }
});

test('the hunter clears the opening after the hatch and drops continuously before walking', () => {
  const egress = PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'egress');
  const hatchClearedMs = egress.startMs + (egress.endMs - egress.startMs) * .28;
  assert.ok(ARRIVAL_HUNTER_MOVE_START_MS > hatchClearedMs);
  for (const mission of MISSIONS) {
    const geometry = geometryFor(mission.id);
    let previous = arrivalHunterEgress(ARRIVAL_HUNTER_MOVE_START_MS, geometry);
    for (let time = ARRIVAL_HUNTER_MOVE_START_MS + 10; time <= ARRIVAL_HUNTER_MOVE_END_MS; time += 10) {
      const current = arrivalHunterEgress(time, geometry);
      assert.ok(current.x >= previous.x, `${mission.id}: backwards movement at ${time}`);
      assert.ok(current.x <= geometry.destinationX + 1e-8);
      assert.ok(current.y >= geometry.threshold.y && current.y <= geometry.floorY);
      assert.ok(current.scale >= previous.scale && current.scale <= 1);
      if (time < ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS) near(current.y, geometry.threshold.y);
      if (time >= ARRIVAL_HUNTER_GROUND_CONTACT_MS) near(current.y, geometry.floorY);
      if (time > ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS && time < ARRIVAL_HUNTER_GROUND_CONTACT_MS) {
        assert.equal(current.contact, 'airborne');
        assert.ok(current.y > previous.y);
        assert.equal(current.walking, false);
      }
      previous = current;
    }
    const firstGround = arrivalHunterEgress(ARRIVAL_HUNTER_GROUND_CONTACT_MS, geometry);
    near(firstGround.x, geometry.clearanceX);
    near(firstGround.y, geometry.floorY);
    near(firstGround.phase, 0);
  }
});

test('threshold departure, ground arrival and final rest preserve position without a horizontal velocity jump', () => {
  const geometry = geometryFor('jungle-vey');
  const deltaMs = .001;
  for (const boundary of [ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS, ARRIVAL_HUNTER_GROUND_CONTACT_MS, ARRIVAL_HUNTER_MOVE_END_MS]) {
    const before = arrivalHunterEgress(boundary - deltaMs, geometry);
    const at = arrivalHunterEgress(boundary, geometry);
    const after = arrivalHunterEgress(boundary + deltaMs, geometry);
    assert.ok(Math.abs(before.x - after.x) < .001);
    assert.ok(Math.abs(before.y - after.y) < .001);
    const incoming = (at.x - before.x) / deltaMs;
    const outgoing = (after.x - at.x) / deltaMs;
    near(incoming, outgoing, .00001);
  }
});

test('walking displacement and rig phase close together on the last planted half-stride', () => {
  const geometry = geometryFor('jungle-vey');
  const grounded = arrivalHunterEgress(ARRIVAL_HUNTER_GROUND_CONTACT_MS, geometry);
  const destination = arrivalHunterEgress(ARRIVAL_HUNTER_MOVE_END_MS, geometry);
  for (let time = ARRIVAL_HUNTER_GROUND_CONTACT_MS; time <= ARRIVAL_HUNTER_MOVE_END_MS; time += 25) {
    const current = arrivalHunterEgress(time, geometry);
    near((current.x - grounded.x) / (destination.x - grounded.x), current.phase / 2.5);
    assert.ok(current.speed >= 0);
  }
  for (let time = ARRIVAL_HUNTER_GROUND_CONTACT_MS; time < ARRIVAL_HUNTER_MOVE_END_MS; time += ARRIVAL_HUNTER_CYCLE_MS / 2) {
    const frame = arrivalHunterMotion(time);
    near(frame.phase * 2, Math.round(frame.phase * 2));
    assert.ok(frame.walking);
  }
  near(destination.phase, 2.5);
  for (const time of [ARRIVAL_HUNTER_MOVE_END_MS, 61_700, 62_000]) {
    const rest = arrivalHunterEgress(time, geometry);
    near(rest.x, destination.x); near(rest.y, destination.y);
    assert.equal(rest.speed, 0); assert.equal(rest.pose, 'idle');
  }
});

test('the aperture reveals the foreground continuously while the actor leaves its raised threshold', () => {
  const atStart = arrivalHunterMotion(ARRIVAL_HUNTER_MOVE_START_MS);
  near(atStart.portalReveal, 0);
  assert.equal(atStart.opacity, 0);
  let previous = 0;
  for (let time = ARRIVAL_HUNTER_MOVE_START_MS; time <= ARRIVAL_HUNTER_GROUND_CONTACT_MS; time += 10) {
    const frame = arrivalHunterMotion(time);
    assert.ok(frame.portalReveal >= previous && frame.portalReveal <= 1);
    previous = frame.portalReveal;
  }
  near(arrivalHunterMotion(ARRIVAL_HUNTER_GROUND_CONTACT_MS).portalReveal, 1);
});

test('the shared reveal camera keeps the raised threshold and feet in the same coordinate frame', () => {
  for (const mission of MISSIONS) {
    const geometry = geometryFor(mission.id);
    for (const reveal of [0, .25, .5, .75, 1]) {
      const camera = arrivalGroundCamera(reveal, geometry.floorY);
      const threshold = attachmentToStage(camera, geometry.threshold.x, geometry.threshold.y);
      const floor = attachmentToStage(camera, 0, geometry.floorY);
      for (const time of [58_600, 59_000, 60_600, ARRIVAL_HUNTER_MOVE_END_MS]) {
        const pose = arrivalHunterEgress(time, geometry);
        const feet = attachmentToStage(camera, pose.x, pose.y);
        assert.ok(feet.y >= threshold.y - 1e-8 && feet.y <= floor.y + 1e-8);
        if (pose.contact === 'threshold') near(feet.y, threshold.y);
        if (pose.contact === 'ground') near(feet.y, floor.y);
      }
    }
  }
});

test('reduced motion uses one planted final tableau and never starts a walking clock', () => {
  const geometry = geometryFor('jungle-vey');
  for (const time of [57_000, 58_500, 59_000, 59_300, 60_600, 61_250, 62_000]) {
    const frame = arrivalHunterEgress(time, geometry, true);
    near(frame.x, geometry.destinationX); near(frame.y, geometry.floorY);
    near(frame.scale, 1); near(frame.opacity, 1);
    assert.equal(frame.contact, 'ground'); assert.equal(frame.stage, 'standing');
    assert.equal(frame.walking, false); assert.equal(frame.speed, 0); assert.equal(frame.phase, 0);
    near(frame.portalReveal, 1);
  }
  assert.equal(arrivalHunterEgress(56_999, geometry, true).opacity, 0);
});

test('non-finite time cannot produce an invalid actor transform or trigger a late movement', () => {
  const geometry = geometryFor('jungle-vey');
  for (const time of [NaN, Infinity, -Infinity, -1]) {
    const frame = arrivalHunterEgress(time, geometry);
    for (const key of ['x', 'y', 'scale', 'phase', 'opacity', 'speed']) assert.ok(Number.isFinite(frame[key]));
    assert.equal(frame.stage, 'hidden');
  }
});

test('local light directions recover the same world source after hull rotation and reflection', () => {
  for (const mirrored of [false, true]) for (const rotation of [-170, -45, 0, 67, 160]) for (const world of [-133, -20, 32, 100]) {
    const local = arrivalLocalLightAngle(world, rotation, mirrored) * Math.PI / 180;
    const x = Math.cos(local) * (mirrored ? -1 : 1), y = Math.sin(local);
    const angle = rotation * Math.PI / 180;
    near(x * Math.cos(angle) - y * Math.sin(angle), Math.cos(world * Math.PI / 180));
    near(x * Math.sin(angle) + y * Math.cos(angle), Math.sin(world * Math.PI / 180));
  }
  for (const mission of MISSIONS) {
    assert.equal(arrivalLighting(mission.biome, 'landing', 54_000).environment, 'surface');
    assert.equal(arrivalLighting(mission.biome, 'atmosphere', 44_000).environment, 'atmosphere');
    assert.equal(arrivalLighting(mission.biome, 'carrier', 19_000).environment, 'space');
  }
});

test('every impact fragment settles at its reported sound event and remains on the ground', () => {
  for (const seed of [0, 1, 42]) {
    const pieces = arrivalImpactDebris(0, seed);
    assert.equal(pieces.length, 9);
    for (const piece of pieces) {
      const before = arrivalImpactDebris(piece.settleAgeMs - 1, seed)[piece.id];
      const at = arrivalImpactDebris(piece.settleAgeMs, seed)[piece.id];
      const after = arrivalImpactDebris(piece.settleAgeMs + 1, seed)[piece.id];
      assert.ok(before.y < 0);
      near(at.y, 0); near(after.y, 0);
      near(at.x, after.x); near(at.angle, after.angle);
    }
  }
  assert.deepEqual(arrivalImpactDebris(500, 1, true), []);
  assert.equal(arrivalEffectsFrame(ARRIVAL_CONTACT_MS + 130, true).impactLight, 0);
  assert.equal(arrivalEffectsFrame(ARRIVAL_CONTACT_MS + 130, true).shockOpacity, 0);
});
