import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../app/game/sound.ts';

const ids = ['pod-arm', 'pod-cancel', 'pod-detonate'];

test('remote pod events each dispatch one optional authored sound without a duplicate synthesized voice', () => {
  for (const id of ids) {
    const audio = new GameAudio();
    const calls = [];
    audio.fileAudio.playSfx = value => { calls.push(value); return true; };
    audio.readyTime = () => { throw new Error('Unexpected duplicate fallback'); };
    audio.playSfx(id);
    assert.deepEqual(calls, [id]);
    audio.dispose();
  }
});

test('the pod fallback produces distinct arm, cancel and blast sounds on the existing effects clock', () => {
  const voices = [];
  for (const id of ids) {
    const audio = new GameAudio();
    const tones = [], noises = [];
    audio.fileAudio.playSfx = () => false;
    audio.readyTime = () => 12;
    audio.tone = (frequency, options) => tones.push({ frequency, ...options });
    audio.noise = options => noises.push(options);
    audio.playSfx(id);
    assert.ok(tones.length > 0);
    for (const sound of [...tones, ...noises]) {
      assert.ok(sound.at >= 12 && sound.at < 12.5);
      assert.ok(sound.duration > 0 && sound.duration <= 1.2);
    }
    voices.push({ id, tones, noises });
    audio.dispose();
  }
  assert.equal(voices[0].tones.length, 3);
  assert.equal(voices[1].tones.length, 2);
  assert.ok(voices[2].noises.length > 0);
  assert.notDeepEqual(voices[0].tones, voices[1].tones);
});

test('pod synthesis stays silent when the existing audio transport is not ready', () => {
  const audio = new GameAudio();
  audio.fileAudio.playSfx = () => false;
  audio.readyTime = () => null;
  audio.tone = () => { throw new Error('Sound escaped the paused/unready transport'); };
  audio.noise = () => { throw new Error('Noise escaped the paused/unready transport'); };
  for (const id of ids) audio.playSfx(id);
  audio.dispose();
});
