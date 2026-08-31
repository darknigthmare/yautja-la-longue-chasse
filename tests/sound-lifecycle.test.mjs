import assert from "node:assert/strict";
import test from "node:test";
import { GameAudio } from "../app/game/sound.ts";

function fixture() {
  const audio = new GameAudio();
  const pending = [], created = [], stopped = [];
  audio.unlock = () => new Promise(resolve => pending.push(resolve));
  audio.readyTime = () => 12;
  audio.createAmbienceVoice = biome => { const voice = { biome }; created.push(voice); return voice; };
  audio.stopAmbienceVoice = voice => stopped.push(voice.biome);
  return { audio, pending, created, stopped };
}

test("a stopped ambience cannot start after a delayed autoplay unlock", async () => {
  const f = fixture();
  const request = f.audio.startAmbience("volcano");
  f.audio.stopAmbience();
  f.pending.shift()();
  await request;
  assert.equal(f.audio.activeAmbience, null);
  assert.equal(f.created.length, 0);
});

test("the latest location wins even when unlock promises resolve out of order", async () => {
  const f = fixture();
  const older = f.audio.startAmbience("jungle");
  const newer = f.audio.startAmbience("ship");
  f.pending[1](); await newer;
  f.pending[0](); await older;
  assert.equal(f.audio.activeAmbience, "ship");
  assert.deepEqual(f.created.map(voice => voice.biome), ["ship"]);
});

test("duplicate pending ambience requests create a single persistent voice", async () => {
  const f = fixture();
  const first = f.audio.startAmbience("ice");
  const second = f.audio.startAmbience("ice");
  f.pending.forEach(resolve => resolve());
  await Promise.all([first, second]);
  assert.equal(f.created.length, 1);
  assert.equal(f.audio.activeAmbience, "ice");
});

test("returning to the active location cancels an earlier pending replacement", async () => {
  const f = fixture();
  const initial = f.audio.startAmbience("ship");
  f.pending.shift()(); await initial;
  const replacement = f.audio.startAmbience("jungle");
  await f.audio.startAmbience("ship");
  f.pending.shift()(); await replacement;
  assert.equal(f.audio.activeAmbience, "ship");
  assert.equal(f.created.length, 1);
});

test("disposing cancels a pending ambience and audio stays safe without a browser", async () => {
  const f = fixture();
  const request = f.audio.startAmbience("ice");
  f.audio.dispose();
  f.pending.shift()(); await request;
  assert.equal(f.created.length, 0);
  const serverAudio = new GameAudio();
  await serverAudio.unlock();
  await serverAudio.startAmbience("ship");
  serverAudio.dispose();
  assert.equal(serverAudio.activeAmbience, null);
});
