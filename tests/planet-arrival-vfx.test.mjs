import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const { MISSIONS } = qa.load('app/game/data.ts');
const { ARRIVAL_VFX_ART, ARRIVAL_POD_GLOW_ART, arrivalVfxArtForBiome } = qa.load('app/game/systems/planetArrivalVfxArt.ts');
const { arrivalBatchGroundFrame, arrivalBiomeFragments, arrivalFragmentSupport, arrivalFootContacts,
  ARRIVAL_BATCH_FOOT_LIFETIME_MS } = qa.load('app/game/systems/planetArrivalVfx.ts');
const { ARRIVAL_CONTACT_MS, ARRIVAL_HUNTER_GROUND_CONTACT_MS, ARRIVAL_HUNTER_MOVE_END_MS,
  arrivalHunterEgress, arrivalImpactDebris, arrivalFormationSlots } = qa.load('app/game/systems/planetArrivalPresentation.ts');
const { planetArrivalSoundCues } = qa.load('app/game/systems/planetArrivalAudio.ts');
const { arrivalImpactArtForBiome } = qa.load('app/game/systems/planetArrivalArt.ts');
const arrival = qa.load('app/game/systems/planetArrival.ts');
const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
const near = (actual, expected, epsilon = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} ≈ ${expected}`);
const geometry = { threshold: { x: 180, y: 570 }, floorY: 624, clearanceX: 240, destinationX: 340 };

function stateFor(mission, method = 'pod', team = 'solo', shipCloak = false) {
  return arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T00:00:00.000Z', runId: `batch:${mission.id}:${method}:${team}`,
    missionId: mission.id, encounterRun: 2, personalShipId: 'wolf-ship', hunterPresetId: 'wolf',
    insertion: { version: 1, method, team, ...(shipCloak ? { shipCloak: true } : {}) } });
}

function renderAt(state, elapsedMs, reducedMotion = false) {
  return qa.render('app/game/PlanetArrivalCinematic.tsx', {
    state: arrival.requestPlanetArrivalHandoff({ ...arrival.startPlanetArrival(state), elapsedMs }, 'skipped'),
    appearance: appearanceForPreset('wolf'), loadout: { armorId: 'hunter', weaponIds: ['wristblades'], gearIds: [] },
    reducedMotion, onCheckpoint: () => true, onHandoff: () => true, onExit: () => {},
  });
}

test('each destination preloads its complete six-part material family and both registered lights', () => {
  const union = new Set();
  assert.equal(Object.keys(ARRIVAL_VFX_ART).length, 50);
  for (const mission of MISSIONS) {
    const assets = arrival.planetArrivalAssets(stateFor(mission));
    const paths = Object.values(assets).filter(path => path.includes('/cinematics/batch-01-20261105/'));
    assert.equal(paths.length, 8, 'One biome only: six material sprites and two shared lights.');
    assert.equal(new Set(paths).size, 8);
    for (const art of Object.values(arrivalVfxArtForBiome(mission.biome))) assert.ok(paths.includes(art.path));
    for (const art of Object.values(ARRIVAL_POD_GLOW_ART)) assert.ok(paths.includes(art.path));
    for (const path of paths) union.add(path);
    assert.equal(assets.impactDust, arrivalImpactArtForBiome(mission.biome).path);
    assert.equal(arrivalImpactArtForBiome(mission.biome).material,
      mission.biome === 'ice' ? 'ice' : ['swamp', 'ocean'].includes(mission.biome) ? 'wet' : 'dry');
  }
  assert.equal(union.size, 50, 'All authored assets are reachable through real destination preloads.');
});

test('calibration is tied to all 50 exact source PNGs and same-size lossless runtime exports', async () => {
  for (const [id, art] of Object.entries(ARRIVAL_VFX_ART)) {
    const source = `public${art.path.replace(/\.webp$/, '.png')}`;
    const png = readFileSync(source);
    assert.equal(createHash('sha256').update(png).digest('hex'), art.sourceSha256, `${id}: stale calibration`);
    const [original, runtime] = await Promise.all([sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(`public${art.path}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })]);
    assert.deepEqual([runtime.info.width, runtime.info.height], [art.width, art.height]);
    assert.deepEqual([original.info.width, original.info.height], [art.width, art.height]);
    // Fully transparent RGB can be changed by a lossless WebP encoder. Visible
    // RGBA and every alpha value must still be identical to the inspected PNG.
    for (let i = 0; i < original.data.length; i += 4) {
      assert.equal(runtime.data[i + 3], original.data[i + 3], `${id}: alpha changed`);
      if (original.data[i + 3]) for (let c = 0; c < 3; c++) assert.equal(runtime.data[i + c], original.data[i + c], `${id}: visible RGB changed`);
    }
  }
});

test('impact and retombée envelopes overlap once, end before egress, and replay deterministically', () => {
  const before = arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS - 1);
  assert.equal(before.frontOpacity, 0); assert.equal(before.settleOpacity, 0);
  const early = arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS + 120);
  assert.ok(early.frontOpacity > .6); assert.equal(early.settleOpacity, 0);
  const overlap = arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS + 700);
  assert.ok(overlap.frontOpacity > 0 && overlap.settleOpacity > 0);
  const later = arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS + 1_600);
  assert.equal(later.frontOpacity, 0); assert.ok(later.settleOpacity > .2);
  for (const time of [49_000, 53_700, 54_450, 55_500, 57_000, 61_900]) {
    assert.deepEqual(arrivalBatchGroundFrame(time), arrivalBatchGroundFrame(time), 'Paused/reloaded frame must not depend on wall time.');
    for (const value of Object.values(arrivalBatchGroundFrame(time))) assert.ok(Number.isFinite(value));
  }
  const final = arrivalBatchGroundFrame(57_000);
  assert.equal(final.frontOpacity, 0); assert.equal(final.settleOpacity, 0); assert.equal(final.washOpacity, 0);
});

test('the ship washes the actual floor before setdown and stops before disembarkation', () => {
  assert.equal(arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS - 1_501).washOpacity, 0);
  assert.ok(arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS - 700).washOpacity > 0);
  assert.ok(arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS).washOpacity > .4);
  assert.ok(arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS + 1_000).washOpacity > 0);
  assert.equal(arrivalBatchGroundFrame(ARRIVAL_CONTACT_MS + 2_800).washOpacity, 0);
});

test('reduced motion and invalid times cannot spawn transient particles or footprint bursts', () => {
  for (const time of [NaN, Infinity, -Infinity, -1]) {
    const frame = arrivalBatchGroundFrame(time);
    for (const key of ['frontOpacity', 'settleOpacity', 'washOpacity']) assert.equal(frame[key], 0);
    assert.deepEqual(arrivalFootContacts(time, geometry), []);
  }
  for (const time of [ARRIVAL_CONTACT_MS + 100, ARRIVAL_HUNTER_GROUND_CONTACT_MS + 50, ARRIVAL_HUNTER_MOVE_END_MS + 50]) {
    const frame = arrivalBatchGroundFrame(time, true);
    for (const key of ['frontOpacity', 'settleOpacity', 'washOpacity']) assert.equal(frame[key], 0);
    assert.deepEqual(arrivalFootContacts(time, geometry, true), []);
    assert.deepEqual(arrivalBiomeFragments(time - ARRIVAL_CONTACT_MS, 1, 'jungle', true), []);
  }
});

test('every material fragment keeps its audited trajectory, source variant, and sound contact time', () => {
  for (const { biome } of MISSIONS) for (const seed of [0, 2, 41]) for (const age of [0, 150, 500, 1_100, 1_650]) {
    const original = arrivalImpactDebris(age, seed);
    const pieces = arrivalBiomeFragments(age, seed, biome);
    assert.equal(pieces.length, 9);
    assert.deepEqual(new Set(pieces.map(piece => piece.variant)), new Set(['a', 'b']));
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i], previous = original[i];
      near(piece.x, previous.x); near(piece.angle, previous.angle); near(piece.opacity, previous.opacity);
      near(piece.settleAgeMs, previous.settleAgeMs);
      near(piece.y + piece.supportOffset, previous.y);
      assert.ok(piece.y + piece.supportOffset <= 1e-7, 'Significant alpha cannot penetrate the floor.');
      if (age >= piece.settleAgeMs) near(piece.y + piece.supportOffset, 0);
      assert.ok(piece.art.path.endsWith(`arrival-fragment-${biome}-${piece.variant}.webp`));
    }
  }
});

test('rotated support encloses the actual significant-alpha pixels for all 16 fragment sources', async () => {
  for (const [id, art] of Object.entries(ARRIVAL_VFX_ART).filter(([id]) => id.startsWith('arrival-fragment-'))) {
    const { data, info } = await sharp(`public${art.path.replace(/\.webp$/, '.png')}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const angle of [0, 37, 90, 143, 235, 315]) {
      const radians = angle * Math.PI / 180, sin = Math.sin(radians), cos = Math.cos(radians);
      const width = 23, height = width * info.height / info.width;
      let actualSupport = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
        // Independent pixel-cell projection, rather than reusing the hull list.
        const px = (x + (sin > 0 ? 1 : 0)) / info.width;
        const py = (y + (cos > 0 ? 1 : 0)) / info.height;
        actualSupport = Math.max(actualSupport, (px - art.anchor.x) * width * sin + (py - art.anchor.y) * height * cos);
      }
      near(arrivalFragmentSupport(art, width, angle), actualSupport, 1e-7);
      assert.ok(art.supportHull.length >= 3, id);
    }
  }
});

test('foot plumes stay at their contact location while the actor continues moving in either direction', () => {
  for (const direction of [-1, 1]) {
    const route = { ...geometry, clearanceX: geometry.threshold.x + direction * 60,
      destinationX: geometry.threshold.x + direction * 160 };
    const early = arrivalFootContacts(ARRIVAL_HUNTER_GROUND_CONTACT_MS + 50, route)[0];
    const late = arrivalFootContacts(ARRIVAL_HUNTER_GROUND_CONTACT_MS + 280, route)[0];
    assert.equal(early.id, late.id); near(early.x, late.x); near(early.y, route.floorY);
    assert.ok(Math.abs(arrivalHunterEgress(ARRIVAL_HUNTER_GROUND_CONTACT_MS + 280, route).x - early.x) > 5);
    assert.ok(late.opacity < early.opacity);
    assert.equal(arrivalFootContacts(ARRIVAL_HUNTER_GROUND_CONTACT_MS - 1, route).length, 0);
    const settled = arrivalFootContacts(ARRIVAL_HUNTER_MOVE_END_MS + 50, route)[0];
    assert.equal(settled.id, 'settle'); near(settled.x, route.destinationX);
    assert.deepEqual(arrivalFootContacts(ARRIVAL_HUNTER_MOVE_END_MS + ARRIVAL_BATCH_FOOT_LIFETIME_MS, route), []);
  }
});

test('all trio foot contacts match existing audio cue times, including a level hull threshold', () => {
  for (const method of ['pod', 'ship']) {
    const state = { biomeId: 'jungle', seed: 1, personalShipId: 'wolf-ship', insertion: { version: 1, method, team: 'triad' } };
    const cues = planetArrivalSoundCues(state);
    for (const slot of arrivalFormationSlots('triad')) {
      const prefix = slot.index ? `${slot.id}:` : '';
      const steps = cues.filter(cue => cue.id.startsWith(prefix) &&
        /^(hunter-touchdown|hunter-step-out|footstep-\d+|hunter-settle)$/.test(cue.id.slice(prefix.length)));
      assert.equal(steps.length, 6);
      for (const cue of steps) {
        const contacts = arrivalFootContacts(cue.atMs - slot.delayMs + 50, geometry);
        assert.equal(contacts.length, 1); assert.equal(contacts[0].atMs + slot.delayMs, cue.atMs);
      }
    }
  }
  const level = { ...geometry, threshold: { x: 180, y: geometry.floorY } };
  const thresholdContact = arrivalFootContacts(58_950, level);
  assert.equal(thresholdContact.length, 1); assert.equal(thresholdContact[0].id, 'threshold');
  assert.equal(thresholdContact[0].y, geometry.floorY);
});

test('the real component renders the new material families in each biome and preserves ship/capsule separation', () => {
  for (const mission of MISSIONS) {
    const pod = stateFor(mission);
    const before = JSON.stringify(pod);
    const front = renderAt(pod, ARRIVAL_CONTACT_MS + 250);
    assert.match(front, /data-arrival-batch-vfx="impact-front"/);
    assert.ok(front.includes(`arrival-impact-front-${mission.biome}.webp`));
    assert.match(front, /data-arrival-batch-vfx="pod-ground-glow"/);
    for (const variant of ['a', 'b']) assert.ok(front.includes(`arrival-fragment-${mission.biome}-${variant}.webp`));
    const settle = renderAt(pod, ARRIVAL_CONTACT_MS + 1_300);
    assert.match(settle, /data-arrival-batch-vfx="impact-settle"/);
    assert.ok(settle.includes(`arrival-impact-settle-${mission.biome}.webp`));
    const feet = renderAt(pod, ARRIVAL_HUNTER_GROUND_CONTACT_MS + 100);
    assert.match(feet, /data-arrival-batch-vfx="foot-contact"/);
    assert.ok(feet.includes(`arrival-foot-contact-${mission.biome}.webp`));
    const ship = renderAt(stateFor(mission, 'ship', 'triad', true), ARRIVAL_CONTACT_MS - 500);
    assert.match(ship, /data-arrival-batch-vfx="ship-ground-wash"/);
    assert.ok(ship.includes(`arrival-ship-ground-wash-${mission.biome}.webp`));
    assert.doesNotMatch(ship, /data-arrival-batch-vfx="(?:impact-front|impact-settle|fragment|pod-ground-glow)"/);
    assert.equal(JSON.stringify(pod), before, 'Effect rendering never mutates the saved arrival.');
  }
});

test('trio effects use each delayed contact and reduced motion never starts a second clock', () => {
  const pod = stateFor(MISSIONS[0], 'pod', 'triad');
  const early = renderAt(pod, ARRIVAL_CONTACT_MS + 100);
  assert.equal((early.match(/data-arrival-batch-vfx="impact-front"/g) ?? []).length, 1);
  const all = renderAt(pod, ARRIVAL_CONTACT_MS + 600);
  assert.equal((all.match(/data-arrival-batch-vfx="impact-front"/g) ?? []).length, 3);
  assert.equal((all.match(/data-arrival-batch-vfx="fragment"/g) ?? []).length, 27);
  const flight = renderAt(pod, 27_000);
  assert.equal((flight.match(/data-arrival-batch-vfx="pod-flight-glow"/g) ?? []).length, 3);
  const reduced = renderAt(pod, ARRIVAL_HUNTER_GROUND_CONTACT_MS + 200, true);
  assert.doesNotMatch(reduced, /data-arrival-batch-vfx="(?:impact-settle|ship-ground-wash|foot-contact|fragment)"/);
});
