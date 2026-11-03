import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { ENVIRONMENT_PROP_SPECS } from "../app/game/environmentPropCatalogue.ts";
import { processBiomeDecorV19 } from "../scripts/process-biome-decor-v19.mjs";
import { removeBiomeChromaPixelsV19, removeBiomeChromaV19 } from "../scripts/remove-biome-chroma-v19.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");

test("portable matte removes green and magenta, cleans transparent RGB, preserves opaque subject colors and existing alpha", () => {
  for (const key of [[0, 255, 0], [255, 0, 255]]) {
    const input = Buffer.from([...key, 255, 200, 40, 20, 255, 200, 40, 20, 128, 70, 80, 90, 0]);
    const before = Buffer.from(input);
    const result = removeBiomeChromaPixelsV19(input, key);
    assert.deepEqual([...result.data.subarray(0, 4)], [0, 0, 0, 0]);
    assert.deepEqual([...result.data.subarray(4, 12)], [200, 40, 20, 255, 200, 40, 20, 128]);
    assert.deepEqual([...result.data.subarray(12, 16)], [0, 0, 0, 0]);
    assert.deepEqual(input, before, "caller-owned pixels remain unchanged");
    assert.deepEqual([result.transparentPixels, result.softPixels, result.opaquePixels], [2, 1, 1]);
  }
});

test("portable matte has real soft edges, despills each key family and applies explicit thresholds", () => {
  const green = Buffer.from([0, 180, 0, 255, 0, 180, 0, 128, 5, 250, 4, 255]);
  const processed = removeBiomeChromaPixelsV19(green, [0, 255, 0]);
  assert.equal(processed.data[3], 77);
  assert.equal(processed.data[7], 39, "an existing translucent edge cannot become more opaque");
  assert.deepEqual([...processed.data.subarray(8, 12)], [0, 0, 0, 0], "small border color noise is cleared");
  assert.equal(processed.data[1], 0, "green spill is removed from a partial matte");
  const withoutDespill = removeBiomeChromaPixelsV19(green, [0, 255, 0], { despill: false });
  assert(withoutDespill.data[1] > processed.data[1]);
  const thresholded = removeBiomeChromaPixelsV19(green, [0, 255, 0], { transparentThreshold: 50, opaqueThreshold: 100 });
  assert.equal(thresholded.data[3], 128);
  const magenta = removeBiomeChromaPixelsV19(Buffer.from([180, 0, 180, 255]), [255, 0, 255]);
  assert(magenta.data[3] > 0 && magenta.data[3] < 255);
  assert.deepEqual([...magenta.data.subarray(0, 3)], [0, 0, 0], "magenta spill is removed independently of green");
  for (const options of [{ transparentThreshold: 220, opaqueThreshold: 12 }, { opaqueThreshold: 256 }, { despill: "yes" }]) {
    assert.throws(() => removeBiomeChromaPixelsV19(green, [0, 255, 0], options), /Seuils/);
  }
  assert.throws(() => removeBiomeChromaPixelsV19(green, [100, 100, 100]), /vert ou magenta/);
});

test("portable PNG processing preserves dimensions and original input bytes while writing usable RGBA", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yautja-chroma-png-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "source.png"), output = path.join(root, "alpha.png");
  const pixels = Buffer.from([255, 0, 255, 255, 200, 40, 20, 255, 180, 0, 180, 255]);
  await sharp(pixels, { raw: { width: 3, height: 1, channels: 4 } }).png().toFile(input);
  const before = hash(await readFile(input));
  const result = await removeBiomeChromaV19({ input, output, keyColor: [255, 0, 255] });
  const actual = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([actual.info.width, actual.info.height, actual.info.channels], [3, 1, 4]);
  assert.deepEqual([...actual.data.subarray(0, 8)], [0, 0, 0, 0, 200, 40, 20, 255]);
  assert(actual.data[11] > 0 && actual.data[11] < 255);
  assert.equal(result.transparentPixels, 1);
  assert.equal(hash(await readFile(input)), before);
});

async function processingFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "yautja-chroma-helper-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "source.png"), alpha = path.join(root, "configured-alpha.png");
  const foreground = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect x="170" y="170" width="172" height="172" fill="#c82814"/></svg>');
  await sharp({ create: { width: 512, height: 512, channels: 3, background: "#ff00ff" } }).composite([{ input: foreground }]).png().toFile(input);
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#00000000" } }).composite([{ input: foreground }]).png().toFile(alpha);
  return { root, alpha, options: { input, definitionId: ENVIRONMENT_PROP_SPECS.find(spec => spec.biomeId === "jungle").definitionId, artRoot: path.join(root, "art"), publicRoot: path.join(root, "runtime") } };
}

test("an explicitly configured helper has priority and its path, executable, checksum and parameters are reported", async t => {
  const { root, alpha, options } = await processingFixture(t);
  const helperPath = path.join(root, "custom-helper.mjs");
  // A Node fixture implements the external CLI contract without adding Python
  // as a dependency of the portable workflow. It is identified as configured.
  const source = `import {copyFileSync} from 'node:fs';\ncopyFileSync(${JSON.stringify(alpha)}, process.argv[process.argv.indexOf('--out')+1]);\nconsole.log('configured-helper-used');\n`;
  await writeFile(helperPath, source);
  const result = await processBiomeDecorV19({ ...options, helperPath, pythonCommand: process.execPath });
  assert.equal(result.helper.mode, "python-helper");
  assert.equal(result.helper.path, helperPath);
  assert.equal(result.helper.pythonCommand, process.execPath);
  assert.equal(result.helper.sha256, hash(Buffer.from(source)));
  assert.equal(result.helper.stdout, "configured-helper-used");
  assert.equal(result.helper.parameters.despill, true);
  assert.equal(result.helper.parameters.transparentThreshold, 12);
  assert.equal(result.helper.parameters.opaqueThreshold, 220);
  assert.equal(result.inputDeleted, false);
});

test("missing or failing explicit helpers fail strictly without falling back or writing destinations", async t => {
  const { root, options } = await processingFixture(t);
  await assert.rejects(processBiomeDecorV19({ ...options, helperPath: path.join(root, "absent.py") }), { code: "ENOENT" });
  const helperPath = path.join(root, "failing-helper.mjs");
  await writeFile(helperPath, "console.error('configured-helper-failure');process.exit(17);\n");
  await assert.rejects(processBiomeDecorV19({ ...options, helperPath, pythonCommand: process.execPath }), /configured-helper-failure/);
  await assert.rejects(access(options.artRoot), { code: "ENOENT" });
  await assert.rejects(access(options.publicRoot), { code: "ENOENT" });
  await access(options.input);
});
