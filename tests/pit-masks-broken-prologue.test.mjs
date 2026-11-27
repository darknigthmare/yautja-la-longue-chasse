import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advancePitMasksBrokenProgress, parsePitMasksBrokenProgress, persistPitMasksBrokenProgress, pitMasksBrokenKey,
} from "../app/game/systems/pitMasksBrokenPrologue.ts";

const owner = "2026-11-27T13:00:00.000Z";
const other = "2026-11-27T14:00:00.000Z";
const read = path => readFile(new URL("../" + path, import.meta.url));

test("the transfer mark precedes a successful independent training receipt", () => {
  assert.equal(advancePitMasksBrokenProgress("arrival", "complete-riposte"), "arrival");
  assert.equal(advancePitMasksBrokenProgress("arrival", "inspect-rack"), "inspected-rack");
  assert.equal(advancePitMasksBrokenProgress("inspected-rack", "complete-riposte"), "guard-practised");
  assert.equal(advancePitMasksBrokenProgress("guard-practised", "inspect-rack"), "guard-practised");
});

test("a local retry cannot lower the prior step or transfer a receipt to another campaign", () => {
  const rows = new Map();
  const storage = { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value) };
  assert.equal(persistPitMasksBrokenProgress(storage, owner, "inspected-rack"), "inspected-rack");
  assert.equal(persistPitMasksBrokenProgress(storage, owner, "guard-practised"), "guard-practised");
  assert.equal(persistPitMasksBrokenProgress(storage, owner, "inspected-rack"), "guard-practised");
  const serialized = storage.getItem(pitMasksBrokenKey(owner));
  assert.equal(parsePitMasksBrokenProgress(serialized, owner), "guard-practised");
  assert.equal(parsePitMasksBrokenProgress(serialized, other), "arrival");
  assert.equal(parsePitMasksBrokenProgress('{"version":2,"owner":"' + owner + '","step":"guard-practised"}', owner), "arrival");
  assert.throws(() => persistPitMasksBrokenProgress({ ...storage, setItem() {} }, other, "inspected-rack"));
});

test("each of the 15 original PNGs decodes to a registered, byte-identical study asset", async () => {
  const catalog = JSON.parse(await read("content/the-pit/les-masques-brises/extension.v1.json"));
  const index = JSON.parse(await read("content/the-pit/les-masques-brises/art-index.v1.json"));
  assert.equal(index.images.length, 15);
  assert.equal(new Set(index.images.map(image => image.gitBlob)).size, 15);
  assert.deepEqual(Object.fromEntries(["fighters","stages","enemies","bosses"].map(kind =>
    [kind, index.images.filter(image => image.kind === kind).length])), { fighters: 9, stages: 4, enemies: 1, bosses: 1 });
  for (const image of index.images) {
    const definition = catalog[image.kind].find(entry => entry.id === image.id);
    assert.equal(definition?.name, image.name);
    assert.equal(definition.implementation.runtimeIntegrated, false);
    const original = await read(image.source);
    const publicCopy = await read("public" + image.publicPath);
    assert.equal(Buffer.compare(original, publicCopy), 0, image.id);
    const gitBlob = createHash("sha1").update("blob " + original.length + "\0").update(original).digest("hex");
    assert.equal(gitBlob, image.gitBlob);
    assert.equal(original.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(original.subarray(12, 16).toString(), "IHDR");
    assert.ok(original.readUInt32BE(16) > 256 && original.readUInt32BE(20) > 256);
  }
  assert.equal(catalog.productionState.runtimeIntegrated, false);
});

test("the native Pit only reports the first actual transition to a completed bonus trial", async () => {
  const source = (await read("app/game/PitCanvas.tsx")).toString("utf8");
  const flow = (await read("app/game/PitExperienceV79.tsx")).toString("utf8");
  assert.match(source, /!isPitPrecisionSessionV2\(previousTrial\) && previousTrial\.status === "running" && frame\.trial\.status === "success"\) \{\s*masksBrokenPractice\?\.onRiposteComplete\(\)/);
  assert.match(flow, /<PitMasksBrokenPrologue key=\{ownerSaveCreatedAt\}/);
});
