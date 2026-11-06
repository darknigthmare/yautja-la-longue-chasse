import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const { ARRIVAL_STAGE, fitArrivalStage, arrivalGroundCamera, attachmentToStage, arrivalFlightPose, arrivalCarrierPose } = qa.load('app/game/systems/planetArrivalSpatial.ts');
const { arrivalInsertionShipPose, arrivalFormationFlightPose, arrivalShipGroundPose, arrivalSurfaceShipGeometry } = qa.load('app/game/systems/planetArrivalSpatial.ts');
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `Expected ${actual} ≈ ${expected} (±${tolerance}).`);
const nearPose = (actual, expected, tolerance) => {
  for (const key of ['x', 'y', 'angle', 'scale']) near(actual[key], expected[key], tolerance);
};

test('the complete 1280×720 plane remains centered and uniformly scaled in portrait, tablet and widescreen viewports', () => {
  for (const [width, height] of [[1280, 720], [1322, 660], [320, 236], [390, 293], [760, 394.25], [2560, 720]]) {
    const fit = fitArrivalStage(width, height);
    const right = fit.left + ARRIVAL_STAGE.width * fit.scale;
    const bottom = fit.top + ARRIVAL_STAGE.height * fit.scale;
    assert.ok(fit.scale > 0 && fit.left >= -1e-9 && fit.top >= -1e-9);
    assert.ok(right <= width + 1e-9 && bottom <= height + 1e-9, 'Contain must preserve every scene edge.');
    near(width - right, fit.left);
    near(height - bottom, fit.top);
    near((right - fit.left) / (bottom - fit.top), 16 / 9);
    near(Math.min(fit.left, fit.top), 0);
  }
});

test('an unmeasured or invalid viewport cannot create infinite CSS transforms', () => {
  for (const dimensions of [[0, 236], [390, 0], [-1, 10], [NaN, 720], [1280, Infinity], [Infinity, Infinity]]) {
    assert.deepEqual(fitArrivalStage(...dimensions), { scale: 0, left: 0, top: 0 });
  }
});

test('the shared ground camera never reveals pixels outside the available backdrop', () => {
  for (const reveal of [0, .1, .25, .5, .75, .9, 1]) {
    const camera = arrivalGroundCamera(reveal);
    const topLeft = attachmentToStage(camera, 0, 0);
    const bottomRight = attachmentToStage(camera, ARRIVAL_STAGE.width, ARRIVAL_STAGE.height);
    assert.ok(topLeft.x <= 0 && topLeft.y <= 0);
    assert.ok(bottomRight.x >= ARRIVAL_STAGE.width && bottomRight.y >= ARRIVAL_STAGE.height);
    // The actual image rectangle, after the outer viewport fit, covers the
    // active film plane; intentional letterbox margins remain outside it.
    for (const [width, height] of [[1322, 660], [320, 236], [390, 293], [2560, 720]]) {
      const fit = fitArrivalStage(width, height);
      assert.ok(fit.left + topLeft.x * fit.scale <= fit.left + 1e-8);
      assert.ok(fit.top + topLeft.y * fit.scale <= fit.top + 1e-8);
      assert.ok(fit.left + bottomRight.x * fit.scale >= fit.left + ARRIVAL_STAGE.width * fit.scale - 1e-8);
      assert.ok(fit.top + bottomRight.y * fit.scale >= fit.top + ARRIVAL_STAGE.height * fit.scale - 1e-8);
    }
  }
});

test('all eight real landing points and actor feet stay on the same projected floor throughout the camera reveal', () => {
  const { MISSIONS } = qa.load('app/game/data.ts');
  const { planetArrivalLanding } = qa.load('app/game/systems/planetArrival.ts');
  assert.equal(MISSIONS.length, 8);
  for (const mission of MISSIONS) {
    const landing = planetArrivalLanding({ missionId: mission.id });
    for (const reveal of [0, .2, .4, .6, .8, 1]) {
      const camera = arrivalGroundCamera(reveal, landing.floorY);
      for (const x of [landing.capsuleX, landing.spawnX + landing.hunterWidth / 2]) {
        const foot = attachmentToStage(camera, x, landing.floorY);
        near(foot.y, landing.floorY);
        assert.ok(foot.x >= 0 && foot.x <= ARRIVAL_STAGE.width, 'The capsule and hunter remain inside the film plane.');
        for (const [width, height] of [[1280, 720], [320, 236], [390, 293]]) {
          const fit = fitArrivalStage(width, height);
          near(fit.top + foot.y * fit.scale, fit.top + landing.floorY * fit.scale);
        }
      }
    }
  }
});

test('camera reveal finishes at the unchanged gameplay coordinate frame', () => {
  assert.deepEqual(arrivalGroundCamera(1), { x: 0, y: 0, angle: 0, scale: 1 });
  assert.deepEqual(arrivalGroundCamera(2), arrivalGroundCamera(1));
  assert.deepEqual(arrivalGroundCamera(-1), arrivalGroundCamera(0));
  assert.deepEqual(arrivalGroundCamera(NaN), arrivalGroundCamera(0));
  const point = { x: 261, y: 624 };
  assert.deepEqual(attachmentToStage(arrivalGroundCamera(1), point.x, point.y), point);
});

test('pod nose follows the observed path tangent throughout all three flight shots', () => {
  const epsilon = 1e-5;
  for (const shot of ['release', 'descent', 'atmosphere']) {
    for (const p of [.001, .1, .25, .5, .75, .9, .999]) {
      const pose = arrivalFlightPose(shot, p);
      const before = arrivalFlightPose(shot, p - epsilon);
      const after = arrivalFlightPose(shot, p + epsilon);
      const dx = after.x - before.x, dy = after.y - before.y;
      assert.ok(dx > 0 && dy > 0, `${shot} must preserve the down/right screen direction.`);
      near(pose.angle, Math.atan2(dy, dx) * 180 / Math.PI, 1e-6);
      const nose = attachmentToStage(pose, 30, 0);
      const rear = attachmentToStage(pose, -30, 0);
      assert.ok((nose.x - rear.x) * dx + (nose.y - rear.y) * dy > 0, 'The nose, not the exhaust, leads the trajectory.');
      for (const [width, height] of [[1280, 720], [320, 236]]) {
        const fit = fitArrivalStage(width, height);
        near(Math.atan2(dy * fit.scale, dx * fit.scale) * 180 / Math.PI, pose.angle, 1e-6);
      }
    }
  }
});

test('the release/descent boundary preserves position, heading, scale and velocity in real seconds', () => {
  nearPose(arrivalFlightPose('release', 1), arrivalFlightPose('descent', 0));
  const seconds = .0001;
  const before = arrivalFlightPose('release', 1 - seconds / 8);
  const join = arrivalFlightPose('release', 1);
  const after = arrivalFlightPose('descent', seconds / 10);
  for (const key of ['x', 'y', 'angle', 'scale']) {
    near((join[key] - before[key]) / seconds, (after[key] - join[key]) / seconds, .0005);
  }
});

test('a real carrier socket relocates launch without changing its initial heading or breaking the later shot boundary', () => {
  const origin = { x: 664, y: 346 };
  const first = arrivalFlightPose('release', 0, origin);
  near(first.x, origin.x); near(first.y, origin.y);
  near(first.angle, arrivalFlightPose('release', 0).angle);
  nearPose(arrivalFlightPose('release', 1, origin), arrivalFlightPose('descent', 0, origin));
  nearPose(arrivalFlightPose('descent', 1, origin), arrivalFlightPose('descent', 1));
});

test('the carrier passes continuously from approach to departure and clears the frame before disappearance', () => {
  nearPose(arrivalCarrierPose('carrier', 1), arrivalCarrierPose('release', 0));
  const seconds = .0001;
  const before = arrivalCarrierPose('carrier', 1 - seconds / 10);
  const join = arrivalCarrierPose('carrier', 1);
  const after = arrivalCarrierPose('release', seconds / 8);
  for (const key of ['x', 'y', 'scale']) {
    near((join[key] - before[key]) / seconds, (after[key] - join[key]) / seconds, .005);
  }
  const last = arrivalCarrierPose('release', 1);
  // An unrotated 600×400 local art box bounds all arrival hull renderers.
  // Its circumscribed radius also bounds every possible rotation of that box.
  assert.ok(last.x - Math.hypot(600, 400) * last.scale / 2 > ARRIVAL_STAGE.width);
});

test('local effect sockets share the sprite pivot, rotation and depth scaling', () => {
  const pose = { x: 400, y: 250, angle: 90, scale: 2 };
  assert.deepEqual(attachmentToStage(pose, 0, 0), { x: 400, y: 250 });
  const rear = attachmentToStage(pose, -30, 0);
  near(rear.x, 400); near(rear.y, 190);
  const side = attachmentToStage(pose, 0, 10);
  near(side.x, 380); near(side.y, 250);
  for (const shot of ['release', 'descent', 'atmosphere']) {
    for (const p of [0, .25, .5, .75, 1]) {
      const moving = arrivalFlightPose(shot, p);
      const point = attachmentToStage(moving, -30, 4);
      near(Math.hypot(point.x - moving.x, point.y - moving.y), Math.hypot(30, 4) * moving.scale);
    }
  }
});

test('bounded progress and invalid inputs cannot introduce off-timeline positions', () => {
  for (const shot of ['release', 'descent', 'atmosphere']) {
    for (const p of [-10, NaN, Infinity, -Infinity]) nearPose(arrivalFlightPose(shot, p), arrivalFlightPose(shot, 0));
    nearPose(arrivalFlightPose(shot, 10), arrivalFlightPose(shot, 1));
  }
  nearPose(arrivalFlightPose('release', .5, { x: NaN, y: Infinity }), arrivalFlightPose('release', .5));
});

test('every registered hull resolves the inspected dimensions and pivots of its actual catalogue source', () => {
  const { SHIP_IDS, shipProfileAssetPath } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  const audit = JSON.parse(readFileSync(new URL('./fixtures/planet-arrival-art-calibration.json', import.meta.url), 'utf8'));
  const profiles = new Map(audit.shipProfiles.map(profile => [profile.path, profile]));
  assert.equal(profiles.size, audit.shipProfiles.length, 'Inspected source paths must be unique.');
  for (const id of SHIP_IDS) {
    const sourcePath = shipProfileAssetPath(id);
    const art = carrierArtForShip(id);
    const inspected = profiles.get(sourcePath);
    assert.ok(inspected, `${id}: actual selected source ${sourcePath} needs an inspected calibration.`);
    assert.equal(art.review, 'inspected-source-art', id);
    assert.equal(art.width, inspected.width, `${id}: native width`);
    assert.equal(art.height, inspected.height, `${id}: native height`);
    assert.equal(art.directionBasis, inspected.directionBasis, id);
    assert.ok(art.width > 0 && art.height > 0);
    for (const point of ['nose', 'tail', 'release']) {
      for (const axis of ['x', 'y']) {
        assert.ok(art[point][axis] >= 0 && art[point][axis] <= 1, `${id}.${point}.${axis}`);
        near(art[point][axis], inspected[point][axis]);
      }
    }
    assert.ok(Math.hypot(art.nose.x - art.tail.x, art.nose.y - art.tail.y) > .1, `${id}: forward axis must have an observable length.`);
  }
  // The rejected V14 Game Preserve study was inspected too, but must not
  // replace the separately registered catalogue artwork by accident.
  assert.equal(shipProfileAssetPath('game-preserve-ship'), '/game/ships/v12/game-preserve-ship.webp');
});

test('every transformed hull socket produces a forward-only downward pod path with a correctly oriented carrier', () => {
  const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  for (const id of SHIP_IDS) {
    const art = carrierArtForShip(id);
    const facing = art.nose.x < art.tail.x ? -1 : 1;
    const width = 550, height = width * art.height / art.width;
    const heading = Math.atan2((art.nose.y - art.tail.y) * art.height,
      (art.nose.x - art.tail.x) * art.width * facing) * 180 / Math.PI;
    const carrier = arrivalCarrierPose('release', 0);
    const sourcePose = { ...carrier, angle: carrier.angle - heading };
    const project = point => attachmentToStage(sourcePose, (point.x - .5) * width * facing, (point.y - .5) * height);
    const nose = project(art.nose), tail = project(art.tail), origin = project(art.release);
    near(Math.atan2(nose.y - tail.y, nose.x - tail.x) * 180 / Math.PI, carrier.angle);
    let previous = arrivalFlightPose('release', 0, origin);
    near(previous.x, origin.x); near(previous.y, origin.y);
    // Sample the actual elapsed seconds, including the 8-second split. This
    // catches a valid-looking socket whose offset makes the cubic double back.
    for (let step = 1; step <= 180; step++) {
      const seconds = step / 10;
      const pose = arrivalFlightPose(seconds <= 8 ? 'release' : 'descent', seconds <= 8 ? seconds / 8 : (seconds - 8) / 10, origin);
      assert.ok(pose.x > previous.x && pose.y > previous.y, `${id}: path reverses at ${seconds}s.`);
      assert.ok(pose.angle > 0 && pose.angle < 90, `${id}: nose must keep pointing down/right.`);
      previous = pose;
    }
    nearPose(arrivalFlightPose('release', 1, origin), arrivalFlightPose('descent', 0, origin));
  }
});

test('all eight campaign globes use their inspected disk bounds without including the surrounding opaque plate', () => {
  const { MISSIONS } = qa.load('app/game/data.ts');
  const { planetArrivalDestination } = qa.load('app/game/systems/planetArrival.ts');
  const { planetArtForDestination } = qa.load('app/game/systems/planetArrivalArt.ts');
  const audit = JSON.parse(readFileSync(new URL('./fixtures/planet-arrival-art-calibration.json', import.meta.url), 'utf8'));
  const sources = new Map(audit.planets.map(planet => [planet.destinationId, planet]));
  assert.equal(sources.size, 8);
  for (const mission of MISSIONS) {
    const destination = planetArrivalDestination(mission.id);
    const art = planetArtForDestination(destination.body.id);
    const inspected = sources.get(destination.body.id);
    assert.ok(art && inspected, mission.id);
    assert.equal(art.width, inspected.width); assert.equal(art.height, inspected.height);
    const bounds = inspected.calibratedEllipseSource;
    near(art.center.x * art.width, bounds.centerX); near(art.center.y * art.height, bounds.centerY);
    near(art.radiusX * art.width, bounds.radiusX); near(art.radiusY * art.height, bounds.radiusY);
    assert.ok(art.radiusX > 0 && art.radiusY > 0);
    assert.ok(art.center.x - art.radiusX >= 0 && art.center.y - art.radiusY >= 0);
    assert.ok(art.center.x + art.radiusX <= 1 && art.center.y + art.radiusY <= 1);
  }
});

test('surface insertion keeps the selected ship on one continuous deorbit path instead of releasing a capsule', () => {
  nearPose(arrivalInsertionShipPose('carrier', 1), arrivalInsertionShipPose('release', 0));
  nearPose(arrivalInsertionShipPose('release', 1), arrivalInsertionShipPose('descent', 0));
  const seconds = .0001;
  for (const [beforeShot, afterShot, beforeDuration, afterDuration] of [
    ['carrier', 'release', 10, 8], ['release', 'descent', 8, 10],
  ]) {
    const before = arrivalInsertionShipPose(beforeShot, 1 - seconds / beforeDuration);
    const at = arrivalInsertionShipPose(afterShot, 0);
    const after = arrivalInsertionShipPose(afterShot, seconds / afterDuration);
    for (const key of ['x', 'y', 'scale']) near((at[key] - before[key]) / seconds, (after[key] - at[key]) / seconds, .005);
  }
  for (const shot of ['release', 'descent', 'atmosphere']) for (const p of [.1, .4, .8]) {
    const before = arrivalInsertionShipPose(shot, p - 1e-5), after = arrivalInsertionShipPose(shot, p + 1e-5);
    const pose = arrivalInsertionShipPose(shot, p);
    assert.ok(after.x > before.x);
    near(pose.angle, Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI, 1e-6);
  }
});

test('each companion capsule launches from the real moving carrier socket at its own time', () => {
  const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  for (const id of SHIP_IDS) for (const index of [1, 2]) {
    const art = carrierArtForShip(id), facing = art.nose.x < art.tail.x ? -1 : 1;
    const heading = Math.atan2((art.nose.y - art.tail.y) * art.height,
      (art.nose.x - art.tail.x) * art.width * facing) * 180 / Math.PI;
    const delayMs = index * 250, width = 550, height = width * art.height / art.width;
    const carrier = arrivalCarrierPose('release', delayMs / 8_000);
    const origin = attachmentToStage({ ...carrier, angle: carrier.angle - heading },
      (art.release.x - .5) * width * facing, (art.release.y - .5) * height);
    assert.equal(arrivalFormationFlightPose('release', (delayMs - 1) / 8_000, origin, index, delayMs).visible, false);
    const launched = arrivalFormationFlightPose('release', delayMs / 8_000, origin, index, delayMs);
    assert.equal(launched.visible, true); near(launched.x, origin.x); near(launched.y, origin.y);
    nearPose(arrivalFormationFlightPose('release', 1, origin, index, delayMs),
      arrivalFormationFlightPose('descent', 0, origin, index, delayMs));
    let previous = launched;
    for (let elapsed = delayMs + 50; elapsed <= 18_000; elapsed += 50) {
      const pose = arrivalFormationFlightPose(elapsed <= 8_000 ? 'release' : 'descent',
        elapsed <= 8_000 ? elapsed / 8_000 : (elapsed - 8_000) / 10_000, origin, index, delayMs);
      assert.ok(pose.x > previous.x && pose.y > previous.y, `${id}/${index}: forward descent at ${elapsed}`);
      previous = pose;
    }
  }
});

test('every admissible ship lands on its inspected alpha contact with its exit and shadow registered after reflection', () => {
  const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  const { shipSupportsSurfaceInsertion } = qa.load('app/game/systems/planetInsertion.ts');
  let tested = 0;
  for (const id of SHIP_IDS.filter(shipSupportsSurfaceInsertion)) {
    const art = carrierArtForShip(id), facing = art.nose.x < art.tail.x ? -1 : 1;
    const geometry = arrivalSurfaceShipGeometry(art, facing, 624);
    tested += 1;
    near(geometry.width / geometry.height, art.width / art.height);
    near(geometry.origin.x + geometry.foot.x * geometry.width, geometry.contact.x);
    near(geometry.origin.y + geometry.foot.y * geometry.height, 624);
    assert.ok(geometry.exit.y <= 624 + 1e-7 && geometry.exit.y >= 450, id);
    const rawExitX = facing < 0 ? 1 - art.groundExit.x : art.groundExit.x;
    near(geometry.exit.x, geometry.origin.x + rawExitX * geometry.width);
    near(geometry.exit.y, geometry.origin.y + art.groundExit.y * geometry.height);
    const rest = arrivalShipGroundPose(1, geometry.contact);
    const centre = attachmentToStage(rest, (.5 - geometry.foot.x) * geometry.width, (.5 - geometry.foot.y) * geometry.height);
    near(centre.x, geometry.origin.x + geometry.width / 2, 1e-7);
    for (const p of [.62, .8, 1]) nearPose(arrivalShipGroundPose(p, geometry.contact), rest);
    for (const reveal of [0, .3, .8, 1]) {
      const camera = arrivalGroundCamera(reveal, 624, 1.2);
      near(attachmentToStage(camera, rest.x, rest.y).y, 624);
      assert.ok(attachmentToStage(camera, geometry.origin.x, 624).x >= 0);
      assert.ok(attachmentToStage(camera, geometry.origin.x + geometry.width, 624).x <= ARRIVAL_STAGE.width);
    }
  }
  assert.ok(tested > 20, 'all compatible catalogue hulls must be covered');
});

test('controlled landing loses speed toward contact and reduced motion never shifts the parked hull', () => {
  const contact = { x: 480, y: 624 };
  let previousSpeed = Infinity;
  for (let p = 0; p <= .61; p += .01) {
    const before = arrivalShipGroundPose(p, contact), after = arrivalShipGroundPose(p + .001, contact);
    const speed = Math.hypot(after.x - before.x, after.y - before.y);
    assert.ok(speed < previousSpeed);
    assert.ok(before.y < contact.y && before.x < contact.x && before.angle <= 0);
    previousSpeed = speed;
  }
  const before = arrivalShipGroundPose(.619999, contact), at = arrivalShipGroundPose(.62, contact);
  near(before.x, at.x, 1e-8); near(before.y, at.y, 1e-8); near(before.angle, at.angle, 1e-8);
  assert.equal(at.contact, true);
  for (const p of [0, .3, .619, .62, .8, 1]) {
    const reduced = arrivalShipGroundPose(p, contact, .62, true);
    nearPose(reduced, at);
    assert.equal(reduced.contact, p >= .62);
  }
});
