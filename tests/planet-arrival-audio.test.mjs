import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const arrival = qa.load('app/game/systems/planetArrival.ts');
const { PlanetArrivalAudio, PLANET_ARRIVAL_SOUND_CUES, PLANET_ARRIVAL_CUE_LATENESS_MS } =
  qa.load('app/game/systems/planetArrivalAudio.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const input = {
  ownerCreatedAt: '2026-11-04T10:47:00.000Z', runId: 'audio-arrival-run',
  missionId: 'jungle-vey', encounterRun: 0,
  personalShipId: 'classic-predator-spaceship', hunterPresetId: 'jungle-hunter',
};
const state = (elapsedMs = 0, overrides = {}) =>
  ({ ...arrival.startPlanetArrival(arrival.createPlanetArrival(input)), elapsedMs, ...overrides });

function harness(saved = state(0)) {
  const played = [], transitions = [], calls = [];
  let activeLoop = null;
  const voice = {
    play(sound) { played.push(PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.sound === sound)?.id); calls.push('play'); return true; },
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
  return { director, played, transitions, calls, get activeLoop() { return activeLoop; } };
}

test('a complete montage plays each authored cue once against the real timeline', () => {
  const f = harness();
  let timeline = state(0);
  f.director.sync(timeline);
  while (timeline.status === 'playing') {
    timeline = arrival.advancePlanetArrival(timeline, 16);
    f.director.sync(timeline);
  }
  assert.deepEqual(f.played, ['destination', 'carrier', 'release', 'descent', 'reentry', 'impact', 'hatch', 'first-step', 'second-step']);
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
  f.director.sync(state(contactMs - 1));
  assert.deepEqual(f.played, []);
  f.director.sync(state(contactMs));
  f.director.sync(state(contactMs));
  f.director.sync(state(contactMs + 16));
  assert.deepEqual(f.played, ['impact']);
  f.director.dispose();
});

test('pause clears live sounds and resume cannot replay a reached impact', () => {
  const impactMs = PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === 'impact').atMs;
  const f = harness(state(impactMs - 50));
  f.director.sync(state(impactMs));
  f.director.suspend();
  f.director.sync(state(impactMs, { status: 'paused' }));
  assert.equal(f.activeLoop, null);
  assert.equal(f.calls.filter(call => call === 'stop').length, 1, 'suspending twice is harmless');
  f.director.unlock();
  f.director.sync(state(impactMs));
  f.director.sync(state(impactMs + 16));
  assert.deepEqual(f.played, ['impact']);
  assert.equal(f.activeLoop, 'surface:jungle');
  f.director.dispose();
});

test('reloading within a shot preserves consumed sounds while future cues still play', () => {
  const saved = state(54_200);
  const f = harness(saved);
  let restored = arrival.resumePlanetArrival(saved);
  assert.equal(restored.elapsedMs, 49_000);
  f.director.sync(restored);
  restored = arrival.startPlanetArrival(restored);
  while (restored.elapsedMs < 59_000) {
    restored = arrival.advancePlanetArrival(restored, 100);
    f.director.sync(restored);
  }
  assert.deepEqual(f.played, ['hatch', 'first-step']);
  assert.ok(!f.played.includes('impact'), 'a replayed shot does not replay an already reached impact');
  f.director.dispose();
});

test('a blocked checkpoint consumes elapsed cues without deferring a burst on resume', () => {
  const f = harness(state(22_950));
  f.director.sync(state(22_950));
  f.director.sync(state(23_000), false);
  assert.equal(f.activeLoop, null);
  f.director.sync(state(23_000));
  f.director.sync(state(30_950));
  f.director.sync(state(31_000));
  assert.deepEqual(f.played, ['descent']);
  f.director.dispose();
});

test('a large external jump discards stale cues but permits the next timely event', () => {
  const f = harness();
  const impact = PLANET_ARRIVAL_SOUND_CUES.find(cue => cue.id === 'impact');
  f.director.sync(state(impact.atMs + PLANET_ARRIVAL_CUE_LATENESS_MS + 1));
  assert.deepEqual(f.played, []);
  f.director.sync(state(56_990));
  f.director.sync(state(57_005));
  assert.deepEqual(f.played, ['hatch']);
  f.director.dispose();
});

test('skip, failed handoff and completion never play or retain scene sounds', () => {
  for (const status of ['prepared', 'paused', 'handoff-pending', 'recoverable-error', 'complete']) {
    const f = harness(state(22_950));
    f.director.sync(state(22_950));
    f.director.sync(state(23_000, { status }));
    assert.equal(f.activeLoop, null, status);
    assert.deepEqual(f.played, [], status);
    assert.equal(f.calls.filter(call => call === 'stop').length, 1, status);
    f.director.dispose();
  }
});

test('switching runs retires the old ambience and gives the new run its own cue timeline', () => {
  const f = harness(state(56_990));
  f.director.sync(state(57_000));
  f.director.sync(state(0, { runId: 'new-run' }));
  f.director.sync(state(7_000, { runId: 'new-run' }));
  assert.deepEqual(f.played, ['hatch', 'destination']);
  assert.equal(f.calls.filter(call => call === 'stop').length, 1);
  assert.deepEqual(f.transitions, ['surface:jungle', 'orbit']);
  f.director.dispose();
});

test('the surface ambience follows every real mission biome', () => {
  for (const mission of MISSIONS) {
    const timeline = arrival.startPlanetArrival(arrival.createPlanetArrival({ ...input, missionId: mission.id }));
    const f = harness(timeline);
    f.director.sync({ ...timeline, elapsedMs: 55_000 });
    assert.equal(f.activeLoop, 'surface:' + mission.biome, mission.id);
    f.director.dispose();
  }
});

test('disposing an arrival is final even if its old timeline or input fires again', () => {
  const f = harness();
  f.director.sync(state(1_000));
  f.director.dispose();
  const calls = [...f.calls];
  f.director.dispose();
  f.director.unlock();
  f.director.sync(state(7_000));
  f.director.suspend();
  assert.deepEqual(f.calls, calls);
  assert.deepEqual(f.played, []);
  assert.equal(f.activeLoop, null);
});
