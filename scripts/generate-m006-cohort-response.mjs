import { mkdir, readFile, writeFile } from "node:fs/promises";

/** Original Yautja cohort response for the three returns of the training tools. */
export function renderM006CohortResponse() {
  const rate = 22050;
  const frames = Math.round(rate * 1.42);
  const wav = new Uint8Array(44 + frames * 2);
  const data = new DataView(wav.buffer);
  const chunk = (offset, label) => {
    for (let i = 0; i < label.length; i++) wav[offset + i] = label.charCodeAt(i);
  };
  chunk(0, "RIFF");
  data.setUint32(4, wav.length - 8, true);
  chunk(8, "WAVEfmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 1, true);
  data.setUint32(24, rate, true);
  data.setUint32(28, rate * 2, true);
  data.setUint16(32, 2, true);
  data.setUint16(34, 16, true);
  chunk(36, "data");
  data.setUint32(40, frames * 2, true);

  const calls = [
    { begin: .025, length: .60, pitch: 93, weight: .84, phase: .20 },
    { begin: .150, length: .73, pitch: 111, weight: .52, phase: 1.30 },
    { begin: .450, length: .78, pitch: 81, weight: .74, phase: 2.05 },
  ];
  const tau = 2 * Math.PI;
  const signal = new Float32Array(frames);
  let random = 0x7a113006;
  let breath = 0;
  let peak = 0;

  for (let i = 0; i < frames; i++) {
    const time = i / rate;
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const white = random / 0x80000000 - 1;
    breath += .15 * (white - breath);
    let sample = 0;
    for (const call of calls) {
      const elapsed = time - call.begin;
      if (elapsed <= 0 || elapsed >= call.length) continue;
      const fraction = elapsed / call.length;
      const edge = Math.sin(Math.PI * fraction) ** 1.1;
      const accent = .64 + .36 * (1 - fraction) ** 2;
      const phase = tau * (call.pitch * (elapsed - .15 * elapsed * fraction)
        + .24 * Math.sin(tau * 6.8 * elapsed)) + call.phase;
      const throat = .23 * Math.sin(phase) + .12 * Math.sin(phase * 2)
        - .24 * Math.sin(phase * 4) + .15 * Math.sin(phase * 5)
        + .08 * Math.sin(phase * 8) + .04 * Math.sin(phase * 11);
      sample += call.weight * edge * (accent * throat + .055 * breath);
    }
    // Three short stone-room reflections keep the utterance grounded at the rack.
    for (const [delay, gain] of [[.039, .13], [.071, .08], [.109, .04]]) {
      const earlier = i - Math.round(delay * rate);
      if (earlier >= 0) sample += signal[earlier] * gain;
    }
    signal[i] = sample;
    peak = Math.max(peak, Math.abs(signal[i]));
  }
  for (let i = 0; i < frames; i++) {
    const fade = Math.min(1, (frames - 1 - i) / 880);
    data.setInt16(44 + i * 2, Math.round(signal[i] * fade * .68 / peak * 32767), true);
  }
  return wav;
}

const target = new URL("../public/audio/sfx/ceremony-cohort-response/cohort-response.wav", import.meta.url);
const waveform = Buffer.from(renderM006CohortResponse());
if (process.argv[2] === "--write") {
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, waveform);
} else if (!(await readFile(target)).equals(waveform)) {
  throw new Error("The cohort response differs from the original synthesis.");
} else {
  console.log("M006 cohort response · PCM mono · 1.42 s at 22050 Hz");
}
