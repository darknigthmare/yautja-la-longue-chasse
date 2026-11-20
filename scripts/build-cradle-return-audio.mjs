/** Original procedural audio for R2-M027. Regenerate with Node 22. */
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function renderArmorRepair() {
  const sampleRate = 24_000, frames = 30_000;
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
    wave.setInt16(44 + frame * 2, Math.round((tick + motor + hiss) * 32767), true);
  }
  return bytes;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const directory = new URL('../public/audio/sfx/armor-repair/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('berceau.wav', directory), renderArmorRepair());
}
