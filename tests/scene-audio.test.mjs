import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSceneAudio } from '../app/game/systems/sceneAudio.ts';
import { GameAudio } from '../app/game/sound.ts';

const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const drone = { tones: [{ frequency: 48, gain: .05 }], noises: [{ filterFrequency: 160, gain: .02 }] };
const impact = {
  tones: [{ frequency: 88, endFrequency: 31, duration: .5, gain: .2 }],
  noises: [{ duration: .7, delay: .09, gain: .18, filterFrequency: 700 }],
};

/** A Web Audio graph recorder: scheduling/routing/lifecycle, not an acoustic simulation. */
function audioGraph() {
  const nodes = [], sources = [], parameters = [];
  const parameter = (initial = 1) => {
    const calls = [];
    const value = {
      value: initial, calls,
      setValueAtTime(value, at) { calls.push({ type: 'set', value, at }); this.value = value; },
      linearRampToValueAtTime(value, at) { calls.push({ type: 'linear', value, at }); this.value = value; },
      exponentialRampToValueAtTime(value, at) {
        assert.ok(Number.isFinite(value) && value > 0, 'exponential target must be positive');
        calls.push({ type: 'exponential', value, at }); this.value = value;
      },
      cancelScheduledValues(at) { calls.push({ type: 'cancel', at }); },
    };
    parameters.push(value);
    return value;
  };
  const node = kind => {
    const result = {
      kind, connections: [], disconnected: false,
      connect(target) { this.connections.push(target); return target; },
      disconnect() { this.disconnected = true; },
    };
    nodes.push(result);
    return result;
  };
  const source = kind => {
    const result = Object.assign(node(kind), {
      starts: [], stops: [], onended: null,
      start(at = context.currentTime) { this.starts.push(at); },
      stop(at = context.currentTime) { this.stops.push(at); },
      end() { this.onended?.(); },
    });
    sources.push(result);
    return result;
  };
  const context = {
    currentTime: 10, sampleRate: 8_000, state: 'running',
    destination: node('destination'),
    createGain() { return Object.assign(node('gain'), { gain: parameter() }); },
    createBiquadFilter() { return Object.assign(node('filter'), { frequency: parameter(350), Q: parameter(1), type: 'lowpass' }); },
    createOscillator() { return Object.assign(source('oscillator'), { frequency: parameter(440), type: 'sine' }); },
    createBufferSource() { return Object.assign(source('buffer-source'), { buffer: null, loop: false }); },
    createBuffer(channels, length, sampleRate) {
      const arrays = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, sampleRate, numberOfChannels: channels, getChannelData(channel) { return arrays[channel]; } };
    },
    close() { this.state = 'closed'; return Promise.resolve(); },
    suspend() { this.state = 'suspended'; return Promise.resolve(); },
    resume() { this.state = 'running'; return Promise.resolve(); },
  };
  const effects = context.createGain();
  return { context, effects, nodes, sources, parameters };
}

function sceneHarness(options = {}) {
  const graph = audioGraph(), pending = [];
  let available = options.available ?? true, releases = 0;
  const voice = new GameSceneAudio({
    graph: () => available ? graph : null,
    unlock: options.deferredUnlock ? () => new Promise(resolve => pending.push(resolve)) : async () => {},
    released: () => { releases += 1; },
  });
  return { ...graph, voice, pending, enable() { available = true; }, get releases() { return releases; } };
}

test('repeated frame requests keep one ambience and every source routes through the effects bus', () => {
  const h = sceneHarness();
  for (let frame = 0; frame < 1_000; frame += 1) h.voice.loop('orbit', drone);
  assert.equal(h.sources.length, 2);
  for (const source of h.sources) {
    assert.equal(source.starts.length, 1);
    const filter = source.connections[0];
    const envelope = filter.connections[0];
    assert.equal(envelope.connections[0], h.effects);
    assert.ok(!source.connections.includes(h.context.destination));
  }
  h.voice.dispose();
});

test('changing ambience retires the old loop once and natural endings disconnect every owned node', () => {
  const h = sceneHarness();
  h.voice.loop('orbit', drone);
  const old = [...h.sources];
  h.voice.loop('atmosphere', { tones: [{ frequency: 90, gain: .08 }] });
  assert.equal(h.sources.length, 3);
  for (const source of old) {
    assert.deepEqual(source.stops, [10.16]);
    source.end();
    const filter = source.connections[0], envelope = filter.connections[0];
    assert.ok(source.disconnected && filter.disconnected && envelope.disconnected);
  }
  h.voice.loop('atmosphere', drone);
  assert.equal(h.sources.length, 3, 'a same-key frame cannot start a second loop');
  assert.ok(!h.sources.at(-1).disconnected);
  h.voice.dispose();
});

test('pause immediately cancels short, delayed, live and fading voices', () => {
  const h = sceneHarness();
  h.voice.loop('orbit', drone);
  h.voice.loop('descent', { tones: [{ frequency: 65 }] });
  assert.equal(h.voice.play(impact), true);
  assert.ok(h.sources.some(source => source.starts[0] > h.context.currentTime), 'the cue owns a delayed layer');
  h.voice.stop();
  for (const source of h.sources) {
    assert.equal(source.stops.at(-1), h.context.currentTime);
    const filter = source.connections[0], envelope = filter.connections[0];
    assert.equal(envelope.gain.value, 0);
    assert.ok(source.disconnected && filter.disconnected && envelope.disconnected);
  }
  h.voice.stop();
  h.voice.dispose();
  h.voice.dispose();
  assert.equal(h.releases, 1);
});

test('short sounds release their graph after normal completion without touching the ambience', () => {
  const h = sceneHarness();
  h.voice.loop('surface', drone);
  const ambience = [...h.sources];
  h.voice.play(impact);
  const oneShots = h.sources.slice(ambience.length);
  assert.equal(oneShots.length, 2);
  for (const source of oneShots) {
    assert.equal(source.stops.length, 1);
    assert.ok(source.stops[0] > source.starts[0]);
    source.end();
    assert.ok(source.disconnected);
    assert.equal(source.onended, null);
  }
  assert.ok(ambience.every(source => !source.disconnected));
  h.voice.dispose();
});

test('a delayed autoplay unlock cannot resurrect a scene after pause or disposal', async () => {
  for (const terminate of ['stop', 'dispose']) {
    const h = sceneHarness({ available: false, deferredUnlock: true });
    h.voice.loop('orbit', drone);
    assert.equal(h.pending.length, 1);
    h.voice[terminate]();
    h.enable();
    h.pending.shift()();
    await nextTurn();
    assert.equal(h.sources.length, 0, terminate);
    h.voice.dispose();
  }
});

test('out-of-order unlocks permit only the latest ambience and never queue a blocked impact', async () => {
  const h = sceneHarness({ available: false, deferredUnlock: true });
  assert.equal(h.voice.play(impact), false);
  h.voice.loop('orbit', drone);
  h.voice.loop('atmosphere', { tones: [{ frequency: 90 }] });
  assert.equal(h.pending.length, 2);
  h.enable();
  h.pending[1]();
  await nextTurn();
  h.pending[0]();
  await nextTurn();
  assert.equal(h.sources.length, 1);
  assert.equal(h.sources[0].frequency.calls[0].value, 90);
  h.voice.dispose();
});

test('duplicate pending unlocks still create a single persistent voice', async () => {
  const h = sceneHarness({ available: false, deferredUnlock: true });
  h.voice.loop('orbit', drone);
  h.voice.unlock();
  h.voice.unlock();
  h.enable();
  h.pending.forEach(resolve => resolve());
  await nextTurn();
  assert.equal(h.sources.length, 2);
  h.voice.dispose();
});

test('zero-gain layers allocate no sources and authored values stay bounded before scheduling', () => {
  const h = sceneHarness();
  h.voice.play({ tones: [{ frequency: 80, gain: 0 }], noises: [{ gain: 0 }] });
  assert.equal(h.sources.length, 0, 'true silence does not become a nonzero envelope floor');
  h.voice.play({
    tones: Array.from({ length: 20 }, () => ({ frequency: NaN, endFrequency: -1, duration: Infinity, delay: -20, gain: 99 })),
    noises: Array.from({ length: 20 }, () => ({ duration: -2, delay: Infinity, filterFrequency: NaN, gain: 99 })),
  });
  assert.equal(h.sources.length, 10, 'one cue cannot allocate unbounded layers');
  for (const parameter of h.parameters) for (const call of parameter.calls) {
    assert.ok(Number.isFinite(call.at));
    if ('value' in call) assert.ok(Number.isFinite(call.value));
  }
  for (const source of h.sources) {
    assert.ok(source.starts[0] >= h.context.currentTime);
    assert.ok(source.stops[0] > source.starts[0] && source.stops[0] <= source.starts[0] + 4.025);
  }
  h.voice.dispose();
});

function sharedEngine() {
  const h = audioGraph(), audio = new GameAudio();
  // Install the shared browser graph; the production setters and scene factory
  // are exercised below without creating a real audio device in Node.
  audio.context = h.context;
  audio.master = h.context.createGain();
  audio.music = h.context.createGain();
  audio.effects = h.effects;
  h.effects.connect(audio.master);
  audio.music.connect(audio.master);
  audio.master.connect(h.context.destination);
  return { ...h, audio };
}

test('scene sounds obey master/effects zero and mute without changing the player mix', () => {
  const h = sharedEngine(), voice = h.audio.createSceneAudio();
  const cases = [
    { master: .8, effects: 0, music: .4, muted: false },
    { master: 0, effects: .7, music: .4, muted: false },
    { master: .8, effects: .7, music: .4, muted: true },
  ];
  for (const mix of cases) {
    h.audio.setMix(mix);
    voice.loop('orbit', drone);
    voice.play(impact);
    assert.equal(h.effects.gain.value * h.audio.master.gain.value, 0, 'every scene path has zero output gain');
    assert.deepEqual(h.audio.getMix(), mix);
    const count = h.sources.length;
    h.audio.setMix({ ...mix, master: .8, effects: .7, muted: false });
    voice.loop('orbit', drone);
    assert.equal(h.sources.length, count, 'unmuting cannot duplicate the active ambience');
    voice.stop();
  }
  voice.dispose();
  h.audio.dispose();
});

test('the owning engine pauses all scene voices and disposal releases every scene exactly once', () => {
  const h = sharedEngine(), first = h.audio.createSceneAudio(), second = h.audio.createSceneAudio();
  first.loop('arrival', drone);
  second.play(impact);
  h.audio.setPaused(true);
  assert.ok(h.sources.every(source => source.disconnected));
  const count = h.sources.length;
  first.loop('arrival', drone);
  assert.equal(first.play(impact), false);
  assert.equal(h.sources.length, count);
  h.audio.setPaused(false);
  first.loop('arrival', drone);
  assert.equal(h.sources.length, count + 2);
  first.dispose();
  assert.equal(h.audio.sceneVoices.size, 1);
  h.audio.dispose();
  assert.equal(h.audio.sceneVoices.size, 0);
  assert.equal(h.context.state, 'closed');
  assert.ok(h.sources.every(source => source.disconnected));
  second.play(impact);
  second.loop('stale', drone);
  assert.equal(h.sources.length, count + 2);
});
