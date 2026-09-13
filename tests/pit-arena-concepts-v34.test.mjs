import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { build } from "esbuild";

const result = await build({ stdin: { contents: 'export * from "./app/game/pitArenaProduction";', loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
const source = JSON.parse(await fs.readFile("art-source/v33/pit-arenas/production-manifest.json", "utf8"));
const ids = source.stages.slice(8, 20).map(stage => stage.catalogueId);
const stages = ids.map(id => source.stages.find(stage => stage.catalogueId === id));

test("V34 extensions 9-20 own 168 original selected files with matching source receipts", async () => {
  const seen = new Set(source.stages.filter(stage => stage.legacyRuntimeStatus === "playable").flatMap(stage => stage.planes.flatMap(plane => plane.assets.flatMap(asset => asset.frames.map(frame => frame.generation?.sha256)))));
  let checked = 0;
  for (const [index, stage] of stages.entries()) {
    assert(stage, ids[index]);
    assert.equal(stage.number, index + 9);
    assert.equal(stage.sourceConfirmation, "pending-dedicated-conversation");
    assert.deepEqual(stage.planes.map(plane => plane.id), ["P0", "P1", "P2", "P3", "P4", "P5"]);
    const assets = stage.planes.flatMap(plane => plane.assets);
    assert.equal(assets.length, 14);
    for (const plane of stage.planes) {
      assert.equal(plane.subplanSpecification, "proposed-original");
      for (const asset of plane.assets) {
        assert.equal(asset.animation, null);
        assert.equal(asset.frames.length, 1);
        const frame = asset.frames[0];
        assert(["reviewed", "integrated"].includes(frame.status));
        if (frame.status === "reviewed") assert.equal(frame.integration, null);
        else assert(frame.integration?.evidence);
        assert.equal(frame.generation.generator, "openai-imagegen");
        assert(frame.path.startsWith(`/game/sprites/v34/pit-arenas/${stage.catalogueId}/`));
        assert(!seen.has(frame.generation.sha256), `Reused drawing: ${frame.path}`);
        seen.add(frame.generation.sha256);
        const receipt = JSON.parse(await fs.readFile(frame.generation.source, "utf8"));
        assert.equal(receipt.accepted, true);
        assert.equal(receipt.arenaId, stage.catalogueId);
        assert.equal(receipt.id + ".png", frame.path.split("/").at(-1));
        assert.equal(receipt.sha256, frame.generation.sha256);
        assert.equal(receipt.publicPath, frame.path);
        assert.equal(createHash("sha256").update(await fs.readFile(`public${frame.path}`)).digest("hex"), receipt.sha256);
        assert.equal(receipt.hasAlpha, asset.alphaRequired);
        assert(receipt.prompt.length > 200);
        if (plane.id === "P4") assert.equal(asset.parallax, 1);
        checked++;
      }
    }
  }
  assert.equal(checked, 168);
});

test("reviewed concept pictures cannot unlock an arena or increase runtime coverage", () => {
  const summary = api.summarizePitArenaProduction();
  assert.equal(summary.stages, 100);
  assert.equal(summary.primaryPlaneTargets, 600);
  assert.equal(summary.legacyPlayable, 8);
  assert.equal(summary.concepts, 80);
  assert.equal(summary.readyRuntimeKits, 20);
  for (const stage of stages) {
    assert.equal(stage.legacyRuntimeStatus, "concept");
    assert.equal(stage.legacyRuntimeArenaId, null);
    assert.equal(stage.runtimeEnabled, true);
    assert(api.resolvePitArenaProductionKit(stage.catalogueId));
    const fixture = structuredClone(source);
    const selected = fixture.stages.find(entry => entry.catalogueId === stage.catalogueId);
    selected.runtimeEnabled = true;
    delete selected.runtimeExtension;
    assert.equal(api.resolvePitArenaProductionKit(stage.catalogueId, fixture), null, "Pictures and an activation flag cannot create a gameplay mapping");
    fixture.stages = [{ ...selected, legacyRuntimeArenaId: "the-pit" }];
    assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null, "A concept cannot borrow a playable ID");
  }
});

test("each concept has a real isolated browser proof without claiming full-app integration", async () => {
  for (const id of ids) {
    const proof = JSON.parse(await fs.readFile(`docs/v34-${id}-renderer-qa.json`, "utf8"));
    assert.equal(proof.result, "PASS");
    assert.equal(proof.arenaId, id);
    assert.equal(proof.conceptPreview, true);
    assert.equal(proof.playablePromotion, false);
    assert.equal(proof.applicationFlowVerified, false);
    assert.equal(proof.loaded.images, 14);
    assert.equal(proof.loaded.expectedImages, 14);
    assert.deepEqual(proof.loaded.failed, []);
    assert.deepEqual(proof.errors, []);
    assert.deepEqual(proof.failedRequests, []);
    assert.equal(proof.mobileNoOverflow, true);
    assert(proof.scenarios.length >= 8);
    for (const scenario of proof.scenarios) {
      assert.deepEqual(scenario.planes, ["P0", "P1", "P2", "P3", "P4", "P5"]);
      assert.equal(scenario.unchangedState, true);
      assert.equal(scenario.unchangedCamera, true);
      assert.deepEqual(scenario.missing, []);
      assert.deepEqual(scenario.fighters, [true, true]);
    }
    assert((await fs.readFile(`docs/v34-${id}-art-review.md`, "utf8")).includes("## Revue de composition non jouable"));
  }
});
