import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const arrival = qa.load('app/game/systems/planetArrival.ts');
const { PlanetArrivalAudio, PLANET_ARRIVAL_SOUND_CUES, PLANET_ARRIVAL_CUE_LATENESS_MS, planetArrivalSoundCues } =
  qa.load('app/game/systems/planetArrivalAudio.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const presentation = qa.load('app/game/systems/planetArrivalPresentation.ts');
const { arrivalImpactArtForBiome } = qa.load('app/game/systems/planetArrivalArt.ts');
const { solveHunterRig, HUNTER_RIG_CANVAS } = qa.load('app/game/hunterRig.ts');
const input = {
  ownerCreatedAt: '2026-11-04T10:47:00.000Z', runId: 'audio-arrival-run',
  missionId: 'jungle-vey', encounterRun: 0,
  personalShipId: 'classic-predator-spaceship', hunterPresetId: 'jungle-hunter',
};
const state = (elapsedMs = 0, overrides = {}) =>
  ({ ...arrival.startPlanetArrival(arrival.createPlanetArrival(input)), elapsedMs, ...overrides });

function harness(saved = state(0)) {
  const played = [], sounds = [], transitions = [], calls = [];
  let activeLoop = null, observed = saved, available = true;
  const voice = {
    play(sound) {
      calls.push('play');
      if (!available) return false;
      const matches = planetArrivalSoundCues(observed).filter(cue =>
        cue.atMs <= observed.elapsedMs && observed.elapsedMs - cue.atMs <= PLANET_ARRIVAL_CUE_LATENESS_MS &&
        isDeepStrictEqual(cue.sound, sound));
      assert.equal(matches.length, 1, 'an audible sound must correspond to exactly one timely scene contact');
      played.push(matches[0].id);
      sounds.push(sound);
      return true;
    },
    loop(key) {
      if (activeLoop !== key) transitions.push(key);
      activeLoop = key;
      calls.push('loop');
    },
    unlock() { calls.push('unlock'); },
    stop() { activeLoop = null; calls.push('stop'); },
    dispose() { activeLoop = null; calls.push('dispose'); },
  };
  const director = new PlanetArrivalAudio(voice, saved);
  return {
    director, played, sounds, transitions, calls,
    sync(next, ...options) { observed = next; director.sync(next, ...options); },
    setAvailable(value) { available = value; },
    get activeLoop() { return activeLoop; },
  };
}

test('a complete montage plays each authored cue once against the real timeline', () => {
  const f = harness();
  let timeline = state(0);
  f.sync(timeline);
  while (timeline.status === 'playing') {
    timeline = arrival.advancePlanetArrival(timeline, 16);
    f.sync(timeline);
  }
  assert.deepEqual(f.played, planetArrivalSoundCues(timeline).map(cue => cue.id));
  assert.equal(new Set(f.played).size, f.played.length, 'one cue per actual contact');
  assert.deepEqual(f.played.filter(id => !id.startsWith('debris-') && !id.startsWith('footstep-') && !id.startsWith('hunter-')),
    ['destination', 'carrier', 'release', 'descent', 'reentry', 'impact', 'hatch', 'vent']);
  assert.equal(f.played.filter(id => id.startsWith('debris-')).length, 9);
  assert.equal(f.played.filter(id => id.startsWith('footstep-')).length, 4);
  assert.deepEqual(f.transitions, ['orbit', 'carrier', 'descent', 'atmosphere', 'surface:jungle']);
  assert.equal(f.activeLoop, null, 'the natural handoff stops the last ambience');
  assert.equal(f.calls.filter(call => call === 'stop').length, 1);
  f.director.dispose();
});

test('impact waits for the capsule to reach the authored floor contact', () => {
  const landing = arrival.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'landing');
  const contactMs = landing.startMs + (landing.endMs - landing.startMs) * arrival.PLANET_ARRIVAL_CONTACT_PROGRESS;
  assert.equal(contactMs, 53_960);
  const f = harness(state(49_000));
  f.sync(state(contactMs - 1));
  assert.deepEqual(f.played, []);
  f.sync(state(contactMs));
  f.sync(state(contactMs));
  f.sync(state(contactMs + 16));
  assert.deepEqual(f.played, ['impact']);
  f.director.dispose();
});

test('pause clears live sounds and resume cannot replay a reached impact', () => {
  const impactMs = PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === 'impact').atMs;
  const f = harness(state(impactMs - 50));
  f.sync(state(impactMs));
  f.director.suspend();
  f.sync(state(impactMs, { status: 'paused' }));
  assert.equal(f.activeLoop, null);
  assert.equal(f.calls.filter(call => call === 'stop').length, 1, 'suspending twice is harmless');
  f.director.unlock();
  f.sync(state(impactMs));
  f.sync(state(impactMs + 16));
  assert.deepEqual(f.played, ['impact']);
  assert.equal(f.activeLoop, 'surface:jungle');
  f.director.dispose();
});

test('reloading within a shot preserves consumed sounds while future cues still play', () => {
  const saved = state(54_200);
  const f = harness(saved);
  let restored = arrival.resumePlanetArrival(saved);
  assert.equal(restored.elapsedMs, 49_000);
  f.sync(restored);
  restored = arrival.startPlanetArrival(restored);
  while (restored.elapsedMs < 59_000) {
    restored = arrival.advancePlanetArrival(restored, 100);
    f.sync(restored);
  }
  const future = planetArrivalSoundCues(saved).filter(cue => cue.atMs > saved.elapsedMs && cue.atMs <= restored.elapsedMs);
  assert.deepEqual(f.played, future.map(cue => cue.id));
  assert.ok(f.played.includes('vent'), 'the not-yet-reached pressure release still plays after reload');
  assert.ok(!f.played.includes('hunter-touchdown'), 'no foot hits the ground before the new descent finishes');
  assert.ok(!f.played.includes('impact'), 'a replayed shot does not replay an already reached impact');
  f.director.dispose();
});

test('a blocked checkpoint consumes elapsed cues without deferring a burst on resume', () => {
  const f = harness(state(22_950));
  f.sync(state(22_950));
  f.sync(state(23_000), false);
  assert.equal(f.activeLoop, null);
  f.sync(state(23_000));
  f.sync(state(30_950));
  f.sync(state(31_000));
  assert.deepEqual(f.played, ['descent']);
  f.director.dispose();
});

test('a large external jump discards stale cues but permits the next timely event', () => {
  const f = harness();
  const impact = PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === 'impact');
  f.sync(state(impact.atMs + PLANET_ARRIVAL_CUE_LATENESS_MS + 1));
  assert.deepEqual(f.played, []);
  f.sync(state(56_990));
  f.sync(state(57_005));
  assert.deepEqual(f.played, ['hatch']);
  f.director.dispose();
});

test('skip, failed handoff and completion never play or retain scene sounds', () => {
  for (const status of ['prepared', 'paused', 'handoff-pending', 'recoverable-error', 'complete']) {
    const f = harness(state(22_950));
    f.sync(state(22_950));
    f.sync(state(23_000, { status }));
    assert.equal(f.activeLoop, null, status);
    assert.deepEqual(f.played, [], status);
    assert.equal(f.calls.filter(call => call === 'stop').length, 1, status);
    f.director.dispose();
  }
});

test('switching runs retires the old ambience and gives the new run its own cue timeline', () => {
  const f = harness(state(56_990));
  f.sync(state(57_000));
  f.sync(state(0, { runId: 'new-run' }));
  f.sync(state(7_000, { runId: 'new-run' }));
  assert.deepEqual(f.played, ['hatch', 'destination']);
  assert.equal(f.calls.filter(call => call === 'stop').length, 1);
  assert.deepEqual(f.transitions, ['surface:jungle', 'orbit']);
  f.director.dispose();
});

test('the surface ambience follows every real mission biome', () => {
  for (const mission of MISSIONS) {
    const timeline = arrival.startPlanetArrival(arrival.createPlanetArrival({ ...input, missionId: mission.id }));
    const f = harness(timeline);
    f.sync({ ...timeline, elapsedMs: 55_000 });
    assert.equal(f.activeLoop, 'surface:' + mission.biome, mission.id);
    f.director.dispose();
  }
});

test('disposing an arrival is final even if its old timeline or input fires again', () => {
  const f = harness();
  f.sync(state(1_000));
  f.director.dispose();
  const calls = [...f.calls];
  f.director.dispose();
  f.director.unlock();
  f.sync(state(7_000));
  f.director.suspend();
  assert.deepEqual(f.calls, calls);
  assert.deepEqual(f.played, []);
  assert.equal(f.activeLoop, null);
});

test('vent hiss starts at the actual emitter event and ends within its visual lifetime', () => {
  const startMs = presentation.ARRIVAL_VENT_START_MS;
  const cue = planetArrivalSoundCues(state()).find(item => item.id === 'vent');
  assert.equal(cue.atMs, startMs);
  assert.equal(presentation.arrivalEffectsFrame(startMs - 1).ventOpacity, 0);
  assert.ok(presentation.arrivalEffectsFrame(startMs + 16).ventOpacity > 0);
  const layers = [...(cue.sound.tones ?? []), ...(cue.sound.noises ?? [])];
  const endMs = Math.max(...layers.map(layer => ((layer.delay ?? 0) + layer.duration) * 1_000));
  assert.equal(endMs, presentation.ARRIVAL_VENT_DURATION_MS, 'the authored hiss follows the emitter fade');
  const f = harness(state(startMs - 2));
  f.sync(state(startMs - 1));
  assert.deepEqual(f.played, []);
  f.sync(state(startMs));
  f.sync(state(startMs + 1));
  assert.deepEqual(f.played, ['vent']);
  f.director.dispose();
});

test('every seeded debris sound occurs at its own ballistic ground contact', () => {
  for (const seed of [0, 1, 34, 402]) {
    const seeded = state(0, { seed });
    const cues = planetArrivalSoundCues(seeded).filter(cue => cue.id.startsWith('debris-'));
    assert.equal(cues.length, 9);
    assert.equal(new Set(cues.map(cue => cue.id)).size, 9);
    for (const cue of cues) {
      const id = Number(cue.id.split('-')[1]);
      const ageMs = cue.atMs - presentation.ARRIVAL_CONTACT_MS;
      const before = presentation.arrivalImpactDebris(ageMs - .1, seed).find(piece => piece.id === id);
      const contact = presentation.arrivalImpactDebris(ageMs, seed).find(piece => piece.id === id);
      const settled = presentation.arrivalImpactDebris(ageMs + 10, seed).find(piece => piece.id === id);
      assert.ok(before.y < -.001, `${seed}:${id} is still falling before its sound`);
      assert.ok(Math.abs(contact.y) < 1e-7, `${seed}:${id} reaches the ground when its sound fires`);
      assert.ok(Math.abs(settled.y) < 1e-7, `${seed}:${id} remains on the ground`);
      assert.ok(contact.opacity > 0, 'a sound must not be assigned to an invisible expired fragment');
      const f = harness(state(cue.atMs - .01, { seed }));
      f.sync(state(cue.atMs, { seed }));
      f.sync(state(cue.atMs, { seed }));
      assert.deepEqual(f.played, [cue.id]);
      f.director.dispose();
    }
  }
});

test('hunter touchdown and footsteps follow the visible rig after its descent from the doorway', () => {
  const cues = planetArrivalSoundCues(state()).filter(cue => cue.id === 'hunter-touchdown' || cue.id.startsWith('footstep-'));
  assert.deepEqual(cues.map(cue => cue.atMs), [59_300, 59_700, 60_100, 60_500, 60_900]);
  assert.equal(cues[0].atMs, presentation.ARRIVAL_HUNTER_GROUND_CONTACT_MS);
  for (const [index, cue] of cues.entries()) {
    const motion = presentation.arrivalHunterMotion(cue.atMs, false);
    assert.ok(motion.walking, `${cue.id} occurs during the actual walk`);
    assert.equal(motion.phase, index / 2, 'alternate contacts share the renderer phase');
    assert.ok(cue.atMs < presentation.ARRIVAL_HUNTER_MOVE_END_MS);
    const rig = solveHunterRig({ pose: 'run', facing: 1, speed: 65 * motion.speedFactor, phase: motion.phase });
    assert.ok(Math.abs(rig.bones.root.f - HUNTER_RIG_CANVAS.groundY) < 1e-7, 'the rig is at its contact height');
  }
  const f = harness(state(58_800));
  f.sync(state(59_200));
  assert.deepEqual(f.played, [], 'no footstep while the hunter is descending');
  f.sync(state(59_300));
  assert.deepEqual(f.played, ['hunter-touchdown']);
  const settled = presentation.arrivalHunterMotion(presentation.ARRIVAL_HUNTER_MOVE_END_MS);
  assert.equal(settled.phase, 2.5, 'the final partial half-stride ends on the other foot');
  assert.equal(settled.speedFactor, 0);
  assert.equal(settled.contact, 'ground');
  f.sync(state(presentation.ARRIVAL_HUNTER_MOVE_END_MS - 1));
  f.sync(state(presentation.ARRIVAL_HUNTER_MOVE_END_MS));
  assert.deepEqual(f.played, ['hunter-touchdown', 'hunter-settle']);
  f.director.dispose();
});

test('the sound material follows the real dry, ice and wet impact artwork', () => {
  const materials = new Map();
  for (const biomeId of ['jungle', 'desert', 'volcano', 'fungal', 'ruins', 'ice', 'ocean', 'swamp']) {
    const timeline = state(0, { biomeId });
    const cues = planetArrivalSoundCues(timeline);
    const material = arrivalImpactArtForBiome(biomeId).material;
    const contactSounds = ['impact', 'debris-0', 'hunter-touchdown', 'footstep-1'].map(id => cues.find(cue => cue.id === id).sound);
    if (materials.has(material)) assert.deepEqual(contactSounds, materials.get(material), `${biomeId} shares its physical surface`);
    else materials.set(material, contactSounds);
    const impactCue = cues.find(cue => cue.id === 'impact');
    const f = harness(state(impactCue.atMs - 1, { biomeId }));
    f.sync(state(impactCue.atMs, { biomeId }));
    assert.deepEqual(f.sounds, [impactCue.sound], `${biomeId} uses its material in the real audio director`);
    f.director.dispose();
  }
  assert.deepEqual([...materials.keys()].sort(), ['dry', 'ice', 'wet']);
  for (const a of materials.keys()) for (const b of materials.keys()) if (a !== b) {
    for (let event = 0; event < 4; event += 1) assert.notDeepEqual(materials.get(a)[event], materials.get(b)[event], `${a}/${b} event ${event}`);
  }
});

test('reduced motion omits sounds for hidden movement and never catches them up when restored', () => {
  const f = harness();
  let timeline = state();
  while (timeline.status === 'playing') {
    timeline = arrival.advancePlanetArrival(timeline, 100);
    f.sync(timeline, true, true);
  }
  assert.deepEqual(f.played, ['destination', 'carrier', 'release', 'descent', 'reentry', 'impact', 'hatch', 'vent']);
  f.director.dispose();

  const g = harness(state(59_290));
  g.sync(state(59_300), true, true);
  g.sync(state(59_310), true, false);
  assert.deepEqual(g.played, [], 'turning movement back on cannot replay the omitted touchdown');
  for (let atMs = 59_400; atMs <= 59_700; atMs += 100) g.sync(state(atMs));
  assert.deepEqual(g.played, ['footstep-1']);
  g.director.dispose();
});

test('pause during steam or a fragment contact cancels the voice without replaying the consumed event', () => {
  const cues = planetArrivalSoundCues(state());
  for (const id of ['vent', 'debris-0', 'hunter-touchdown', 'footstep-1', 'hunter-settle']) {
    const cue = cues.find(item => item.id === id);
    const f = harness(state(cue.atMs - .01));
    f.sync(state(cue.atMs));
    f.sync(state(cue.atMs, { status: 'paused' }));
    assert.equal(f.activeLoop, null, id);
    f.director.unlock();
    f.sync(state(cue.atMs));
    assert.deepEqual(f.played, [id], id);
    assert.equal(f.calls.filter(call => call === 'stop').length, 1, id);
    f.director.dispose();
  }
});

test('an external seek across a debris cluster does not burst old contacts into the same frame', () => {
  const cue = planetArrivalSoundCues(state()).find(item => item.id === 'debris-0');
  const f = harness(state(presentation.ARRIVAL_CONTACT_MS));
  f.sync(state(cue.atMs));
  assert.deepEqual(f.played, [], 'only normal bounded timeline steps can trigger motion contacts');
  f.sync(state(56_990));
  f.sync(state(57_000));
  assert.deepEqual(f.played, ['hatch'], 'future timely mechanisms still work after a seek');
  f.director.dispose();
});

test('a blocked audio unlock consumes a vent cue instead of playing it late when audio becomes available', () => {
  const f = harness(state(presentation.ARRIVAL_VENT_START_MS - 1));
  f.setAvailable(false);
  f.sync(state(presentation.ARRIVAL_VENT_START_MS));
  f.setAvailable(true);
  f.director.unlock();
  f.sync(state(presentation.ARRIVAL_VENT_START_MS + 10));
  assert.deepEqual(f.played, []);
  f.sync(state(59_290));
  f.sync(state(59_300));
  assert.deepEqual(f.played, ['hunter-touchdown']);
  f.director.dispose();
});

test('ship insertion uses controlled reactor, braking and setdown cues without any capsule mechanism or crash', () => {
  const { planetArrivalAmbience } = qa.load('app/game/systems/planetArrivalAudio.ts');
  for (const team of ['solo', 'triad']) {
    const insertion = { version: 1, method: 'ship', team };
    const cues = planetArrivalSoundCues(state(0, { insertion }));
    assert.ok(cues.some(cue => cue.id === 'ship-deorbit'));
    assert.ok(cues.some(cue => cue.id === 'ship-braking'));
    assert.equal(cues.find(cue => cue.id === 'ship-setdown').atMs, presentation.ARRIVAL_CONTACT_MS);
    for (const cue of cues) assert.doesNotMatch(cue.id, /(?:^|:)(release|impact|hatch|vent|reentry|debris-\d+)$/);
    assert.equal(cues.filter(cue => cue.id.endsWith('hunter-touchdown')).length, team === 'triad' ? 3 : 1);
    assert.equal(cues.filter(cue => cue.id.endsWith('hunter-settle')).length, team === 'triad' ? 3 : 1);
    const setdown = cues.find(cue => cue.id === 'ship-setdown');
    const crash = PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === 'impact');
    assert.ok(setdown.sound.tones[0].gain < crash.sound.tones[0].gain / 2);
  }
  let previousGain = Infinity, previousFrequency = Infinity;
  for (const elapsedMs of [49_000, 50_300, 51_600, 52_800]) {
    const ambient = planetArrivalAmbience('landing', 'jungle', 'ship', elapsedMs);
    assert.match(ambient.key, /^ship:braking:/);
    const reactor = ambient.sound.tones[0];
    assert.ok(reactor.gain < previousGain && reactor.frequency < previousFrequency);
    previousGain = reactor.gain; previousFrequency = reactor.frequency;
  }
  assert.equal(planetArrivalAmbience('landing', 'jungle', 'ship', presentation.ARRIVAL_CONTACT_MS).key, 'surface:jungle');
});

test('trio contacts use each actual body clock and each capsule fragment seed', () => {
  const insertion = { version: 1, method: 'pod', team: 'triad' };
  const timeline = state(0, { insertion, seed: 31 });
  const cues = planetArrivalSoundCues(timeline);
  assert.equal(new Set(cues.map(cue => cue.id)).size, cues.length);
  for (const slot of presentation.arrivalFormationSlots('triad')) {
    const id = cue => slot.index ? `${slot.id}:${cue}` : cue;
    for (const event of ['release', 'impact', 'hatch', 'vent']) {
      assert.equal(cues.find(cue => cue.id === id(event)).atMs,
        PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === event).atMs + slot.delayMs);
    }
    for (const piece of presentation.arrivalImpactDebris(0, timeline.seed + slot.index)) {
      const cue = cues.find(cue => cue.id === id(`debris-${piece.id}`));
      assert.ok(Math.abs(cue.atMs - presentation.ARRIVAL_CONTACT_MS - slot.delayMs - piece.settleAgeMs) < 1e-7);
    }
    for (const suffix of ['hunter-touchdown', 'footstep-1', 'footstep-2', 'footstep-3', 'footstep-4']) {
      const cue = cues.find(cue => cue.id === id(suffix));
      const motion = presentation.arrivalHunterMotion(cue.atMs - slot.delayMs);
      assert.equal(motion.contact, 'ground'); assert.ok(motion.walking);
      assert.ok(Math.abs(motion.phase * 2 - Math.round(motion.phase * 2)) < 1e-7);
    }
    assert.equal(cues.find(cue => cue.id === id('hunter-settle')).atMs, presentation.ARRIVAL_HUNTER_MOVE_END_MS + slot.delayMs);
  }
  assert.ok(Math.max(...cues.map(cue => cue.atMs)) < arrival.PLANET_ARRIVAL_DURATION_MS);
});

test('level ship exits sound an actual threshold stride instead of a non-existent downward landing', () => {
  const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
  const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
  const { shipSupportsSurfaceInsertion } = qa.load('app/game/systems/planetInsertion.ts');
  const { arrivalSurfaceShipGeometry } = qa.load('app/game/systems/planetArrivalSpatial.ts');
  const insertion = { version: 1, method: 'ship', team: 'triad' };
  let levelCount = 0;
  for (const personalShipId of SHIP_IDS.filter(shipSupportsSurfaceInsertion)) {
    const art = carrierArtForShip(personalShipId);
    if (Math.abs(art.groundContact.y - art.groundExit.y) > 1e-7) continue;
    levelCount += 1;
    const geometry = arrivalSurfaceShipGeometry(art, art.nose.x < art.tail.x ? -1 : 1, 624);
    const cues = planetArrivalSoundCues(state(0, { personalShipId, insertion }));
    assert.equal(cues.filter(cue => cue.id.endsWith('hunter-threshold-step')).length, 3);
    assert.equal(cues.filter(cue => cue.id.endsWith('hunter-step-out')).length, 3);
    assert.ok(cues.every(cue => !cue.id.endsWith('hunter-touchdown')));
    for (const slot of presentation.arrivalFormationSlots('triad')) {
      const cue = cues.find(cue => cue.id === (slot.index ? slot.id + ':' : '') + 'hunter-threshold-step');
      const pose = presentation.arrivalHunterEgress(cue.atMs - slot.delayMs, {
        threshold: geometry.exit, floorY: 624, clearanceX: geometry.exit.x + 40, destinationX: geometry.exit.x + 120,
      });
      assert.equal(pose.contact, 'threshold'); assert.equal(pose.pose, 'run'); assert.equal(pose.phase, .5);
      assert.equal(pose.y, 624);
      const rig = solveHunterRig({ pose: pose.pose, facing: pose.facing, speed: pose.speed, phase: pose.phase });
      assert.ok(Math.abs(rig.bones.root.f - HUNTER_RIG_CANVAS.groundY) < 1e-7);
    }
  }
  assert.ok(levelCount >= 2);
});

test('all four method/team combinations play exactly their own timeline once and stop cleanly', () => {
  for (const method of ['pod', 'ship']) for (const team of ['solo', 'triad']) {
    const insertion = { version: 1, method, team };
    const f = harness(state(0, { insertion }));
    let timeline = state(0, { insertion });
    while (timeline.status === 'playing') {
      timeline = arrival.advancePlanetArrival(timeline, 100);
      f.sync(timeline);
    }
    assert.deepEqual(f.played, planetArrivalSoundCues(timeline).map(cue => cue.id), `${method}/${team}`);
    assert.equal(new Set(f.played).size, f.played.length);
    assert.equal(f.activeLoop, null);
    f.director.dispose();
  }
});

test('ship/trio pause, reload, external jumps and reduced motion cannot queue a delayed burst', () => {
  for (const method of ['pod', 'ship']) {
    const insertion = { version: 1, method, team: 'triad' };
    const cues = planetArrivalSoundCues(state(0, { insertion }));
    const firstContact = cues.find(cue => cue.id === 'karhek:hunter-touchdown');
    const f = harness(state(firstContact.atMs - 1, { insertion }));
    f.sync(state(firstContact.atMs, { insertion }));
    f.sync(state(firstContact.atMs, { insertion, status: 'paused' }));
    f.sync(state(firstContact.atMs, { insertion }));
    assert.deepEqual(f.played, ['karhek:hunter-touchdown']);
    f.sync(state(61_800, { insertion }));
    assert.deepEqual(f.played, ['karhek:hunter-touchdown'], 'seek must not replay already crossed trio contacts');
    f.director.dispose();

    const saved = state(60_250, { insertion });
    const restoredAudio = harness(saved);
    let restored = arrival.startPlanetArrival(arrival.resumePlanetArrival(saved));
    while (restored.status === 'playing') {
      restored = arrival.advancePlanetArrival(restored, 100);
      restoredAudio.sync(restored);
    }
    assert.deepEqual(restoredAudio.played, cues.filter(cue => cue.atMs > saved.elapsedMs).map(cue => cue.id));
    restoredAudio.director.dispose();

    const reduced = harness(state(0, { insertion }));
    let reducedState = state(0, { insertion });
    while (reducedState.status === 'playing') {
      reducedState = arrival.advancePlanetArrival(reducedState, 100);
      reduced.sync(reducedState, true, true);
    }
    assert.deepEqual(reduced.played, cues.filter(cue => !cue.motionOnly).map(cue => cue.id));
    reduced.director.dispose();
  }
});
