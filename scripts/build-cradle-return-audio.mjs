/** Original procedural audio for R2-M027. Regenerate with Node 22. */
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function pcmWave(samples, sampleRate) {
  const frames = samples.length;
  const bytes = new Uint8Array(44 + frames * 2);
  const wave = new DataView(bytes.buffer);
  const writeTag = (start, tag) => {
    for (let index = 0; index < tag.length; index++) wave.setUint8(start + index, tag.charCodeAt(index));
  };
  writeTag(0, 'RIFF');
  wave.setUint32(4, bytes.length - 8, true);
  writeTag(8, 'WAVEfmt ');
  wave.setUint32(16, 16, true);
  wave.setUint16(20, 1, true);
  wave.setUint16(22, 1, true);
  wave.setUint32(24, sampleRate, true);
  wave.setUint32(28, sampleRate * 2, true);
  wave.setUint16(32, 2, true);
  wave.setUint16(34, 16, true);
  writeTag(36, 'data');
  wave.setUint32(40, frames * 2, true);
  for (let frame = 0; frame < frames; frame++) wave.setInt16(44 + frame * 2, samples[frame], true);
  return bytes;
}

export function renderArmorRepair() {
  const sampleRate = 24_000, frames = 30_000;
  const samples = new Int16Array(frames);

  let seed = 0x27272026, low = 0, mid = 0;
  const tap = (elapsed, pitch, decay) => elapsed < 0 ? 0 : Math.exp(-elapsed * decay) *
    (Math.sin(2 * Math.PI * pitch * elapsed) + .34 * Math.sin(2.79 * Math.PI * pitch * elapsed));
  for (let frame = 0; frame < frames; frame++) {
    // Leave room for the existing Medicomp cue before the clamp closes.
    const t = frame / sampleRate - .36;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += .04 * (noise - low);
    mid += .23 * (noise - mid);
    const tick = .23 * tap(t, 245, 57) + .11 * tap(t - .072, 393, 72) +
      .17 * tap(t - .61, 283, 60);
    const servo = t - .085;
    const pressure = servo > 0 && servo < .54 ? Math.sin(Math.PI * servo / .54) ** 1.5 : 0;
    const motor = pressure * (.05 * Math.sin(2 * Math.PI * (116 * servo - 30 * servo ** 2)) +
      .09 * low + .15 * (mid - low) * (.70 + .30 * Math.cos(94 * servo)));
    const hiss = t > .14 && t < .64 ? Math.sin(Math.PI * (t - .14) / .5) ** 2 * (noise - mid) * .045 : 0;
    samples[frame] = Math.round((tick + motor + hiss) * 32767);
  }
  return pcmWave(samples, sampleRate);
}

const tau = 2 * Math.PI;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const palettes = {
  return: [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 60, 62],
    [45, 52, 57, 60, 64], [46, 53, 57, 60, 65], [48, 55, 60, 64, 67]],
  ship: [[45, 52, 57, 60, 64], [45, 52, 59, 60, 64], [41, 48, 53, 57, 60],
    [43, 50, 55, 57, 62], [45, 52, 57, 60, 64]],
};

export function renderCradleScore(id) {
  if (id !== 'return' && id !== 'ship') throw new Error('Unknown Berceau cue');
  const sampleRate = 24_000;
  const isReturn = id === 'return';
  const bpm = isReturn ? 64 : 60;
  const bars = isReturn ? 24 : 45;
  const beatSeconds = 60 / bpm, barSeconds = beatSeconds * 4;
  const duration = bars * barSeconds, frames = duration * sampleRate;
  const mix = new Float32Array(frames);
  const tone = (midi, start, length, volume, voice) => {
    const first = Math.round(start * sampleRate), count = Math.round(length * sampleRate);
    const pitch = frequency(midi), step = tau * pitch / sampleRate;
    const attack = voice === 'pad' ? 1.45 : voice === 'horn' ? .19 : .007;
    for (let i = 0; i < count; i++) {
      const offset = first + i;
      if (isReturn && (offset < 0 || offset >= frames)) continue;
      const t = i / sampleRate;
      const phase = i * step;
      const swell = Math.min(1, t / attack);
      let partial;
      if (voice === 'pad') {
        const tail = Math.min(1, (length - t) / 1.5);
        partial = (Math.sin(phase) + .24 * Math.sin(phase * 2.003) + .10 * Math.sin(phase * 3.005)) *
          tail * swell * (.90 + .10 * Math.cos(t * 2.2));
      } else if (voice === 'horn') {
        const bend = phase + .22 * Math.sin(31 * t);
        partial = (Math.sin(bend) + .31 * Math.sin(2 * bend) + .12 * Math.sin(3 * bend)) *
          swell * Math.min(1, (length - t) / .40);
      } else if (voice === 'glass') {
        partial = (Math.sin(phase) + .24 * Math.sin(phase * 2.01 + .08 * Math.sin(25 * t))) *
          swell * Math.exp(-3.3 * t) * Math.min(1, (length - t) / .18);
      } else {
        const strike = tau * (pitch * t + 1.6 * (1 - Math.exp(-19 * t)));
        partial = Math.sin(strike) * swell * Math.exp(-13 * t);
      }
      mix[(offset + frames) % frames] += partial * volume;
    }
  };

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barSeconds;
    const chord = palettes[id][Math.floor(bar / (isReturn ? 4 : 9))];
    if (isReturn) {
      if (bar % 4 === 0) chord.forEach((midi, index) => tone(midi, barStart - .40 + .08 * index, 4 * barSeconds + .94, .045, 'pad'));
      if (bar < 17 && bar % 2 === 0) {
        tone(31, barStart, .41, .07 * (1 - bar / 22), 'drum');
        if (bar < 12) tone(31, barStart + .54 + .032 * bar, .36, .046 * (1 - bar / 16), 'drum');
      }
    } else {
      if (bar % 3 === 0) chord.forEach((midi, index) => tone(midi - (index === 0 ? 12 : 0),
        barStart - 1.18 + .15 * index, 3 * barSeconds + 2.55, index === 0 ? .048 : .028, 'pad'));
      const rhythm = bar % 2 === 0 ? [0, 1, 2.65] : [.51, 2.05];
      rhythm.forEach((offset, index) => tone(chord[(bar + index + 1) % chord.length] + 12, barStart + offset, 1.53, .038, 'glass'));
      if (bar % 8 === 0) tone(33, barStart + .17, .40, .055, 'drum');
      if (bar % 4 === 2) {
        tone(84, barStart + .62, .09, .017, 'glass');
        tone(91, barStart + .73, .07, .014, 'glass');
      }
    }
  }
  const motif = [69, 67, 64, 60];
  for (const start of isReturn ? [6.8, 28.1, 58.1, 78.4] : [90]) {
    motif.forEach((midi, index) => tone(midi - (start > 70 ? 12 : 0), start + 1.08 * index,
      index === motif.length - 1 ? 2.95 : 1.36, isReturn ? .092 : .054, 'horn'));
  }
  const samples = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / sampleRate;
    const engine = isReturn ? 0 : .033 * Math.sin(tau * 39 * t) + .021 * Math.sin(tau * 78 * t) *
      (.88 + .12 * Math.cos(tau * t / 12));
    const fade = isReturn ? Math.min(1, t / 1.2, (duration - t) / 6) : 1;
    const output = (mix[frame] + engine) * fade;
    samples[frame] = Math.round(Math.max(-1, Math.min(1, output)) * 32767);
  }
  return { samples, sampleRate };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const directory = new URL('../public/audio/sfx/armor-repair/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('berceau.wav', directory), renderArmorRepair());
  const masters = process.argv.indexOf('--masters');
  if (masters >= 0) {
    const target = process.argv[masters + 1];
    if (!target) throw new Error('Missing output directory for --masters');
    await mkdir(target, { recursive: true });
    for (const [id, filename] of [['return', 'MUS-15-retour.wav'], ['ship', 'MUS-02-veille.wav']]) {
      const { samples, sampleRate } = renderCradleScore(id);
      await writeFile(new URL(filename, pathToFileURL(target.replace(/\/+$/, '') + '/')), pcmWave(samples, sampleRate));
    }
  }
}
