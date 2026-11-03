/** Explicit, offline asset preparation. Never runs as part of a game build. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const sourceRoot = process.env.V54_AUDIO_SOURCES || "outputs/qa-commercial-audit/v54/audio/sources";
const targetRoot = process.env.V54_AUDIO_TARGET || "public/audio";
const rate = 44100;
const packs = {
  interface: { page: "https://kenney.nl/assets/interface-sounds", archive: "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip", sha256: "f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232" },
  rpg: { page: "https://kenney.nl/assets/rpg-audio", archive: "https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip", sha256: "6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b" },
  "sci-fi": { page: "https://kenney.nl/assets/sci-fi-sounds", archive: "https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip", sha256: "119340f351a5098ad814f78719438c0da355a9ce8a4c8a3af6a8d48aa3d49e04" },
};
// One deliberate event per folder; these are not random alternatives or franchise recordings.
const clips = [
  ["ui", "interface", "click_001", .12, .06],
  ["select", "interface", "confirmation_002", .18, .06],
  ["jump", "rpg", "cloth1", .16, .05],
  ["footstep", "rpg", "footstep03", .14, .04],
  ["slash", "rpg", "knifeSlice", .24, .065],
  ["plasma", "sci-fi", "laserLarge_000", .26, .07],
  ["scan", "sci-fi", "computerNoise_000", .16, .04, .38],
  ["cloak-on", "sci-fi", "forceField_000", .18, .05],
  ["cloak-off", "sci-fi", "forceField_001", .16, .045],
  ["mask-on", "rpg", "metalLatch", .17, .05],
  ["mask-off", "rpg", "metalClick", .15, .045],
  ["weapon-switch", "rpg", "drawKnife2", .18, .05],
  ["medicomp", "sci-fi", "laserSmall_002", .15, .045],
  ["netgun", "sci-fi", "thrusterFire_000", .22, .06, .28],
  ["snare", "rpg", "clothBelt", .20, .055],
  ["enemy-alert", "interface", "question_003", .18, .06],
  ["objective", "interface", "confirmation_004", .20, .065],
  ["hit", "rpg", "dropLeather", .30, .08],
];
const sha = data => createHash("sha256").update(data).digest("hex");
const stats = samples => {
  let peak = 0, sum = 0, square = 0;
  for (const x of samples) { peak = Math.max(peak, Math.abs(x)); sum += x; square += x * x; }
  return { duration: samples.length / rate, peak, rms: Math.sqrt(square / samples.length), dc: sum / samples.length };
};
const normalise = (samples, peakLimit, rmsLimit) => {
  const dc = stats(samples).dc;
  const centred = samples.map(x => x - dc), before = stats(centred);
  const gain = Math.min(peakLimit / (before.peak || 1), rmsLimit / (before.rms || 1), 8);
  return { samples: centred.map(x => x * gain), gain, removedDc: dc };
};
const shortEnvelope = samples => samples.map((x, i) => x * Math.min(1, i / (rate * .003), (samples.length - 1 - i) / (rate * .012)));
const pcm = samples => {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2));
  return buffer;
};

await fs.mkdir(path.join(targetRoot, "licenses"), { recursive: true });
const sources = new Map(), assetRecords = [];
for (const [id, pack] of Object.entries(packs)) {
  const archivePath = path.join(sourceRoot, `${id}.zip`), bytes = await fs.readFile(archivePath);
  if (sha(bytes) !== pack.sha256) throw new Error(`Archive fingerprint changed: ${id}`);
  const extracted = JSON.parse(execFileSync("python", ["-c", "import zipfile,base64,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n:base64.b64encode(z.read(n)).decode() for n in z.namelist() if n.endswith('.ogg') or n=='License.txt'}))", archivePath], { maxBuffer: 16 * 1024 * 1024 }).toString());
  const licenseBytes = Buffer.from(extracted["License.txt"], "base64");
  pack.licenseOriginalSha256 = sha(licenseBytes);
  // Only whitespace is normalised; the archive and original license fingerprint remain recorded.
  const licenseText = licenseBytes.toString("utf8").replace(/\r+/g, "").split("\n").map(line => line.trimEnd()).join("\n");
  await fs.writeFile(path.join(targetRoot, "licenses", `kenney-${id}.txt`), licenseText);
  for (const [name, encoded] of Object.entries(extracted)) sources.set(`${id}/${name}`, encoded);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const decode = async (pack, name) => {
    const originalPath = `Audio/${name}.ogg`, encoded = sources.get(`${pack}/${originalPath}`);
    if (!encoded) throw new Error(`Missing source ${pack}/${originalPath}`);
    const samples = await page.evaluate(async encoded => {
      const context = new OfflineAudioContext(1, 1, 44100);
      const buffer = await context.decodeAudioData(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)).buffer);
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      return Array.from({ length: buffer.length }, (_, i) => channels.reduce((sum, c) => sum + c[i], 0) / channels.length);
    }, encoded);
    return { samples, source: { pack, originalPath, sha256: sha(Buffer.from(encoded, "base64")), author: "Kenney", license: "CC0-1.0", sourcePage: packs[pack].page } };
  };
  const write = async (category, id, samples, provenance) => {
    const file = `${category}/${id}/v54.wav`, bytes = pcm(samples);
    await fs.mkdir(path.join(targetRoot, category, id), { recursive: true });
    await fs.writeFile(path.join(targetRoot, file), bytes);
    // Measurements are on the delivered 16-bit samples, not only on a float intermediate.
    const delivered = Array.from({ length: samples.length }, (_, i) => bytes.readInt16LE(44 + i * 2) / 32768);
    assetRecords.push({ category, id, file, bytes: bytes.length, sha256: sha(bytes), sampleRate: rate, channels: 1, bits: 16, ...stats(delivered), ...provenance });
  };
  for (const [id, pack, name, peak, rms, maxDuration] of clips) {
    const original = await decode(pack, name);
    const length = maxDuration ? Math.min(original.samples.length, Math.round(maxDuration * rate)) : original.samples.length;
    const mix = normalise(shortEnvelope(original.samples.slice(0, length)), peak, rms);
    await write("sfx", id, mix.samples, { kind: "external-cc0-adaptation", source: original.source, processing: { monoAverage: true, maxDuration: maxDuration ?? null, attackSeconds: .003, releaseSeconds: .012, peakLimit: peak, rmsLimit: rms, gain: mix.gain, removedDc: mix.removedDc } });
  }
  // A circular overlap blend removes the source engine's restart discontinuity.
  const engine = await decode("sci-fi", "spaceEngineLow_000"), overlap = Math.round(.25 * rate), n = engine.samples.length;
  const loop = engine.samples.slice(0, n - overlap);
  for (let i = 0; i < overlap; i++) { const weight = .5 - .5 * Math.cos(Math.PI * i / (overlap - 1)); loop[i] = engine.samples[n - overlap + i] * (1 - weight) + engine.samples[i] * weight; }
  const mixedLoop = normalise(loop, .10, .025);
  await write("ambience", "ship", mixedLoop.samples, { kind: "external-cc0-adaptation", source: engine.source, processing: { monoAverage: true, circularOverlapSeconds: .25, peakLimit: .10, rmsLimit: .025, gain: mixedLoop.gain, removedDc: mixedLoop.removedDc }, loopBoundaryStep: Math.abs(mixedLoop.samples[0] - mixedLoop.samples.at(-1)) });

  // Original procedural stingers. No melody, voice, recording or sample from the franchise.
  const stinger = (seconds, notes, drums) => {
    const data = Array(Math.round(seconds * rate)).fill(0);
    for (const [at, frequency, duration] of notes) for (let i = 0; i < duration * rate && i + at * rate < data.length; i++) {
      const t = i / rate, env = Math.min(1, t / .015) * Math.exp(-5 * t / duration) * Math.min(1, (duration - t) / .05);
      data[Math.round(at * rate) + i] += env * (Math.sin(2 * Math.PI * frequency * t) + .2 * Math.sin(2 * Math.PI * frequency * 2.01 * t));
    }
    for (const [at, frequency] of drums) for (let i = 0; i < .28 * rate && i + at * rate < data.length; i++) {
      const t = i / rate; data[Math.round(at * rate) + i] += 1.2 * Math.sin(2 * Math.PI * (frequency * t + 20 * (1 - Math.exp(-20 * t)))) * Math.min(1, t / .003) * Math.exp(-25 * t);
    }
    return normalise(shortEnvelope(data), .25, .055);
  };
  const motifs = {
    trophy: { seconds: 1.2, notes: [[.16, 174, .85], [.38, 261, .7]], drums: [[0, 95], [.18, 82]] },
    victory: { seconds: 1.6, notes: [[.36, 146.83, 1], [.49, 220, .95], [.62, 329.63, .9]], drums: [[0, 76], [.22, 88], [.44, 64]] },
    defeat: { seconds: 1.4, notes: [[0, 154, .8], [.25, 103, .85], [.55, 58, .8]], drums: [[0, 48]] },
  };
  for (const [id, motif] of Object.entries(motifs)) {
    const mix = stinger(motif.seconds, motif.notes, motif.drums);
    await write("sfx", id, mix.samples, { kind: "original-procedural", author: "Yautja La Longue Chasse project / Codex", license: "project-original-no-third-party-samples", recipe: motif, processing: { peakLimit: .25, rmsLimit: .055, gain: mix.gain, removedDc: mix.removedDc } });
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(targetRoot, "provenance-v54.json"), JSON.stringify({ schemaVersion: 1, version: "v54", verifiedOn: "2026-09-27", canonicalFranchiseAudio: false, licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/", packs, assets: assetRecords, limitations: ["CC0 sound design is an original project adaptation, not official Predator or AVP audio.", "No source pack recording technique is asserted; external sound design is distinct from project procedural synthesis.", "No score, voice acting, or eight remaining biome audio files supplied in this batch.", "Subjective listening and in-game mix approval remain required."] }, null, 2) + "\n");
console.log(JSON.stringify({ delivered: assetRecords.length, bytes: assetRecords.reduce((sum, a) => sum + a.bytes, 0), provenance: path.join(targetRoot, "provenance-v54.json") }, null, 2));
