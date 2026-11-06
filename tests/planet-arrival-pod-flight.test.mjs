import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const {
  ARRIVAL_POD_ENTRY_START_MS, ARRIVAL_POD_ENTRY_END_MS,
  ARRIVAL_POD_SHUTTERS_OPEN_START_MS, ARRIVAL_POD_SHUTTERS_OPEN_END_MS,
  ARRIVAL_POD_FLIGHT_PANELS, ARRIVAL_POD_FLIGHT_CORE_CLIP,
  arrivalPodEntryFrame, arrivalPodPanelAngle,
} = qa.load('app/game/systems/planetArrivalPodFlight.ts');
const arrival = qa.load('app/game/systems/planetArrival.ts');
const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
const { arrivalFormationSlots } = qa.load('app/game/systems/planetArrivalPresentation.ts');
const { planetArrivalSoundCues } = qa.load('app/game/systems/planetArrivalAudio.ts');
const { ARRIVAL_POD_ART, ARRIVAL_POD_SPRITES } = qa.load('app/game/systems/planetArrivalPodArt.ts');

function insidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

test('the full visible outer petal rims move with their panel instead of leaving floating fragments in space', async () => {
  const { data, info } = await sharp('public/game/planet-arrival/v1/pod-flight.webp')
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1536); assert.equal(info.height, 1024);
  // These two strips lie outside the stationary body's measured silhouette.
  // Any substantial source pixel there belongs to a petal. Unlike checking the
  // SVG string, this catches a cut traced inside the real painted outer rim.
  for (const panel of ARRIVAL_POD_FLIGHT_PANELS) {
    let visible = 0, missed = 0;
    for (let y = 0; y < info.height; y++) {
      if (panel.id === 'upper' ? y >= 370 : y <= 648) continue;
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + info.channels - 1] <= 32) continue;
        visible++;
        if (!insidePolygon({ x: (x + .5) / info.width, y: (y + .5) / info.height }, panel.polygon)) missed++;
      }
    }
    assert.ok(visible > 50_000, `${panel.id}: the authored outer petal must be present`);
    assert.equal(missed, 0, `${panel.id}: a stationary remnant of the open petal remains outside its mask`);
  }
});

function renderAt(elapsedMs, reducedMotion = false, team = 'solo') {
  const state = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T16:00:00.000Z',
    runId: 'pod-thermal-flight', missionId: 'jungle-vey', encounterRun: 1,
    personalShipId: 'wolf-ship', hunterPresetId: 'wolf',
    insertion: { version: 1, method: 'pod', team } });
  return qa.render('app/game/PlanetArrivalCinematic.tsx', {
    state: arrival.requestPlanetArrivalHandoff({ ...arrival.startPlanetArrival(state), elapsedMs }, 'skipped'),
    appearance: appearanceForPreset('wolf'), loadout: { armorId: 'hunter', weaponIds: ['wristblades'], gearIds: [] },
    reducedMotion, onCheckpoint: () => true, onHandoff: () => true, onExit: () => {},
  });
}

test('vacuum release and descent retain folded panels with no atmospheric heat', () => {
  for (const time of [0, 23_000, 23_500, 31_000, 40_999, NaN, Infinity, -Infinity]) {
    const frame = arrivalPodEntryFrame(time);
    assert.equal(frame.phase, 'space');
    assert.equal(frame.shutters, 'closed');
    assert.equal(frame.shuttersOpen, 0);
    assert.equal(frame.heat, 0);
    assert.equal(frame.hullHeat, 0);
    assert.equal(frame.trailOpacity, 0);
    assert.equal(frame.bowShockOpacity, 0);
  }
  assert.deepEqual(ARRIVAL_POD_FLIGHT_PANELS.map(panel => arrivalPodPanelAngle(panel, 0)), [37, -33]);
  const html = renderAt(31_000);
  assert.match(html, /data-arrival-pod-shutters="closed"/);
  assert.doesNotMatch(html, /data-arrival-pod-bow-shock=/);
  assert.doesNotMatch(html, /data-arrival-vfx-source="pod-nose"/);
});

test('heat builds before aerodynamic deployment, then cools completely before the surface shot', () => {
  assert.equal(arrivalPodEntryFrame(ARRIVAL_POD_ENTRY_START_MS).heat, 0);
  const rising = [150, 350, 650, 850].map(offset => arrivalPodEntryFrame(ARRIVAL_POD_ENTRY_START_MS + offset));
  for (let i = 0; i < rising.length; i++) {
    assert.ok(rising[i].heat > (rising[i - 1]?.heat ?? 0));
    assert.equal(rising[i].shutters, 'closed');
  }
  const cooling = [0, 600, 1_400, 3_700, 4_799, 4_800]
    .map(offset => arrivalPodEntryFrame(ARRIVAL_POD_SHUTTERS_OPEN_END_MS + offset).heat);
  for (let i = 1; i < cooling.length; i++) assert.ok(cooling[i] <= cooling[i - 1]);
  for (const time of [ARRIVAL_POD_ENTRY_END_MS, 53_960, 62_000]) {
    const frame = arrivalPodEntryFrame(time);
    assert.equal(frame.heat, 0); assert.equal(frame.trailOpacity, 0);
    assert.equal(frame.bowShockOpacity, 0); assert.equal(frame.shutters, 'open');
  }
});

test('the two rigid panels deploy monotonically in the stratosphere without changing their pivots', () => {
  const before = JSON.stringify(ARRIVAL_POD_FLIGHT_PANELS);
  let previous = 0;
  for (let time = ARRIVAL_POD_SHUTTERS_OPEN_START_MS; time <= ARRIVAL_POD_SHUTTERS_OPEN_END_MS; time += 20) {
    const frame = arrivalPodEntryFrame(time);
    assert.ok(frame.shuttersOpen >= previous && frame.shuttersOpen <= 1);
    for (const panel of ARRIVAL_POD_FLIGHT_PANELS) {
      const angle = arrivalPodPanelAngle(panel, frame.shuttersOpen);
      assert.ok(Math.abs(angle) <= Math.abs(panel.foldedAngle));
      assert.equal(Math.sign(angle) || Math.sign(panel.foldedAngle), Math.sign(panel.foldedAngle));
      assert.ok(panel.hinge.x > 0 && panel.hinge.x < 1 && panel.hinge.y > 0 && panel.hinge.y < 1);
    }
    previous = frame.shuttersOpen;
  }
  const midpoint = (ARRIVAL_POD_SHUTTERS_OPEN_START_MS + ARRIVAL_POD_SHUTTERS_OPEN_END_MS) / 2;
  assert.equal(arrivalPodEntryFrame(midpoint).shuttersOpen, .5);
  assert.equal(arrivalPodEntryFrame(midpoint).phase, 'stratosphere');
  assert.equal(arrivalPodEntryFrame(ARRIVAL_POD_SHUTTERS_OPEN_END_MS).shuttersOpen, 1);
  assert.equal(JSON.stringify(ARRIVAL_POD_FLIGHT_PANELS), before);
});

test('rendering uses the complete independent core behind two registered original panels', () => {
  for (const time of [31_000, 43_000, 46_000]) {
    const html = renderAt(time);
    assert.equal((html.match(/data-arrival-pod-core="true"/g) ?? []).length, 1);
    assert.equal((html.match(/data-arrival-pod-core-mode="independent"/g) ?? []).length, 1);
    assert.equal((html.match(/data-arrival-pod-shutter="(?:upper|lower)"/g) ?? []).length, 2);
    assert.match(html, /clipPathUnits="objectBoundingBox"/);
    assert.match(html, /clip-rule="evenodd" fill-rule="evenodd"/);
    assert.ok(html.includes(ARRIVAL_POD_FLIGHT_CORE_CLIP));
    for (const panel of ARRIVAL_POD_FLIGHT_PANELS) {
      assert.ok(html.includes(`data-arrival-anchor="shutter-${panel.id}-hinge"`));
      assert.ok(html.includes(`data-arrival-anchor="shutter-${panel.id}-socket"`));
    }
    assert.equal((html.match(/data-arrival-lit="flight-pod"/g) ?? []).length, 1);
    assert.ok(html.includes(`data-arrival-light-source="${ARRIVAL_POD_ART.podFlightCore}"`));
    assert.equal((html.match(/data-arrival-batch-vfx="pod-flight-glow"/g) ?? []).length, 1);
    const frame = arrivalPodEntryFrame(time);
    assert.ok(html.includes(`data-arrival-pod-deployment="${frame.shuttersOpen}"`));
    assert.ok(html.includes(`data-arrival-pod-hull-heat="${frame.hullHeat}"`));
  }
});

test('the independent core and nose effects retain their measured canvases and are actually used during atmospheric flight', async () => {
  const records = [
    ['podFlightCore', ARRIVAL_POD_SPRITES.flightCore],
    ['podBowShock', ARRIVAL_POD_SPRITES.bowShock],
    ['podPlasmaWake', ARRIVAL_POD_SPRITES.plasmaWake],
  ];
  const html = renderAt(43_000);
  for (const [key, art] of records) {
    const path = ARRIVAL_POD_ART[key];
    const metadata = await sharp(`public${path}`).metadata();
    assert.deepEqual([metadata.width, metadata.height], [art.width, art.height], `${key}: source registration cannot change`);
    assert.equal(metadata.hasAlpha, true);
    assert.ok(html.includes(`<img src="${path}"`), `${key}: a generated asset must be consumed by the actual scene`);
  }
  const { ARRIVAL_SPRITES } = qa.load('app/game/systems/planetArrivalArt.ts');
  assert.deepEqual([ARRIVAL_POD_SPRITES.flightCore.width, ARRIVAL_POD_SPRITES.flightCore.height],
    [ARRIVAL_SPRITES.podFlight.width, ARRIVAL_SPRITES.podFlight.height], 'The full source canvas preserves the old nose and hinge coordinates.');
  assert.ok(ARRIVAL_POD_SPRITES.plasmaWake.end.x < ARRIVAL_POD_SPRITES.plasmaWake.origin.x,
    'The authored wake must extend behind its leading bright head.');
});

test('three pods use their own delayed mechanical and heat state, including both servo cues', () => {
  const time = ARRIVAL_POD_SHUTTERS_OPEN_START_MS + 300;
  const html = renderAt(time, false, 'triad');
  assert.equal((html.match(/data-arrival-pod-core="true"/g) ?? []).length, 3);
  assert.equal((html.match(/data-arrival-pod-shutter="(?:upper|lower)"/g) ?? []).length, 6);
  const tags = [...html.matchAll(/<div[^>]*data-arrival-flight-pod="true"[^>]*>/g)].map(match => match[0]);
  const cues = planetArrivalSoundCues({ biomeId: 'jungle', seed: 0,
    insertion: { version: 1, method: 'pod', team: 'triad' } });
  for (const slot of arrivalFormationSlots('triad')) {
    const tag = tags.find(tag => tag.includes(`data-arrival-member="${slot.id}"`));
    assert.ok(tag, slot.id);
    const expected = arrivalPodEntryFrame(time - slot.delayMs);
    assert.ok(tag.includes(`data-arrival-pod-deployment="${expected.shuttersOpen}"`));
    assert.ok(tag.includes(`data-arrival-pod-heat="${expected.heat}"`));
    for (const [id, atMs] of [['shutters-open', ARRIVAL_POD_SHUTTERS_OPEN_START_MS],
      ['shutters-lock', ARRIVAL_POD_SHUTTERS_OPEN_END_MS]]) {
      const cue = cues.find(cue => cue.id === (slot.index ? `${slot.id}:${id}` : id));
      assert.equal(cue?.atMs, atMs + slot.delayMs);
    }
  }
});

test('reduced motion retains the complete mechanical assembly but suppresses panel travel and flutter', () => {
  for (const time of [31_000, 42_399, 42_400, 43_000, 45_000]) {
    const frame = arrivalPodEntryFrame(time, true);
    assert.equal(frame.shuttersOpen, time < ARRIVAL_POD_SHUTTERS_OPEN_START_MS ? 0 : 1);
    assert.equal(frame.flutterScale, 1);
    const html = renderAt(time, true);
    assert.equal((html.match(/data-arrival-pod-core="true"/g) ?? []).length, 1);
    assert.equal((html.match(/data-arrival-pod-shutter="(?:upper|lower)"/g) ?? []).length, 2);
    assert.deepEqual(arrivalPodEntryFrame(time, true), frame, 'reading a paused frame cannot advance an animation');
  }
});

test('pause freezes the pod assembly and a saved reload replays its native shot with the same mechanical states', () => {
  const original = arrival.createPlanetArrival({ ownerCreatedAt: '2026-11-05T16:00:00.000Z',
    runId: 'pod-mechanical-reload', missionId: 'jungle-vey', encounterRun: 1,
    personalShipId: 'wolf-ship', hunterPresetId: 'wolf',
    insertion: { version: 1, method: 'pod', team: 'triad' } });
  const targetTime = ARRIVAL_POD_SHUTTERS_OPEN_START_MS + 900;
  const saved = arrival.pausePlanetArrival({ ...arrival.startPlanetArrival(original), elapsedMs: targetTime });
  const before = arrivalFormationSlots('triad').map(slot => arrivalPodEntryFrame(saved.elapsedMs - slot.delayMs));
  assert.equal(before[0].shuttersOpen, .5);
  for (const delta of [16, 350, 2_000]) assert.deepEqual(arrival.advancePlanetArrival(saved, delta), saved);
  const restored = arrival.resumePlanetArrival(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.status, 'paused');
  assert.equal(restored.elapsedMs, ARRIVAL_POD_ENTRY_START_MS, 'The established reload contract restarts the native shot.');
  assert.ok(arrivalFormationSlots('triad').every(slot => arrivalPodEntryFrame(restored.elapsedMs - slot.delayMs).shutters === 'closed'));
  let replay = arrival.startPlanetArrival(restored);
  while (replay.elapsedMs < targetTime) replay = arrival.advancePlanetArrival(replay, Math.min(16, targetTime - replay.elapsedMs));
  assert.deepEqual(arrivalFormationSlots('triad').map(slot => arrivalPodEntryFrame(replay.elapsedMs - slot.delayMs)), before,
    'The assembly must not drift or consume a second animation clock after reload.');
});

test('ship insertion does not play pod mechanical cues', () => {
  const cues = planetArrivalSoundCues({ biomeId: 'jungle', seed: 0,
    insertion: { version: 1, method: 'ship', team: 'triad', shipCloak: true }, personalShipId: 'wolf-ship' });
  assert.ok(cues.some(cue => cue.id === 'ship-cloak-off'));
  assert.ok(cues.every(cue => !cue.id.includes('shutters-')));
});
