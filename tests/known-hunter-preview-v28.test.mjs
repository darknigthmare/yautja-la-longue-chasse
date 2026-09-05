import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildKnownHunterSpritePreview, collectKnownHunterReview } from "../scripts/build-known-hunter-sprite-preview-v28.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const json = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + "\n");
const sourceFiles = [
  "scripts/build-known-hunter-sprite-preview-v28.mjs",
  "scripts/known-hunter-preview-v28.client.ts",
  "scripts/known-hunter-preview-v28.html",
  "app/game/hunterSpriteAtlas.ts",
];

async function fixture(t) {
  const temporaryRoot = fs.realpathSync(path.join(root, "tmp"));
  const projectRoot = fs.mkdtempSync(path.join(temporaryRoot, "hunter-review-v28-test-"));
  t.after(() => {
    const resolved = fs.realpathSync(projectRoot);
    const relative = path.relative(temporaryRoot, resolved);
    assert.ok(relative.startsWith("hunter-review-v28-test-") && !relative.includes(path.sep),
      "recursive cleanup must stay inside this test's verified temporary directory");
    fs.rmSync(resolved, { recursive: true });
  });
  for (const relative of sourceFiles) {
    const destination = path.join(projectRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, relative), destination);
  }
  const base = path.join(projectRoot, "art-source/v28/known-hunters");
  fs.mkdirSync(path.join(base, "sources"), { recursive: true });
  const sourceImages = [
    await sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 40, g: 90, b: 80, alpha: 0.8 } } }).png().toBuffer(),
    await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 255, g: 0, b: 255 } } }).png().toBuffer(),
  ];
  fs.writeFileSync(path.join(base, "sources/human.png"), sourceImages[0]);
  fs.writeFileSync(path.join(base, "sources/yautja.png"), sourceImages[1]);
  const review = {
    schemaVersion: 1, scope: "Isolated test data", includeV27: false,
    entries: [
      { id: "machiko-idle", characterId: "machiko-noguchi", name: "Machiko Noguchi", species: "human",
        family: "humans-in-yautja-armor", variantId: "comic-armor", variantLabel: "Armure Yautja · comics",
        action: "Attente", status: "draft", loop: true, notes: ["Source de test, pas un dessin livré."] },
      { id: "tracker-guard", characterId: "tracker", name: "Tracker", species: "yautja",
        family: "film-hunters", variantId: "predators-2010", action: "Garde",
        status: "rejected", loop: false, notes: [] },
    ],
  };
  const registration = {
    schemaVersion: 1, entries: [
      { id: "machiko-idle", characterId: "machiko-noguchi", status: "draft-registration-only",
        source: { path: "art-source/v28/known-hunters/sources/human.png", sha256: hash(sourceImages[0]), width: 32, height: 24 },
        frames: [
          { index: 1, stage: "ready", rectPx: [0, 0, 10, 12], pivotPx: { x: 5, y: 11 }, durationTicks: 3 },
          { index: 2, stage: "inhale", rectPx: [12, 0, 16, 20], pivotPx: { x: 6, y: 19 }, durationTicks: 7 },
        ] },
      { id: "tracker-guard", characterId: "tracker", status: "draft-registration-only",
        source: { path: "art-source/v28/known-hunters/sources/yautja.png", sha256: hash(sourceImages[1]), width: 40, height: 20 },
        frames: [
          { index: 1, stage: "ready", rectPx: [0, 0, 10, 16], pivotPx: { x: 5, y: 15 } },
          { index: 2, stage: "guard", rectPx: [12, 0, 10, 16], pivotPx: { x: 5, y: 15 } },
          { index: 3, stage: "recover", rectPx: [24, 0, 10, 16], pivotPx: { x: 5, y: 15 } },
        ] },
    ],
  };
  const save = () => { json(path.join(base, "review.json"), review); json(path.join(base, "frame-registration.json"), registration); };
  save();
  return { projectRoot, base, review, registration, sourceImages, save };
}

test("counts, species, variants, native alpha and scale derive from the actual sources and entries", async t => {
  const f = await fixture(t);
  const result = await collectKnownHunterReview(f.projectRoot);
  assert.deepEqual(result.counts, {
    sheets: 2, cells: 5, subjects: 2, variants: 2, humanSheets: 1, yautjaSheets: 1,
    statuses: { draft: 1, rejected: 1, validated: 0 },
  });
  const [human, yautja] = result.entries;
  assert.equal(human.species, "human");
  assert.equal(human.variantLabel, "Armure Yautja · comics");
  assert.equal(human.reviewScale, 0.8);
  assert.equal(yautja.reviewScale, 0.95);
  assert.equal(human.source.hasAlpha, true);
  assert.deepEqual(human.transparency, { mode: "alpha" });
  assert.equal(yautja.source.hasAlpha, false);
  assert.equal(yautja.transparency.mode, "color-key");
  assert.equal(yautja.transparency.tolerance, 64);
  assert.equal(yautja.transparency.fringe.radius, 2);
  assert.deepEqual(human.frames.map(frame => frame.rect[3]), [12, 20],
    "different source heights stay different instead of frame-by-frame normalization");
  assert.deepEqual(human.frames.map(frame => frame.durationTicks), [3, 7]);
  assert.deepEqual(result.entries.map(entry => entry.status), ["draft", "rejected"]);
});

test("build preserves PNG bytes and V27 while check verifies all output and code freshness", async t => {
  const f = await fixture(t);
  const legacyDirectory = path.join(f.projectRoot, "public/game/assets/v27/sprite-review");
  fs.mkdirSync(legacyDirectory, { recursive: true });
  const sentinel = Buffer.from("V27 must remain byte-for-byte intact.\n");
  fs.writeFileSync(path.join(legacyDirectory, "index.html"), sentinel);
  const built = await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot });
  assert.equal(built.manifest.completion.gameplayValidatedClips, 0);
  assert.deepEqual(built.manifest.completion.completeSubjectIds, []);
  assert.deepEqual(fs.readFileSync(path.join(legacyDirectory, "index.html")), sentinel);
  const publicRoot = path.join(f.projectRoot, "public/game/assets/v28/sprite-review");
  assert.deepEqual(fs.readFileSync(path.join(publicRoot, "machiko-idle.png")), f.sourceImages[0]);
  assert.deepEqual(fs.readFileSync(path.join(publicRoot, "tracker-guard.png")), f.sourceImages[1]);
  await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot, check: true });
  for (const relative of [
    "public/game/assets/v28/sprite-review/index.html",
    "public/game/assets/v28/sprite-review/review.js",
    "public/game/assets/v28/sprite-review/manifest.json",
    "public/game/assets/v28/sprite-review/machiko-idle.png",
    "outputs/known-hunters-v28/preview.html",
  ]) {
    const filename = path.join(f.projectRoot, relative), previous = fs.readFileSync(filename);
    fs.appendFileSync(filename, "\nSTALE");
    await assert.rejects(buildKnownHunterSpritePreview({ projectRoot: f.projectRoot, check: true }), /stale\/missing/);
    fs.writeFileSync(filename, previous);
  }
  for (const relative of sourceFiles) {
    const filename = path.join(f.projectRoot, relative), previous = fs.readFileSync(filename);
    fs.appendFileSync(filename, relative.endsWith(".html") ? "\n<!-- changed -->" : "\n// changed");
    await assert.rejects(buildKnownHunterSpritePreview({ projectRoot: f.projectRoot, check: true }), /stale\/missing/);
    fs.writeFileSync(filename, previous);
  }
  await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot, check: true });
  const publicHtml = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
  assert.match(publicHtml, /src="review\.js"/);
  assert.doesNotMatch(publicHtml, /data:image\/png;base64/);
  assert.match(fs.readFileSync(path.join(f.projectRoot, "outputs/known-hunters-v28/preview.html"), "utf8"),
    /data:image\/png;base64/);
});

test("V27 inclusion is optional, explicit and cumulative without rebuilding its old artifacts", async t => {
  const f = await fixture(t);
  assert.equal((await collectKnownHunterReview(f.projectRoot)).entries.length, 2, "missing V27 is not a default dependency");
  const legacy = path.join(f.projectRoot, "art-source/v27/known-yautja");
  fs.mkdirSync(legacy, { recursive: true });
  const oldItem = { ...f.review.entries[1], id: "wolf-legacy", characterId: "wolf", name: "Wolf" };
  delete oldItem.species;
  const oldRegistration = { ...f.registration.entries[1], id: "wolf-legacy", characterId: "wolf" };
  json(path.join(legacy, "review.json"), { schemaVersion: 1, entries: [oldItem] });
  json(path.join(legacy, "frame-registration.json"), { schemaVersion: 1, entries: [oldRegistration] });
  const originals = [fs.readFileSync(path.join(legacy, "review.json")), fs.readFileSync(path.join(legacy, "frame-registration.json"))];
  f.review.includeV27 = true; f.save();
  const result = await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot });
  assert.equal(result.manifest.counts.sheets, 3);
  assert.equal(result.manifest.counts.cells, 8);
  assert.equal(result.manifest.entries[2].species, "yautja");
  assert.equal(result.manifest.entries[2].sourceBatch, "V27");
  assert.deepEqual(fs.readFileSync(path.join(legacy, "review.json")), originals[0]);
  assert.deepEqual(fs.readFileSync(path.join(legacy, "frame-registration.json")), originals[1]);
});

test("malformed registration, implicit human species, changed source and destructive native-alpha keying fail", async t => {
  const f = await fixture(t);
  const originalReview = structuredClone(f.review), originalRegistration = structuredClone(f.registration);
  const reset = () => {
    f.review.entries = structuredClone(originalReview.entries);
    f.registration.entries = structuredClone(originalRegistration.entries);
  };
  const mutations = [
    () => { delete f.review.entries[0].species; },
    () => { f.review.entries[0].id = "../escape"; },
    () => { f.review.entries[0].reviewScale = 0; },
    () => { f.review.entries[0].transparency = { mode: "color-key", rgb: [255, 0, 255], tolerance: 64 }; },
    () => { f.registration.entries[0].frames[1].rectPx = [0, 0, 10, 12]; },
    () => { f.registration.entries[0].frames[1].rectPx = [30, 0, 10, 12]; },
    () => { f.registration.entries[0].frames[1].index = 1; },
    () => { f.registration.entries[0].frames[1].durationTicks = 0; },
    () => { f.registration.entries[0].source.sha256 = "a".repeat(64); },
    () => { f.registration.entries[0].source.width = 33; },
  ];
  for (const mutate of mutations) {
    reset(); mutate(); f.save();
    await assert.rejects(collectKnownHunterReview(f.projectRoot));
  }
  reset(); f.save();
  const outside = path.join(f.projectRoot, "outside.png");
  fs.writeFileSync(outside, f.sourceImages[0]);
  f.registration.entries[0].source.path = "outside.png"; f.save();
  await assert.rejects(collectKnownHunterReview(f.projectRoot), /outside art-source/);
});

test("empty filters are supported and injected names cannot terminate the data script", async t => {
  const f = await fixture(t);
  f.review.entries[0].name = "Machiko </script><script>unsafe()</script>";
  f.save();
  const built = await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot });
  assert.equal(built.manifest.entries[0].name, f.review.entries[0].name);
  const html = fs.readFileSync(path.join(f.projectRoot, "public/game/assets/v28/sprite-review/index.html"), "utf8");
  assert.doesNotMatch(html, /<script>unsafe\(\)<\/script>/);
  assert.match(html, /\\u003c\/script>/);
  for (const name of ["Machiko $& test", "Machiko $' test"]) {
    f.review.entries[0].name = name; f.save();
    await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot });
    for (const relative of [
      "public/game/assets/v28/sprite-review/index.html",
      "outputs/known-hunters-v28/preview.html",
    ]) {
      const output = fs.readFileSync(path.join(f.projectRoot, relative), "utf8");
      const dataScript = output.match(/<script>([\s\S]*?)<\/script>/)?.[1];
      assert.ok(dataScript, "generated data script must exist");
      const context = { window: {} };
      vm.runInNewContext(dataScript, context, { timeout: 1000 });
      assert.equal(context.window.__hunterReviewV28.entries[0].name, name,
        "literal replacement tokens must survive public and standalone HTML injection");
    }
  }
  f.review.entries = []; f.registration.entries = []; f.save();
  const empty = await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot });
  assert.equal(empty.manifest.counts.sheets, 0);
  assert.equal(empty.manifest.counts.cells, 0);
  await buildKnownHunterSpritePreview({ projectRoot: f.projectRoot, check: true });
});
