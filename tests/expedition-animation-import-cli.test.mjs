import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execute = promisify(execFile);
const repository = fileURLToPath(new URL("../", import.meta.url));
const scratchParent = path.join(repository, "work", "test-expedition-import");
const contractSource = new URL("../app/game/systems/expeditionAnimationContract.ts", import.meta.url);
const scriptSource = new URL("../scripts/audit-expedition-animation-import.mjs", import.meta.url);
const bodyParts = ["head", "mandibles", "torso", "left-arm", "right-arm", "left-hand", "right-hand", "left-leg", "right-leg", "left-foot", "right-foot"];
const anchors = ["face", "dread-roots", "left-shoulder", "right-shoulder", "left-wrist", "right-wrist", "left-hand", "right-hand", "belt", "back", "torso"];

// Test the exact CLI/contract bytes in an isolated workspace. No transient images
// enter real public/game while a release build may run concurrently.
async function fixture(t) {
  await fs.mkdir(scratchParent, { recursive: true });
  const parent = await fs.realpath(scratchParent);
  const directory = await fs.mkdtemp(path.join(parent, "cli-"));
  t.after(async () => {
    const resolved = await fs.realpath(directory);
    const relative = path.relative(parent, resolved);
    assert.ok(relative && !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith("cli-"));
    await fs.rm(resolved, { recursive: true, force: false });
  });
  await Promise.all([
    fs.mkdir(path.join(directory, "scripts"), { recursive: true }),
    fs.mkdir(path.join(directory, "app/game/systems"), { recursive: true }),
    fs.mkdir(path.join(directory, "public/game"), { recursive: true }),
  ]);
  await fs.copyFile(scriptSource, path.join(directory, "scripts/audit-expedition-animation-import.mjs"));
  await fs.copyFile(contractSource, path.join(directory, "app/game/systems/expeditionAnimationContract.ts"));
  const image = path.join(directory, "public/game/body.png");
  const manifestPath = path.join(directory, "manifest.json");
  const pixels = Buffer.alloc(16 * 16 * 4, 0);
  for (let y = 3; y < 14; y++) for (let x = 5; x < 11; x++) pixels.set([80, 120, 90, 255], (y * 16 + x) * 4);
  const bytes = await sharp(pixels, { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer();
  await fs.writeFile(image, bytes);
  const manifest = {
    schemaVersion: 1, mode: "expedition",
    assets: [{ id: "body", src: "/game/body.png", sha256: createHash("sha256").update(bytes).digest("hex"), width: 16, height: 16,
      facing: "right", orientation: "native", kind: "body", construction: "whole-anatomy", anatomy: bodyParts, fusedEquipment: [] }],
    clips: [{ id: "test-only", appearanceId: "synthetic", facing: "right", bodyClock: "gameplay", equipmentClock: "independent",
      frames: [{ id: "one", durationTicks: 1, body: { assetId: "body", rect: [0, 0, 16, 16], pivot: [8, 15] },
        attachments: Object.fromEntries(anchors.map(id => [id, { x: 8, y: 8, rotation: 0 }])), ownership: [], equipment: [], cues: [] }] }],
  };
  const write = async () => fs.writeFile(manifestPath, JSON.stringify(manifest));
  await write();
  const run = async (args = [manifestPath]) => {
    const invocation = ["--experimental-strip-types", path.join(directory, "scripts/audit-expedition-animation-import.mjs"), ...args];
    try {
      const output = await execute(process.execPath, invocation, { cwd: directory, timeout: 10000, maxBuffer: 1024 * 1024 });
      return { code: 0, ...output, report: output.stdout.trim() ? JSON.parse(output.stdout) : null };
    } catch (error) {
      assert.equal(typeof error.code, "number", error.message);
      return { code: error.code, stdout: error.stdout, stderr: error.stderr, report: error.stdout?.trim() ? JSON.parse(error.stdout) : null };
    }
  };
  const replaceImage = async (replacement) => {
    await fs.writeFile(image, replacement);
    manifest.assets[0].sha256 = createHash("sha256").update(replacement).digest("hex");
    await write();
  };
  return { directory, manifest, manifestPath, image, bytes, write, run, replaceImage };
}

function rejected(result, reason) {
  assert.equal(result.code, 1);
  assert.equal(result.report.valid, false);
  assert.equal(result.report.conformingRuntimeClipCount, 0);
  assert.equal(result.report.checkedAssets, 0);
  assert.ok(result.report.issues.some(issue => issue.code === "source-file-rejected" && reason.test(issue.reason)), JSON.stringify(result.report));
}

test("CLI verifies real synthetic PNG bytes without granting runtime coverage or mutating input", async t => {
  const f = await fixture(t);
  const beforeManifest = await fs.readFile(f.manifestPath);
  const beforeFiles = await fs.readdir(f.directory);
  const result = await f.run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(result.report, { valid: true, declaredClipCount: 1, checkedAssets: 1, conformingRuntimeClipCount: 0, visualReviewRequired: true, issues: [] });
  assert.deepEqual(await fs.readFile(f.image), f.bytes);
  assert.deepEqual(await fs.readFile(f.manifestPath), beforeManifest);
  assert.deepEqual(await fs.readdir(f.directory), beforeFiles);
});

test("CLI rejects a missing declared source file", async t => {
  const f = await fixture(t);
  f.manifest.assets[0].src = "/game/missing.png";
  await f.write();
  rejected(await f.run(), /ENOENT|no such file/i);
});

test("CLI rejects a real PNG with a mismatching declared SHA", async t => {
  const f = await fixture(t);
  f.manifest.assets[0].sha256 = "0".repeat(64);
  await f.write();
  rejected(await f.run(), /SHA-256 differs/);
});

test("CLI rejects decoded dimensions inconsistent with valid manifest crop metadata", async t => {
  const f = await fixture(t);
  f.manifest.assets[0].width = 32;
  await f.write();
  rejected(await f.run(), /Decoded dimensions differ/);
});

test("CLI rejects opaque RGB, fully opaque RGBA and completely empty RGBA sources", async t => {
  const f = await fixture(t);
  for (const [channels, alpha, reason] of [[3, 1, /Transparent body\/equipment/], [4, 1, /visible and transparent/], [4, 0, /visible and transparent/]]) {
    const bytes = await sharp({ create: { width: 16, height: 16, channels, background: { r: 80, g: 120, b: 90, alpha } } }).png().toBuffer();
    await f.replaceImage(bytes);
    rejected(await f.run(), reason);
  }
});

test("CLI skips file reads after rejected metadata and does not count a malformed body", async t => {
  const f = await fixture(t);
  f.manifest.assets[0].src = "/game/missing.png";
  f.manifest.assets[0].fusedEquipment = ["biomask"];
  await f.write();
  const result = await f.run();
  assert.equal(result.code, 1);
  assert.equal(result.report.checkedAssets, 0);
  assert.ok(result.report.issues.some(issue => issue.code === "fused-equipment-forbidden"));
  assert.equal(result.report.issues.some(issue => issue.code === "source-file-rejected"), false);
});

test("CLI usage and malformed JSON return nonzero exit codes", async t => {
  const f = await fixture(t);
  const usage = await f.run([]);
  assert.equal(usage.code, 2);
  assert.match(usage.stderr, /Usage:/);
  await fs.writeFile(f.manifestPath, "{ invalid json");
  const malformed = await f.run();
  assert.equal(malformed.code, 1);
  assert.equal(malformed.report, null);
  assert.ok(malformed.stderr.trim());
});
