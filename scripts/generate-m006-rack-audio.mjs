import { mkdir, readFile, writeFile } from "node:fs/promises";

// Original synthesized rack gate for R2-M006. No recorded sources.
const sampleRate = 22050;
const frames = Math.round(sampleRate * 1.18);
const signal = new Float32Array(frames);
const tau = 2 * Math.PI;
let randomState = 0x4d303036;
let lowNoise = 0;
let fastNoise = 0;
let peak = 0;

function resonance(time, onset, frequency, decay, amplitude) {
  const elapsed = time - onset;
  return elapsed <= 0 ? 0 : amplitude * Math.min(elapsed / .003, 1)
    * Math.exp(-decay * elapsed) * Math.sin(tau * frequency * elapsed);
}

for (let frame = 0; frame < frames; frame++) {
  const time = frame / sampleRate;
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  const whiteNoise = randomState / 0x80000000 - 1;
  lowNoise += .046 * (whiteNoise - lowNoise);
  fastNoise += .215 * (whiteNoise - fastNoise);
  const slide = time > .18 && time < .83 ? Math.sin(Math.PI * (time - .18) / .65) ** 1.4 : 0;
  const rumble = slide * (.85 + .15 * Math.cos(tau * 16 * time));
  // Latch, sliding plate and the second resonance at its upper stop.
  const sample = resonance(time, .012, 76, 15, .42) + resonance(time, .012, 137, 25, .24)
    + resonance(time, .022, 631, 34, .09) + resonance(time, .145, 914, 42, .11)
    + rumble * (.48 * lowNoise + .116 * fastNoise + .040 * Math.sin(tau * (52 * time + 121 * time * time)))
    + resonance(time, .864, 68, 18, .25) + resonance(time, .878, 319, 30, .10)
    + resonance(time, .883, 897, 32, .038);
  signal[frame] = sample;
  peak = Math.max(peak, Math.abs(sample));
}

const wav = Buffer.alloc(44 + 2 * frames);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(2 * frames, 40);
for (let frame = 0; frame < frames; frame++) {
  wav.writeInt16LE(Math.round(signal[frame] * .77 / peak * 32767), 44 + 2 * frame);
}

const target = new URL("../public/audio/sfx/ceremony-rack/threshold-metal.wav", import.meta.url);
if (process.argv[2] === "--write") {
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, wav);
} else if (!(await readFile(target)).equals(wav)) throw new Error("The M006 rack sound differs from its synthesis.");
else console.log(`M006 rack · PCM mono · ${frames} samples at ${sampleRate} Hz`);
