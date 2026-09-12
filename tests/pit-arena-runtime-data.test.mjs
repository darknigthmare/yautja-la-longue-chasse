import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import {
  PIT_ARENA_SOURCE_PATH,
  PIT_ARENA_RUNTIME_PATH,
  projectPitArenaRuntimeData,
  serializePitArenaRuntimeData,
  checkPitArenaRuntimeData,
  verifyPitArenaSourceReferences,
} from "../scripts/build-pit-arena-runtime-v33.mjs";

const root = process.cwd();
const source = JSON.parse(await fs.readFile(path.join(root, PIT_ARENA_SOURCE_PATH), "utf8"));
const artifact = await fs.readFile(path.join(root, PIT_ARENA_RUNTIME_PATH), "utf8");
const bundle = await build({
  stdin: { contents: 'export * from "./app/game/pitArenaProduction"; export { getPitArenaArtPaths } from "./app/game/pitArenaRendering";', resolveDir: root, loader: "ts" },
  bundle: true, write: false, platform: "browser", format: "esm", metafile: true, logLevel: "silent",
  plugins: [{ name: "deployment-excludes-private-archives", setup(api) {
    api.onResolve({ filter: /(?:^|[\\/])(art-source|docs|work|scripts)(?:[\\/]|$)/ }, args => ({ errors: [{ text: "Not uploaded to deployment: " + args.path }] }));
  } }],
});
const runtime = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

test("the committed runtime projection is deterministic and synchronized with its authoring source", async () => {
  const before = JSON.stringify(source);
  assert.equal(artifact.replaceAll("\r\n", "\n"), serializePitArenaRuntimeData(source));
  assert.equal(serializePitArenaRuntimeData(source), serializePitArenaRuntimeData(structuredClone(source)));
  assert.equal(JSON.stringify(source), before, "Projection mutated the authoritative source");
  await checkPitArenaRuntimeData(root);
});

test("the browser dependency graph builds without any archive, proof or authoring-script import", () => {
  for (const input of Object.keys(bundle.metafile.inputs)) {
    assert(!/(?:^|[\\/])(art-source|docs|work|scripts)(?:[\\/]|$)/.test(input), input);
  }
  assert(Object.keys(bundle.metafile.inputs).some(input => input.endsWith("pitArenaProductionData.generated.json")));
  assert(!artifact.includes('art-source/'));
  assert(!artifact.includes('docs/'));
  assert(!artifact.includes('generation-receipts'));
  assert(!artifact.includes('"contour"'));
  for (const arena of ["the-pit", "trophy-hall"]) assert(runtime.resolvePitArenaProductionKit(arena));
});

test("runtime summaries and actual render plans retain all 100 entries and exact source coverage", () => {
  assert.deepEqual(runtime.summarizePitArenaProduction(), runtime.summarizePitArenaProduction(source));
  assert.equal(runtime.summarizePitArenaProduction().stages, 100);
  assert.equal(runtime.summarizePitArenaProduction().primaryPlaneTargets, 600);
  assert.equal(runtime.summarizePitArenaProduction().legacyPlayable, 8);
  assert.equal(runtime.summarizePitArenaProduction().concepts, 92);
  for (const stage of source.stages) {
    const projected = runtime.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(entry => entry.catalogueId === stage.catalogueId);
    assert(projected);
    assert.equal(projected.name, stage.name);
    assert.deepEqual(projected.planes.map(plane => [plane.id, plane.status]), stage.planes.map(plane => [plane.id, plane.status]));
    if (!stage.legacyRuntimeArenaId) continue;
    const original = runtime.resolvePitArenaProductionKit(stage.legacyRuntimeArenaId, source);
    const client = runtime.resolvePitArenaProductionKit(stage.legacyRuntimeArenaId);
    assert.deepEqual(client?.paths, original?.paths);
    assert.deepEqual(client?.requiredPaths, original?.requiredPaths);
    if (original) for (const [index, plane] of original.planes.entries()) {
      assert.deepEqual(client.planes[index].assets.map(asset => [asset.id, asset.mode, asset.parallax, asset.placements, asset.sourceCrop, asset.anchorToGround, asset.verticalAlign, asset.animation]),
        plane.assets.map(asset => [asset.id, asset.mode, asset.parallax, asset.placements, asset.sourceCrop, asset.anchorToGround, asset.verticalAlign, asset.animation]));
    }
  }
});

test("unknown private fields cannot leak through the projection allow-list", () => {
  const draft = structuredClone(source);
  const secret = "PRIVATE_PROMPT_SENTINEL_DO_NOT_SHIP";
  draft.prompt = secret;
  draft.stages[0].receipts = secret;
  const plane = draft.stages[0].planes[0];
  plane.productionNotes = secret;
  const asset = plane.assets[0];
  asset.contour = secret;
  asset.prompts = secret;
  asset.frames[0].generation.source = "art-source/" + secret;
  asset.frames[0].generation.rawPrompt = secret;
  asset.frames[0].review.evidence = "docs/" + secret;
  asset.frames[0].integration.evidence = "docs/" + secret;
  assert(!JSON.stringify(projectPitArenaRuntimeData(draft)).includes(secret));
  assert.notEqual(projectPitArenaRuntimeData(draft).sourceManifestSha256, projectPitArenaRuntimeData(source).sourceManifestSha256);
});

test("authoring validation requires original proof paths, never runtime-only attestations", async () => {
  await assert.rejects(verifyPitArenaSourceReferences(projectPitArenaRuntimeData(source), root), /Missing original generation receipt/);
  const missing = structuredClone(source);
  missing.stages[0].planes[0].assets[0].frames[0].generation.source = "art-source/v33/pit-arenas/missing-receipt-for-regression.json";
  await assert.rejects(verifyPitArenaSourceReferences(missing, root), { code: "ENOENT" });
});

test("the check rejects a stale committed projection after a source-only change", async () => {
  // Keep scratch physically under C: work, never the tmp junction on D:.
  const scratch = path.join(root, "work/v33/runtime-data-tests");
  await fs.mkdir(scratch, { recursive: true });
  const fixtureRoot = await fs.mkdtemp(path.join(scratch, "stale-"));
  const fixture = { ...source, stages: [] };
  for (const relative of [PIT_ARENA_SOURCE_PATH, PIT_ARENA_RUNTIME_PATH]) await fs.mkdir(path.dirname(path.join(fixtureRoot, relative)), { recursive: true });
  await fs.writeFile(path.join(fixtureRoot, PIT_ARENA_SOURCE_PATH), JSON.stringify(fixture));
  await fs.writeFile(path.join(fixtureRoot, PIT_ARENA_RUNTIME_PATH), serializePitArenaRuntimeData(fixture));
  await checkPitArenaRuntimeData(fixtureRoot);
  await fs.writeFile(path.join(fixtureRoot, PIT_ARENA_RUNTIME_PATH), serializePitArenaRuntimeData(fixture).replaceAll("\n", "\r\n"));
  await checkPitArenaRuntimeData(fixtureRoot); // Git autocrlf does not mean the data is stale.
  fixture.sourceNote += " source changed after the previous projection";
  await fs.writeFile(path.join(fixtureRoot, PIT_ARENA_SOURCE_PATH), JSON.stringify(fixture));
  await assert.rejects(checkPitArenaRuntimeData(fixtureRoot), /Stale PIT runtime projection/);
});
