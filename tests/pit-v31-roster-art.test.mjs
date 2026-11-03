import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { build } from "esbuild";

const specs = [
  ["scarface", "exec-1ba677fe-78d9-4fee-a44e-99c245e5be88.png"],
  ["stone-heart", "exec-23d90f1d-1802-4962-8003-565c1528e82b.png"],
  ["valkyrie", "exec-ee2d108c-fcd2-4fde-b1a9-9d0110f16d30.png"],
  ["witch", "exec-56605dc0-4810-4cbe-b1c7-391ea478ff08.png"],
  ["enforcer", "exec-edba7c25-9243-45d6-96a7-3c2e68ea22f7.png"],
];
test("the five V31 PIT identities stay exact inside the expanded static manifest without claiming animations", async () => {
  const manifest = JSON.parse(await readFile("public/game/sprites/v31/film-plates/manifest.json", "utf8"));
  assert.deepEqual(manifest.coverage, {
    fighters: 15, staticPoses: 16, homeworldStaticPlates: 9,
    completeAnimationSets: 0, animationClips: 0,
    officialCertifications: 0, oneToOneCertifications: 0,
  });
  assert.equal(new Set(manifest.entries.map(entry => entry.id)).size, 16);
  assert.match(manifest.rightsNote, /fan-made.*no official.*1:1/i);
  const built = await build({entryPoints:["app/game/pitCombatBitmapArt.ts"],bundle:true,write:false,platform:"node",format:"esm"});
  const api = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
  for (const [id, output] of specs) {
    const entry = manifest.entries.find(item => item.id === id);
    assert.ok(entry, id);
    assert.equal(entry.fighterId, id); assert.equal(entry.nativeFacing, "right");
    assert.equal(entry.kind, "static-bitmap");
    assert.equal(entry.review.identityReviewed, true);
    assert.equal(entry.review.officialCertification, false);
    assert.equal(entry.review.animationFramesApproved, 0);
    assert.equal(entry.source.generator, "OpenAI imagegen (built-in)");
    assert.equal(entry.source.sessionOutputFile, output);
    assert.equal(entry.source.masterPath, "art-source/v31/known-yautja/sources/" + id + "-chroma.png");
    const runtime = api.getPitCombatBitmapArtDefinition(id);
    assert.equal(runtime.src, entry.runtimeUrl);
    assert.deepEqual(runtime.pivot, entry.combatRegistration.pivot);
    assert.equal(runtime.bodyTopY, entry.combatRegistration.bodyTopY);
    for (const [file, expected] of [[entry.runtimePath, entry.metadata], [entry.source.masterPath, entry.source.metadata]]) {
      const bytes = await readFile(file), actual = await sharp(bytes).metadata();
      assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256);
      assert.equal(bytes.length, expected.bytes);
      assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
    }
    assert.equal(entry.metadata.hasAlpha, true); assert.equal(entry.alphaValidation.outerEdgeMaxAlpha, 0);
  }
});
