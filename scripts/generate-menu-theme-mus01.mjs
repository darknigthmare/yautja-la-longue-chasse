/**
 * MUS-01, La Longue Chasse. Original instrumental score with synthesized voices.
 * No recordings, sampled instruments, or external compositions.
 *
 * node scripts/generate-menu-theme-mus01.mjs /tmp/mus-01.wav
 * ffmpeg -i /tmp/mus-01.wav -map_metadata -1 -c:a libvorbis -q:a 4 public/audio/music/menu/mus-01.ogg
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const rate = 32_000;
const seconds = 180;
const frames = rate * seconds;
const beat = 60 / 72; // Dotted quarter, with two beats in each 6/8 measure.
const measure = beat * 2;
const left = new Float32Array(frames), right = new Float32Array(frames);
const tau = Math.PI * 2;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const sine = Math.sin;

function voice(start, duration, pan, level, sample) {
  const first = Math.round(start * rate);
  for (let frame = Math.max(0, first); frame < Math.min(frames, first + Math.round(duration * rate)); frame++) {
    const value = sample((frame - first) / rate) * level;
    left[frame] += value * Math.cos((pan + 1) * Math.PI / 4);
    right[frame] += value * Math.sin((pan + 1) * Math.PI / 4);
  }
}

function envelope(t, duration, attack, release) {
  return Math.max(0, Math.min(t / attack, (duration - t) / release, 1));
}

function horn(start, duration, note, pan, level) {
  const f = hz(note) * tau;
  voice(start, duration, pan, level, t => {
    const vibrato = 0.14 * sine(tau * 4.8 * t) * Math.min(1, t / 0.4);
    const phase = f * t + vibrato;
    return envelope(t, duration, 0.14, 0.21) *
      (sine(phase) + 0.44 * sine(2 * phase) + 0.22 * sine(3 * phase) + 0.10 * sine(5 * phase));
  });
}

function pad(start, duration, note, pan, level) {
  const f = hz(note) * tau;
  voice(start, duration, pan, level, t => {
    const phase = f * t;
    return envelope(t, duration, 0.5, 0.9) * (0.58 * sine(phase) +
      0.26 * sine(phase * 1.004 + 0.1 * sine(tau * 0.19 * t)) +
      0.18 * sine(2 * phase) + 0.14 * sine(3 * phase) + 0.06 * sine(7 * phase));
  });
}

function drum(start, pan, level, fundamental, seed) {
  const duration = 0.72;
  let noise = seed | 0;
  let low = 0;
  voice(start, duration, pan, level, t => {
    noise = Math.imul(noise, 1664525) + 1013904223 | 0;
    low += (noise / 2147483648 - low) * 0.055;
    const phase = tau * (fundamental * t + 11 * (1 - Math.exp(-7 * t)));
    return Math.min(t / 0.012, 1) * Math.exp(-7 * t) *
      (0.83 * sine(phase) + 0.16 * sine(phase * 1.49) + 0.64 * low);
  });
}

function flick(start, note, pan, level) {
  let noise = Math.round(start * 8137 + note);
  const f = hz(note) * tau;
  voice(start, 0.22, pan, level, t => {
    noise = Math.imul(noise, 1664525) + 1013904223 | 0;
    return Math.min(t / 0.007, 1) * Math.exp(-25 * t) *
      (0.44 * sine(f * t) + 0.21 * sine(f * 3 * t) + 0.35 * noise / 2147483648);
  });
}

const motif = [50, 48, 46, 45]; // D, C, B-flat, A.
const chords = [[38, 45, 53], [34, 41, 50], [43, 46, 50], [45, 52, 55]];
for (const [firstBar, strength] of [[2, 0.12], [10, 0.09], [18, 0.105], [26, 0.12], [32, 0.19],
  [36, 0.16], [40, 0.19], [46, 0.10], [52, 0.09], [66, 0.10], [73, 0.14], [80, 0.20], [86, 0.17],
  [90, 0.18], [98, 0.09]]) {
  for (let index = 0; index < motif.length; index++) {
    const when = firstBar * measure + [0, 2, 4, 7][index] * beat / 3;
    horn(when, index === 3 ? 0.88 : 0.56, motif[index], -0.24, strength);
    if (strength >= 0.15) horn(when + 0.032, 0.81, motif[index] + 12, 0.42, strength * 0.34);
    horn(when + 0.12, 0.49, motif[index], 0.62, strength * 0.16);
  }
}

for (let bar = 0; bar < 108; bar++) {
  const t = bar * measure;
  const rhythmic = (bar >= 16 && bar < 48) || (bar >= 64 && bar < 96);
  const full = (bar >= 32 && bar < 48) || (bar >= 80 && bar < 96);
  if (bar % 4 === 0 && bar < 104) {
    const chord = rhythmic ? chords[(bar / 4) % chords.length] : chords[0];
    chord.forEach((note, index) => pad(t, measure * 4 + 0.7, note, [-0.5, 0.1, 0.54][index], full ? 0.093 : 0.044));
    if (full) chord.forEach((note, index) => pad(t + 0.25, measure * 4, note + 12, [0.5, -0.35, 0.22][index], 0.053));
  }
  if (!rhythmic) continue;
  drum(t, -0.25, full ? 0.26 : 0.20, 48, bar * 919 + 677);
  drum(t + beat, 0.25, 0.15, 62, bar * 439 + 122);
  if (bar % 2 === 1) drum(t + 5 * beat / 3, 0.1, 0.105, 54, bar * 703 + 19);
  for (let count = 1; count < 6; count += 2) {
    flick(t + beat * count / 3, bar % 2 === 0 ? 62 : 58, count % 4 === 1 ? -0.6 : 0.6, 0.075);
  }
}
for (const time of [0.85, 13.3, 26.5, 52.9, 79.4, 106.2, 132.9, 159.3]) {
  drum(time, -0.65, 0.065, 30, Math.round(time * 703));
  drum(time + 0.096, 0.60, 0.055, 28, Math.round(time * 701));
}
for (let frame = 0; frame < frames; frame++) {
  const cycle = frame / frames * tau;
  const drone = 0.14 * sine(6608 * cycle) + 0.042 * sine(13216 * cycle + 0.23 * sine(7 * cycle));
  left[frame] += drone + 0.035 * sine(9912 * cycle + 0.42);
  right[frame] += drone + 0.035 * sine(9912 * cycle + 0.71);
}

let peak = 0, energy = 0;
const pcm = Buffer.alloc(frames * 4 + 44);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(frames * 4, 40);
for (let i = 0; i < frames; i++) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
assert.ok(peak > 0.35 && peak < 2);
assert.ok(Math.abs(left.at(-1) - left[0]) < 0.006);
assert.ok(Math.abs(right.at(-1) - right[0]) < 0.006);
const gain = (10 ** (-1.5 / 20)) / peak;
for (let i = 0; i < frames; i++) {
  const a = left[i] * gain, b = right[i] * gain;
  energy += a * a + b * b;
  pcm.writeInt16LE(Math.round(a * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(b * 32767), 46 + i * 4);
}
const rmsDb = 20 * Math.log10(Math.sqrt(energy / (frames * 2)));
assert.ok(rmsDb < -10 && rmsDb > -27, 'Energy suits background playback.');
writeFileSync(process.argv[2] ?? '/tmp/mus-01.wav', pcm);
console.log(JSON.stringify({ frames, seconds, channels: 2, rate, peakDb: -1.5, rmsDb }));
