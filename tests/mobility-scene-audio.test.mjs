import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export {createMobilityAudio} from './app/game/systems/mobility/audio';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const {createMobilityAudio} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));

function scene(model = 'scout_grav_sled') {
  const loop = [], play = [], lifetime = [];
  const controller = createMobilityAudio({
    loop: (id, preset) => loop.push({id, preset}),
    play: preset => play.push(preset) > 0,
    unlock: () => lifetime.push('unlock'),
    stop: () => lifetime.push('stop'),
    dispose: () => lifetime.push('dispose'),
  }, model);
  return {controller, loop, play, lifetime};
}

const course = {x: 610, y: 490, speed: 0, condition: 100, energy: 100, impacts: 0, cargoKg: 0,
  cargoDelivered: false, checkpoint: 0, overheated: false, distance: 0, fatigue: 0, panicked: false};
const neutral = {throttle: 0, brake: false, boost: false};

test('dedicated engines do not rearm a voice on each movement tick and stop before resuming', () => {
  const sled = scene(), bike = scene('clan_bike');
  sled.controller.unlock();
  sled.controller.drive(course, course, neutral);
  sled.controller.drive(course, course, neutral);
  assert.deepEqual(sled.loop.map(event => event.id), ['sled:idle']);
  bike.controller.drive(course, course, neutral);
  assert.notEqual(sled.loop[0].preset.tones[0].frequency, bike.loop[0].preset.tones[0].frequency);
  const moving = {...course, speed: 54};
  sled.controller.drive(course, moving, {...neutral, throttle: 1});
  sled.controller.drive(moving, moving, {...neutral, throttle: 1, boost: true});
  sled.controller.drive(moving, moving, {...neutral, throttle: 1, boost: true, brake: true});
  sled.controller.drive(moving, {...moving, energy: 0}, neutral);
  assert.deepEqual(sled.loop.map(event => event.id), ['sled:idle', 'sled:drive', 'sled:boost', 'sled:drive', 'sled:off']);
  assert.deepEqual(sled.loop.at(-1).preset, {});
  sled.controller.stop();
  sled.controller.drive(course, course, neutral);
  sled.controller.dispose();
  assert.equal(sled.loop.at(-1).id, 'sled:idle');
  assert.deepEqual(sled.lifetime, ['unlock', 'stop', 'dispose']);
});

test('frein, cendres, choc, balise et manutention ont des signatures propres et déclenchées à la transition', () => {
  const a = scene(), before = {...course, speed: 50}, cargo = {...before, x: 636, impacts: 1, cargoKg: 25, checkpoint: 1};
  a.controller.drive(before, cargo, {...neutral, brake: true});
  assert.equal(a.play.length, 5);
  assert.equal(new Set(a.play).size, 5);
  a.controller.drive(cargo, cargo, {...neutral, brake: true});
  assert.equal(a.play.length, 5);
  a.controller.drive(cargo, {...cargo, cargoKg: 0, cargoDelivered: true}, neutral);
  assert.equal(a.play.length, 6);
  assert.equal(new Set(a.play).size, 6);
});

test('mount breath, footfalls and panic follow real movement, fatigue and panic transitions', () => {
  const a = scene('kha_rha');
  const walking = {...course, speed: 40, distance: 23, fatigue: 79};
  a.controller.ride(walking, {...walking, distance: 24, fatigue: 80});
  assert.equal(a.play.length, 2);
  const stopped = {...walking, speed: 0, distance: 24, fatigue: 80};
  a.controller.ride(stopped, stopped);
  assert.equal(a.play.length, 2);
  a.controller.ride(stopped, {...stopped, panicked: true});
  assert.equal(a.play.length, 3);
  assert.equal(new Set(a.play).size, 3);
  assert.deepEqual(a.loop, []);
});
