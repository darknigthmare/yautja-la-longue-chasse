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
  arrivalImpactDebris, arrivalEffectsFrame, ARRIVAL_CONTACT_MS, arrivalShipCloakFrame,
  ARRIVAL_SHIP_CLOAK_RELEASE_START_MS, ARRIVAL_SHIP_CLOAK_RELEASE_END_MS,
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

test('the three named hunters have staggered physical exits and reach their exact gameplay formation before handoff', () => {
  const { arrivalFormationSlots } = qa.load('app/game/systems/planetArrivalPresentation.ts');
  const slots = arrivalFormationSlots('triad');
  assert.deepEqual(slots.map(({ id, offsetX, delayMs }) => ({ id, offsetX, delayMs })), [
    { id: 'player', offsetX: 0, delayMs: 0 }, { id: 'karhek', offsetX: 160, delayMs: 250 },
    { id: 'saketh', offsetX: 320, delayMs: 500 },
  ]);
  assert.equal(arrivalFormationSlots('solo').length, 1);
  for (const mission of MISSIONS) for (const slot of slots) {
    const base = geometryFor(mission.id);
    const geometry = { ...base, threshold: { x: base.threshold.x + slot.offsetX, y: base.threshold.y },
      clearanceX: base.clearanceX + slot.offsetX, destinationX: base.destinationX + slot.offsetX };
    for (const reduced of [false, true]) {
      const end = arrivalHunterEgress(62_000 - slot.delayMs, geometry, reduced);
      near(end.x, geometry.destinationX); near(end.y, geometry.floorY);
      assert.equal(end.stage, 'standing'); assert.equal(end.speed, 0);
    }
    const receivedAt = ARRIVAL_HUNTER_GROUND_CONTACT_MS + slot.delayMs;
    assert.equal(arrivalHunterEgress(receivedAt - slot.delayMs - 1, geometry).contact, 'airborne');
    assert.equal(arrivalHunterEgress(receivedAt - slot.delayMs, geometry).contact, 'ground');
    assert.ok(ARRIVAL_HUNTER_MOVE_END_MS + slot.delayMs < 62_000);
  }
});

test('every ship exit supports left and right disembarkation without passing below the floor or reversing its path', () => {
  const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  const { shipSupportsSurfaceInsertion } = qa.load('app/game/systems/planetInsertion.ts');
  const { arrivalSurfaceShipGeometry } = qa.load('app/game/systems/planetArrivalSpatial.ts');
  const { arrivalFormationSlots } = qa.load('app/game/systems/planetArrivalPresentation.ts');
  for (const id of SHIP_IDS.filter(shipSupportsSurfaceInsertion)) for (const slot of arrivalFormationSlots('triad')) {
    const landing = planetArrivalLanding({ missionId: 'jungle-vey' });
    const art = carrierArtForShip(id), facing = art.nose.x < art.tail.x ? -1 : 1;
    const ship = arrivalSurfaceShipGeometry(art, facing, landing.floorY);
    const destinationX = landing.spawnX + landing.hunterWidth / 2 + slot.offsetX;
    const direction = destinationX >= ship.exit.x ? 1 : -1;
    const geometry = { threshold: ship.exit, floorY: landing.floorY, destinationX,
      clearanceX: ship.exit.x + direction * Math.min(60, Math.abs(destinationX - ship.exit.x) * .4) };
    let previous = arrivalHunterEgress(ARRIVAL_HUNTER_MOVE_START_MS, geometry);
    for (let time = ARRIVAL_HUNTER_MOVE_START_MS + 10; time <= ARRIVAL_HUNTER_MOVE_END_MS; time += 10) {
      const pose = arrivalHunterEgress(time, geometry);
      assert.ok((pose.x - previous.x) * direction >= -1e-7, `${id}/${slot.id}: reverses at ${time}`);
      assert.ok(pose.y <= geometry.floorY + 1e-7 && pose.y >= ship.exit.y - 1e-7);
      assert.equal(pose.facing, direction);
      if (Math.abs(geometry.floorY - ship.exit.y) < 1e-7 && time < ARRIVAL_HUNTER_GROUND_CONTACT_MS) {
        assert.equal(pose.contact, 'threshold'); assert.equal(pose.pose, 'run');
        near(pose.y, geometry.floorY);
      }
      previous = pose;
    }
    near(previous.x, destinationX); near(previous.y, geometry.floorY);
  }
});

test('the real ship renderer keeps its selected hull and omits all capsule mechanisms in every flight and surface shot', () => {
  const arrival = qa.load('app/game/systems/planetArrival.ts');
  const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
  const { shipProfileAssetPath } = qa.load('app/game/shipCatalogue.ts');
  for (const team of ['solo', 'triad']) for (const elapsedMs of [24_000, 36_000, 45_000, 54_200, 60_000, 61_900]) {
    const fresh = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T12:00:00.000Z', runId: `ship:${team}`,
      missionId: 'jungle-vey', encounterRun: 1, personalShipId: 'wolf-ship', hunterPresetId: 'wolf',
      insertion: { version: 1, method: 'ship', team } });
    const state = arrival.requestPlanetArrivalHandoff({ ...arrival.startPlanetArrival(fresh), elapsedMs }, 'skipped');
    const before = JSON.stringify(state);
    const html = qa.render('app/game/PlanetArrivalCinematic.tsx', { state, appearance: appearanceForPreset('wolf'),
      loadout: { armorId: 'hunter', weaponIds: ['wristblades'], gearIds: [] },
      onCheckpoint: () => true, onHandoff: () => true, onExit: () => {} });
    assert.match(html, new RegExp(`data-arrival-method="ship" data-arrival-team="${team}"`));
    assert.ok(html.includes(`data-arrival-light-source="${shipProfileAssetPath('wolf-ship')}"`));
    assert.doesNotMatch(html, /data-arrival-(flight-pod|ground-pod|vfx-source|impact-material|impact-ring|vent|debris|hatch-face)=/);
    assert.equal((html.match(/data-arrival-hunter="/g) ?? []).length, team === 'triad' ? 3 : 1);
    if (elapsedMs >= 49_000) {
      assert.match(html, /data-arrival-ground-ship="wolf-ship" data-arrival-ship-contact="true"/);
      assert.match(html, /data-arrival-anchor="ship-ground-contact"/);
      assert.match(html, /data-arrival-anchor="ship-ground-exit"/);
    }
    if (team === 'triad') {
      assert.match(html, /data-arrival-member-name="Ka’rhek"/); assert.match(html, /data-arrival-member-name="Sa’keth"/);
      assert.doesNotMatch(html, /data-arrival-member-name="(?:Saar|Vek)"/);
    }
    assert.equal(JSON.stringify(state), before, 'rendering must not modify the saved run');
  }
});

test('pod trio renders distinct launches, ground anchors and authored modular companion rigs', () => {
  const arrival = qa.load('app/game/systems/planetArrival.ts');
  const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
  const fresh = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T12:00:00.000Z', runId: 'pod-triad',
    missionId: 'jungle-vey', encounterRun: 1, personalShipId: 'wolf-ship', hunterPresetId: 'wolf',
    insertion: { version: 1, method: 'pod', team: 'triad' } });
  const render = (elapsedMs, reducedMotion = false) => qa.render('app/game/PlanetArrivalCinematic.tsx', {
    state: arrival.requestPlanetArrivalHandoff({ ...arrival.startPlanetArrival(fresh), elapsedMs }, 'skipped'),
    appearance: appearanceForPreset('wolf'), loadout: { armorId: 'hunter', weaponIds: ['wristblades'], gearIds: [] },
    reducedMotion, onCheckpoint: () => true, onHandoff: () => true, onExit: () => {} });
  for (const [time, count] of [[23_000, 1], [23_250, 2], [23_500, 3], [45_000, 3]]) {
    assert.equal((render(time).match(/data-arrival-flight-pod="true"/g) ?? []).length, count);
  }
  const html = render(61_900);
  assert.equal((html.match(/data-arrival-ground-pod="true"/g) ?? []).length, 3);
  for (const id of ['player', 'karhek', 'saketh']) {
    const prefix = id === 'player' ? '' : id + '-';
    for (const anchor of ['pod-ground', 'hunter-feet', 'hunter-support', 'capsule-threshold']) {
      assert.equal((html.match(new RegExp(`data-arrival-anchor="${prefix}${anchor}"`, 'g')) ?? []).length, 1);
    }
  }
  assert.equal((html.match(/data-hunter-rig=""/g) ?? []).length, 3);
  assert.equal((html.match(/data-preset="custom"/g) ?? []).length, 2);
  const { EXPEDITION_MEMBER_SIZE } = qa.load('app/game/systems/planetInsertion.ts');
  for (const id of ['karhek', 'saketh']) {
    const tag = html.match(new RegExp(`<div class="hunter"[^>]*data-arrival-member="${id}"[^>]*>`))?.[0];
    assert.ok(tag, id);
    near(Number(tag.match(/width:([\d.]+)px/)?.[1]), EXPEDITION_MEMBER_SIZE.height * 256 / 384);
  }
  const reduced = render(61_900, true);
  assert.equal((reduced.match(/data-arrival-hunter-stage="standing"/g) ?? []).length, 3);
  assert.equal((reduced.match(/data-arrival-hunter-contact="ground"/g) ?? []).length, 3);
});

test('optical concealment is opt-in for the ship and is engaged before its visible approach', () => {
  for (const plan of [undefined, { method: 'ship' }, { method: 'ship', shipCloak: false },
    { method: 'pod', shipCloak: true }]) {
    for (const time of [0, 13_000, 45_000, 52_800, 62_000]) {
      const frame = arrivalShipCloakFrame(time, plan);
      assert.equal(frame.requested, false); assert.equal(frame.phase, 'off');
      assert.equal(frame.strength, 0); assert.equal(frame.hullOpacity, 1);
      assert.equal(frame.refractionOpacity, 0); assert.equal(frame.rimOpacity, 0);
      assert.equal(frame.distortionScale, 0);
    }
  }
  const plan = { method: 'ship', shipCloak: true };
  for (const time of [0, 7_000, 13_000, 23_000, 31_000, 41_000, 49_000, 52_299]) {
    const frame = arrivalShipCloakFrame(time, plan);
    assert.equal(frame.phase, 'active'); assert.equal(frame.strength, 1);
    assert.ok(frame.hullOpacity >= .2 && frame.hullOpacity < .5, 'the selected hull stays readable through the field');
    assert.ok(frame.refractionOpacity > 0 && frame.rimOpacity > 0);
    assert.ok(frame.distortionScale > 0 && frame.distortionScale < 4);
  }
});

test('the optical field releases continuously and is completely gone before the physical setdown', () => {
  const plan = { method: 'ship', shipCloak: true };
  assert.equal(ARRIVAL_SHIP_CLOAK_RELEASE_START_MS, 52_300);
  assert.equal(ARRIVAL_SHIP_CLOAK_RELEASE_END_MS, 53_300);
  assert.ok(ARRIVAL_SHIP_CLOAK_RELEASE_END_MS < ARRIVAL_CONTACT_MS);
  let previous = arrivalShipCloakFrame(ARRIVAL_SHIP_CLOAK_RELEASE_START_MS, plan);
  for (let time = ARRIVAL_SHIP_CLOAK_RELEASE_START_MS + 10; time <= ARRIVAL_SHIP_CLOAK_RELEASE_END_MS; time += 10) {
    const frame = arrivalShipCloakFrame(time, plan);
    assert.ok(frame.strength <= previous.strength && frame.strength >= 0);
    assert.ok(previous.strength - frame.strength < .02, 'no one-frame disappearance');
    assert.ok(frame.hullOpacity >= previous.hullOpacity);
    assert.ok(frame.refractionOpacity <= previous.refractionOpacity && frame.rimOpacity <= previous.rimOpacity);
    previous = frame;
  }
  near(arrivalShipCloakFrame(52_800, plan).strength, .5);
  for (const time of [53_300, ARRIVAL_CONTACT_MS, 57_000, 61_900, 62_000]) {
    const frame = arrivalShipCloakFrame(time, plan);
    assert.equal(frame.phase, 'off'); assert.equal(frame.strength, 0);
    assert.equal(frame.hullOpacity, 1); assert.equal(frame.refractionOpacity, 0); assert.equal(frame.rimOpacity, 0);
    assert.equal(frame.distortionScale, 0); assert.equal(frame.noiseOffsetX, 0); assert.equal(frame.noiseOffsetY, 0);
  }
});

test('the saved arrival clock freezes optical distortion and reduced motion removes its moving field', () => {
  const arrival = qa.load('app/game/systems/planetArrival.ts');
  const insertion = { version: 1, method: 'ship', team: 'triad', shipCloak: true };
  const fresh = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T12:00:00.000Z', runId: 'cloak-clock',
    missionId: 'jungle-vey', encounterRun: 1, personalShipId: 'wolf-ship', hunterPresetId: 'wolf', insertion });
  const paused = arrival.pausePlanetArrival({ ...arrival.startPlanetArrival(fresh), elapsedMs: 52_800 });
  const expected = arrivalShipCloakFrame(paused.elapsedMs, paused.insertion);
  const later = arrival.advancePlanetArrival(paused, 10_000);
  assert.deepEqual(arrivalShipCloakFrame(later.elapsedMs, later.insertion), expected);
  const resumed = arrival.advancePlanetArrival(arrival.startPlanetArrival(paused), 100);
  assert.ok(arrivalShipCloakFrame(resumed.elapsedMs, resumed.insertion).strength < expected.strength);
  for (const time of [NaN, Infinity, -Infinity, -1, 13_000, 45_000, 52_800, 53_300]) {
    const reduced = arrivalShipCloakFrame(time, insertion, true);
    const normal = arrivalShipCloakFrame(time, insertion);
    assert.equal(reduced.strength, normal.strength); assert.equal(reduced.hullOpacity, normal.hullOpacity);
    assert.equal(reduced.distortionScale, 0); assert.equal(reduced.noiseOffsetX, 0); assert.equal(reduced.noiseOffsetY, 0);
    for (const value of Object.values(reduced).filter(value => typeof value === 'number')) assert.ok(Number.isFinite(value));
  }
});

test('the actual cloaked ship keeps its source, transforms and sockets while the alpha-masked field follows the clock', () => {
  const arrival = qa.load('app/game/systems/planetArrival.ts');
  const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
  const { shipProfileAssetPath } = qa.load('app/game/shipCatalogue.ts');
  const render = (personalShipId, elapsedMs, shipCloak, reducedMotion = false) => {
    const state = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T12:00:00.000Z', runId: 'cloak-render',
      missionId: 'jungle-vey', encounterRun: 1, personalShipId, hunterPresetId: 'wolf',
      insertion: { version: 1, method: 'ship', team: 'triad', ...(shipCloak ? { shipCloak: true } : {}) } });
    return qa.render('app/game/PlanetArrivalCinematic.tsx', {
      state: arrival.requestPlanetArrivalHandoff({ ...arrival.startPlanetArrival(state), elapsedMs }, 'skipped'),
      appearance: appearanceForPreset('wolf'), loadout: { armorId: 'hunter', weaponIds: ['wristblades'], gearIds: [] },
      reducedMotion, onCheckpoint: () => true, onHandoff: () => true, onExit: () => {},
    });
  };
  for (const ship of ['classic-predator-spaceship', 'wolf-ship', 'avpr-scout-ship']) {
    for (const time of [13_000, 23_000, 41_000, 52_300, 52_800, 53_300, ARRIVAL_CONTACT_MS, 61_900]) {
      const html = render(ship, time, true), normal = render(ship, time, false);
      const expected = arrivalShipCloakFrame(time, { method: 'ship', shipCloak: true });
      const hullTag = markup => markup.match(/<div[^>]*data-arrival-(?:carrier|ground-ship)="[^"]+"[^>]*>/)?.[0];
      const style = tag => tag?.match(/style="([^"]+)"/)?.[1];
      assert.equal(style(hullTag(html)), style(hullTag(normal)), `${ship} transform at ${time}`);
      assert.deepEqual(html.match(/<span[^>]*data-arrival-anchor="[^"]+"[^>]*>/g),
        normal.match(/<span[^>]*data-arrival-anchor="[^"]+"[^>]*>/g), `${ship} sockets at ${time}`);
      assert.ok(html.includes(`data-arrival-light-source="${shipProfileAssetPath(ship)}"`));
      assert.ok(html.includes(`data-arrival-cloak-strength="${expected.strength}"`));
      const opacity = Number(html.match(/data-arrival-cloak-body="true" style="opacity:([\d.]+)"/)?.[1]);
      near(opacity, expected.hullOpacity);
      if (expected.strength > 0) {
        assert.ok(html.includes(`data-arrival-cloak-refraction="${shipProfileAssetPath(ship)}"`));
        assert.ok(html.includes(`data-arrival-cloak-rim="${shipProfileAssetPath(ship)}"`));
        assert.match(html, /backdrop-filter:url\(/);
        assert.match(html, /<feDisplacementMap[^>]+in="SourceGraphic"/);
        assert.match(html, /<feMorphology[^>]+in="SourceAlpha"/);
      } else assert.doesNotMatch(html, /data-arrival-cloak-(?:refraction|rim)=/);
      assert.doesNotMatch(normal, /data-arrival-cloak-(?:body|refraction|rim)=/);
    }
    const reduced = render(ship, 41_000, true, true);
    assert.match(reduced, /<feOffset[^>]+dx="0" dy="0"/);
    assert.match(reduced, /<feDisplacementMap[^>]+scale="0"/);
  }
});
