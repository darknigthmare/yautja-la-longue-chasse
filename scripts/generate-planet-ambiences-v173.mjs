#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sampleRate = 24000;
const duration = 18;
const count = sampleRate * duration;
const tau = 2 * Math.PI;

// Each atmosphere defines its own wind bands and a small family of periodic
// environmental events. A unit position spans exactly one complete loop.
const worlds = {
  jungle: { seed: 118, bed: [325, 1200, 0.045, 0.031, 3], tones: [[710, 1.3, 0.13, 0.075, 2], [944, 5.6, 0.20, 0.063, -2], [1290, 13.1, 0.14, 0.057, 4], [640, 16.4, 0.30, 0.059, -1]] },
  ice: { seed: 179, bed: [94, 450, 0.068, 0.026, 2], tones: [[323, 3.8, 0.36, 0.051, -1], [585, 10.5, 0.17, 0.063, -2], [172, 15.7, 0.60, 0.044, -1]] },
  volcano: { seed: 241, bed: [34, 290, 0.120, 0.021, 2], tones: [[45, 2.3, 1.60, 0.092, -1], [57, 8.5, 1.60, 0.082, -1], [69, 14.5, 0.95, 0.078, -1]] },
  swamp: { seed: 319, bed: [168, 700, 0.052, 0.024, 4], tones: [[122, 1.8, 0.38, 0.074, 5], [183, 2.2, 0.28, 0.057, 4], [96, 9.0, 0.70, 0.062, 3], [202, 14.4, 0.26, 0.067, 4]] },
  desert: { seed: 431, bed: [211, 1650, 0.046, 0.055, 3], tones: [[248, 6.1, 1.03, 0.029, -2], [304, 12.7, 0.92, 0.024, -1], [214, 16.8, 0.38, 0.021, 1]] },
  ocean: { seed: 517, bed: [106, 1050, 0.079, 0.115, 5], tones: [[38, 3.2, 1.30, 0.045, -1], [29, 9.8, 1.48, 0.052, -1], [34, 15.8, 0.85, 0.040, -1]] },
  fungal: { seed: 613, bed: [125, 540, 0.038, 0.020, 2], tones: [[72, 1.9, 2.55, 0.058, 1], [109, 4.7, 2.23, 0.044, 1], [145, 10.0, 2.10, 0.055, -1], [216, 13.1, 2.24, 0.038, 1]] },
  ruins: { seed: 719, bed: [44, 160, 0.028, 0.015, 1], tones: [[66, 1.8, 0.68, 0.065, -1], [90, 7.9, 0.43, 0.060, -1], [120, 13.7, 0.42, 0.057, -1]] },
};

function noise(seed, low, high) {
  const white = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    white[index] = seed / 2147483648 - 1;
  }
  const filtered = new Float32Array(count * 2);
  const slowRate = 1 - Math.exp(-tau * low / sampleRate);
  const fastRate = 1 - Math.exp(-tau * high / sampleRate);
  let slow = 0;
  let fast = 0;
  // Pre-roll through one copy of the same loop to settle the filter across the seam.
  for (let index = 0; index < count * 2; index++) {
    const sample = white[index % count];
    slow += (sample - slow) * slowRate;
    fast += (sample - fast) * fastRate;
    if (index >= count) {
      const offset = (index - count) * 2;
      filtered[offset] = slow;
      filtered[offset + 1] = fast - slow;
    }
  }
  return filtered;
}

export function renderPlanetAmbience(id) {
  const profile = worlds[id];
  if (!profile) throw new RangeError("Unknown atmosphere " + id);
  const [low, high, windGain, detailGain, swells] = profile.bed;
  const bands = noise(profile.seed, low, high);
  const pcm = Buffer.alloc(count * 4);
  let energy = 0;
  let peak = 0;
  for (let index = 0; index < count; index++) {
    const t = index / sampleRate;
    const phase = tau * t / duration;
    const swell = 0.63 + 0.24 * Math.sin(phase * swells + 1.1) + 0.13 * Math.cos(phase * (swells + 2));
    let left = bands[index * 2] * windGain + bands[index * 2 + 1] * detailGain * swell;
    let right = left;
    const side = ((index + 141) % count) * 2 + 1;
    right += (bands[side] - bands[index * 2 + 1]) * detailGain * 0.38 * swell;
    for (const [frequency, start, seconds, gain, slope] of profile.tones) {
      const offset = (t - start + duration) % duration;
      if (offset >= seconds) continue;
      const fraction = offset / seconds;
      const envelope = Math.sin(Math.PI * fraction) ** 2;
      const bend = tau * offset * frequency * (1 + fraction * slope * 0.065);
      const sound = gain * envelope * (Math.sin(bend) + 0.24 * Math.sin(2 * bend));
      left += sound * 0.88;
      right += sound * (frequency % 3 === 0 ? 0.77 : 1.06);
    }
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
    energy += (left * left + right * right) / 2;
    pcm.writeInt16LE(Math.round(left * 32767), index * 4);
    pcm.writeInt16LE(Math.round(right * 32767), index * 4 + 2);
  }
  const rms = Math.sqrt(energy / count);
  if (peak >= 0.4 || rms < 0.005) throw Error("Invalid output level for " + id);
  for (const channel of [0, 2]) {
    if (Math.abs(pcm.readInt16LE(channel) - pcm.readInt16LE(pcm.length - 4 + channel)) > 1800) {
      throw Error("Discontinuous loop for " + id);
    }
  }
  return { pcm, peak, rms };
}

export function generatePlanetAmbiences(output) {
  const metadata = [];
  for (const id of Object.keys(worlds)) {
    const { pcm, peak, rms } = renderPlanetAmbience(id);
    const folder = join(output, "ambience", id);
    mkdirSync(folder, { recursive: true });
    const file = join(folder, "surface-v173.ogg");
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", String(sampleRate), "-ac", "2",
      "-i", "pipe:0", "-map_metadata", "-1", "-c:a", "libvorbis", "-q:a", "4", file,
    ], { input: pcm });
    const audio = readFileSync(file);
    const sha256 = createHash("sha256").update(audio).digest("hex");
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries",
      "stream=sample_rate,channels,codec_name:format=duration", "-of", "json", file], { encoding: "utf8" }));
    if (probe.streams[0].codec_name !== "vorbis" || probe.streams[0].channels !== 2 ||
        Number(probe.streams[0].sample_rate) !== sampleRate || Math.abs(Number(probe.format.duration) - duration) > 0.03) {
      throw Error("Incorrect loop media " + id);
    }
    metadata.push({ id, path: "ambience/" + id + "/surface-v173.ogg", bytes: audio.length, sha256,
      gitBlob: createHash("sha1").update("blob " + audio.length + "\0").update(audio).digest("hex"),
      rms: Number(rms.toFixed(4)), peak: Number(peak.toFixed(4)), duration });
  }
  writeFileSync(join(output, "generated-planet-ambiences.json"), JSON.stringify(metadata, null, 2) + "\n");
  return metadata;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(generatePlanetAmbiences(resolve(process.argv[2] ?? "outputs/planet-ambience-v173")), null, 2));
}
