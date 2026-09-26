import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { GameAudio } from "../app/game/sound.ts";
import { buildAudioManifest } from "../scripts/build-audio-manifest.mjs";

test("V54 delivered audio decodes as bounded PCM with exact source and manifest fingerprints", async () => {
  const proof = JSON.parse(await fs.readFile("public/audio/provenance-v54.json", "utf8"));
  const inventory = (await buildAudioManifest({ write: false })).manifest;
  assert.equal(proof.assets.length, 22);
  assert.equal(proof.assets.filter(a => a.kind === "external-cc0-adaptation").length, 19);
  assert.equal(proof.assets.filter(a => a.kind === "original-procedural").length, 3);
  for (const asset of proof.assets) {
    const bytes = await fs.readFile(`public/audio/${asset.file}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF"); assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
    assert.equal(bytes.readUInt16LE(20), 1); assert.equal(bytes.readUInt16LE(22), 1); assert.equal(bytes.readUInt16LE(34), 16);
    assert.equal(bytes.readUInt32LE(24), 44100); assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    let peak = 0, square = 0, mean = 0;
    for (let i = 44; i < bytes.length; i += 2) { const x = bytes.readInt16LE(i) / 32768; peak = Math.max(peak, Math.abs(x)); square += x * x; mean += x; }
    const frames = (bytes.length - 44) / 2, rms = Math.sqrt(square / frames);
    assert.ok(peak > .01 && peak <= .301, `${asset.id} useful headroom`);
    assert.ok(rms > .001 && rms <= .081, `${asset.id} bounded RMS`);
    assert.ok(Math.abs(mean / frames) < .0001, `${asset.id} no DC offset`);
    assert.ok(frames / 44100 < 5, `${asset.id} short preload or bounded loop`);
    assert.equal(inventory.entries.find(e => e.id === asset.id && e.category === asset.category).sources[0].sha256, asset.sha256);
    if (asset.source) { assert.equal(asset.source.license, "CC0-1.0"); assert.match(asset.source.sourcePage, /^https:\/\/kenney\.nl\/assets\//); assert.match(asset.source.sha256, /^[a-f0-9]{64}$/); }
  }
  assert.equal(inventory.entries.filter(e => e.sources.length).length, 22);
  assert.equal(inventory.entries.filter(e => e.category === "music" && e.sources.length).length, 0);
});

test("ship overlap loop has no impulsive boundary compared with its own adjacent samples", async () => {
  const bytes = await fs.readFile("public/audio/ambience/ship/v54.wav");
  const samples = Array.from({ length: (bytes.length - 44) / 2 }, (_, i) => bytes.readInt16LE(44 + i * 2) / 32768);
  const adjacent = samples.slice(1).map((x, i) => Math.abs(x - samples[i])).sort((a, b) => a - b);
  const boundary = Math.abs(samples[0] - samples.at(-1));
  assert.ok(boundary <= adjacent[Math.floor(adjacent.length * .999)] + 1 / 32768);
  assert.ok(boundary < .005);
});

test("scene pause preserves preferences and does not create or resume an unactivated engine", async () => {
  const audio = new GameAudio();
  audio.setMix({ master: .8, music: .4, effects: .7, muted: true }); const before = audio.getMix();
  audio.setPaused(true); assert.equal(audio.targetMasterGain(), 0); assert.equal(audio.readyTime(), null);
  audio.setPaused(false); assert.equal(audio.context, null); assert.deepEqual(audio.getMix(), before);
  audio.dispose();
});

test("an unactivated score request keeps its context but does not fetch the optional inventory", async () => {
  const audio = new GameAudio(); audio.unlock = async () => {};
  audio.fileAudio.startLoop = () => { throw new Error("premature media/inventory access"); };
  await audio.setMusicContext("menu");
  assert.equal(audio.requestedMusic, "menu"); assert.equal(audio.context, null); audio.dispose();
});

test("pause suspends an already activated context; resume preserves mute and bus levels", async () => {
  const audio = new GameAudio(), calls = [];
  audio.context = { state: "running", suspend: async () => { calls.push("suspend"); audio.context.state = "suspended"; }, resume: async () => { calls.push("resume"); audio.context.state = "running"; }, close: async () => {} };
  audio.unlocked = true; audio.applyMix = () => {};
  audio.unlock = async () => { calls.push("resume"); audio.context.state = "running"; audio.fileAudio.setPaused(false); };
  audio.setMix({ master: .7, music: .3, effects: .2, muted: true }); const before = audio.getMix();
  audio.setPaused(true); await audio.transportTransition; assert.equal(audio.context.state, "suspended"); assert.equal(audio.readyTime(), null);
  audio.setPaused(false); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["suspend", "resume"]); assert.deepEqual(audio.getMix(), before); assert.equal(audio.targetMasterGain(), 0);
  audio.context = null; audio.dispose();
});

test("a late browser suspend cannot override a newer resume", async () => {
  const audio = new GameAudio(); let finishSuspend;
  audio.context = { state: "running", suspend: () => new Promise(resolve => { finishSuspend = () => { audio.context.state = "suspended"; resolve(); }; }), resume: async () => { audio.context.state = "running"; } };
  audio.unlocked = true; audio.applyMix = () => {};
  audio.setPaused(true); await new Promise(resolve => setImmediate(resolve));
  audio.setPaused(false); finishSuspend(); await audio.transportTransition;
  assert.equal(audio.context.state, "running"); assert.equal(audio.paused, false);
  audio.context = null; audio.dispose();
});
