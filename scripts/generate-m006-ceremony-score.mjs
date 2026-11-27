import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// All oscillators, drums and ember impulses are synthesized for this scene.
const sampleRate = 24000;
const duration = 105;
const beat = 60 / 76;
const tau = 2 * Math.PI;
const paths = {
  fire: new URL("../public/audio/ambience/ceremony-brazier/embers.wav", import.meta.url),
  score: new URL("../public/audio/music/ceremony-m006/mus-06-clan-ceremonie.ogg", import.meta.url),
};

function seededNoise(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x80000000 - 1;
  };
}

function writePcm(samples) {
  const wav = Buffer.alloc(44 + samples.length * 2);
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
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index++) {
    wav.writeInt16LE(Math.round(32767 * Math.max(-1, Math.min(1, samples[index]))), 44 + index * 2);
  }
  return wav;
}

function renderBrazier() {
  const frames = 4 * sampleRate;
  const overlap = sampleRate / 4;
  const signal = new Float32Array(frames + overlap);
  const noise = seededNoise(0xb2a21e70);
  let coalAir = 0, crackle = 0, edge = 0;
  for (let frame = 0; frame < signal.length; frame++) {
    const air = noise();
    coalAir += .011 * (air - coalAir);
    edge += .24 * (air - edge);
    if (noise() > .9979) crackle += .09 + (noise() + 1) * .18;
    crackle *= .994;
    signal[frame] = coalAir * .52 + edge * .034 + crackle * (edge - coalAir) * .7;
  }
  for (let frame = 0; frame < overlap; frame++) {
    const blend = .5 - .5 * Math.cos(Math.PI * frame / overlap);
    signal[frame] = blend * signal[frame] + (1 - blend) * signal[frames + frame];
  }
  return writePcm(signal.subarray(0, frames));
}

function addVoice(samples, start, seconds, volume, voice) {
  const begin = Math.round(start * sampleRate);
  const length = Math.min(Math.round(seconds * sampleRate), samples.length - begin);
  for (let frame = 0; frame < length; frame++) samples[begin + frame] += volume * voice(frame / sampleRate);
}

const midiHz = note => 440 * 2 ** ((note - 69) / 12);
const envelope = (time, seconds, attack, release) => Math.min(time / attack, 1, (seconds - time) / release);

function drum(samples, start, deep, volume, noise) {
  const length = deep ? 1.12 : .56;
  const pitch = deep ? 48 : 98;
  addVoice(samples, start, length, volume, time => {
    const phase = tau * (pitch * time + 23 * (1 - Math.exp(-17 * time)) / 17);
    const skin = Math.sin(phase) + .19 * Math.sin(2.16 * phase) + .084 * Math.sin(3.92 * phase);
    return envelope(time, length, .003, .11) * (Math.exp(-5.5 * time) * skin
      + .16 * Math.exp(-35 * time) * noise());
  });
}

function horn(samples, start, length, note, volume, bowed = false) {
  const frequency = midiHz(note);
  addVoice(samples, start, length, volume, time => {
    const phase = tau * (frequency * time + .037 * Math.sin(tau * 3.7 * time));
    const second = tau * (frequency * 1.003 * time);
    const harmonics = Math.sin(phase) + .29 * Math.sin(2 * phase) + (bowed ? .11 : .21) * Math.sin(3 * phase)
      + .069 * Math.sin(4 * phase) + .17 * Math.sin(second);
    return envelope(time, length, bowed ? .24 : .13, .55) * harmonics;
  });
}

function renderScore() {
  const samples = new Float32Array(duration * sampleRate);
  const noise = seededNoise(0x906dc105);
  // Low D/A fundamental with slow guttural formants.
  addVoice(samples, 0, duration, .072, time => {
    const cycle = tau * 73.416 * time;
    const texture = Math.sin(cycle) + .34 * Math.sin(tau * 110 * time)
      + (.19 + .07 * Math.sin(tau * .29 * time)) * Math.sin(3 * cycle) + .055 * Math.sin(7 * cycle);
    const breathe = .83 + .12 * Math.sin(tau * .19 * time) + .05 * Math.sin(tau * .52 * time);
    return envelope(time, duration, 2.4, 6) * breathe * texture;
  });
  for (let bar = 0; bar < 32; bar++) {
    const start = bar * 4 * beat;
    const strength = Math.min(1, .44 + bar / 45) * (bar >= 28 ? (32 - bar) / 4 : 1);
    drum(samples, start, true, .24 * strength, noise);
    if (bar < 4 || bar > 29) continue;
    drum(samples, start + 2 * beat, true, .148 * strength, noise);
    drum(samples, start + 1.5 * beat, false, .075 * strength, noise);
    if (bar >= 12) drum(samples, start + 3.5 * beat, false, .10 * strength, noise);
    if (bar >= 22 && bar < 28) drum(samples, start + 2.75 * beat, false, .116 * strength, noise);
  }
  // Four descending notes D–C–A–F. Lower horns state the motif and bowed
  // strings answer against a D-minor procession.
  const motif = [50, 48, 45, 41];
  for (const [bar, strength] of [[4, .54], [10, .66], [16, .77], [22, .86], [25, 1], [29, .44]]) {
    const start = bar * 4 * beat;
    for (let tone = 0; tone < motif.length; tone++) {
      horn(samples, start + (tone * .87) * beat, 1.92, motif[tone], .097 * strength);
      if (bar < 29) horn(samples, start + (4 + tone) * beat, 1.78, motif[tone] + 12, .048 * strength, true);
      if (bar >= 22 && bar <= 25) horn(samples, start + (tone * .87) * beat, 2.13, motif[tone] + 12, .048 * strength);
    }
  }
  const harmony = [[38, 45, 53], [34, 41, 50], [36, 43, 52], [33, 40, 49]];
  for (let bar = 8; bar < 30; bar += 2) {
    for (const note of harmony[Math.floor(bar / 2) % harmony.length]) {
      horn(samples, bar * 4 * beat, 6.7, note, bar >= 24 && bar <= 26 ? .058 : .031, true);
    }
  }
  // Two soft late reflections and the final D/A open fifth.
  horn(samples, 97.6, 6.7, 38, .069, true);
  horn(samples, 98.2, 6.05, 45, .046, true);
  const early = Math.round(.15 * sampleRate), late = Math.round(.31 * sampleRate);
  for (let frame = samples.length - 1; frame >= 0; frame--) {
    if (frame >= early) samples[frame] += .12 * samples[frame - early];
    if (frame >= late) samples[frame] += .064 * samples[frame - late];
    const end = Math.min(1, (samples.length - 1 - frame) / (2 * sampleRate));
    samples[frame] = Math.tanh(samples[frame] * 1.37) * end;
  }
  return writePcm(samples);
}

function opus(wav) {
  const render = spawnSync("ffmpeg", [
    "-v", "error", "-fflags", "+bitexact", "-f", "wav", "-i", "pipe:0", "-map_metadata", "-1",
    "-fflags", "+bitexact", "-flags:a", "+bitexact", "-c:a", "libopus", "-ac", "1", "-ar", String(sampleRate),
    "-b:a", "24k", "-vbr", "off", "-f", "ogg", "pipe:1",
  ], { input: wav, maxBuffer: 2 * 1024 * 1024 });
  if (render.error) throw render.error;
  if (render.status !== 0) throw new Error(render.stderr.toString());
  return render.stdout;
}

function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const mode = process.argv[2] ?? "--verify";
if (process.argv.length > 3 || !["--write", "--verify", "--emit"].includes(mode)) {
  throw new Error("Usage: node scripts/generate-m006-ceremony-score.mjs [--write|--verify|--emit]");
}
const fire = renderBrazier();
const wave = renderScore();
for (const [name, media] of Object.entries({ fire, score: opus(wave) })) {
  if (mode === "--write") {
    await mkdir(new URL(".", paths[name]), { recursive: true });
    await writeFile(paths[name], media);
  } else if (mode === "--verify" && !(await readFile(paths[name])).equals(media)) {
    throw new Error("M006 asset differs from the bit-exact render: " + name);
  }
  console.log("M006_AUDIO_META " + JSON.stringify({ name, bytes: media.length, sha256: sha(media), frames: name === "fire" ? sampleRate * 4 : sampleRate * duration }));
  if (mode === "--emit") {
    const encoded = media.toString("base64");
    for (let offset = 0; offset < encoded.length; offset += 10000) {
      console.log("M006_AUDIO_DATA " + name + " " + offset + " " + encoded.slice(offset, offset + 10000));
    }
  }
}
