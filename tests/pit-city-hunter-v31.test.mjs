import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import sharp from "sharp";

test("City Hunter V31 provenance binds both OpenAI outputs to exact existing masters and alpha runtime assets", async () => {
  const manifest = JSON.parse(await readFile("public/game/sprites/v31/film-plates/manifest.json", "utf8"));
  assert.equal(manifest.coverage.staticPoses, manifest.entries.length);
  assert.equal(manifest.coverage.completeAnimationSets, 0);
  const entries = manifest.entries.filter(entry => entry.fighterId === "city-hunter");
  assert.match(manifest.rightsNote, /fan-made.*no official/i);
  assert.deepEqual(entries.map(entry => entry.nativeFacing), ["right", "left"]);
  assert.deepEqual(entries.map(entry => entry.source.sessionOutputFile), [
    "exec-a0ee7258-953b-471a-b52f-a845d6b41202.png",
    "exec-49e098da-686b-48d5-a506-f0cafd93ad08.png",
  ]);
  const hashes = new Set();
  for (const entry of entries) {
    assert.equal(entry.kind, "static-bitmap");
    assert.equal(entry.review.officialCertification, false);
    assert.equal(entry.review.animationFramesApproved, 0);
    assert.equal(entry.source.generator, "OpenAI imagegen (built-in)");
    for (const [file, expected] of [[entry.runtimePath, entry.metadata], [entry.source.masterPath, entry.source.metadata]]) {
      const bytes = await readFile(file), actual = await sharp(bytes).metadata();
      const digest = createHash("sha256").update(bytes).digest("hex");
      assert.equal(digest, expected.sha256); assert.equal(bytes.length, expected.bytes);
      assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
      hashes.add(digest);
    }
    const { data, info } = await sharp(entry.runtimePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let maxEdge = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1)
        maxEdge = Math.max(maxEdge, data[(y * info.width + x) * 4 + 3]);
    assert.equal(maxEdge, 0, "padding remains transparent, without a clipped edge");
    assert.equal(entry.metadata.hasAlpha, true);
  }
  assert.equal(hashes.size, 4, "two independent masters and two distinct runtime poses");
});
