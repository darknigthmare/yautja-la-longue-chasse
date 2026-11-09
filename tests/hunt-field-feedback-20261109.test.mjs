import assert from 'node:assert/strict';
import test from 'node:test';
import { huntFieldWorkSoundsV112 } from '../app/game/systems/huntFieldFeedbackV112.ts';
import { GameAudio } from '../app/game/sound.ts';

const work = (elapsed, action = 'flay', completedEventIds = []) => ({
  operation: elapsed === null ? null : { corpseId: 'real-corpse', action, elapsed }, completedEventIds,
});
test('a confirmed unique gesture has one completion cue; interruption and a restored ledger have none', () => {
  assert.deepEqual(huntFieldWorkSoundsV112(work(3.19), work(null, 'flay', ['flay:real-corpse'])), ['field-secure']);
  assert.deepEqual(huntFieldWorkSoundsV112(work(2), work(null)), []);
  const restored = work(null, 'flay', ['flay:real-corpse', 'harvest-hide:real-corpse']);
  assert.deepEqual(huntFieldWorkSoundsV112(restored, restored), []);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.99, 'mark'), work(null, 'mark', ['mark:real-corpse'])), []);
});
test('work cues follow simulation strokes without replay on pause, repaint, rollback or a long frame burst', () => {
  assert.deepEqual(huntFieldWorkSoundsV112(work(0), work(1 / 120)), ['field-work']);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.1), work(.2)), []);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.63), work(.65)), ['field-work']);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.65), work(.65)), []);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.65), work(.2)), []);
  assert.deepEqual(huntFieldWorkSoundsV112(work(.65), work(4)), ['field-work']);
});
const ids = ['field-work', 'field-secure', 'canopy-grab', 'canopy-release'];
test('field and canopy cues respect the existing unready audio transport and optional authored sound fallback', () => {
  const audio = new GameAudio();
  audio.fileAudio.playSfx = () => false;
  audio.readyTime = () => null;
  audio.tone = audio.noise = () => { throw Error('A field cue escaped the suspended transport'); };
  for (const id of ids) audio.playSfx(id);
  const calls = [];
  audio.fileAudio.playSfx = id => { calls.push(id); return true; };
  audio.readyTime = () => { throw Error('Duplicate synthesized voice'); };
  for (const id of ids) audio.playSfx(id);
  assert.deepEqual(calls, ids);
  audio.dispose();
});
test('original cues remain quiet, short, finite and distinct on the effects clock', () => {
  const signatures = new Set();
  for (const id of ids) {
    const audio = new GameAudio(), tones = [], noises = [];
    audio.fileAudio.playSfx = () => false;
    audio.readyTime = () => 12;
    audio.tone = (frequency, options) => tones.push({ frequency, ...options });
    audio.noise = options => noises.push(options);
    audio.playSfx(id);
    assert.ok(tones.length && noises.length);
    for (const voice of [...tones, ...noises]) {
      assert.ok(voice.at >= 12 && voice.at < 12.1);
      assert.ok(voice.duration > 0 && voice.duration <= .15);
      assert.ok(voice.gain > 0 && voice.gain <= .04);
    }
    signatures.add(JSON.stringify({ tones, noises }));
    audio.dispose();
  }
  assert.equal(signatures.size, ids.length);
});
