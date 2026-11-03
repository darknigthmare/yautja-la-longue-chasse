import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { buildAudioManifest, expectedAudioSlots, watchAudioManifest } from "../scripts/build-audio-manifest.mjs";

const slots = [{ category: "sfx", id: "plasma" }, { category: "music", id: "menu" }];
async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-audio-test-"));
  try { await fn(root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}
test("inventory covers every declared effect, biome and music context without requiring audio", async () => {
  const expected = await expectedAudioSlots();
  assert.equal(expected.filter(slot => slot.category === "sfx").length, 21);
  assert.equal(expected.filter(slot => slot.category === "ambience").length, 9);
  assert.equal(expected.filter(slot => slot.category === "music").length, 7);
  await fixture(async root => {
    const result = await buildAudioManifest({ root: path.join(root, "absent"), slots, write: false });
    assert.equal(result.manifest.entries.length, 2);
    assert.ok(result.manifest.entries.every(entry => !entry.sources.length));
  });
});
test("a real file wins over the missing marker, empty audio is excluded and URL names are escaped", async () => fixture(async root => {
  const folder = path.join(root, "sfx/plasma"); await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "missing.txt"), "not an audio gate");
  await fs.writeFile(path.join(folder, "vide.wav"), "");
  await fs.writeFile(path.join(folder, "tir chargé.mp3"), "test bytes, not a production recording");
  const result = await buildAudioManifest({ root, slots });
  const effect = result.manifest.entries[0];
  assert.equal(effect.sources.length, 1); assert.match(effect.sources[0].url, /^\/audio\/sfx\/plasma\/tir%20charg%C3%A9\.mp3\?v=[a-f0-9]+$/);
  assert.equal(result.ignored[0].reason, "empty-file");
  assert.equal((await fs.readFile(path.join(folder, "missing.txt"), "utf8")), "not an audio gate");
}));
test("format ordering, deterministic output and content fingerprints survive adds, replacement and removal", async () => fixture(async root => {
  const folder = path.join(root, "sfx/plasma"); await fs.mkdir(folder, { recursive: true });
  for (const name of ["b.wav", "z.mp3", "a.mp3", "c.ogg"]) await fs.writeFile(path.join(folder, name), name);
  const first = await buildAudioManifest({ root, slots });
  const second = await buildAudioManifest({ root, slots }); assert.equal(second.changed, false);
  assert.equal(first.manifest.version, second.manifest.version);
  assert.deepEqual(first.manifest.entries[0].sources.map(source => source.mime), ["audio/ogg", "audio/mpeg", "audio/mpeg", "audio/wav"]);
  await fs.writeFile(path.join(folder, "a.mp3"), "changed bytes");
  const changed = await buildAudioManifest({ root, slots }); assert.notEqual(changed.manifest.version, first.manifest.version);
  await fs.unlink(path.join(folder, "a.mp3"));
  assert.equal((await buildAudioManifest({ root, slots })).manifest.entries[0].sources.length, 3);
}));
test("a configurable local public prefix is supported and unsafe prefixes are rejected", async () => fixture(async root => {
  await fs.mkdir(path.join(root, "music/menu"), { recursive: true }); await fs.writeFile(path.join(root, "music/menu/score.m4a"), "fixture");
  const result = await buildAudioManifest({ root, slots, publicBase: "/assets/sound" });
  assert.match(result.manifest.entries[1].sources[0].url, /^\/assets\/sound\//);
  await assert.rejects(buildAudioManifest({ root, slots, publicBase: "//example.com" }));
}));
test("development watcher updates added and deleted audio without rewriting its own manifest forever", async () => fixture(async root => {
  await fs.mkdir(path.join(root, "sfx/plasma"), { recursive: true });
  const close = await watchAudioManifest({ root, slots });
  const read = async () => JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
  const until = async predicate => { for (let i = 0; i < 30; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); } assert.fail("watcher did not converge"); };
  try {
    await fs.writeFile(path.join(root, "sfx/plasma/new.wav"), "fixture");
    await until(async () => (await read()).entries[0].sources.length === 1);
    await fs.unlink(path.join(root, "sfx/plasma/new.wav"));
    await until(async () => (await read()).entries[0].sources.length === 0);
    const stat = await fs.stat(path.join(root, "manifest.json")); await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal((await fs.stat(path.join(root, "manifest.json"))).mtimeMs, stat.mtimeMs);
  } finally { close(); }
}));
